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
import { OFF_VISIT_KINDS, readOffVisitNote } from "@/modules/consultations/off-visit-note";
import { isSoapReviewed } from "@/modules/consultations/local-ai/soap-review";
import type { Appointment, ConsultationSoap, Invoice, Note, Vaccination, WeightEntry } from "@/types/db";

type TimelineKind = "consultation" | "note" | "vaccination" | "weight" | "piece";

type TimelineEntry = {
  id: string;
  at: string;
  kind: TimelineKind;
  label: string;
  context?: string;
  summary: string;
  summaryDetail?: string;
  statusBadge?: { label: string; className: string };
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

const KIND_COLOR: Record<TimelineKind, string> = {
  consultation:
    "bg-sky-50 text-sky-700 border border-sky-200/80 shadow-xs dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/40",
  note:
    "bg-amber-50 text-amber-700 border border-amber-200/80 shadow-xs dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40",
  vaccination:
    "bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40",
  weight:
    "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40",
  piece:
    "bg-zinc-50 text-zinc-700 border border-zinc-200/80 shadow-xs dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700/60",
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
        Date.UTC(Number(year), Number(month) - 1, Number(day))
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

const oneLine = (value?: string | null) => value?.replace(/\s+/g, " ").trim() || "";

/**
 * What the chronology says about a visit: its consultation note first (the
 * assessment, as the Synthèse shows it, then the plan), the visit's own
 * report fields for older visits, and « non renseigné » only when neither
 * exists.
 */
export function consultationSummary(
  apt: Pick<Appointment, "diagnosis" | "treatment" | "notes">,
  soap?: ConsultationSoap | null
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
    ].filter(Boolean).join(" · ");
    return { summary: lead, summaryDetail: detail || undefined };
  }
  return {
    summary: apt.diagnosis?.trim() || apt.treatment?.trim() || apt.notes?.trim() || NO_REPORT,
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
  pieces: TimelinePiece[] = []
): TimelineEntry[] {
  const items: TimelineEntry[] = [];
  const { attached, loose } = piecesByVisit(
    pieces,
    new Set(appointments.map((apt) => apt.id))
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
        meta.soap.assessment.trim() ||
        meta.soap.subjective.trim() ||
        meta.soap.plan.trim() ||
        meta.soap.objective.trim(),
      summaryDetail: meta.soap.plan.trim() && meta.soap.plan.trim() !== meta.soap.assessment.trim() ? `Plan · ${meta.soap.plan.trim()}` : undefined,
      statusBadge: {
        label: "Validée",
        className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
      },
    });
  }

  for (const apt of appointments) {
    const status = APPOINTMENT_STATUS_META[apt.status];
    items.push({
      id: `apt-${apt.id}`,
      at: apt.startTime,
      kind: "consultation",
      label: TYPE_LABEL[apt.type],
      context: apt.reason?.trim() || undefined,
      ...consultationSummary(apt, getSoap(apt.id)),
      statusBadge: { label: status.label, className: status.className },
      pieces: attached.get(apt.id),
    });
  }

  for (const piece of loose) {
    items.push({
      id: `piece-${piece.id}`,
      at: piece.at,
      kind: "piece",
      label: piece.label,
      summary: piece.detail ?? "",
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
      },
      weightEntry: w,
    });
  }

  return items.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
}

