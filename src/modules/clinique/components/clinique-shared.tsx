import {
  Add01Icon,
  AttachmentIcon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Delete01Icon,
  Dollar01Icon,
  File01Icon,
  HourglassIcon,
  Mail01Icon,
  NoteIcon,
  PrinterIcon,
  StethoscopeIcon,
  TimerIcon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Hospital, Pill, Syringe } from "@/lib/icons";
import { jsPDF } from "jspdf";
import React, { useEffect, useEffectEvent, useRef, useState } from "react";

import { toast } from "sonner";

import { FormDialogHeader } from "@/components/ui/form-dialog";
import { ModalBanner } from "@/components/ui/modal-banner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Textarea } from "@/components/ui/textarea";
import {
  CLINIQUE_STATUS_META,
  PATIENT_STATUS_META,
  getAppointmentTypeMeta,
} from "@/config/status-meta";

import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

import type { View } from "@/types";
import type {
  Appointment,
  ConsultationDocument,
  Owner,
  Patient,
} from "@/types/db";

export type CliniqueProps = {
  onNavigate?: (view: View) => void;
};

export type BillingItem = {
  desc: string;
  amount: number;
};

export type SaveDraftOptions = {
  silent?: boolean;
};

export type ListTab = "all" | "scheduled" | "in_progress" | "completed";

export type DetailTab = "overview" | "history";

export type ConsultationDraftPayload = {
  appointmentPatch: Partial<Appointment>;
  patientPatch: Partial<Patient>;
};

export const MAX_DOCUMENT_SIZE_BYTES = 12 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const LIST_TABS: Array<{
  value: ListTab;
  label: string;
  icon: typeof StethoscopeIcon;
}> = [
  { value: "all", label: "Planning", icon: Calendar01Icon },
  { value: "scheduled", label: "À venir", icon: HourglassIcon },
  { value: "in_progress", label: "En cours", icon: TimerIcon },
  { value: "completed", label: "Terminés", icon: CheckmarkCircle01Icon },
];

export function normalizeDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getDocumentCategory(
  mimeType: string
): ConsultationDocument["category"] {
  if (mimeType === "application/pdf") {
    return "pdf";
  }
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  return "other";
}

export function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  const power = Math.min(
    Math.floor(Math.log(sizeBytes) / Math.log(1024)),
    units.length - 1
  );
  const value = sizeBytes / 1024 ** power;
  const rounded = value >= 10 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded} ${units[power]}`;
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Lecture du fichier impossible."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

export function isToday(date: Date) {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function formatTime(value?: string | Date | null) {
  const date = normalizeDate(value);
  if (!date) {
    return "--:--";
  }
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateLabel(value?: string | Date | null) {
  const date = normalizeDate(value);
  if (!date) {
    return "Date indisponible";
  }
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(value?: string | Date | null) {
  const date = normalizeDate(value);
  if (!date) {
    return "Date indisponible";
  }
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatElapsedDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export { getSpeciesGlyph as getSpeciesIcon } from "@/lib/species-icons";

export function getPatientAge(dateOfBirth?: string) {
  const birthday = normalizeDate(dateOfBirth);
  if (!birthday) {
    return "Âge non renseigné";
  }

  const today = new Date();
  let years = today.getFullYear() - birthday.getFullYear();
  const monthDelta = today.getMonth() - birthday.getMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < birthday.getDate())
  ) {
    years -= 1;
  }

  if (years <= 0) {
    return "Moins d'un an";
  }
  return `${years} an${years > 1 ? "s" : ""}`;
}

export function formatOwnerName(owner?: Owner) {
  if (!owner) {
    return "Propriétaire non lié";
  }
  return (
    `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
    "Propriétaire non lié"
  );
}

export function getPatientStatusMeta(status?: Patient["status"]) {
  return PATIENT_STATUS_META[status || "sante"];
}

export function AppointmentTypeBadge({
  type,
  className,
}: {
  type: Appointment["type"];
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        "border-transparent",
        getAppointmentTypeMeta(type).badgeClassName,
        className
      )}
      variant="outline"
    >
      {type}
    </Badge>
  );
}

