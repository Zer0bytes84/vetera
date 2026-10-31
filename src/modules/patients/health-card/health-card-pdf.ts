import { jsPDF } from "jspdf";
import regularFontUrl from "pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf?url";
import boldFontUrl from "pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf?url";

import type { InvoiceSettings } from "@/services/invoiceSettingsService";
import type { PatientRecordPdf } from "../export/patient-record-types";
import {
  type HealthCard,
  type HealthCardAlert,
  type HealthCardEvent,
  type HealthCardVaccine,
  parseClinicalDate,
  type VaccineStatus,
} from "./health-card-data";

/**
 * Carnet de santé : une page A4, lisible en trente secondes. Hiérarchie
 * inspirée des carnets de santé humains et d'Apple Santé : identité, ce qui
 * demande de l'attention, puis les rubriques en cartes calmes.
 */

const W = 210, M = 14, CW = W - 2 * M;
const GAP = 4, COL = (CW - GAP) / 2;
/** Le contenu s'arrête au-dessus de ce trait : une page, jamais deux. */
export const HEALTH_CARD_FOOTER_TOP = 280;
const FOOTER_TOP = HEALTH_CARD_FOOTER_TOP;
const FONT = "BaitariHealthCard";

const INK = "#1d1d1f", SOFT = "#3a3a3c", MUTED = "#6e6e73", RULE = "#e3e3e8", CARD = "#f5f5f7";
const RED = "#c4001a", RED_BG = "#fdecee";
const ORANGE = "#b25000", ORANGE_BG = "#fff3e0";
const GREEN = "#1f7a37", GREEN_BG = "#e9f7ee";
const GRAY_BG = "#ececf0";
const WEIGHT = "#5e5ce6";

let fontPromise: Promise<[string, string]> | undefined;

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}

/** Polices locales, servies par l'application : aucun accès réseau. */
async function fonts(): Promise<[string, string]> {
  fontPromise ??= Promise.all([regularFontUrl, boldFontUrl].map(async (url) => {
    if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(url) && new URL(url, window.location.href).origin !== window.location.origin)
      throw new Error("Une ressource distante est interdite dans le carnet de santé.");
    const response = await fetch(url);
    if (!response.ok) throw new Error("La police locale du carnet n’a pas pu être chargée.");
    return encodeBase64(new Uint8Array(await response.arrayBuffer()));
  })) as Promise<[string, string]>;
  try { return await fontPromise; }
  catch (error) { fontPromise = undefined; throw error; }
}

