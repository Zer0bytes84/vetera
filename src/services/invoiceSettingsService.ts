import { APP_NAME } from "@/lib/brand";
import { getSetting, setSettings } from "./appSettingsService";

export const INVOICE_ACCENTS = {
  graphite: { label: "Graphite", color: "#27272a" },
  forest: { label: "Forêt", color: "#285c4a" },
  blue: { label: "Bleu", color: "#245a87" },
} as const;

export interface InvoiceSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  registrationNumber: string;
  logoDataUrl: string;
  footer: string;
  accent: keyof typeof INVOICE_ACCENTS;
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  name: "", address: "", phone: "", email: "", registrationNumber: "",
  logoDataUrl: "", footer: "Merci pour votre confiance.", accent: "graphite",
};
const KEY = "invoice_settings_v1";

export function normalizeInvoiceSettings(value: Partial<InvoiceSettings>): InvoiceSettings {
  const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
  return {
    name: text(value.name, 120), address: text(value.address, 400),
    phone: text(value.phone, 80), email: text(value.email, 160),
    registrationNumber: text(value.registrationNumber, 160),
    logoDataUrl: typeof value.logoDataUrl === "string" && value.logoDataUrl.length <= 1_500_000 && /^data:image\/(png|jpeg);base64,[a-z0-9+/=]+$/i.test(value.logoDataUrl) ? value.logoDataUrl : "",
    footer: text(value.footer, 400),
    accent: value.accent && Object.hasOwn(INVOICE_ACCENTS, value.accent) ? value.accent : "graphite",
  };
}

export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  const stored = await getSetting(KEY);
  const name = (await getSetting("clinic_name")) || (await getSetting("cabinet_name")) || (await getSetting("practice_name")) || APP_NAME;
  if (!stored) return { ...DEFAULT_INVOICE_SETTINGS, name };
  const parsed = JSON.parse(stored);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Les réglages de facture sont illisibles.");
  return { ...normalizeInvoiceSettings(parsed), name: normalizeInvoiceSettings(parsed).name || name };
}

export async function saveInvoiceSettings(settings: InvoiceSettings): Promise<void> {
  const value = normalizeInvoiceSettings(settings);
  if (!value.name) throw new Error("Indiquez le nom du cabinet.");
  await setSettings({ [KEY]: JSON.stringify(value), clinic_name: value.name, cabinet_name: value.name, practice_name: value.name });
}

/** Store a small, local raster logo; preserve the uploaded image's proportions. */
export async function prepareInvoiceLogo(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Choisissez une image PNG, JPEG ou WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Le logo doit peser moins de 5 Mo.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const ratio = Math.min(1, 600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Impossible de préparer cette image.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/png");
    if (result.length > 1_500_000) throw new Error("Cette image est trop complexe. Choisissez un logo plus léger.");
    return result;
  } finally { URL.revokeObjectURL(url); }
}
