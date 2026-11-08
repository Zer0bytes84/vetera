import { meaningful } from "../lib/meaningful";
import {
  CalendarBlank,
  FileText,
  ClipboardText,
  PencilSimple,
  Notebook,
  Pill,
  ReceiptText,
  Stethoscope,
  Syringe,
  TrendUp,
} from "@/lib/icons";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  useAppointmentsRepository,
  useConsultationDocumentsRepository,
  useConsultationSoapsRepository,
  useNotesRepository,
  usePrescriptionsRepository,
  useVaccinationsRepository,
  useWeightEntriesRepository,
} from "@/data/repositories";
import { usePatientDocuments } from "@/modules/documents/hooks/use-managed-documents";
import { isTauriRuntime } from "@/services/browser-store";
import {
  collectTimelinePieces,
  piecesByVisit,
  type TimelinePiece,
  type TimelinePieceKind,
} from "../lib/timeline-pieces";
import { APPOINTMENT_STATUS_META } from "@/config/status-meta";
import { cn } from "@/lib/utils";
import {
  OFF_VISIT_KINDS,
  readOffVisitNote,
} from "@/modules/consultations/off-visit-note";
import { isSoapReviewed } from "@/modules/consultations/local-ai/soap-review";
import type {
  Appointment,
  ConsultationSoap,
  Invoice,
  Note,
  Vaccination,
  WeightEntry,
} from "@/types/db";

type TimelineKind =
  "consultation" | "note" | "vaccination" | "weight" | "piece";

type TimelineEntry = {
  id: string;
  at: string;
  kind: TimelineKind;
  label: string;
  context?: string;
  summary: string;
  summaryDetail?: string;
  /** Quiet: the state an event normally ends in, read as plain text; only the others stay a tag. */
  statusBadge?: { label: string; className: string; quiet?: boolean };
  /** A visit that was planned or confirmed and whose time has passed with no other status. */
  overdue?: boolean;
  weightEntry?: WeightEntry;
  /** Prescriptions, invoices and results this event produced. */
  pieces?: TimelinePiece[];
  /** A piece no visit produced stands as its own event. */
  piece?: TimelinePiece;
};

const KIND_ICON: Record<TimelineKind, typeof Stethoscope> = {
  consultation: Stethoscope,
  note: PencilSimple,
  vaccination: Syringe,
  weight: TrendUp,
  piece: FileText,
};

const PIECE_ICON: Record<TimelinePieceKind, typeof FileText> = {
  prescription: Pill,
  invoice: ReceiptText,
  result: ClipboardText,
  document: FileText,
};

interface PatientTimelineProps {
  className?: string;
  onEditWeight?: (entry: WeightEntry) => void;
  onJumpToAppointment?: (appointmentId: string) => void;
  /** Opens a note kept without a visit. */
  onOpenNote?: (noteId: string) => void;
  /** Opens a prescription, an invoice, a result or a document. */
  onOpenPiece?: (piece: TimelinePiece) => void;
  patientId: string;
  /** The visit the Synthèse already shows in full: one line here, without its note. */
  summarizedVisitId?: string;
}

/** Events shown when the record opens, and how many each « Afficher plus » adds. */
export const TIMELINE_PAGE = 3;

const PIECE_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * What a piece shows beside its label. An invoice imported from the old
 * software carries an internal « LEGACY-… » key, never meant to be read: it
 * is named by the date of its event instead.
 */
export function pieceDetail(
  piece: Pick<TimelinePiece, "kind" | "detail">,
  eventAt: string,
) {
  if (piece.kind !== "invoice" || !piece.detail) return piece.detail;
  const [number, ...rest] = piece.detail.split(" · ");
  if (!number.startsWith("LEGACY-")) return piece.detail;
  const date = new Date(eventAt);
  return (
    [Number.isNaN(date.getTime()) ? "" : PIECE_DATE.format(date), ...rest]
      .filter(Boolean)
      .join(" · ") || undefined
  );
}

