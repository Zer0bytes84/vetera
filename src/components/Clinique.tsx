import {
  Activity01Icon,
  Add01Icon,
  ArrowRight01Icon,
  BirdIcon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Delete01Icon,
  Dollar01Icon,
  HourglassIcon,
  Mail01Icon,
  MoreVerticalCircle01Icon,
  PhoneCheckIcon,
  PillIcon,
  PlayIcon,
  PrinterIcon,
  SearchIcon,
  StethoscopeIcon,
  TimerIcon,
  UserGroupIcon,
  WorkHistoryIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import React, {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import Avatar from "@/components/Avatar";
import { type SectionCardItem, SectionCards } from "@/components/section-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  APPOINTMENT_TYPE_META,
  CLINIQUE_STATUS_META,
  PATIENT_STATUS_META,
} from "@/config/status-meta";
import {
  useAppointmentsRepository,
  useConsultationDocumentsRepository,
  useOwnersRepository,
  usePatientsRepository,
} from "@/data/repositories";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { getSetting } from "@/services/appSettingsService";
import type { View } from "@/types";
import type {
  Appointment,
  ConsultationDocument,
  Owner,
  Patient,
} from "@/types/db";

type CliniqueProps = {
  onNavigate?: (view: View) => void;
};

type BillingItem = {
  desc: string;
  amount: number;
};

type SaveDraftOptions = {
  silent?: boolean;
};

type ListTab = "all" | "scheduled" | "in_progress" | "completed";
type DetailTab = "overview" | "history";

type ConsultationDraftPayload = {
  appointmentPatch: Partial<Appointment>;
  patientPatch: Partial<Patient>;
};

const MAX_DOCUMENT_SIZE_BYTES = 12 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const LIST_TABS: Array<{
  value: ListTab;
  label: string;
  icon: typeof StethoscopeIcon;
}> = [
  { value: "all", label: "Planning", icon: Calendar01Icon },
  { value: "scheduled", label: "À venir", icon: HourglassIcon },
  { value: "in_progress", label: "En cours", icon: TimerIcon },
  { value: "completed", label: "Terminés", icon: CheckmarkCircle01Icon },
];

function normalizeDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDocumentCategory(
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

function formatFileSize(sizeBytes: number) {
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

async function readFileAsDataUrl(file: File): Promise<string> {
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

function isToday(date: Date) {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function formatTime(value?: string | Date | null) {
  const date = normalizeDate(value);
  if (!date) {
    return "--:--";
  }
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateLabel(value?: string | Date | null) {
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

function formatShortDate(value?: string | Date | null) {
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

function formatElapsedDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function getSpeciesIcon(_species?: string) {
  return BirdIcon;
}

function getPatientAge(dateOfBirth?: string) {
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

function formatOwnerName(owner?: Owner) {
  if (!owner) {
    return "Propriétaire non lié";
  }
  return (
    `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
    "Propriétaire non lié"
  );
}

function getPatientStatusMeta(status?: Patient["status"]) {
  return PATIENT_STATUS_META[status || "sante"];
}

function AppointmentTypeBadge({
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
        APPOINTMENT_TYPE_META[type].badgeClassName,
        className
      )}
      variant="outline"
    >
      {type}
    </Badge>
  );
}

function AppointmentStatusBadge({
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

const generateInvoicePDF = async (data: {
  patientName: string;
  ownerName?: string;
  date: Date;
  items: BillingItem[];
  total: number;
  id: string;
  diagnosis?: string;
  clinicName?: string;
}) => {
  const doc = new jsPDF();
  const primaryColor = "#2563EB";
  const grayColor = "#52525B";
  const clinicName = data.clinicName?.trim() || APP_NAME;

  doc.setFontSize(22);
  doc.setTextColor(primaryColor);
  doc.text(clinicName, 20, 20);

  doc.setFontSize(10);
  doc.setTextColor(grayColor);
  doc.text("Clinique vétérinaire", 20, 26);
  doc.text(`${clinicName} · Gestion locale du cabinet`, 20, 31);
  doc.text("Support interne", 20, 36);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 45, 190, 45);

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("FACTURE", 150, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(grayColor);
  doc.text(`N°: ${data.id}`, 150, 26, { align: "center" });
  doc.text(`Date: ${data.date.toLocaleDateString("fr-FR")}`, 150, 31, {
    align: "center",
  });

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Facturé à :", 20, 60);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(grayColor);

  let yPos = 66;
  if (data.ownerName) {
    doc.text(`Propriétaire : ${data.ownerName}`, 20, yPos);
    yPos += 6;
  }
  doc.text(`Patient : ${data.patientName}`, 20, yPos);

  let y = 90;
  doc.setFillColor(245, 245, 245);
  doc.rect(20, y - 8, 170, 10, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("DESCRIPTION", 25, y);
  doc.text("MONTANT", 185, y, { align: "right" });

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(grayColor);

  data.items.forEach((item) => {
    doc.text(item.desc, 25, y);
    doc.text(`${item.amount} DA`, 185, y, { align: "right" });
    y += 10;
  });

  y += 5;
  doc.setDrawColor(0, 0, 0);
  doc.line(20, y, 190, y);
  y += 10;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("TOTAL À PAYER", 90, y);
  doc.setTextColor(primaryColor);
  doc.text(`${data.total} DA`, 185, y, { align: "right" });

  if (data.diagnosis) {
    y += 20;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(grayColor);
    doc.text("Note médicale : " + data.diagnosis, 20, y);
  }

  try {
    const qrDataUrl = await QRCode.toDataURL("https://www.google.com", {
      margin: 1,
      width: 100,
    });
    doc.addImage(qrDataUrl, "PNG", 160, 240, 30, 30);
    doc.setFontSize(8);
    doc.setTextColor(grayColor);
    doc.text("Merci pour votre confiance", 175, 275, { align: "center" });
  } catch (error) {
    console.error(error);
  }

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`${clinicName} · Système clinique local`, 105, 290, {
    align: "center",
  });
  doc.save(
    `Facture-${data.patientName}-${data.date.toISOString().split("T")[0]}.pdf`
  );
};

const generatePrescriptionPDF = (data: {
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

function ConsultationSessionDialog({
  appointment,
  patient,
  owner,
  patientName,
  documents,
  historyAppointments,
  onClose,
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
        await saveDraftRef.current(buildPayload(), { silent: true });
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
        <DialogHeader className="modal-medical-header border-b px-6 py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1.5">
              <DialogTitle className="text-xl tracking-[-0.04em]">
                Consultation active
              </DialogTitle>
              <DialogDescription>
                Gardez cette fiche ouverte pendant l’examen pour documenter le
                dossier en temps réel puis clôturer la consultation.
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-background/90" variant="outline">
                <HugeiconsIcon
                  className="mr-1 size-3.5"
                  icon={Clock01Icon}
                  strokeWidth={2}
                />
                {formatElapsedDuration(elapsedMs)}
              </Badge>
              <AppointmentStatusBadge
                className="min-w-[92px] bg-blue-500/12 px-3 font-semibold text-blue-700 text-sm dark:bg-blue-500/18 dark:text-blue-200"
                status="in_progress"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="modal-medical-body min-h-0 overflow-y-auto p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
            <div className="grid gap-6">
              <Card size="sm">
                <CardHeader>
                  <CardTitle className="text-base">Résumé du créneau</CardTitle>
                  <CardDescription>
                    {patientName} · {appointment.type} ·{" "}
                    {formatTime(appointment.startTime)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-muted/30 px-4 py-3 transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                    <p className="text-muted-foreground text-sm">Patient</p>
                    <p className="mt-1 font-medium text-foreground">
                      {patient.name}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-muted/30 px-4 py-3 transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                    <p className="text-muted-foreground text-sm">
                      Propriétaire
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {formatOwnerName(owner)}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-muted/30 px-4 py-3 transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                    <p className="text-muted-foreground text-sm">
                      Heure de début
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {formatTime(startedAt)}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-muted/30 px-4 py-3 transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                    <p className="text-muted-foreground text-sm">Téléphone</p>
                    <p className="mt-1 font-medium text-foreground">
                      {owner?.phone || "Non renseigné"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle className="text-base">Historique récent</CardTitle>
                  <CardDescription>
                    Les dernières consultations restent visibles pendant
                    l’examen.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {historyAppointments.length > 0 ? (
                    <div className="grid gap-2">
                      {historyAppointments.map((entry) => (
                        <div
                          className="rounded-2xl border bg-background/70 px-4 py-3"
                          key={entry.id}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-foreground text-sm">
                              {entry.type} · {formatShortDate(entry.startTime)}
                            </p>
                            <AppointmentStatusBadge status={entry.status} />
                          </div>
                          <p className="mt-2 line-clamp-2 text-muted-foreground text-sm">
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
                    <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-3 text-muted-foreground text-sm">
                      Première consultation enregistrée pour ce patient.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle className="text-base">
                    Mise à jour du patient
                  </CardTitle>
                  <CardDescription>
                    Ajustez les informations utiles pendant l’examen.
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                        onChange={(event) =>
                          setPatientBreed(event.target.value)
                        }
                        placeholder="Race ou profil"
                        value={patientBreed}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Sexe</FieldLabel>
                      <NativeSelect
                        className="w-full"
                        onChange={(event) =>
                          setPatientSex(event.target.value as Patient["sex"])
                        }
                        value={patientSex}
                      >
                        <NativeSelectOption value="M">Mâle</NativeSelectOption>
                        <NativeSelectOption value="F">
                          Femelle
                        </NativeSelectOption>
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel>Statut clinique</FieldLabel>
                      <NativeSelect
                        className="w-full"
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
                        onChange={(event) =>
                          setGeneralNotes(event.target.value)
                        }
                        placeholder="Comportement, sensibilité, consignes particulières..."
                        value={generalNotes}
                      />
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>
            </div>

            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-base">
                  Conduite de consultation
                </CardTitle>
                <CardDescription>
                  Notez le motif, l’examen, le diagnostic et le traitement au
                  fil de l’eau.
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                    <div className="grid gap-3 rounded-3xl border border-border/70 bg-muted/20 p-4">
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
                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={isUploadingDocument}
                          onClick={triggerDocumentPicker}
                          type="button"
                          variant="outline"
                        >
                          <HugeiconsIcon
                            data-icon="inline-start"
                            icon={Add01Icon}
                            strokeWidth={2}
                          />
                          {isUploadingDocument
                            ? "Import..."
                            : "Importer PDF / photo"}
                        </Button>
                        <p className="self-center text-muted-foreground text-xs">
                          Historique patient centralisé, accessible depuis
                          l’onglet Historique.
                        </p>
                      </div>

                      {documents.length > 0 ? (
                        <div className="grid gap-2">
                          {documents.map((document) => (
                            <div
                              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-background/80 px-3 py-2"
                              key={document.id}
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground text-sm">
                                  {document.fileName}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {formatFileSize(Number(document.sizeBytes))} ·{" "}
                                  {formatShortDate(document.createdAt)}
                                  {document.description
                                    ? ` · ${document.description}`
                                    : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
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
              </CardContent>
            </Card>
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
                  strokeWidth={2}
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

function BillingDialog({
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
  onConfirm: (items: BillingItem[]) => Promise<void>;
}) {
  const [items, setItems] = useState<BillingItem[]>([
    { desc: `Consultation - ${appointment.type}`, amount: 2000 },
  ]);
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  const total = items.reduce((sum, item) => sum + item.amount, 0);

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
      await onConfirm(items);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="modal-medical-shell max-h-[calc(100dvh-2rem)] max-w-[min(940px,calc(100%-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-[min(940px,calc(100%-2rem))]">
        <DialogHeader className="modal-medical-header border-b px-6 py-5">
          <DialogTitle className="text-xl tracking-[-0.04em]">
            Facturation et encaissement
          </DialogTitle>
          <DialogDescription>
            Consolidez les actes facturés avant impression du reçu clinique.
          </DialogDescription>
        </DialogHeader>

        <div className="modal-medical-body min-h-0 overflow-y-auto p-6">
          <div className="grid gap-6">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-base">
                  Résumé avant facturation
                </CardTitle>
                <CardDescription>
                  Vérifiez le patient, le propriétaire et le total avant de
                  générer la facture.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-muted/30 px-4 py-3">
                  <p className="text-muted-foreground text-xs">Patient</p>
                  <p className="mt-1 font-medium">{patientName}</p>
                </div>
                <div className="rounded-2xl bg-muted/30 px-4 py-3">
                  <p className="text-muted-foreground text-xs">Client</p>
                  <p className="mt-1 font-medium">
                    {ownerName || "Non renseigné"}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/30 px-4 py-3">
                  <p className="text-muted-foreground text-xs">Acte</p>
                  <p className="mt-1 font-medium">{appointment.type}</p>
                </div>
                <div className="rounded-2xl bg-primary/10 px-4 py-3 text-primary">
                  <p className="text-xs">Total provisoire</p>
                  <p className="mt-1 font-semibold">{total} DA</p>
                </div>
              </CardContent>
            </Card>

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
                    strokeWidth={2}
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
                            strokeWidth={2}
                          />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-4xl border border-border/80 bg-muted/20 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-sm">
                  Total à encaisser
                </span>
                <span className="font-semibold text-2xl text-foreground tracking-[-0.04em]">
                  {total} DA
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
              strokeWidth={2}
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
                  strokeWidth={2}
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

const Clinique: React.FC<CliniqueProps> = ({ onNavigate }) => {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [activeConsultation, setActiveConsultation] =
    useState<Appointment | null>(null);
  const [billingAppointment, setBillingAppointment] =
    useState<Appointment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [listTab, setListTab] = useState<ListTab>("all");
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  const {
    data: appointments,
    loading: loadingAppointments,
    update: updateAppointment,
    completeWithBilling,
  } = useAppointmentsRepository();
  const { data: patients, update: updatePatient } = usePatientsRepository();
  const { data: owners } = useOwnersRepository();
  const {
    data: consultationDocuments,
    add: addConsultationDocument,
    remove: removeConsultationDocument,
  } = useConsultationDocumentsRepository();

  const patientsById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients]
  );
  const ownersById = useMemo(
    () => new Map(owners.map((owner) => [owner.id, owner])),
    [owners]
  );

  const todaysAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => {
          const date = normalizeDate(appointment.startTime);
          return date ? isToday(date) : false;
        })
        .sort(
          (left, right) =>
            new Date(left.startTime).getTime() -
            new Date(right.startTime).getTime()
        ),
    [appointments]
  );

  const filteredAppointments = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return todaysAppointments.filter((appointment) => {
      if (listTab !== "all" && appointment.status !== listTab) {
        return false;
      }

      if (!query) {
        return true;
      }

      const patient = patientsById.get(appointment.patientId);
      const owner = ownersById.get(
        appointment.ownerId || patient?.ownerId || ""
      );

      const searchIndex = [
        patient?.name,
        patient?.species,
        patient?.breed,
        owner?.firstName,
        owner?.lastName,
        appointment.type,
        appointment.reason,
        appointment.diagnosis,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchIndex.includes(query);
    });
  }, [deferredSearch, listTab, ownersById, patientsById, todaysAppointments]);

  useEffect(() => {
    if (filteredAppointments.length === 0) {
      setSelectedAppointmentId(null);
      return;
    }

    if (
      !(
        selectedAppointmentId &&
        filteredAppointments.some((item) => item.id === selectedAppointmentId)
      )
    ) {
      setSelectedAppointmentId(filteredAppointments[0].id);
    }
  }, [filteredAppointments, selectedAppointmentId]);

  const selectedAppointment = useMemo(
    () =>
      selectedAppointmentId
        ? (appointments.find(
            (appointment) => appointment.id === selectedAppointmentId
          ) ?? null)
        : null,
    [appointments, selectedAppointmentId]
  );

  const selectedPatient = selectedAppointment
    ? patientsById.get(selectedAppointment.patientId)
    : undefined;
  const selectedOwner = selectedAppointment
    ? ownersById.get(
        selectedAppointment.ownerId || selectedPatient?.ownerId || ""
      )
    : undefined;

  const patientHistory = useMemo(() => {
    if (!selectedPatient) {
      return [];
    }

    return appointments
      .filter(
        (appointment) =>
          appointment.patientId === selectedPatient.id &&
          appointment.status === "completed"
      )
      .sort(
        (left, right) =>
          new Date(right.startTime).getTime() -
          new Date(left.startTime).getTime()
      )
      .slice(0, 6);
  }, [appointments, selectedPatient]);

  const selectedPatientDocuments = useMemo(() => {
    if (!selectedPatient) {
      return [];
    }
    return consultationDocuments
      .filter((document) => document.patientId === selectedPatient.id)
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime()
      )
      .slice(0, 24);
  }, [consultationDocuments, selectedPatient]);

  const activeConsultationDocuments = useMemo(() => {
    if (!activeConsultation) {
      return [];
    }
    return consultationDocuments
      .filter((document) => document.appointmentId === activeConsultation.id)
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime()
      );
  }, [activeConsultation, consultationDocuments]);

  const activeConsultationHistory = useMemo(() => {
    if (!activeConsultation) {
      return [];
    }

    return appointments
      .filter(
        (appointment) =>
          appointment.patientId === activeConsultation.patientId &&
          appointment.id !== activeConsultation.id
      )
      .sort(
        (left, right) =>
          new Date(right.startTime).getTime() -
          new Date(left.startTime).getTime()
      )
      .slice(0, 4);
  }, [activeConsultation, appointments]);

  const stats = useMemo(
    () => ({
      total: todaysAppointments.length,
      completed: todaysAppointments.filter(
        (appointment) => appointment.status === "completed"
      ).length,
      inProgress: todaysAppointments.filter(
        (appointment) => appointment.status === "in_progress"
      ).length,
      pending: todaysAppointments.filter(
        (appointment) => appointment.status === "scheduled"
      ).length,
    }),
    [todaysAppointments]
  );

  const sectionCards = useMemo<SectionCardItem[]>(
    () => [
      {
        title: "Consultations",
        value: String(stats.total),
        badge: `${stats.completed} clôturée${stats.completed > 1 ? "s" : ""}`,
        trend: "neutral",
        footerTitle: "Flux consultatoire",
        footerDescription: "Flux du jour",
      },
      {
        title: "En cours",
        value: String(stats.inProgress),
        badge: `${stats.inProgress} active${stats.inProgress > 1 ? "s" : ""}`,
        trend: "neutral",
        footerTitle: "Activité en cours",
        footerDescription: "À documenter",
      },
      {
        title: "Terminés",
        value: String(stats.completed),
        badge: `${stats.completed} finie${stats.completed > 1 ? "s" : ""}`,
        trend: "up",
        footerTitle: "Consultations clôturées",
        footerDescription: "Clôturées",
      },
      {
        title: "En attente",
        value: String(stats.pending),
        badge: `${stats.pending} en salle`,
        trend: "neutral",
        footerTitle: "Patients en attente",
        footerDescription: "À lancer",
      },
    ],
    [stats.completed, stats.inProgress, stats.pending, stats.total]
  );

  const getPatient = (patientId: string) => patientsById.get(patientId);
  const getOwner = (appointment: Appointment) => {
    const patient = getPatient(appointment.patientId);
    return ownersById.get(appointment.ownerId || patient?.ownerId || "");
  };
  const moveSelectionToStatusTab = (
    status: Appointment["status"],
    appointmentId: string
  ) => {
    if (status === "in_progress" || status === "completed") {
      setListTab(status);
    }
    setSelectedAppointmentId(appointmentId);
  };

  const handleStatusAction = async (appointment: Appointment) => {
    try {
      if (appointment.status === "scheduled") {
        await updateAppointment(appointment.id, { status: "in_progress" });
        const openedAppointment = {
          ...appointment,
          status: "in_progress" as const,
        };
        setActiveConsultation(openedAppointment);
        moveSelectionToStatusTab("in_progress", appointment.id);
        toast.success(
          "La consultation a été démarrée et déplacée dans En cours."
        );
        return;
      }

      if (appointment.status === "in_progress") {
        setActiveConsultation(appointment);
      }
    } catch (error) {
      console.error(error);
      toast.error("Impossible de mettre à jour le statut de la consultation.");
    }
  };

  const handleConsultationSaveDraft = async (
    payload: ConsultationDraftPayload,
    options?: SaveDraftOptions
  ) => {
    if (!activeConsultation) {
      return;
    }

    try {
      await updateAppointment(activeConsultation.id, payload.appointmentPatch);
      await updatePatient(activeConsultation.patientId, payload.patientPatch);
      moveSelectionToStatusTab("in_progress", activeConsultation.id);

      setActiveConsultation((current) =>
        current
          ? {
              ...current,
              ...payload.appointmentPatch,
            }
          : current
      );

      if (!options?.silent) {
        toast.success("Consultation mise à jour.");
      }
    } catch (error) {
      console.error(error);
      if (!options?.silent) {
        toast.error("Impossible d’enregistrer la consultation.");
      }
      throw error;
    }
  };

  const handleConsultationComplete = async (
    payload: ConsultationDraftPayload
  ) => {
    if (!activeConsultation) {
      return;
    }

    try {
      const finalAppointmentPatch: Partial<Appointment> = {
        ...payload.appointmentPatch,
        status: "completed",
      };
      const patientPatch: Partial<Patient> = {
        ...payload.patientPatch,
        lastVisit: new Date().toISOString(),
      };

      await updateAppointment(activeConsultation.id, finalAppointmentPatch);
      await updatePatient(activeConsultation.patientId, patientPatch);

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(
          `vetera:consultation-start:${activeConsultation.id}`
        );
      }

      const updatedAppointment: Appointment = {
        ...activeConsultation,
        ...finalAppointmentPatch,
      };

      moveSelectionToStatusTab("completed", activeConsultation.id);
      setActiveConsultation(null);
      setBillingAppointment(updatedAppointment);
      toast.success("Consultation clôturée et déplacée dans Terminés.");
    } catch (error) {
      console.error(error);
      toast.error("Impossible de clôturer la consultation.");
    }
  };

  const handleConsultationDocumentUpload = async (
    file: File,
    description?: string
  ) => {
    if (!activeConsultation) {
      throw new Error("Aucune consultation active.");
    }

    const patient = getPatient(activeConsultation.patientId);
    if (!patient) {
      throw new Error("Patient introuvable pour ce document.");
    }

    const dataUrl = await readFileAsDataUrl(file);
    const owner = getOwner(activeConsultation);

    await addConsultationDocument({
      appointmentId: activeConsultation.id,
      patientId: activeConsultation.patientId,
      ownerId: owner?.id,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      category: getDocumentCategory(file.type || ""),
      dataUrl,
      description: description?.trim() || undefined,
      createdBy: "local",
    } as Omit<ConsultationDocument, "id" | "createdAt" | "updatedAt">);
  };

  const handleConsultationDocumentDelete = async (documentId: string) => {
    await removeConsultationDocument(documentId);
    toast.success("Document supprimé.");
  };

  const handleBillingConfirm = async (items: BillingItem[]) => {
    if (!billingAppointment) {
      return;
    }

    try {
      const patient = getPatient(billingAppointment.patientId);
      const owner = getOwner(billingAppointment);

      const { totalAmountDa } = await completeWithBilling({
        appointmentId: billingAppointment.id,
        items,
        category: "Consultation",
        method: "cash",
      });

      const clinicName =
        (await getSetting("clinic_name")) ||
        (await getSetting("cabinet_name")) ||
        (await getSetting("practice_name")) ||
        APP_NAME;

      await generateInvoicePDF({
        patientName: patient?.name || "Patient local",
        ownerName: formatOwnerName(owner),
        date: new Date(),
        items,
        total: totalAmountDa,
        id: `FACT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10_000)}`,
        diagnosis: billingAppointment.diagnosis,
        clinicName,
      });

      setBillingAppointment(null);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(
          `vetera:consultation-start:${billingAppointment.id}`
        );
      }
      toast.success("Facturation finalisée et reçu généré.");
    } catch (error) {
      console.error(error);
      toast.error("Impossible de finaliser la facturation.");
    }
  };

  const handleCallOwner = (owner?: Owner) => {
    if (!owner?.phone) {
      toast.error("Aucun numéro n’est enregistré pour ce propriétaire.");
      return;
    }

    window.open(`tel:${owner.phone}`);
  };

  const handlePrescription = () => {
    if (!(selectedAppointment && selectedPatient)) {
      return;
    }

    if (
      selectedAppointment.status !== "completed" &&
      !selectedAppointment.treatment
    ) {
      toast.error(
        "Clôturez d’abord la consultation avant de générer l’ordonnance."
      );
      return;
    }

    generatePrescriptionPDF({
      patientName: selectedPatient.name,
      ownerName: formatOwnerName(selectedOwner),
      species: selectedPatient.species,
      breed: selectedPatient.breed,
      treatment: selectedAppointment.treatment,
      diagnosis: selectedAppointment.diagnosis,
    });

    toast.success("Ordonnance générée et téléchargée.");
  };

  const visibleCount = filteredAppointments.length;
  const SelectedSpeciesIcon = getSpeciesIcon(selectedPatient?.species);
  const activeConsultationPatient = activeConsultation
    ? patientsById.get(activeConsultation.patientId)
    : undefined;
  const activeConsultationOwner = activeConsultation
    ? getOwner(activeConsultation)
    : undefined;

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 px-4 lg:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-end">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="h-10 rounded-xl px-4"
            onClick={() => onNavigate?.("agenda")}
          >
            <HugeiconsIcon
              data-icon="inline-start"
              icon={Calendar01Icon}
              strokeWidth={2}
            />
            Ouvrir l&apos;agenda
          </Button>
          {selectedAppointment ? (
            <Button
              disabled={selectedAppointment.status === "completed"}
              onClick={() => handleStatusAction(selectedAppointment)}
            >
              {selectedAppointment.status === "scheduled" ? (
                <>
                  <HugeiconsIcon
                    data-icon="inline-start"
                    icon={PlayIcon}
                    strokeWidth={2}
                  />
                  Démarrer
                </>
              ) : selectedAppointment.status === "in_progress" ? (
                <>
                  <HugeiconsIcon
                    data-icon="inline-start"
                    icon={StethoscopeIcon}
                    strokeWidth={2}
                  />
                  Reprendre
                </>
              ) : (
                <>
                  <HugeiconsIcon
                    data-icon="inline-start"
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={2}
                  />
                  Terminé
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      <SectionCards items={sectionCards} />

      <div className="grid gap-4">
        <Card className="card-vibrant card-hover-lift relative min-h-[760px] overflow-hidden rounded-[24px] border border-border bg-card shadow-none">
          <CardHeader className="relative border-border border-b bg-transparent px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                <HugeiconsIcon
                  className="h-5 w-5 text-violet-600"
                  icon={WorkHistoryIcon}
                  strokeWidth={2}
                />
              </div>
              <div className="grid flex-1 gap-0.5">
                <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
                  Registre clinique
                </CardDescription>
                <CardTitle className="font-normal text-[22px] tracking-[-0.04em]">
                  Activité des dossiers
                </CardTitle>
              </div>
            </div>
            <CardAction>
              <Badge
                className="rounded-full bg-background/80 px-3 py-1"
                variant="outline"
              >
                {visibleCount} consultation{visibleCount > 1 ? "s" : ""}
              </Badge>
            </CardAction>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col px-0 pb-0">
            <div className="flex flex-col gap-3 px-6 pt-1 pb-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex-1" />
              <Tabs
                className="gap-3"
                onValueChange={(value) => setListTab(value as ListTab)}
                value={listTab}
              >
                <TabsList className="bg-muted/50 p-1">
                  {LIST_TABS.map((tab) => {
                    const count =
                      tab.value === "all"
                        ? filteredAppointments.length
                        : tab.value === "scheduled"
                          ? stats.pending
                          : tab.value === "in_progress"
                            ? stats.inProgress
                            : stats.completed;
                    return (
                      <TabsTrigger
                        className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        key={tab.value}
                        value={tab.value}
                      >
                        <HugeiconsIcon className="h-4 w-4" icon={tab.icon} />
                        <span>{tab.label}</span>
                        <Badge
                          className="ml-1 h-5 min-w-5 px-1 text-xs"
                          variant="secondary"
                        >
                          {count}
                        </Badge>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>

              <div className="relative w-full xl:max-w-[440px] xl:flex-1">
                <HugeiconsIcon
                  className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
                  icon={SearchIcon}
                  strokeWidth={2}
                />
                <Input
                  className="h-11 rounded-3xl bg-input/50 pl-11"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Rechercher un patient, un motif ou un type d’acte..."
                  value={searchQuery}
                />
              </div>
            </div>

            <Separator />

            {loadingAppointments ? (
              <div className="flex items-center justify-center py-16">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            ) : visibleCount === 0 ? (
              <div className="flex flex-1 px-6 pb-6">
                <Empty className="border border-border/80 border-dashed bg-muted/20">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={StethoscopeIcon} strokeWidth={2} />
                    </EmptyMedia>
                    <EmptyTitle>Aucune consultation dans cette vue</EmptyTitle>
                    <EmptyDescription>
                      Ajustez la recherche ou revenez à l’agenda pour planifier
                      de nouveaux créneaux.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent className="justify-center sm:flex-row">
                    <Button
                      onClick={() => {
                        setSearchQuery("");
                        setListTab("all");
                      }}
                      variant="outline"
                    >
                      Réinitialiser
                    </Button>
                    <Button onClick={() => onNavigate?.("agenda")}>
                      <HugeiconsIcon
                        data-icon="inline-start"
                        icon={Calendar01Icon}
                        strokeWidth={2}
                      />
                      Voir l&apos;agenda
                    </Button>
                  </EmptyContent>
                </Empty>
              </div>
            ) : (
              <div className="px-6 pt-5 pb-6">
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="w-[34%] pl-4">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              className="h-4 w-4 text-muted-foreground"
                              icon={StethoscopeIcon}
                            />
                            <span className="font-semibold">Patient</span>
                          </div>
                        </TableHead>
                        <TableHead className="hidden w-[20%] xl:table-cell">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              className="h-4 w-4 text-muted-foreground"
                              icon={UserGroupIcon}
                            />
                            <span className="font-semibold">Propriétaire</span>
                          </div>
                        </TableHead>
                        <TableHead className="w-[20%]">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              className="h-4 w-4 text-muted-foreground"
                              icon={Clock01Icon}
                            />
                            <span className="font-semibold">Horaire</span>
                          </div>
                        </TableHead>
                        <TableHead className="w-[12%]">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              className="h-4 w-4 text-muted-foreground"
                              icon={Activity01Icon}
                            />
                            <span className="font-semibold">Type</span>
                          </div>
                        </TableHead>
                        <TableHead className="w-[14%]">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              className="h-4 w-4 text-muted-foreground"
                              icon={CheckmarkCircle01Icon}
                            />
                            <span className="font-semibold">État</span>
                          </div>
                        </TableHead>
                        <TableHead className="w-[20%]">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              className="h-4 w-4 text-muted-foreground"
                              icon={ArrowRight01Icon}
                            />
                            <span className="font-semibold">Action</span>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.map((appointment) => {
                        const patient = getPatient(appointment.patientId);
                        const owner = getOwner(appointment);
                        const SpeciesIcon = getSpeciesIcon(patient?.species);

                        return (
                          <TableRow
                            className={cn(
                              "cursor-pointer",
                              selectedAppointmentId === appointment.id
                                ? "!bg-primary/5 hover:!bg-primary/6"
                                : ""
                            )}
                            data-state={
                              selectedAppointmentId === appointment.id
                                ? "selected"
                                : undefined
                            }
                            key={appointment.id}
                            onClick={() => {
                              setSelectedAppointmentId(appointment.id);
                              setDetailTab("overview");
                            }}
                          >
                            <TableCell className="whitespace-normal pl-10">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "flex size-10 items-center justify-center rounded-2xl",
                                    APPOINTMENT_TYPE_META[appointment.type]
                                      .iconClassName
                                  )}
                                >
                                  <HugeiconsIcon
                                    className="size-4"
                                    icon={SpeciesIcon}
                                    strokeWidth={2}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="break-words font-medium text-foreground">
                                    {patient?.name || "Patient local"}
                                  </p>
                                  <p className="break-words text-muted-foreground text-sm">
                                    {patient?.species || "Espèce"}
                                    {patient?.breed
                                      ? ` · ${patient.breed}`
                                      : ""}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="hidden whitespace-normal xl:table-cell">
                              <div className="min-w-0">
                                <p className="break-words font-medium text-foreground">
                                  {formatOwnerName(owner)}
                                </p>
                                <p className="break-words text-muted-foreground text-sm">
                                  {owner?.phone || "Téléphone non renseigné"}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="whitespace-normal">
                              <div className="min-w-0">
                                <p className="font-medium text-foreground">
                                  {formatTime(appointment.startTime)}
                                </p>
                                <p className="break-words text-muted-foreground text-sm">
                                  {appointment.reason || "Motif non renseigné"}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="whitespace-normal">
                              <AppointmentTypeBadge type={appointment.type} />
                            </TableCell>

                            <TableCell className="whitespace-normal">
                              <AppointmentStatusBadge
                                status={appointment.status}
                              />
                            </TableCell>

                            <TableCell
                              className="whitespace-normal pl-6 text-left"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <div className="flex flex-wrap items-center gap-1.5">
                                {appointment.status === "scheduled" ? (
                                  <Button
                                    className="min-w-[118px] rounded-3xl"
                                    onClick={() =>
                                      handleStatusAction(appointment)
                                    }
                                    size="xs"
                                  >
                                    <HugeiconsIcon
                                      data-icon="inline-start"
                                      icon={PlayIcon}
                                      strokeWidth={2}
                                    />
                                    <span>Démarrer</span>
                                  </Button>
                                ) : appointment.status === "in_progress" ? (
                                  <Button
                                    className="min-w-[118px] rounded-3xl"
                                    onClick={() =>
                                      handleStatusAction(appointment)
                                    }
                                    size="xs"
                                  >
                                    <HugeiconsIcon
                                      data-icon="inline-start"
                                      icon={StethoscopeIcon}
                                      strokeWidth={2}
                                    />
                                    <span>Ouvrir</span>
                                  </Button>
                                ) : (
                                  <Button
                                    className="rounded-3xl bg-muted/40 text-muted-foreground"
                                    disabled
                                    size="xs"
                                    variant="outline"
                                  >
                                    <HugeiconsIcon
                                      data-icon="inline-start"
                                      icon={CheckmarkCircle02Icon}
                                      strokeWidth={2}
                                    />
                                    <span>Facturé</span>
                                  </Button>
                                )}

                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={
                                      <Button size="icon-xs" variant="ghost" />
                                    }
                                  >
                                    <HugeiconsIcon
                                      icon={MoreVerticalCircle01Icon}
                                      strokeWidth={2}
                                    />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-48"
                                  >
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedAppointmentId(
                                          appointment.id
                                        );
                                        setDetailTab("overview");
                                      }}
                                    >
                                      Ouvrir
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => onNavigate?.("patients")}
                                    >
                                      Dossier patient
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleCallOwner(owner)}
                                    >
                                      Appeler le propriétaire
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover-lift relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-emerald-500/[0.035] via-emerald-500/[0.015] to-transparent" />
          <CardHeader className="relative border-border/35 border-b bg-transparent">
            <CardDescription>Dossier sélectionné</CardDescription>
            <CardTitle className="text-xl tracking-[-0.04em]">
              {selectedPatient?.name || "Sélectionnez une consultation"}
            </CardTitle>
            {selectedAppointment ? (
              <CardAction>
                <AppointmentStatusBadge status={selectedAppointment.status} />
              </CardAction>
            ) : null}
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            {selectedAppointment && selectedPatient ? (
              <Tabs
                className="flex min-h-0 flex-1 flex-col gap-4"
                onValueChange={(value) => setDetailTab(value as DetailTab)}
                value={detailTab}
              >
                <div
                  className={cn(
                    "rounded-4xl border p-5",
                    APPOINTMENT_TYPE_META[selectedAppointment.type]
                      .surfaceClassName
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-16 items-center justify-center rounded-3xl bg-background shadow-sm">
                      <HugeiconsIcon
                        className="size-7 text-foreground"
                        icon={SelectedSpeciesIcon}
                        strokeWidth={2}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-foreground text-xl tracking-[-0.04em]">
                          {selectedPatient.name}
                        </p>
                        <AppointmentTypeBadge type={selectedAppointment.type} />
                      </div>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {selectedPatient.species}
                        {selectedPatient.breed
                          ? ` · ${selectedPatient.breed}`
                          : ""}
                        {" · "}
                        {getPatientAge(selectedPatient.dateOfBirth)}
                      </p>
                      <p className="mt-2 text-muted-foreground text-sm">
                        Créneau du jour ·{" "}
                        {formatTime(selectedAppointment.startTime)} ·{" "}
                        {formatDateLabel(selectedAppointment.startTime)}
                      </p>
                    </div>
                  </div>
                </div>

                <TabsList
                  className="w-full justify-start rounded-none p-0"
                  variant="line"
                >
                  <TabsTrigger value="overview">Dossier</TabsTrigger>
                  <TabsTrigger value="history">Historique</TabsTrigger>
                </TabsList>

                <TabsContent className="min-h-0 flex-1" value="overview">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                    <Card size="sm">
                      <CardHeader>
                        <CardTitle>Repères du dossier</CardTitle>
                        <CardDescription>
                          L’essentiel du patient regroupé dans un seul bloc.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-3xl bg-muted/30 px-4 py-3 transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                          <p className="text-muted-foreground text-sm">
                            Espèce
                          </p>
                          <p className="mt-1 font-medium text-foreground">
                            {selectedPatient.species}
                          </p>
                        </div>
                        <div className="rounded-3xl bg-muted/30 px-4 py-3 transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                          <p className="text-muted-foreground text-sm">Race</p>
                          <p className="mt-1 font-medium text-foreground">
                            {selectedPatient.breed || "Non renseignée"}
                          </p>
                        </div>
                        <div className="rounded-3xl bg-muted/30 px-4 py-3 transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                          <p className="text-muted-foreground text-sm">Âge</p>
                          <p className="mt-1 font-medium text-foreground">
                            {getPatientAge(selectedPatient.dateOfBirth)}
                          </p>
                        </div>
                        <div className="rounded-3xl bg-muted/30 px-4 py-3 transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                          <p className="text-muted-foreground text-sm">
                            Statut
                          </p>
                          <div className="mt-1">
                            <Badge
                              className={cn(
                                "border-transparent",
                                getPatientStatusMeta(selectedPatient.status)
                                  .className
                              )}
                              variant="outline"
                            >
                              {
                                getPatientStatusMeta(selectedPatient.status)
                                  .label
                              }
                            </Badge>
                          </div>
                        </div>
                        <div className="rounded-3xl bg-muted/30 px-4 py-3 transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                          <p className="text-muted-foreground text-sm">
                            Dernière visite
                          </p>
                          <p className="mt-1 font-medium text-foreground">
                            {selectedPatient.lastVisit
                              ? formatShortDate(selectedPatient.lastVisit)
                              : "Non renseignée"}
                          </p>
                        </div>
                        <div className="rounded-3xl bg-muted/30 px-4 py-3 transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                          <p className="text-muted-foreground text-sm">
                            Acte du jour
                          </p>
                          <div className="mt-1">
                            <AppointmentTypeBadge
                              type={selectedAppointment.type}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card size="sm">
                      <CardHeader>
                        <CardTitle>Coordination clinique</CardTitle>
                        <CardDescription>
                          Contact propriétaire et éléments à traiter pour la
                          consultation active.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={formatOwnerName(selectedOwner)}
                            size="md"
                            src={
                              selectedOwner?.email
                                ? undefined
                                : "gradient:from-blue-500 to-cyan-500"
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground">
                              {formatOwnerName(selectedOwner)}
                            </p>
                            <p className="truncate text-muted-foreground text-sm">
                              {selectedOwner?.email || "Email non renseigné"}
                            </p>
                          </div>
                          <AppointmentStatusBadge
                            status={selectedAppointment.status}
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-3xl bg-muted/30 px-4 py-3 transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                            <p className="text-muted-foreground text-sm">
                              Téléphone
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                              {selectedOwner?.phone || "Non renseigné"}
                            </p>
                          </div>
                          <div className="rounded-3xl bg-muted/30 px-4 py-3 transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                            <p className="text-muted-foreground text-sm">
                              Ville
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                              {selectedOwner?.city || "Non renseignée"}
                            </p>
                          </div>
                        </div>

                        <Separator />

                        <div className="grid gap-3">
                          <div className="rounded-3xl bg-muted/30 px-4 py-3 transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                            <p className="text-muted-foreground text-sm">
                              Motif
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                              {selectedAppointment.reason ||
                                "Motif non renseigné"}
                            </p>
                          </div>
                          <div className="rounded-3xl bg-muted/30 px-4 py-3 transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                            <p className="text-muted-foreground text-sm">
                              Diagnostic
                            </p>
                            <p className="mt-1 text-foreground">
                              {selectedAppointment.diagnosis ||
                                "Diagnostic à compléter"}
                            </p>
                          </div>
                          <div className="rounded-3xl bg-muted/30 px-4 py-3 transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                            <p className="text-muted-foreground text-sm">
                              Traitement
                            </p>
                            <p className="mt-1 text-foreground">
                              {selectedAppointment.treatment ||
                                "Traitement à compléter"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="rounded-3xl"
                            onClick={handlePrescription}
                            variant="outline"
                          >
                            <HugeiconsIcon
                              data-icon="inline-start"
                              icon={PillIcon}
                              strokeWidth={2}
                            />
                            Ordonnance
                          </Button>
                          <Button
                            className="rounded-3xl"
                            onClick={() => handleCallOwner(selectedOwner)}
                            variant="outline"
                          >
                            <HugeiconsIcon
                              data-icon="inline-start"
                              icon={PhoneCheckIcon}
                              strokeWidth={2}
                            />
                            Appeler
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent className="min-h-0 flex-1" value="history">
                  {patientHistory.length > 0 ||
                  selectedPatientDocuments.length > 0 ? (
                    <div className="grid gap-4">
                      {patientHistory.length > 0 ? (
                        <div className="grid gap-3">
                          {patientHistory.map((appointment) => (
                            <Card key={appointment.id} size="sm">
                              <CardHeader>
                                <CardTitle className="text-base">
                                  {appointment.type}
                                </CardTitle>
                                <CardDescription>
                                  {formatShortDate(appointment.startTime)} ·{" "}
                                  {formatTime(appointment.startTime)}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="grid gap-3">
                                <div>
                                  <p className="text-muted-foreground text-sm">
                                    Diagnostic
                                  </p>
                                  <p className="mt-1 text-foreground">
                                    {appointment.diagnosis || "Non renseigné"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-sm">
                                    Traitement
                                  </p>
                                  <p className="mt-1 text-foreground">
                                    {appointment.treatment || "Non renseigné"}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : null}

                      {selectedPatientDocuments.length > 0 ? (
                        <Card size="sm">
                          <CardHeader>
                            <CardTitle className="text-base">
                              Documents archivés
                            </CardTitle>
                            <CardDescription>
                              PDF et images importés pendant les consultations.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="grid gap-2">
                            {selectedPatientDocuments.map((document) => (
                              <div
                                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2"
                                key={document.id}
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-sm">
                                    {document.fileName}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {formatShortDate(document.createdAt)} ·{" "}
                                    {formatFileSize(Number(document.sizeBytes))}
                                    {document.description
                                      ? ` · ${document.description}`
                                      : ""}
                                  </p>
                                </div>
                                <Button
                                  onClick={() =>
                                    window.open(document.dataUrl, "_blank")
                                  }
                                  size="xs"
                                  type="button"
                                  variant="outline"
                                >
                                  Ouvrir
                                </Button>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      ) : null}
                    </div>
                  ) : (
                    <Empty className="border border-border/80 border-dashed bg-muted/20">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <HugeiconsIcon
                            className="size-5"
                            icon={WorkHistoryIcon}
                            strokeWidth={2}
                          />
                        </EmptyMedia>
                        <EmptyTitle>Aucun historique récent</EmptyTitle>
                        <EmptyDescription>
                          Ce dossier n&apos;a pas encore de consultation
                          archivée.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <Empty className="border border-border/80 border-dashed bg-muted/20">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HugeiconsIcon icon={StethoscopeIcon} strokeWidth={2} />
                  </EmptyMedia>
                  <EmptyTitle>Sélectionnez une consultation</EmptyTitle>
                  <EmptyDescription>
                    Sélectionnez une consultation pour afficher la synthèse du
                    dossier et le suivi clinique.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      {activeConsultation && activeConsultationPatient ? (
        <ConsultationSessionDialog
          appointment={activeConsultation}
          documents={activeConsultationDocuments}
          historyAppointments={activeConsultationHistory}
          onClose={() => setActiveConsultation(null)}
          onComplete={handleConsultationComplete}
          onDeleteDocument={handleConsultationDocumentDelete}
          onSaveDraft={handleConsultationSaveDraft}
          onUploadDocument={handleConsultationDocumentUpload}
          owner={activeConsultationOwner}
          patient={activeConsultationPatient}
          patientName={
            patientsById.get(activeConsultation.patientId)?.name ||
            "Patient local"
          }
        />
      ) : null}

      {billingAppointment ? (
        <BillingDialog
          appointment={billingAppointment}
          onClose={() => setBillingAppointment(null)}
          onConfirm={handleBillingConfirm}
          ownerEmail={getOwner(billingAppointment)?.email}
          ownerName={formatOwnerName(getOwner(billingAppointment))}
          patientName={
            patientsById.get(billingAppointment.patientId)?.name ||
            "Patient local"
          }
        />
      ) : null}
    </div>
  );
};

export default React.memo(Clinique);