const MONTH_FORMAT = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

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
        if (!cancelled) setInvoices(rows.filter((invoice) => invoice.patientId === patientId));
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
  piece,
  onOpen,
}: {
  piece: TimelinePiece;
  onOpen?: (piece: TimelinePiece) => void;
}) {
  const Icon = PIECE_ICON[piece.kind];
  const content = (
    <>
      <Icon className="size-3.5 shrink-0" weight="duotone" aria-hidden="true" />
      <span className="font-medium">{piece.label}</span>
      {piece.detail ? (
        <span className="truncate text-muted-foreground">{piece.detail}</span>
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
        attachments: attachmentsRepo.data.filter((doc) => doc.patientId === patientId),
        documents,
        invoices,
        prescriptions: prescriptionsRepo.data.filter((rx) => rx.patientId === patientId),
      }),
    [attachmentsRepo.data, documents, invoices, prescriptionsRepo.data, patientId]
  );

  const entries = useMemo(
    () =>
      buildEntries(
        appointmentsRepo.data.filter((apt) => apt.patientId === patientId),
        vaccinationsRepo.forPatient(patientId),
        weightsRepo.forPatient(patientId),
        notesRepo.data.filter((note) => note.patientId === patientId),
        soapsRepo.forAppointment,
        pieces
      ),
    [appointmentsRepo.data, vaccinationsRepo, weightsRepo, notesRepo.data, soapsRepo.forAppointment, patientId, pieces]
  );

  const months = useMemo(() => {
    const groups: { label: string; entries: TimelineEntry[] }[] = [];
    for (const entry of entries) {
      const label = monthLabel(entry.at);
      const current = groups.at(-1);
      if (current?.label === label) current.entries.push(entry);
      else groups.push({ label, entries: [entry] });
    }
    return groups;
  }, [entries]);

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
                  const Icon = entry.piece ? PIECE_ICON[entry.piece.kind] : KIND_ICON[entry.kind];
                  const dateParts = formatDateParts(
                    entry.at,
                    entry.kind === "consultation" || entry.kind === "note"
                  );
                  const muted = entry.summary === NO_REPORT;
                  return (
                    <li className="patient-timeline-event" key={entry.id} data-kind={entry.kind}>
                      <span
                        className={cn(
                          "patient-timeline-marker patient-timeline-kind-icon",
                          KIND_COLOR[entry.kind]
                        )}
                        aria-hidden="true"
                      >
                        <Icon className="size-4" weight="duotone" />
                      </span>
                      <div className="patient-timeline-body">
                        <div className="patient-timeline-head">
                          <time className="patient-timeline-date" dateTime={entry.at}>
                            {dateParts.date}
                            {dateParts.time ? ` · ${dateParts.time}` : ""}
                          </time>
                          <span className="patient-timeline-title">{entry.label}</span>
                          {entry.context ? (
                            <span className="patient-timeline-context">{entry.context}</span>
                          ) : null}
                          {entry.statusBadge ? (
                            <Badge
                              className={cn(
                                "rounded-full px-2 py-0.5 font-medium t-12",
                                entry.statusBadge.className
                              )}
                              variant="secondary"
                            >
                              {entry.statusBadge.label}
                            </Badge>
                          ) : null}
                          <span className="patient-timeline-action">
                            {entry.kind === "consultation" && onJumpToAppointment ? (
                              <Button
                                className="h-7 gap-1 rounded-lg px-2 text-xs"
                                onClick={() => onJumpToAppointment(entry.id.replace(/^apt-/, ""))}
                                size="sm"
                                variant="ghost"
                              >
                                Note clinique
                                <Notebook className="size-3.5" weight="duotone" />
                              </Button>
                            ) : entry.kind === "note" && onOpenNote ? (
                              <Button
                                className="h-7 gap-1 rounded-lg px-2 text-xs"
                                onClick={() => onOpenNote(entry.id.replace(/^note-/, ""))}
                                size="sm"
                                variant="ghost"
                              >
                                Lire la note
                                <PencilSimple className="size-3.5" weight="duotone" />
                              </Button>
                            ) : entry.kind === "weight" && entry.weightEntry && onEditWeight ? (
                              <Button
                                className="h-7 rounded-lg px-2 text-xs"
                                onClick={() => onEditWeight(entry.weightEntry!)}
                                size="sm"
                                variant="ghost"
                              >
                                Modifier
                              </Button>
                            ) : entry.piece && onOpenPiece ? (
                              <Button
                                className="h-7 rounded-lg px-2 text-xs"
                                onClick={() => onOpenPiece(entry.piece!)}
                                size="sm"
                                variant="ghost"
                              >
                                Ouvrir
                              </Button>
                            ) : null}
                          </span>
                        </div>
                        {entry.summary ? (
                          <p
                            className={cn(
                              "patient-timeline-summary",
                              muted ? "text-muted-foreground" : "text-foreground/85"
                            )}
                          >
                            {entry.summary}
                          </p>
                        ) : null}
                        {entry.summaryDetail ? (
                          <p className="patient-timeline-detail">{entry.summaryDetail}</p>
                        ) : null}
                        {entry.pieces?.length ? (
                          <ul className="patient-timeline-pieces" aria-label="Pièces de cet événement">
                            {entry.pieces.map((piece) => (
                              <li key={piece.id}>
                                <PieceChip onOpen={onOpenPiece} piece={piece} />
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