/** Planned or confirmed, and its end is behind us: the visit is not history yet. */
export function isOverdueVisit(
  apt: Pick<Appointment, "status" | "startTime" | "endTime">,
  now: number,
) {
  if (apt.status !== "scheduled" && apt.status !== "confirmed") return false;
  const end = new Date(apt.endTime || apt.startTime).getTime();
  return !Number.isNaN(end) && end < now;
}

const TYPE_LABEL: Record<Appointment["type"], string> = {
  Consultation: "Consultation",
  Vaccin: "Vaccin",
  Chirurgie: "Chirurgie",
  Urgence: "Urgence",
  Contrôle: "Contrôle",
};

function formatDateParts(iso: string, includeTime: boolean) {
  if (!includeTime) {
    const civilDate = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (civilDate) {
      const [, year, month, day] = civilDate;
      const date = new Date(
        Date.UTC(Number(year), Number(month) - 1, Number(day)),
      );
      return {
        date: date.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
          timeZone: "UTC",
          year: "numeric",
        }),
        time: null,
      };
    }
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { date: "—", time: null };
  }
  return {
    date: date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: includeTime
      ? date.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null,
  };
}

export const NO_REPORT = "Compte rendu non renseigné";

const oneLine = (value?: string | null) => meaningful(value);

/**
 * What the chronology says about a visit: its consultation note first (the
 * assessment, as the Synthèse shows it, then the plan), the visit's own
 * report fields for older visits, and « non renseigné » only when neither
 * exists.
 */
export function consultationSummary(
  apt: Pick<Appointment, "diagnosis" | "treatment" | "notes">,
  soap?: ConsultationSoap | null,
): { summary: string; summaryDetail?: string } {
  const assessment = oneLine(soap?.assessment);
  const plan = oneLine(soap?.plan);
  const subjective = oneLine(soap?.subjective);
  const objective = oneLine(soap?.objective);
  const lead = assessment || subjective || objective || plan;
  if (soap && lead) {
    const detail = [
      plan && plan !== lead ? `Plan · ${plan}` : "",
      isSoapReviewed(soap) ? "" : "Note non validée",
    ]
      .filter(Boolean)
      .join(" · ");
    return { summary: lead, summaryDetail: detail || undefined };
  }
  return {
    summary:
      apt.diagnosis?.trim() ||
      apt.treatment?.trim() ||
      apt.notes?.trim() ||
      NO_REPORT,
    summaryDetail:
      apt.diagnosis?.trim() && apt.treatment?.trim()
        ? `Traitement · ${apt.treatment.trim()}`
        : apt.diagnosis?.trim() && apt.notes?.trim()
          ? apt.notes.trim()
          : undefined,
  };
}