export function AppointmentStatusBadge({
  status,
  className,
}: {
  status: Appointment["status"];
  className?: string;
}) {
  const meta = CLINIQUE_STATUS_META[status];

  return (
    <Badge
      className={cn("border-transparent", meta.className, className)}
      variant="outline"
    >
      {meta.label}
    </Badge>
  );
}

export const generatePrescriptionPDF = (data: {
  patientName: string;
  ownerName?: string;
  species?: string;
  breed?: string;
  treatment?: string;
  diagnosis?: string;
}) => {
  const doc = new jsPDF();
  const primaryColor = "#10B981";
  const grayColor = "#52525B";

  doc.setFontSize(22);
  doc.setTextColor(primaryColor);
  doc.text(APP_NAME, 20, 20);

  doc.setFontSize(10);
  doc.setTextColor(grayColor);
  doc.text("Clinique vétérinaire", 20, 26);
  doc.text("Prescription interne", 20, 31);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 45, 190, 45);

  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("ORDONNANCE VÉTÉRINAIRE", 105, 60, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(grayColor);
  doc.text(`Date: ${new Date().toLocaleDateString("fr-FR")}`, 190, 50, {
    align: "right",
  });

  let y = 80;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Patient :", 20, y);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(grayColor);
  y += 8;
  doc.text(`Nom : ${data.patientName}`, 25, y);
  if (data.species) {
    y += 6;
    doc.text(`Espèce : ${data.species}`, 25, y);
  }
  if (data.breed) {
    y += 6;
    doc.text(`Race : ${data.breed}`, 25, y);
  }
  if (data.ownerName) {
    y += 6;
    doc.text(`Propriétaire : ${data.ownerName}`, 25, y);
  }

  if (data.diagnosis) {
    y += 15;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Diagnostic :", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grayColor);
    const diagnosisLines = doc.splitTextToSize(data.diagnosis, 170);
    doc.text(diagnosisLines, 25, y);
    y += diagnosisLines.length * 6;
  }

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Traitement prescrit :", 20, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(grayColor);

  if (data.treatment) {
    const treatmentLines = doc.splitTextToSize(data.treatment, 170);
    doc.text(treatmentLines, 25, y);
  } else {
    doc.text("(À compléter)", 25, y);
  }

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`${APP_NAME} · Prescription clinique`, 105, 270, {
    align: "center",
  });
  doc.text("Valable 3 mois à compter de la date d'émission.", 105, 280, {
    align: "center",
  });

  doc.save(
    `Ordonnance-${data.patientName}-${new Date().toISOString().split("T")[0]}.pdf`
  );
};