export function civilDate(value: string | undefined): string {
  const date = parseClinicalDate(value);
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function kgText(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
}

export function healthCardFilename(name: string, generatedAt: string): string {
  const safe = name.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Patient";
  return `Carnet_de_sante_${safe}_${generatedAt.slice(0, 10)}.pdf`;
}

class Page {
  constructor(readonly doc: jsPDF) {}

  style(size: number, bold = false, color = INK) {
    this.doc.setFont(FONT, bold ? "bold" : "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(color);
  }

  /** Texte sur une ligne, tronqué proprement à la largeur donnée. */
  fit(text: string, width: number): string {
    const value = text.replace(/\s+/g, " ").trim();
    if (this.doc.getTextWidth(value) <= width) return value;
    let cut = value;
    while (cut.length > 1 && this.doc.getTextWidth(`${cut}…`) > width) cut = cut.slice(0, -1);
    return `${cut.trimEnd()}…`;
  }

  text(text: string, x: number, y: number, width: number, align: "left" | "right" | "center" = "left") {
    this.doc.text(this.fit(text, width), x, y, { align, baseline: "alphabetic" });
  }

  /** Au plus `max` lignes, la dernière tronquée si besoin. */
  wrap(text: string, x: number, y: number, width: number, max: number, leading: number): number {
    const lines = this.doc.splitTextToSize(text.replace(/\s+/g, " ").trim(), width) as string[];
    const shown = lines.slice(0, max);
    if (lines.length > max) shown[max - 1] = this.fit(`${shown[max - 1]} ${lines.slice(max).join(" ")}`, width);
    shown.forEach((line, index) => this.doc.text(line, x, y + index * leading));
    return shown.length;
  }

  fill(color: string) { this.doc.setFillColor(color); }

  card(x: number, y: number, w: number, h: number, color = CARD) {
    this.fill(color);
    this.doc.roundedRect(x, y, w, h, 3, 3, "F");
  }

  /** Pastille : fond teinté, texte coloré. Renvoie la largeur. */
  pill(label: string, x: number, y: number, color: string, background: string, alignRight = false): number {
    this.style(7.5, true, color);
    const width = this.doc.getTextWidth(label) + 4.4;
    const left = alignRight ? x - width : x;
    this.fill(background);
    this.doc.roundedRect(left, y - 3.3, width, 4.6, 2.3, 2.3, "F");
    this.doc.text(label, left + 2.2, y);
    return width;
  }

  heading(title: string, x: number, y: number, color: string, aside?: string, width = COL - 10) {
    this.fill(color);
    this.doc.circle(x + 1.3, y - 1.25, 1.3, "F");
    this.style(10.5, true, INK);
    this.doc.text(title, x + 4.2, y);
    if (aside) {
      this.style(7.5, false, MUTED);
      this.text(aside, x + width, y, width / 2, "right");
    }
  }
}

function imageFormat(dataUrl: string): "PNG" | "JPEG" | null {
  const match = dataUrl.match(/^data:image\/(png|jpe?g);base64,/i);
  return match ? (match[1].toLowerCase() === "png" ? "PNG" : "JPEG") : null;
}

function drawHeader(page: Page, card: HealthCard, clinic: InvoiceSettings) {
  const { doc } = page;
  page.style(8, true, MUTED);
  doc.text("CARNET DE SANTÉ", M, 18, { charSpace: 0.6 });
  page.style(8, false, MUTED);
  doc.text(`Édité le ${civilDate(card.generatedAt)}`, M, 22.5);

  let right = W - M;
  const logo = clinic.logoDataUrl && imageFormat(clinic.logoDataUrl);
  if (logo) {
    try {
      const props = doc.getImageProperties(clinic.logoDataUrl);
      const h = 10, w = Math.min(28, (props.width / props.height) * h);
      doc.addImage(clinic.logoDataUrl, logo, right - w, 13.5, w, h);
      right -= w + 3;
    } catch { /* Un logo illisible ne bloque pas le carnet. */ }
  }
  if (clinic.name) {
    page.style(9, true, INK);
    page.text(clinic.name, right, 18, 80, "right");
    page.style(7.5, false, MUTED);
    const contact = [clinic.phone, clinic.email].filter(Boolean).join(" · ");
    if (contact) page.text(contact, right, 22.5, 80, "right");
  }
  doc.setDrawColor(RULE);
  doc.setLineWidth(0.3);
  doc.line(M, 27, W - M, 27);
}

function drawIdentity(page: Page, card: HealthCard): number {
  const { doc } = page;
  const { identity, weight } = card;
  const top = 33, size = 27;
  if (identity.photoDataUrl && imageFormat(identity.photoDataUrl)) {
    doc.saveGraphicsState();
    doc.roundedRect(M, top, size, size, 7, 7, null);
    doc.clip();
    doc.discardPath();
    try {
      doc.addImage(identity.photoDataUrl, imageFormat(identity.photoDataUrl)!, M, top, size, size);
    } catch { /* Photo illisible : l'initiale reste visible dessous. */ }
    doc.restoreGraphicsState();
  } else {
    page.card(M, top, size, size, "#eef0f8");
    page.style(22, true, WEIGHT);
    doc.text(identity.name.trim().charAt(0).toUpperCase() || "?", M + size / 2, top + size / 2 + 3.6, { align: "center" });
  }

  const x = M + size + 7, width = W - M - x;
  page.style(22, true, INK);
  page.text(identity.name, x, top + 8.5, width);
  page.style(10, false, SOFT);
  page.text([identity.reference, identity.species, identity.breed, identity.sexLabel].filter(Boolean).join(" · "), x, top + 14.5, width);

  const facts: [string, string][] = [
    ["Âge", identity.ageLabel ?? "Non renseigné"],
    ["Naissance", civilDate(identity.dateOfBirth) || "Non renseignée"],
    ["Poids actuel", weight.current ? `${kgText(weight.current.kg)} kg` : "Aucune pesée"],
    ["Identification", identity.chipNumber ? `Puce ${identity.chipNumber}` : identity.tattooNumber ? `Tatouage ${identity.tattooNumber}` : "Non renseignée"],
  ];
  // L'identification (puce à 15 chiffres) reçoit la colonne la plus large.
  const shares = [0.21, 0.21, 0.21, 0.37];
  facts.forEach(([label, value], index) => {
    const fx = x + shares.slice(0, index).reduce((sum, share) => sum + share * width, 0);
    const factWidth = shares[index] * width;
    page.style(7, true, MUTED);
    doc.text(label.toUpperCase(), fx, top + 21.5, { charSpace: 0.3 });
    page.style(9.5, true, INK);
    page.text(value, fx, top + 26.5, factWidth - 3);
  });

  if (identity.ownerName || identity.ownerPhone) {
    page.style(8, false, MUTED);
    page.text(`Propriétaire : ${[identity.ownerName, identity.ownerPhone].filter(Boolean).join(" · ")}`, M, top + size + 6.5, CW);
    return top + size + 11;
  }
  return top + size + 6;
}

const ALERT_LABEL: Record<HealthCardAlert["kind"], string> = {
  allergy: "Allergie",
  vaccine_overdue: "Vaccin en retard",
  condition: "Affection chronique",
};
const MAX_ALERTS = 8;

function drawAlerts(page: Page, alerts: HealthCardAlert[], top: number): number {
  const { doc } = page;
  if (alerts.length === 0) {
    page.card(M, top, CW, 10, GREEN_BG);
    page.style(9, true, GREEN);
    doc.text("Rien à signaler", M + 5, top + 6.4);
    page.style(8.5, false, SOFT);
    page.text("Aucune allergie, affection chronique ni vaccin en retard dans le dossier.", M + 32, top + 6.4, CW - 37);
    return top + 10;
  }
  const shown = alerts.slice(0, MAX_ALERTS);
  const columns = shown.length > 4 ? 2 : 1;
  const rows = Math.ceil(shown.length / columns);
  const height = 13 + rows * 6.4 + (alerts.length > MAX_ALERTS ? 4 : 0);
  page.card(M, top, CW, height, RED_BG);
  page.fill(RED);
  doc.roundedRect(M, top, 1.6, height, 0.8, 0.8, "F");
  page.style(10.5, true, RED);
  doc.text("À signaler", M + 6, top + 7.2);
  page.style(7.5, false, SOFT);
  page.text(`${alerts.length > 1 ? `${alerts.length} points` : "1 point"} à connaître avant tout soin`, W - M - 5, top + 7.2, 80, "right");
  const colWidth = (CW - 12) / columns;
  page.style(7.5, true, RED);
  // Largeur des libellés mesurée par colonne, dans le style des libellés.
  const measure = (alert: HealthCardAlert) => doc.getTextWidth(ALERT_LABEL[alert.kind].toUpperCase()) + ALERT_LABEL[alert.kind].length * 0.2;
  const labelWidths = Array.from({ length: columns }, (_, col) => Math.max(...shown.slice(col * rows, col * rows + rows).map(measure)) + 4);
  shown.forEach((alert, index) => {
    const col = Math.floor(index / rows), row = index % rows;
    const labelWidth = labelWidths[col];
    const x = M + 6 + col * colWidth, y = top + 13.8 + row * 6.4;
    page.style(7.5, true, RED);
    const label = ALERT_LABEL[alert.kind];
    doc.text(label.toUpperCase(), x, y, { charSpace: 0.2 });
    page.style(9.5, true, INK);
    const detail = alert.kind === "vaccine_overdue" && alert.detail ? ` · rappel dû le ${civilDate(alert.detail)}` : "";
    page.text(`${alert.title}${detail}`, x + labelWidth, y, colWidth - labelWidth - 4);
  });
  if (alerts.length > MAX_ALERTS) {
    page.style(7.5, false, MUTED);
    doc.text(`Et ${alerts.length - MAX_ALERTS} autre(s), voir le dossier complet.`, M + 6, top + height - 2.5);
  }
  return top + height;
}

const STATUS_STYLE: Record<VaccineStatus, { color: string; bg: string; label: (v: HealthCardVaccine) => string }> = {
  overdue: { color: RED, bg: RED_BG, label: (v) => `En retard · ${civilDate(v.nextDueAt)}` },
  due_soon: { color: ORANGE, bg: ORANGE_BG, label: (v) => `À prévoir · ${civilDate(v.nextDueAt)}` },
  up_to_date: { color: GREEN, bg: GREEN_BG, label: (v) => `Rappel · ${civilDate(v.nextDueAt)}` },
  no_reminder: { color: MUTED, bg: GRAY_BG, label: () => "Pas de rappel prévu" },
};

function drawVaccinations(page: Page, card: HealthCard, x: number, top: number): number {
  const { doc } = page;
  const { current, hiddenCurrent, totalInjections } = card.vaccinations;
  const rowH = 10.5;
  const height = current.length ? 15 + current.length * rowH + (hiddenCurrent ? 4 : 0) : 22;
  page.card(x, top, COL, height);
  page.heading("Vaccinations", x + 5, top + 8, GREEN, totalInjections ? `${totalInjections} injection${totalInjections > 1 ? "s" : ""} enregistrée${totalInjections > 1 ? "s" : ""}` : undefined);
  if (!current.length) {
    page.style(8.5, false, MUTED);
    doc.text("Aucune vaccination enregistrée.", x + 5, top + 16);
    return top + height;
  }
  current.forEach((vaccine, index) => {
    const y = top + 16.5 + index * rowH;
    if (index > 0) {
      doc.setDrawColor(RULE);
      doc.setLineWidth(0.2);
      doc.line(x + 5, y - 5, x + COL - 5, y - 5);
    }
    const status = STATUS_STYLE[vaccine.status];
    const pillWidth = page.pill(status.label(vaccine), x + COL - 5, y, status.color, status.bg, true);
    page.style(9.5, true, INK);
    page.text(vaccine.name, x + 5, y, COL - 14 - pillWidth);
    page.style(7.5, false, MUTED);
    doc.text(`Dernière injection le ${civilDate(vaccine.administeredAt)}`, x + 5, y + 4);
  });
  if (hiddenCurrent) {
    page.style(7.5, false, MUTED);
    doc.text(`Et ${hiddenCurrent} autre(s) vaccin(s) dans le dossier.`, x + 5, top + height - 3);
  }
  return top + height;
}

function drawTreatments(page: Page, card: HealthCard, x: number, top: number): number {
  const { doc } = page;
  const { items, hidden } = card.treatments;
  const rowH = 15;
  const height = items.length ? 15 + items.length * rowH + (hidden ? 4 : 0) : 22;
  page.card(x, top, COL, height);
  page.heading("Traitements en cours", x + 5, top + 8, ORANGE);
  if (!items.length) {
    page.style(8.5, false, MUTED);
    doc.text("Aucun traitement en cours.", x + 5, top + 16);
    return top + height;
  }
  items.forEach((item, index) => {
    const y = top + 16.5 + index * rowH;
    if (index > 0) {
      doc.setDrawColor(RULE);
      doc.setLineWidth(0.2);
      doc.line(x + 5, y - 5.2, x + COL - 5, y - 5.2);
    }
    page.style(9.5, true, INK);
    page.text(item.name, x + 5, y, COL - 10);
    page.style(8, false, SOFT);
    page.text([item.dose, item.frequency, item.duration].filter(Boolean).join(" · ") || "Posologie non précisée", x + 5, y + 4.2, COL - 10);
    page.style(7.5, false, MUTED);
    const until = item.until === "long_cours" ? " · au long cours" : item.until ? ` · jusqu’au ${civilDate(item.until)}` : "";
    doc.text(`Depuis le ${civilDate(item.since)}${until}`, x + 5, y + 8.2);
  });
  if (hidden) {
    page.style(7.5, false, MUTED);
    doc.text(`Et ${hidden} autre(s) ligne(s) en cours.`, x + 5, top + height - 3);
  }
  return top + height;
}

function drawWeight(page: Page, card: HealthCard, x: number, top: number): number {
  const { doc } = page;
  const { points, current, previous, deltaKg, total } = card.weight;
  const height = points.length > 1 ? 66 : current ? 30 : 22;
  page.card(x, top, COL, height);
  page.heading("Poids", x + 5, top + 8, WEIGHT, total ? `${total} pesée${total > 1 ? "s" : ""}` : undefined);
  if (!current) {
    page.style(8.5, false, MUTED);
    doc.text("Aucune pesée enregistrée.", x + 5, top + 16);
    return top + height;
  }
  page.style(20, true, INK);
  const value = kgText(current.kg);
  doc.text(value, x + 5, top + 20);
  const valueWidth = doc.getTextWidth(value);
  page.style(10, true, SOFT);
  doc.text("kg", x + 6.5 + valueWidth, top + 20);
  page.style(7.5, false, MUTED);
  const since = previous && deltaKg != null
    ? `${deltaKg === 0 ? "Stable" : `${deltaKg > 0 ? "+" : "−"}${kgText(Math.abs(deltaKg))} kg`} depuis le ${civilDate(previous.date)}`
    : "";
  page.text([`Pesé le ${civilDate(current.date)}`, since].filter(Boolean).join(" · "), x + 5, top + 25, COL - 10);
  if (points.length < 2) return top + height;

  // Courbe : axe vertical au plus près des valeurs, marges de 10 %.
  const cx = x + 13, cy = top + 31, cw = COL - 19, ch = 26;
  const values = points.map((p) => p.kg);
  let min = Math.min(...values), max = Math.max(...values);
  const span = Math.max(max - min, max * 0.04, 0.2);
  min = Math.max(0, min - span * 0.15);
  max = max + span * 0.15;
  const times = points.map((p) => parseClinicalDate(p.date)!.getTime());
  const t0 = times[0], t1 = times.at(-1)!;
  const px = (t: number) => (t1 === t0 ? cx + cw / 2 : cx + ((t - t0) / (t1 - t0)) * cw);
  const py = (kg: number) => cy + ch - ((kg - min) / (max - min)) * ch;

  doc.setDrawColor(RULE);
  doc.setLineWidth(0.2);
  page.style(6.5, false, MUTED);
  for (const kg of [max, (max + min) / 2, min]) {
    doc.line(cx, py(kg), cx + cw, py(kg));
    doc.text(kgText(Math.round(kg * 10) / 10), cx - 1.5, py(kg) + 1, { align: "right" });
  }
  doc.setDrawColor(WEIGHT);
  doc.setLineWidth(0.6);
  doc.setLineJoin("round");
  doc.setLineCap("round");
  for (let index = 1; index < points.length; index += 1)
    doc.line(px(times[index - 1]), py(values[index - 1]), px(times[index]), py(values[index]));
  page.fill(WEIGHT);
  points.forEach((point, index) => doc.circle(px(times[index]), py(point.kg), index === points.length - 1 ? 1.1 : 0.65, "F"));
  page.style(6.5, false, MUTED);
  doc.text(civilDate(points[0].date), cx, cy + ch + 4.5);
  doc.text(civilDate(points.at(-1)!.date), cx + cw, cy + ch + 4.5, { align: "right" });
  return top + height;
}

const EVENT_COLOR: Record<HealthCardEvent["kind"], string> = {
  Chirurgie: RED, Urgence: ORANGE, Hospitalisation: ORANGE, Consultation: MUTED, Contrôle: MUTED,
};

function drawHistory(page: Page, card: HealthCard, x: number, top: number): number {
  const { doc } = page;
  const { events, hidden } = card.history;
  const rowH = 9.5;
  const height = events.length ? 15 + events.length * rowH + (hidden ? 4 : 0) : 22;
  page.card(x, top, COL, height);
  page.heading("Antécédents", x + 5, top + 8, "#0a64c8");
  if (!events.length) {
    page.style(8.5, false, MUTED);
    doc.text("Aucun antécédent enregistré.", x + 5, top + 16);
    return top + height;
  }
  events.forEach((event, index) => {
    const y = top + 16.5 + index * rowH;
    page.style(7.5, false, MUTED);
    doc.text(civilDate(event.date), x + 5, y);
    page.style(6.5, true, EVENT_COLOR[event.kind]);
    doc.text(event.kind.toUpperCase(), x + 5, y + 3.8, { charSpace: 0.15 });
    page.style(9, true, INK);
    page.text(event.title, x + 31, y, COL - 36);
    if (event.detail) {
      page.style(7.5, false, MUTED);
      page.text(event.detail, x + 31, y + 3.8, COL - 36);
    }
  });
  if (hidden) {
    page.style(7.5, false, MUTED);
    doc.text(`Et ${hidden} autre(s) visite(s) dans le dossier.`, x + 5, top + height - 3);
  }
  return top + height;
}

function drawFooter(page: Page, card: HealthCard, clinic: InvoiceSettings) {
  const { doc } = page;
  doc.setDrawColor(RULE);
  doc.setLineWidth(0.3);
  doc.line(M, FOOTER_TOP + 3, W - M, FOOTER_TOP + 3);
  page.style(7, false, MUTED);
  const source = clinic.name ? `du dossier médical tenu par ${clinic.name}` : "du dossier médical";
  page.wrap(
    `Établi le ${civilDate(card.generatedAt)} à partir ${source}. Seules les informations enregistrées figurent sur ce carnet ; il ne remplace pas l’avis de votre vétérinaire.`,
    M, FOOTER_TOP + 8, CW - 22, 2, 3.3
  );
  doc.text("Baitari", W - M, FOOTER_TOP + 8, { align: "right" });
}

export async function buildHealthCardPdf(
  card: HealthCard,
  context: {
    clinic: InvoiceSettings;
    patientId: string;
    requestedBy: string;
    /** Bas du contenu en mm, pour vérifier qu'il tient sur la page. */
    onLayout?: (contentBottom: number) => void;
  }
): Promise<PatientRecordPdf> {
  const fontData = await fonts();
  const doc = new jsPDF({ format: "a4", unit: "mm", compress: true, putOnlyUsedFonts: true });
  for (const [index, weight] of ["normal", "bold"].entries()) {
    const filename = `${FONT}-${weight}.ttf`;
    doc.addFileToVFS(filename, fontData[index]);
    doc.addFont(filename, FONT, weight);
  }
  doc.setProperties({
    title: `Carnet de santé - ${card.identity.name}`,
    subject: "Carnet de santé",
    author: context.clinic.name || "Baitari",
    creator: "Baitari",
  });
  const page = new Page(doc);
  drawHeader(page, card, context.clinic);
  const afterIdentity = drawIdentity(page, card);
  const gridTop = drawAlerts(page, card.alerts, afterIdentity + 2) + 5;
  const leftX = M, rightX = M + COL + GAP;
  const leftBottom = drawTreatments(page, card, leftX, drawVaccinations(page, card, leftX, gridTop) + GAP);
  const rightBottom = drawHistory(page, card, rightX, drawWeight(page, card, rightX, gridTop) + GAP);
  context.onLayout?.(Math.max(leftBottom, rightBottom));
  drawFooter(page, card, context.clinic);

  return {
    bytes: new Uint8Array(doc.output("arraybuffer")),
    pageCount: doc.getNumberOfPages(),
    filename: healthCardFilename(card.identity.name, card.generatedAt),
    patientId: context.patientId,
    patientName: card.identity.name,
    requestedBy: context.requestedBy,
    generatedAt: card.generatedAt,
  };
}