function buildEntries(
  appointments: Appointment[],
  vaccinations: Vaccination[],
  weights: WeightEntry[],
  notes: Note[] = [],
  getSoap: (appointmentId: string) => ConsultationSoap | null = () => null,
  pieces: TimelinePiece[] = [],
  now = Date.now(),
): TimelineEntry[] {
  const items: TimelineEntry[] = [];
  const { attached, loose } = piecesByVisit(
    pieces,
    new Set(appointments.map((apt) => apt.id)),
  );

  // Notes kept without a visit: dated by their validation, never a consultation.
  for (const note of notes) {
    const meta = readOffVisitNote(note);
    if (!meta) continue;
    items.push({
      id: `note-${note.id}`,
      at: note.createdAt,
      kind: "note",
      label: "Note hors visite",
      context: OFF_VISIT_KINDS[meta.kind],
      summary:
        meaningful(meta.soap.assessment) ||
        meaningful(meta.soap.subjective) ||
        meaningful(meta.soap.plan) ||
        meaningful(meta.soap.objective),
      summaryDetail:
        meaningful(meta.soap.plan) &&
        meaningful(meta.soap.plan) !== meaningful(meta.soap.assessment)
          ? `Plan · ${meaningful(meta.soap.plan)}`
          : undefined,
      statusBadge: {
        label: "Validée",
        className:
          "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        quiet: true,
      },
    });
  }

  for (const apt of appointments) {
    const status = APPOINTMENT_STATUS_META[apt.status];
    const overdue = isOverdueVisit(apt, now);
    // A visit that did not take place has no report to miss.
    const held = apt.status === "completed" || apt.status === "in_progress";
    const summary = consultationSummary(apt, getSoap(apt.id));
    items.push({
      id: `apt-${apt.id}`,
      at: apt.startTime,
      kind: "consultation",
      label: TYPE_LABEL[apt.type],
      context: meaningful(apt.reason) || undefined,
      ...(held || summary.summary !== NO_REPORT ? summary : { summary: "" }),
      statusBadge: overdue
        ? {
            label: `${status.label} · date passée`,
            className: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
          }
        : {
            label: status.label,
            className: status.className,
            quiet: apt.status === "completed",
          },
      overdue,
      pieces: attached.get(apt.id),
    });
  }

  for (const piece of loose) {
    items.push({
      id: `piece-${piece.id}`,
      at: piece.at,
      kind: "piece",
      label: piece.label,
      summary: pieceDetail(piece, piece.at) ?? "",
      piece,
    });
  }

  for (const vacc of vaccinations) {
    items.push({
      id: `vacc-${vacc.id}`,
      at: vacc.administeredAt,
      kind: "vaccination",
      label: "Vaccination",
      context: vacc.vaccineType,
      summary: vacc.vaccineName,
      summaryDetail: vacc.notes,
      statusBadge: {
        label: "Administré",
        className:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
        quiet: true,
      },
    });
  }

  for (const w of weights) {
    items.push({
      id: `w-${w.id}`,
      at: w.measuredAt,
      kind: "weight",
      label: "Pesée",
      context: w.bcs == null ? undefined : `Score corporel ${w.bcs}/9`,
      summary: `${w.weightKg.toFixed(2)} kg`,
      summaryDetail: w.notes,
      statusBadge: {
        label: "Enregistrée",
        className:
          "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        quiet: true,
      },
      weightEntry: w,
    });
  }

  return items.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

const MONTH_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

function monthLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  const label = MONTH_FORMAT.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Invoices are kept in SQLite only; the browser demo has none. */
function usePatientInvoices(patientId: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  useEffect(() => {
    if (!isTauriRuntime()) return;
    let cancelled = false;
    void import("@/services/billingService")
      .then(({ listInvoices }) => listInvoices())
      .then((rows) => {
        if (!cancelled)
          setInvoices(
            rows.filter((invoice) => invoice.patientId === patientId),
          );
      })
      .catch(() => {
        // A missing invoice list leaves the visits themselves readable.
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);
  return invoices;
}

function PieceChip({
  eventAt,
  piece,
  onOpen,
}: {
  eventAt: string;
  piece: TimelinePiece;
  onOpen?: (piece: TimelinePiece) => void;
}) {
  const Icon = PIECE_ICON[piece.kind];
  const detail = pieceDetail(piece, eventAt);
  const content = (
    <>
      <Icon className="size-3.5 shrink-0" weight="duotone" aria-hidden="true" />
      <span className="font-medium">{piece.label}</span>
      {detail ? (
        <span className="truncate text-muted-foreground">{detail}</span>
      ) : null}
    </>
  );
  return onOpen ? (
    <button
      className="patient-timeline-piece"
      onClick={() => onOpen(piece)}
      type="button"
    >
      {content}
    </button>
  ) : (
    <span className="patient-timeline-piece">{content}</span>
  );
}

export function PatientTimeline({
  className,
  onEditWeight,
  onJumpToAppointment,
  onOpenNote,
  onOpenPiece,
  patientId,
  summarizedVisitId,
}: PatientTimelineProps) {
  const { t } = useTranslation();
  const appointmentsRepo = useAppointmentsRepository();
  const vaccinationsRepo = useVaccinationsRepository();
  const weightsRepo = useWeightEntriesRepository();
  const notesRepo = useNotesRepository();
  // The same source as the Synthèse tab: the visit's consultation note.
  const soapsRepo = useConsultationSoapsRepository();
  const prescriptionsRepo = usePrescriptionsRepository();
  const attachmentsRepo = useConsultationDocumentsRepository();
  const { documents } = usePatientDocuments(patientId);
  const invoices = usePatientInvoices(patientId);

  const pieces = useMemo(
    () =>
      collectTimelinePieces({
        attachments: attachmentsRepo.data.filter(
          (doc) => doc.patientId === patientId,
        ),
        documents,
        invoices,
        prescriptions: prescriptionsRepo.data.filter(
          (rx) => rx.patientId === patientId,
        ),
      }),
    [
      attachmentsRepo.data,
      documents,
      invoices,
      prescriptionsRepo.data,
      patientId,
    ],
  );

  const entries = useMemo(
    () =>
      buildEntries(
        appointmentsRepo.data.filter((apt) => apt.patientId === patientId),
        vaccinationsRepo.forPatient(patientId),
        weightsRepo.forPatient(patientId),
        notesRepo.data.filter((note) => note.patientId === patientId),
        soapsRepo.forAppointment,
        pieces,
      ),
    [
      appointmentsRepo.data,
      vaccinationsRepo,
      weightsRepo,
      notesRepo.data,
      soapsRepo.forAppointment,
      patientId,
      pieces,
    ],
  );

  // A few events first; « Afficher plus » adds the next ones. The count
  // starts over when another patient's record opens.
  const [shown, setShown] = useState({ patientId, count: TIMELINE_PAGE });
  const shownCount =
    shown.patientId === patientId ? shown.count : TIMELINE_PAGE;
  const visible = entries.slice(0, shownCount);
  const remaining = entries.length - visible.length;

  const months: { label: string; entries: TimelineEntry[] }[] = [];
  for (const entry of visible) {
    const label = monthLabel(entry.at);
    const current = months.at(-1);
    if (current?.label === label) current.entries.push(entry);
    else months.push({ label, entries: [entry] });
  }

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      {entries.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <CalendarBlank
                className="size-7 text-muted-foreground"
                weight="duotone"
              />
            </EmptyMedia>
            <EmptyTitle>{t("patientDetail.timeline.empty")}</EmptyTitle>
            <EmptyDescription>
              {t("patientDetail.timeline.subtitle")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div
          className="patient-timeline"
          role="region"
          aria-label="Chronologie du patient"
        >
          {months.map((month) => (
            <section className="patient-timeline-month" key={month.label}>
              <h3 className="patient-timeline-month-label">{month.label}</h3>
              <ol className="patient-timeline-list">
                {month.entries.map((entry) => {
                  const Icon = entry.piece
                    ? PIECE_ICON[entry.piece.kind]
                    : KIND_ICON[entry.kind];
                  const dateParts = formatDateParts(
                    entry.at,
                    entry.kind === "consultation" || entry.kind === "note",
                  );
                  // The visit the Synthèse shows in full: its note is not repeated here.
                  const compact = entry.id === `apt-${summarizedVisitId}`;
                  const noReport = entry.summary === NO_REPORT;
                  return (
                    <li
                      className="patient-timeline-event"
                      key={entry.id}
                      data-kind={entry.kind}
                      data-piece={entry.piece?.kind}
                      data-compact={compact || undefined}
                      data-overdue={entry.overdue || undefined}
                    >
                      <time className="patient-timeline-date" dateTime={entry.at}>
                        {dateParts.date}
                        {dateParts.time ? ` · ${dateParts.time}` : ""}
                      </time>
                      <div className="patient-timeline-kind">
                        <span className="patient-timeline-marker" aria-hidden="true">
                          <Icon className="size-3.5" />
                        </span>
                        <span className="patient-timeline-title">{entry.label}</span>
                      </div>
                      <div className="patient-timeline-body">
                        {entry.context || entry.kind === "consultation" ? (
                          <p className="patient-timeline-context">
                            {entry.kind === "consultation" ? (
                              <span>Motif · </span>
                            ) : null}
                            {entry.context || "Non renseigné"}
                          </p>
                        ) : null}
                        {!entry.context && !entry.summary && !entry.summaryDetail && entry.kind !== "consultation" ? (
                          <p className="patient-timeline-note">Aucun détail renseigné</p>
                        ) : null}
                        {compact ? null : noReport ? (
                          <p className="patient-timeline-note">{NO_REPORT}</p>
                        ) : (
                          <>
                            {entry.summary ? (
                              <p className="patient-timeline-summary">
                                {entry.summary}
                              </p>
                            ) : null}
                            {entry.summaryDetail ? (
                              <p className="patient-timeline-detail">
                                {entry.summaryDetail}
                              </p>
                            ) : null}
                          </>
                        )}
                      </div>
                      <div className="patient-timeline-side">
                        {entry.pieces?.length ? (
                          <ul
                            className="patient-timeline-pieces"
                            aria-label="Pièces de cet événement"
                          >
                            {entry.pieces.map((piece) => (
                              <li key={piece.id}>
                                <PieceChip
                                  eventAt={entry.at}
                                  onOpen={onOpenPiece}
                                  piece={piece}
                                />
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {entry.statusBadge?.quiet ? (
                          <span className="patient-timeline-state">
                            {entry.statusBadge.label}
                          </span>
                        ) : entry.statusBadge ? (
                          <Badge
                            className={cn(
                              "rounded-full px-2 py-0.5 font-medium t-12",
                              entry.statusBadge.className,
                            )}
                            variant="secondary"
                          >
                            {entry.statusBadge.label}
                          </Badge>
                        ) : null}
                        <span className="patient-timeline-action">
                          {entry.kind === "consultation" &&
                          onJumpToAppointment ? (
                            <Button
                              className="h-7 gap-1 rounded-full px-3 text-xs"
                              onClick={() =>
                                onJumpToAppointment(
                                  entry.id.replace(/^apt-/, ""),
                                )
                              }
                              size="sm"
                              variant="outline"
                            >
                              Note clinique
                              <Notebook className="size-3.5" weight="duotone" />
                            </Button>
                          ) : entry.kind === "note" && onOpenNote ? (
                            <Button
                              className="h-7 gap-1 rounded-full px-3 text-xs"
                              onClick={() =>
                                onOpenNote(entry.id.replace(/^note-/, ""))
                              }
                              size="sm"
                              variant="outline"
                            >
                              Lire la note
                              <PencilSimple
                                className="size-3.5"
                                weight="duotone"
                              />
                            </Button>
                          ) : entry.kind === "weight" &&
                            entry.weightEntry &&
                            onEditWeight ? (
                            <Button
                              className="h-7 rounded-full px-3 text-xs"
                              onClick={() => onEditWeight(entry.weightEntry!)}
                              size="sm"
                              variant="outline"
                            >
                              Modifier
                            </Button>
                          ) : entry.piece && onOpenPiece ? (
                            <Button
                              className="h-7 rounded-full px-3 text-xs"
                              onClick={() => onOpenPiece(entry.piece!)}
                              size="sm"
                              variant="outline"
                            >
                              Ouvrir
                            </Button>
                          ) : null}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {remaining > 0 ? (
            <div className="patient-timeline-more">
              <Button
                onClick={() =>
                  setShown({ patientId, count: shownCount + TIMELINE_PAGE })
                }
                size="sm"
                variant="outline"
              >
                Afficher plus
              </Button>
              <span>
                {visible.length} sur {entries.length} événements
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