export function ConsultationSessionDialog({
  appointment,
  patient,
  owner,
  patientName,
  documents,
  historyAppointments,
  onClose,
  onOpenSoap,
  onOpenPrescription,
  onOpenHospitalization,
  onOpenAnesthesia,
  onSaveDraft,
  onComplete,
  onUploadDocument,
  onDeleteDocument,
}: {
  appointment: Appointment;
  patient: Patient;
  owner?: Owner;
  patientName: string;
  documents: ConsultationDocument[];
  historyAppointments: Appointment[];
  onClose: () => void;
  onOpenSoap?: () => void;
  onOpenPrescription?: () => void;
  onOpenHospitalization?: () => void;
  onOpenAnesthesia?: () => void;
  onSaveDraft: (
    payload: ConsultationDraftPayload,
    options?: SaveDraftOptions
  ) => Promise<void>;
  onComplete: (payload: ConsultationDraftPayload) => Promise<void>;
  onUploadDocument: (file: File, description?: string) => Promise<void>;
  onDeleteDocument: (documentId: string) => Promise<void>;
}) {
  const [patientNameValue, setPatientNameValue] = useState(patient.name);
  const [patientSpecies, setPatientSpecies] = useState(
    patient.species || "Chien"
  );
  const [patientBreed, setPatientBreed] = useState(patient.breed || "");
  const [patientSex, setPatientSex] = useState<Patient["sex"]>(
    patient.sex || "M"
  );
  const [patientStatus, setPatientStatus] = useState<Patient["status"]>(
    patient.status || "sante"
  );
  const [allergies, setAllergies] = useState(patient.allergies || "");
  const [chronicConditions, setChronicConditions] = useState(
    patient.chronicConditions || ""
  );
  const [generalNotes, setGeneralNotes] = useState(patient.generalNotes || "");
  const [reason, setReason] = useState(appointment.reason || "");
  const [diagnosis, setDiagnosis] = useState(appointment.diagnosis || "");
  const [treatment, setTreatment] = useState(appointment.treatment || "");
  const [consultationNotes, setConsultationNotes] = useState(
    appointment.notes || ""
  );
  const [documentDescription, setDocumentDescription] = useState("");
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const autosaveReadyRef = useRef(false);
  const saveDraftRef = useRef(onSaveDraft);
  const [startedAt, setStartedAt] = useState(() => {
    if (typeof window === "undefined") {
      return new Date().toISOString();
    }
    const key = `vetera:consultation-start:${appointment.id}`;
    const existing = window.sessionStorage.getItem(key);
    if (existing) {
      return existing;
    }
    const fallback = new Date().toISOString();
    window.sessionStorage.setItem(key, fallback);
    return fallback;
  });
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    setPatientNameValue(patient.name);
    setPatientSpecies(patient.species || "Chien");
    setPatientBreed(patient.breed || "");
    setPatientSex(patient.sex || "M");
    setPatientStatus(patient.status || "sante");
    setAllergies(patient.allergies || "");
    setChronicConditions(patient.chronicConditions || "");
    setGeneralNotes(patient.generalNotes || "");
    setReason(appointment.reason || "");
    setDiagnosis(appointment.diagnosis || "");
    setTreatment(appointment.treatment || "");
    setConsultationNotes(appointment.notes || "");
    setAutosaveStatus("idle");
    autosaveReadyRef.current = false;
  }, [appointment, patient]);

  useEffect(() => {
    saveDraftRef.current = onSaveDraft;
  }, [onSaveDraft]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const key = `vetera:consultation-start:${appointment.id}`;
    const existing = window.sessionStorage.getItem(key);
    if (existing) {
      setStartedAt(existing);
      return;
    }
    const now = new Date().toISOString();
    window.sessionStorage.setItem(key, now);
    setStartedAt(now);
  }, [appointment.id]);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    if (Number.isNaN(start)) {
      return;
    }

    const updateElapsed = () => {
      setElapsedMs(Date.now() - start);
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const buildPayload = (): ConsultationDraftPayload => ({
    appointmentPatch: {
      status: "in_progress",
      reason: reason.trim(),
      diagnosis: diagnosis.trim(),
      treatment: treatment.trim(),
      notes: consultationNotes.trim(),
    },
    patientPatch: {
      name: patientNameValue.trim() || patient.name,
      species: patientSpecies,
      breed: patientBreed.trim(),
      sex: patientSex,
      status: patientStatus,
      allergies: allergies.trim(),
      chronicConditions: chronicConditions.trim(),
      generalNotes: generalNotes.trim(),
    },
  });

  const autosaveKey = [
    patientNameValue,
    patientSpecies,
    patientBreed,
    patientSex,
    patientStatus,
    allergies,
    chronicConditions,
    generalNotes,
    reason,
    diagnosis,
    treatment,
    consultationNotes,
  ].join("\u001f");

  const getAutosavePayload = useEffectEvent(() => buildPayload());

  useEffect(() => {
    if (!autosaveReadyRef.current) {
      autosaveReadyRef.current = true;
      return;
    }

    if (isCompleting) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setAutosaveStatus("saving");
        await saveDraftRef.current(getAutosavePayload(), { silent: true });
        setLastAutoSavedAt(new Date());
        setAutosaveStatus("saved");
      } catch (error) {
        console.error(error);
        setAutosaveStatus("error");
      }
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [autosaveKey, isCompleting]);

  const triggerDocumentPicker = () => {
    uploadInputRef.current?.click();
  };

  const handleDocumentSelection = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      toast.error(
        "Le fichier dépasse 12 Mo. Réduisez sa taille puis réessayez."
      );
      return;
    }

    if (!ALLOWED_DOCUMENT_MIME.has(file.type)) {
      toast.error("Format non pris en charge. Utilisez PDF, JPG, PNG ou WebP.");
      return;
    }

    try {
      setIsUploadingDocument(true);
      await onUploadDocument(file, documentDescription.trim());
      setDocumentDescription("");
      toast.success("Document ajouté à la consultation.");
    } catch (error) {
      console.error(error);
      toast.error("Impossible d'ajouter ce document.");
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleSaveDraftClick = async () => {
    if (isSavingDraft || isCompleting) {
      return;
    }
    try {
      setIsSavingDraft(true);
      await onSaveDraft(buildPayload());
      setLastAutoSavedAt(new Date());
      setAutosaveStatus("saved");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleCompleteClick = async () => {
    if (isSavingDraft || isCompleting) {
      return;
    }
    try {
      setIsCompleting(true);
      await onComplete(buildPayload());
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="modal-medical-shell max-h-[calc(100dvh-2rem)] max-w-[min(1180px,calc(100%-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-[min(1180px,calc(100%-2rem))]">
        <DialogHeader className="modal-medical-header gap-0">
          <ModalBanner
            artwork="consultation"
            className="modal-banner-compact modal-banner-record"
            icon={<HugeiconsIcon icon={StethoscopeIcon} strokeWidth={1.5} />}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="space-y-1.5">
                <DialogTitle className="text-xl tracking-[-0.04em]">
                  Consultation active
                </DialogTitle>
                <DialogDescription>
                  Examen et suivi du patient.
                </DialogDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="h-8 gap-1.5"
                  onClick={() => onOpenSoap?.()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <HugeiconsIcon icon={NoteIcon} size={14} strokeWidth={1.5} />
                  Note SOAP
                </Button>
                <Button
                  className="h-8 gap-1.5"
                  onClick={() => onOpenPrescription?.()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Pill size={14} weight="duotone" />
                  Ordonnance
                </Button>
                <Button
                  className="h-8 gap-1.5"
                  onClick={() => onOpenHospitalization?.()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Hospital size={14} weight="duotone" />
                  Hospitaliser
                </Button>
                <Button
                  className="h-8 gap-1.5"
                  onClick={() => onOpenAnesthesia?.()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Syringe size={14} weight="duotone" />
                  Anesthésie
                </Button>
                <Badge className="bg-background/90" variant="outline">
                  <HugeiconsIcon
                    className="mr-1 size-3.5"
                    icon={Clock01Icon}
                    strokeWidth={1.5}
                  />
                  {formatElapsedDuration(elapsedMs)}
                </Badge>
                <AppointmentStatusBadge
                  className="min-w-[92px] bg-blue-500/12 px-3 font-semibold text-blue-700 text-sm dark:bg-blue-500/18 dark:text-blue-200"
                  status="in_progress"
                />
              </div>
            </div>
          </ModalBanner>
        </DialogHeader>

        <div className="modal-medical-body min-h-0 overflow-y-auto p-6">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
            {/* Left Column: Patient File & Metadata */}
            <div className="flex flex-col gap-6">
              {/* Section 1: Résumé du créneau */}
              <div className="flex flex-col gap-4">
                <div className="border-zinc-100 border-b pb-2 dark:border-zinc-800/80">
                  <h3 className="font-bold text-[11px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
                    Résumé du créneau
                  </h3>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {patientName} · {appointment.type} ·{" "}
                    {formatTime(appointment.startTime)}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
                    <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                      Patient
                    </p>
                    <p className="mt-1 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                      {patient.name}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
                    <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                      Propriétaire
                    </p>
                    <p className="mt-1 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                      {formatOwnerName(owner)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
                    <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                      Heure de début
                    </p>
                    <p className="mt-1 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                      {formatTime(startedAt)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
                    <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                      Téléphone
                    </p>
                    <p className="mt-1 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                      {owner?.phone || "Non renseigné"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Historique récent */}
              <div className="flex flex-col gap-4">
                <div className="border-zinc-100 border-b pb-2 dark:border-zinc-800/80">
                  <h3 className="font-bold text-[11px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
                    Historique récent
                  </h3>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    Les dernières consultations enregistrées pour ce patient.
                  </p>
                </div>
                <div>
                  {historyAppointments.length > 0 ? (
                    <div className="grid gap-2">
                      {historyAppointments.map((entry) => (
                        <div
                          className="rounded-xl border border-zinc-100 bg-white px-4 py-3 shadow-3xs dark:border-zinc-800 dark:bg-zinc-950"
                          key={entry.id}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                              {entry.type} · {formatShortDate(entry.startTime)}
                            </p>
                            <AppointmentStatusBadge status={entry.status} />
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-muted-foreground text-xs leading-relaxed">
                            {entry.diagnosis ||
                              entry.treatment ||
                              entry.notes ||
                              entry.reason ||
                              "Aucune note clinique détaillée."}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-zinc-200 border-dashed bg-zinc-50/20 px-4 py-4 text-center text-muted-foreground text-xs dark:border-zinc-850">
                      Première consultation enregistrée pour ce patient.
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Mise à jour du patient */}
              <div className="flex flex-col gap-4">
                <div className="border-zinc-100 border-b pb-2 dark:border-zinc-800/80">
                  <h3 className="font-bold text-[11px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
                    Mise à jour du patient
                  </h3>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    Ajustez les informations utiles pendant l’examen.
                  </p>
                </div>
                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Nom du patient</FieldLabel>
                    <Input
                      onChange={(event) =>
                        setPatientNameValue(event.target.value)
                      }
                      value={patientNameValue}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Espèce</FieldLabel>
                    <Input
                      onChange={(event) =>
                        setPatientSpecies(event.target.value)
                      }
                      value={patientSpecies}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Race</FieldLabel>
                    <Input
                      onChange={(event) => setPatientBreed(event.target.value)}
                      placeholder="Race ou profil"
                      value={patientBreed}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Sexe</FieldLabel>
                    <NativeSelect
                      className="w-full cursor-pointer"
                      onChange={(event) =>
                        setPatientSex(event.target.value as Patient["sex"])
                      }
                      value={patientSex}
                    >
                      <NativeSelectOption value="M">Mâle</NativeSelectOption>
                      <NativeSelectOption value="F">Femelle</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel>Statut clinique</FieldLabel>
                    <NativeSelect
                      className="w-full cursor-pointer"
                      onChange={(event) =>
                        setPatientStatus(
                          event.target.value as Patient["status"]
                        )
                      }
                      value={patientStatus}
                    >
                      <NativeSelectOption value="sante">
                        En bonne santé
                      </NativeSelectOption>
                      <NativeSelectOption value="traitement">
                        En traitement
                      </NativeSelectOption>
                      <NativeSelectOption value="hospitalise">
                        Hospitalisé
                      </NativeSelectOption>
                      <NativeSelectOption value="decede">
                        Décédé
                      </NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldLabel>Allergies</FieldLabel>
                    <Input
                      onChange={(event) => setAllergies(event.target.value)}
                      placeholder="Aucune allergie connue, pénicilline, etc."
                      value={allergies}
                    />
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldLabel>Affections chroniques</FieldLabel>
                    <Textarea
                      className="min-h-24"
                      onChange={(event) =>
                        setChronicConditions(event.target.value)
                      }
                      placeholder="Arthrose, insuffisance rénale, diabète..."
                      value={chronicConditions}
                    />
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldLabel>Notes générales du patient</FieldLabel>
                    <Textarea
                      className="min-h-28"
                      onChange={(event) => setGeneralNotes(event.target.value)}
                      placeholder="Comportement, sensibilité, consignes particulières..."
                      value={generalNotes}
                    />
                  </Field>
                </FieldGroup>
              </div>
            </div>

            {/* Right Column: SOAP & Clinical documentation */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <div className="border-zinc-100 border-b pb-2 dark:border-zinc-800/80">
                  <h3 className="font-bold text-[11px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
                    Conduite de consultation
                  </h3>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    Notez le motif, l’examen, le diagnostic et le traitement au
                    fil de l’eau.
                  </p>
                </div>
                <FieldGroup className="grid gap-5">
                  <Field>
                    <FieldLabel>Motif</FieldLabel>
                    <Textarea
                      className="min-h-24"
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Motif de visite, contexte, symptômes observés..."
                      value={reason}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Notes en temps réel</FieldLabel>
                    <Textarea
                      className="min-h-40"
                      onChange={(event) =>
                        setConsultationNotes(event.target.value)
                      }
                      placeholder="Constantes, examen clinique, réactions du patient, points à surveiller..."
                      value={consultationNotes}
                    />
                    <FieldDescription>
                      Gardez cette zone ouverte pendant la consultation pour
                      saisir vos observations.
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel>Documents de consultation</FieldLabel>
                    <div className="grid gap-3 rounded-xl border border-zinc-150/70 bg-zinc-50/30 p-4 dark:border-zinc-800/60 dark:bg-zinc-900/10">
                      <Input
                        onChange={(event) =>
                          setDocumentDescription(event.target.value)
                        }
                        placeholder="Description rapide (ex: radio thorax, bilan sanguin)"
                        value={documentDescription}
                      />
                      <input
                        accept=".pdf,image/png,image/jpeg,image/webp,image/heic,image/heif"
                        className="hidden"
                        onChange={handleDocumentSelection}
                        ref={uploadInputRef}
                        type="file"
                      />
                      <Button
                        className="h-9 w-full cursor-pointer gap-1.5"
                        disabled={isUploadingDocument}
                        onClick={triggerDocumentPicker}
                        type="button"
                        variant="outline"
                      >
                        <HugeiconsIcon
                          icon={AttachmentIcon}
                          size={14}
                          strokeWidth={1.5}
                        />
                        {isUploadingDocument
                          ? "Ajout du document…"
                          : "Sélectionner et attacher un fichier"}
                      </Button>
                      {documents.length > 0 ? (
                        <div className="grid gap-2 border-zinc-100 border-t pt-3 dark:border-zinc-800/80">
                          {documents.map((document) => (
                            <div
                              className="flex items-center justify-between gap-4 rounded-lg border border-zinc-100 bg-white p-2.5 shadow-3xs dark:border-zinc-900 dark:bg-zinc-950"
                              key={document.id}
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <HugeiconsIcon
                                  className="size-4 shrink-0 text-muted-foreground"
                                  icon={File01Icon}
                                  strokeWidth={1.5}
                                />
                                <p className="truncate font-medium text-xs text-zinc-800 dark:text-zinc-200">
                                  {document.fileName}
                                  {document.description
                                    ? ` · ${document.description}`
                                    : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  className="cursor-pointer"
                                  onClick={() =>
                                    window.open(document.dataUrl, "_blank")
                                  }
                                  size="xs"
                                  type="button"
                                  variant="ghost"
                                >
                                  Ouvrir
                                </Button>
                                <Button
                                  className="cursor-pointer"
                                  onClick={() =>
                                    void onDeleteDocument(document.id)
                                  }
                                  size="xs"
                                  type="button"
                                  variant="ghost"
                                >
                                  Supprimer
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-xs">
                          Aucun document attaché pour cette consultation.
                        </p>
                      )}
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel>Diagnostic</FieldLabel>
                    <Textarea
                      className="min-h-28"
                      onChange={(event) => setDiagnosis(event.target.value)}
                      placeholder="Ex: gastro-entérite aiguë, syndrome respiratoire, contrôle post-opératoire..."
                      value={diagnosis}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Traitement prescrit</FieldLabel>
                    <Textarea
                      className="min-h-32"
                      onChange={(event) => setTreatment(event.target.value)}
                      placeholder="Ex: injection anti-vomitive, antibiothérapie 5 jours, alimentation fractionnée..."
                      value={treatment}
                    />
                  </Field>
                </FieldGroup>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-medical-footer flex flex-col gap-2 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-5 text-muted-foreground text-sm">
            {autosaveStatus === "saving" ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="size-3.5" />
                Sauvegarde automatique...
              </span>
            ) : autosaveStatus === "saved" ? (
              <span>
                Sauvegardé automatiquement
                {lastAutoSavedAt
                  ? ` à ${lastAutoSavedAt.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
              </span>
            ) : autosaveStatus === "error" ? (
              <span className="text-destructive">
                Sauvegarde automatique à vérifier.
              </span>
            ) : (
              <span>Les changements sont sauvegardés automatiquement.</span>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              className="min-w-[120px]"
              disabled={isSavingDraft || isCompleting}
              onClick={onClose}
              variant="outline"
            >
              Fermer
            </Button>
            <Button
              className="min-w-[130px]"
              disabled={isSavingDraft || isCompleting}
              onClick={() => void handleSaveDraftClick()}
              variant="outline"
            >
              {isSavingDraft ? <Spinner className="size-4" /> : null}
              {isSavingDraft ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
            <Button
              className="min-w-[188px]"
              disabled={isSavingDraft || isCompleting}
              onClick={() => void handleCompleteClick()}
            >
              {isCompleting ? (
                <Spinner className="size-4" />
              ) : (
                <HugeiconsIcon
                  data-icon="inline-start"
                  icon={Dollar01Icon}
                  strokeWidth={1.5}
                />
              )}
              {isCompleting ? "Traitement..." : "Clôturer et facturer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BillingDialog({
  appointment,
  patientName,
  ownerName,
  ownerEmail,
  onClose,
  onConfirm,
}: {
  appointment: Appointment;
  patientName: string;
  ownerName?: string;
  ownerEmail?: string;
  onClose: () => void;
  onConfirm: (items: BillingItem[], amountReceivedDa: number) => Promise<void>;
}) {
  const [items, setItems] = useState<BillingItem[]>([
    { desc: `Consultation - ${appointment.type}`, amount: 2000 },
  ]);
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [amountReceived, setAmountReceived] = useState("2000");
  const previousTotalRef = useRef(2000);

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  useEffect(() => {
    setAmountReceived((current) =>
      Number(current) === previousTotalRef.current ? String(total) : current
    );
    previousTotalRef.current = total;
  }, [total]);
  const received = Math.min(total, Math.max(0, Number(amountReceived) || 0));
  const balance = Math.max(0, total - received);

  const addItem = () => {
    const parsedAmount = Number(newItemAmount);
    if (
      !(newItemDesc.trim() && Number.isFinite(parsedAmount)) ||
      parsedAmount <= 0
    ) {
      toast.error("Renseignez une ligne de prestation valide.");
      return;
    }

    setItems((current) => [
      ...current,
      { desc: newItemDesc.trim(), amount: parsedAmount },
    ]);
    setNewItemDesc("");
    setNewItemAmount("");
  };

  const removeItem = (index: number) => {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const updateItem = (
    index: number,
    field: keyof BillingItem,
    value: string | number
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (field === "amount") {
          const amount = Number(value);
          return {
            ...item,
            amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
          };
        }

        return {
          ...item,
          [field]: String(value),
        };
      })
    );
  };

  const handleSendEmail = () => {
    if (!ownerEmail) {
      toast.error("Aucune adresse email n’est liée à ce propriétaire.");
      return;
    }

    const subject = encodeURIComponent(`Facture vétérinaire - ${patientName}`);
    const itemList = items
      .map((item) => `- ${item.desc}: ${item.amount} DA`)
      .join("\n");
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver le détail de la consultation pour ${patientName}.\n\n${itemList}\n\nTOTAL: ${total} DA\n\nCordialement,\nL'équipe ${APP_NAME}`
    );

    window.open(`mailto:${ownerEmail}?subject=${subject}&body=${body}`);
  };

  const handleConfirm = async () => {
    if (isConfirming) {
      return;
    }
    try {
      setIsConfirming(true);
      await onConfirm(items, received);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="modal-medical-shell max-h-[calc(100dvh-2rem)] max-w-[min(940px,calc(100%-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-[min(940px,calc(100%-2rem))]">
        <FormDialogHeader
          artwork="billing"
          description="Actes, produits et règlement."
          icon={<HugeiconsIcon icon={Dollar01Icon} strokeWidth={1.5} />}
          title="Facturation et encaissement"
          tone="amber"
        />

        <div className="modal-medical-body min-h-0 overflow-y-auto p-6">
          <div className="grid gap-6">
            <div>
              <div className="mb-4 border-zinc-100 border-b pb-3 dark:border-zinc-800/80">
                <h3 className="font-bold text-[11px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
                  Résumé avant facturation
                </h3>
                <p className="mt-1 text-muted-foreground text-xs">
                  Vérifiez le patient, le propriétaire et le total avant de
                  générer la facture.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
                  <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Patient
                  </p>
                  <p className="mt-1.5 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                    {patientName}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
                  <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Client
                  </p>
                  <p className="mt-1.5 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                    {ownerName || "Non renseigné"}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
                  <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Acte
                  </p>
                  <p className="mt-1.5 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                    {appointment.type}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <p className="font-semibold text-[10px] uppercase tracking-wider">
                    Total provisoire
                  </p>
                  <p className="mt-1.5 font-extrabold text-base tracking-tight">
                    {total} DA
                  </p>
                </div>
              </div>
            </div>

            <FieldGroup className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_160px_auto]">
              <Field>
                <FieldLabel>Nouvelle ligne</FieldLabel>
                <Input
                  onChange={(event) => setNewItemDesc(event.target.value)}
                  placeholder="Ex: injection, pansement, examen complémentaire..."
                  value={newItemDesc}
                />
              </Field>

              <Field>
                <FieldLabel>Montant (DA)</FieldLabel>
                <Input
                  onChange={(event) => setNewItemAmount(event.target.value)}
                  placeholder="0"
                  type="number"
                  value={newItemAmount}
                />
              </Field>

              <div className="flex items-end">
                <Button onClick={addItem} type="button">
                  <HugeiconsIcon
                    data-icon="inline-start"
                    icon={Add01Icon}
                    strokeWidth={1.5}
                  />
                  Ajouter
                </Button>
              </div>
            </FieldGroup>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prestation</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={`${item.desc}-${index}`}>
                      <TableCell className="pl-8">
                        <Input
                          className="h-9 border-transparent bg-transparent px-0 font-medium shadow-none focus-visible:border-input focus-visible:bg-background"
                          onChange={(event) =>
                            updateItem(index, "desc", event.target.value)
                          }
                          value={item.desc}
                        />
                      </TableCell>
                      <TableCell className="w-[180px]">
                        <div className="flex items-center gap-2">
                          <Input
                            className="h-9"
                            min="0"
                            onChange={(event) =>
                              updateItem(index, "amount", event.target.value)
                            }
                            type="number"
                            value={String(item.amount)}
                          />
                          <span className="text-muted-foreground text-sm">
                            DA
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-8 text-right">
                        <Button
                          disabled={items.length === 1}
                          onClick={() => removeItem(index)}
                          size="icon-sm"
                          variant="ghost"
                        >
                          <HugeiconsIcon
                            className="size-4"
                            icon={Delete01Icon}
                            strokeWidth={1.5}
                          />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-panel border border-border/80 bg-muted/20 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-sm">
                  Total à encaisser
                </span>
                <span className="font-semibold text-2xl text-foreground tracking-[-0.04em]">
                  {total} DA
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px] sm:items-end">
                <div>
                  <p className="font-medium text-sm">Règlement aujourd’hui</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    Laissez 0 DA pour créer une créance à recouvrer.
                  </p>
                </div>
                <Input
                  min="0"
                  max={total}
                  onChange={(event) => setAmountReceived(event.target.value)}
                  type="number"
                  value={amountReceived}
                />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-background/70 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Solde restant</span>
                <span
                  className={cn(
                    "font-semibold",
                    balance > 0 ? "text-amber-700" : "text-emerald-700"
                  )}
                >
                  {balance} DA
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-medical-footer flex flex-col gap-2 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            className="min-w-[110px]"
            onClick={handleSendEmail}
            variant="outline"
          >
            <HugeiconsIcon
              data-icon="inline-start"
              icon={Mail01Icon}
              strokeWidth={1.5}
            />
            Email
          </Button>

          <div className="modal-medical-actions">
            <Button
              className="min-w-[120px]"
              disabled={isConfirming}
              onClick={onClose}
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              className="min-w-[196px]"
              disabled={isConfirming}
              onClick={() => void handleConfirm()}
            >
              {isConfirming ? (
                <Spinner className="size-4" />
              ) : (
                <HugeiconsIcon
                  data-icon="inline-start"
                  icon={PrinterIcon}
                  strokeWidth={1.5}
                />
              )}
              {isConfirming ? "Traitement..." : "Encaisser et imprimer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
