import { PatientStays } from "@/modules/hospitalizations/stays/patient-stays";
import {
  ArrowLeft,
  Check,
  FileText,
  FirstAid,
  History,
  Hospital,
  IdentificationBadge,
  Notebook,
  Pill,
  Scales,
  Syringe,
  User,
  X,
} from "@/lib/icons";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { SkeletonBlock } from "@/design-system/primitives";
import { Textarea } from "@/components/ui/textarea";
import { PATIENT_STATUS_META } from "@/config/status-meta";
import { useAuth } from "@/contexts/AuthContext";
import { useFocus } from "@/contexts/focus-provider";
import {
  useAppointmentsRepository,
  useConsultationSoapsRepository,
  useNotesRepository,
  useOwnersRepository,
  usePatientsRepository,
  usePrescriptionItemsRepository,
  usePrescriptionsRepository,
  useTasksRepository,
  useVaccinationsRepository,
  useWeightEntriesRepository,
} from "@/data/repositories";
import { AnesthesiaDetail, AnesthesiaList } from "@/modules/anesthesia";
import { SoapPanel } from "@/modules/consultations/components/soap-panel";
import { ConsultationProducts } from "@/modules/stock/components/consultation-products";
import {
  HospitalizationDetail,
  HospitalizationList,
} from "@/modules/hospitalizations";
import { PrescriptionList, PrescriptionSheet } from "@/modules/prescriptions";
import type { View } from "@/types";
import type {
  AnesthesiaSheet,
  Hospitalization,
  Patient,
  Vaccination,
  WeightEntry,
} from "@/types/db";
import { PatientDocumentsList } from "./components/patient-documents-list";
import { PatientHeader } from "./components/patient-header";
import { PatientContextWidgets } from "./components/patient-context-widgets";
import {
  OwnerContact,
  recordDate,
} from "./components/medical-record-summary";
import { PatientSafetyZone } from "./components/patient-safety-zone";
import { PatientPrevention } from "./components/patient-prevention";
import { buildTreatments } from "./health-card/health-card-data";
import type { TimelinePiece } from "./lib/timeline-pieces";
import { MedicalRecordTabs } from "./components/medical-record-tabs";
import { prepareAppointment } from "@/modules/shell/model/clinical-actions";
import { PatientKpiStrip } from "./components/patient-kpi-strip";
import { PatientClinicalSummary, PatientOverview } from "./components/patient-overview";
import { PatientRecordHealth } from "./components/patient-record-health";
import { RecordBlockHeading } from "./components/record-block-heading";
import { PatientTimeline } from "./components/patient-timeline";
import { OffVisitNotePanel } from "./components/off-visit-note-panel";
import { readOffVisitNote } from "@/modules/consultations/off-visit-note";
import { VaccinationDialog } from "./components/vaccination-dialog";
import { VaccinationList } from "./components/vaccination-list";
import { WeightEntryDialog } from "./components/weight-entry-dialog";
import { WeightEvolutionChart } from "./components/weight-evolution-chart";
import { DatePicker } from "@/components/ui/date-picker";
import { PageHeader } from "@/design-system/patterns/page-header";

const HealthCardDialog = lazy(() => import("./health-card/health-card-dialog").then(module => ({ default: module.HealthCardDialog })));
const PatientRecordExportDialog = lazy(() => import("./export/patient-record-export-dialog").then(module => ({ default: module.PatientRecordExportDialog })));

interface PatientDetailPageProps {
  onNavigate: (view: View) => void;
  patientId: string;
}

type PatientRecordSection =
  | "overview"
  | "vaccinations"
  | "weight"
  | "documents"
  | "prescriptions"
  | "hospitalizations"
  | "anesthesia";

const PATIENT_RECORD_SECTIONS = [
  {
    value: "overview",
    label: "Synthèse",
    icon: FirstAid,
    color: "text-rose-600 dark:text-rose-400",
  },
  {
    value: "prescriptions",
    label: "Ordonnances",
    icon: Pill,
    color: "text-violet-600 dark:text-violet-400",
  },
  {
    value: "hospitalizations",
    label: "Hospitalisations",
    icon: Hospital,
    color: "text-amber-600 dark:text-amber-400",
  },
  {
    value: "anesthesia",
    label: "Anesthésies",
    icon: Syringe,
    color: "text-teal-600 dark:text-teal-400",
  },
  {
    value: "vaccinations",
    label: "Vaccinations",
    icon: Syringe,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    value: "weight",
    label: "Poids",
    icon: Scales,
    color: "text-indigo-600 dark:text-indigo-400",
  },
  {
    value: "documents",
    label: "Documents",
    icon: FileText,
    color: "text-slate-600 dark:text-slate-300",
  },
] satisfies Array<{
  value: PatientRecordSection;
  label: string;
  icon: typeof FirstAid;
  color: string;
}>;

/** One neutral selected state for every record section (charte: #F5F5F5, #292929, 2 px underline). */
const ACTIVE_RECORD_TAB_CLASS =
  "!bg-[#F5F5F5] !text-[#292929] !border-[#F2F2F2] shadow-[inset_0_-2px_0_#292929] dark:!bg-white/5 dark:!text-white dark:!border-white/10 dark:shadow-[inset_0_-2px_0_#ffffff]";

type PatientProfileDraft = Pick<
  Patient,
  | "allergies"
  | "breed"
  | "chipNumber"
  | "chronicConditions"
  | "restraint"
  | "dateOfBirth"
  | "generalNotes"
  | "name"
  | "sex"
  | "species"
  | "status"
  | "sterilized"
  | "tattooNumber"
>;

function createProfileDraft(patient: Patient): PatientProfileDraft {
  return {
    allergies: patient.allergies ?? "",
    breed: patient.breed ?? "",
    chipNumber: patient.chipNumber ?? "",
    chronicConditions: patient.chronicConditions ?? "",
    restraint: patient.restraint ?? "",
    dateOfBirth: patient.dateOfBirth ?? "",
    generalNotes: patient.generalNotes ?? "",
    name: patient.name,
    sex: patient.sex,
    species: patient.species,
    status: patient.status,
    sterilized: patient.sterilized ?? false,
    tattooNumber: patient.tattooNumber ?? "",
  };
}

export function PatientDetailPage({
  onNavigate,
  patientId,
}: PatientDetailPageProps) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { requestFocus } = useFocus();
  const patientsRepo = usePatientsRepository();
  const appointmentsRepo = useAppointmentsRepository();
  const prescriptionsRepo = usePrescriptionsRepository();
  const prescriptionItemsRepo = usePrescriptionItemsRepository();
  const vaccinationsRepo = useVaccinationsRepository();
  const weightsRepo = useWeightEntriesRepository();
  const soapsRepo = useConsultationSoapsRepository();
  const notesRepo = useNotesRepository();
  const ownersRepo = useOwnersRepository();
  const tasksRepo = useTasksRepository();

  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [pdfExportOpen, setPdfExportOpen] = useState(false);
  const [healthCardOpen, setHealthCardOpen] = useState(false);
  const [editingWeight, setEditingWeight] = useState<WeightEntry | null>(null);
  const [vaccinationDialogOpen, setVaccinationDialogOpen] = useState(false);
  const [editingVaccination, setEditingVaccination] =
    useState<Vaccination | null>(null);
  const [activeTab, setActiveTab] = useState<PatientRecordSection>("overview");
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<PatientProfileDraft | null>(
    null
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const [soapAppointmentId, setSoapAppointmentId] = useState<string | null>(
    null
  );
  /** "new" writes a note without a visit; a note id reads one. */
  const [offVisitNote, setOffVisitNote] = useState<"new" | string | null>(null);
  // A search result asks for its note: opened once the record's notes are read.
  useEffect(() => {
    const wanted = sessionStorage.getItem("patient:open-note");
    const note = wanted ? notesRepo.data.find((entry) => entry.id === wanted) : null;
    if (!note) return;
    sessionStorage.removeItem("patient:open-note");
    if (note.patientId === patientId && readOffVisitNote(note)) setOffVisitNote(note.id);
  }, [notesRepo.data, patientId]);

  const [selectedHospitalization, setSelectedHospitalization] =
    useState<Hospitalization | null>(null);
  const [selectedAnesthesia, setSelectedAnesthesia] =
    useState<AnesthesiaSheet | null>(null);

  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [prescriptionAppointmentId, setPrescriptionAppointmentId] = useState<
    string | null
  >(null);
  // Session créée automatiquement pour porter une ordonnance : si l'utilisateur
  // ferme la sheet sans rien enregistrer, on la supprime pour ne pas laisser
  // de rendez-vous fantôme qui polluerait la note clinique.
  const [autoCreatedAppointmentId, setAutoCreatedAppointmentId] = useState<
    string | null
  >(null);

  const handlePrescriptionOpenChange = async (next: boolean) => {
    setPrescriptionOpen(next);
    if (!next) {
      if (autoCreatedAppointmentId) {
        const saved = prescriptionsRepo.forAppointment(
          autoCreatedAppointmentId
        );
        if (saved.length === 0) {
          try {
            await appointmentsRepo.remove(autoCreatedAppointmentId);
          } catch (err) {
            console.error(
              "[PatientDetailPage] cleanup auto-created appointment failed",
              err
            );
          }
        }
        setAutoCreatedAppointmentId(null);
      }
      setPrescriptionAppointmentId(null);
    }
  };

  // Stable "now" snapshot — évite l'avertissement React `Date.now()` impurity
  // tout en restant à jour toutes les 60s pour les KPIs temporels.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const patient = useMemo(
    () => patientsRepo.data.find((p) => p.id === patientId) ?? null,
    [patientsRepo.data, patientId]
  );

  useEffect(() => {
    if (
      !patient ||
      sessionStorage.getItem("vetera:pending-vaccination") !== patientId
    )
      return;
    sessionStorage.removeItem("vetera:pending-vaccination");
    setEditingVaccination(null);
    setVaccinationDialogOpen(true);
  }, [patient, patientId]);

  const owner = useMemo(
    () => ownersRepo.data.find((o) => o.id === patient?.ownerId) ?? undefined,
    [ownersRepo.data, patient?.ownerId]
  );

  const weightEntries = useMemo(
    () => weightsRepo.forPatient(patientId),
    [weightsRepo, patientId]
  );
  const vaccinations = useMemo(
    () => vaccinationsRepo.forPatient(patientId),
    [vaccinationsRepo, patientId]
  );
  const appointments = useMemo(
    () =>
      appointmentsRepo.data
        .filter((apt) => apt.patientId === patientId)
        .sort(
          (a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        ),
    [appointmentsRepo.data, patientId]
  );
  const lastAppointment = useMemo(
    () =>
      appointments.find(
        (apt) =>
          apt.status === "completed" && new Date(apt.startTime).getTime() <= now
      ) ?? null,
    [appointments, now]
  );
  const nextAppointment = useMemo(
    () =>
      appointments
        .filter(
          (apt) =>
            [
              "scheduled",
              "confirmed",
              "arrived",
              "waiting",
              "in_progress",
            ].includes(apt.status) &&
            (new Date(apt.startTime).getTime() > now ||
              ["arrived", "waiting", "in_progress"].includes(apt.status))
        )
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )[0] ?? null,
    [appointments, now]
  );
  // The clinical summary shows what is still being given today.
  const treatments = useMemo(
    () =>
      patient
        ? buildTreatments({
            items: prescriptionItemsRepo.data,
            now: new Date(now),
            patient,
            prescriptions: prescriptionsRepo.data,
          })
        : { hidden: 0, items: [] },
    [now, patient, prescriptionItemsRepo.data, prescriptionsRepo.data]
  );
  const clinicalNoteAppointment = useMemo(
    () =>
      appointments.find(
        (appointment) => appointment.status === "in_progress"
      ) ??
      appointments.find((appointment) => appointment.status === "completed") ??
      null,
    [appointments]
  );
  const patientTasks = tasksRepo.data.filter(
    (task) => task.patientId === patientId && task.status !== "done"
  );

  useEffect(() => {
    setActiveTab("overview");
    setIsProfileEditorOpen(false);
    setSoapAppointmentId(null);
    setSelectedHospitalization(null);
    setSelectedAnesthesia(null);
    setPrescriptionOpen(false);
    setAutoCreatedAppointmentId(null);
  }, [patientId]);

  const handleTabChange = (val: PatientRecordSection | "timeline") => {
    // The chronology follows the synthesis: asking for it scrolls there.
    if (val === "timeline") {
      setActiveTab("overview");
      requestAnimationFrame(() =>
        document
          .getElementById("patient-chronologie")
          ?.scrollIntoView({ block: "start" })
      );
    } else {
      setActiveTab(val);
    }
    setSelectedHospitalization(null);
    setSelectedAnesthesia(null);
    setPrescriptionAppointmentId(null);
    setPrescriptionOpen(false);
  };

  if (patientsRepo.loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (patientsRepo.error) {
    return (
      <div className="p-8">
        <h2 className="text-lg font-semibold">
          Le dossier ne peut pas être chargé
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Réessayez pour retrouver les informations du patient.
        </p>
        <Button className="mt-4" onClick={() => void patientsRepo.refresh()}>
          Réessayer
        </Button>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="font-semibold text-lg">
          {t("patientDetail.notFoundDetails.title")}
        </p>
        <p className="text-muted-foreground text-sm">
          {t("patientDetail.notFoundDetails.description")}
        </p>
        <Button onClick={() => onNavigate("patients")} variant="outline">
          <ArrowLeft className="size-4" weight="duotone" />
          {t("patientDetail.notFoundDetails.back")}
        </Button>
      </div>
    );
  }

  const openNewWeight = () => {
    setEditingWeight(null);
    setWeightDialogOpen(true);
  };
  const openEditWeight = (entry: WeightEntry) => {
    setEditingWeight(entry);
    setWeightDialogOpen(true);
  };
  const openNewVaccination = () => {
    setEditingVaccination(null);
    setVaccinationDialogOpen(true);
  };
  const openEditVaccination = (entry: Vaccination) => {
    setEditingVaccination(entry);
    setVaccinationDialogOpen(true);
  };
  const openProfileEditor = () => {
    setProfileDraft(createProfileDraft(patient));
    setIsProfileEditorOpen(true);
  };
  // Dirige l'utilisateur vers le bon formulaire selon le repère manquant.
  const completeRecordCheck = (label: string) => {
    // Weighings and vaccines are recorded in their own tabs.
    if (label === "Première pesée") {
      handleTabChange("weight");
      return;
    }
    if (label === "Vaccination") {
      handleTabChange("vaccinations");
      return;
    }
    openProfileEditor();
  };
  const closeProfileEditor = () => {
    setProfileDraft(null);
    setIsProfileEditorOpen(false);
  };
  const saveProfile = async () => {
    if (!profileDraft?.name.trim() || !profileDraft.species.trim()) {
      toast.error("Le nom et l'espèce du patient sont obligatoires.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await patientsRepo.update(patient.id, {
        ...profileDraft,
        allergies: profileDraft.allergies?.trim() || undefined,
        breed: profileDraft.breed?.trim() || undefined,
        chipNumber: profileDraft.chipNumber?.trim() || undefined,
        chronicConditions: profileDraft.chronicConditions?.trim() || undefined,
        restraint: profileDraft.restraint?.trim() || undefined,
        dateOfBirth: profileDraft.dateOfBirth || undefined,
        generalNotes: profileDraft.generalNotes?.trim() || undefined,
        name: profileDraft.name.trim(),
        species: profileDraft.species.trim(),
        sterilized: profileDraft.sterilized ?? false,
        tattooNumber: profileDraft.tattooNumber?.trim() || undefined,
      });
      if (!updated) {
        toast.error("Le dossier n'a pas pu être mis à jour.");
        return;
      }
      toast.success("Dossier patient mis à jour.");
      closeProfileEditor();
    } catch (error) {
      console.error(error);
      toast.error("Impossible d'enregistrer les modifications.");
    } finally {
      setIsSavingProfile(false);
    }
  };
  const recentVisits = appointments.filter((appointment) =>
    ["completed", "in_progress"].includes(appointment.status)
  );
  const scrollRecordToTop = () =>
    requestAnimationFrame(() => {
      const scrollPanel = pageRef.current?.closest<HTMLElement>(
        '[data-slot="shell-scroll-panel"]'
      );
      if (scrollPanel) scrollPanel.scrollTo({ top: 0, behavior: "instant" });
      else pageRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  const openOffVisitNote = (target: "new" | string) => {
    setSoapAppointmentId(null);
    setOffVisitNote(target);
    scrollRecordToTop();
  };
  const openPiece = (piece: TimelinePiece) => {
    if (piece.kind === "invoice") {
      requestFocus("invoice", piece.sourceId);
      onNavigate("finances");
    } else if (piece.id.startsWith("prescription-")) {
      handleTabChange("prescriptions");
    } else {
      handleTabChange("documents");
    }
  };
  const openSoapForAppointment = (appointmentId: string) => {
    setOffVisitNote(null);
    setSoapAppointmentId(appointmentId);
    requestAnimationFrame(() => {
      const scrollPanel = pageRef.current?.closest<HTMLElement>(
        '[data-slot="shell-scroll-panel"]'
      );
      if (scrollPanel) {
        scrollPanel.scrollTo({ top: 0, behavior: "instant" });
      } else {
        pageRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
      }
    });
  };

  return (
    <div ref={pageRef} className="patient-record-page dashboard-stage flex w-full min-w-0 flex-col gap-5 px-4 pb-8 lg:px-6">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <PageHeader
          className="patient-record-heading"
          // A trail back to the list: « Patients / Kejounti · ID-0010 ».
          title={
            <nav aria-label="Fil d’Ariane" className="patient-record-trail">
              <button
                className="patient-record-list-link"
                onClick={() => onNavigate("patients")}
                title="Retour à la liste des patients"
                type="button"
              >
                Patients
              </button>
              <span aria-hidden="true">/</span>
              <span aria-current="page">
                {patient.name}
                {patient.reference ? ` · ${patient.reference}` : ""}
              </span>
            </nav>
          }
        />
        {soapAppointmentId && (
          <section id="patient-consultation-note" aria-label={`Note de consultation de ${patient.name}`} className="space-y-4 border-b border-border pb-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Consultation · {patient.name}</h2>
              <Button onClick={() => setSoapAppointmentId(null)} size="sm" variant="ghost">Revenir au dossier</Button>
            </div>
            <SoapPanel appointmentId={soapAppointmentId} key={soapAppointmentId} patientId={patientId} />
            <ConsultationProducts key={`products:${soapAppointmentId}`} appointmentId={soapAppointmentId} patientId={patientId} />
          </section>
        )}
        {offVisitNote && (
          <OffVisitNotePanel
            key={offVisitNote}
            note={offVisitNote === "new" ? null : notesRepo.data.find((note) => note.id === offVisitNote) ?? null}
            onClose={() => setOffVisitNote(null)}
            onSaved={(note) => setOffVisitNote(note.id)}
            patientId={patientId}
            patientName={patient.name}
          />
        )}
        <PatientHeader
          onEditProfile={openProfileEditor}
          onExportPdf={() => setPdfExportOpen(true)}
          onHealthCard={() => setHealthCardOpen(true)}
          onNewAppointment={() => {
            prepareAppointment(patient.id);
            onNavigate("agenda");
          }}
          onOpenClinicalNote={
            clinicalNoteAppointment
              ? () => openSoapForAppointment(clinicalNoteAppointment.id)
              : undefined
          }
          onNewOffVisitNote={() => openOffVisitNote("new")}
          onOpenCare={() => {
            requestFocus("care_patient", patientId);
            onNavigate("clinique");
          }}
          owner={owner}
          patient={patient}
        />
        {pdfExportOpen && <Suspense fallback={<p role="status" className="text-sm text-muted-foreground">Ouverture de l’export PDF…</p>}>
          <PatientRecordExportDialog key={patientId} patientId={patientId} patientName={patient.name} onClose={() => setPdfExportOpen(false)} />
        </Suspense>}
        {healthCardOpen && <Suspense fallback={<p role="status" className="text-sm text-muted-foreground">Ouverture du carnet de santé…</p>}>
          <HealthCardDialog key={patientId} owner={owner} patient={patient} onClose={() => setHealthCardOpen(false)} />
        </Suspense>}
        <PatientSafetyZone patient={patient} />
        <section className="patient-record-indicators" aria-label={`Indicateurs de ${patient.name}`}>
          <PatientContextWidgets
            patientName={patient.name}
            appointments={appointments}
            appointmentsLoading={appointmentsRepo.loading}
            appointmentsError={Boolean(appointmentsRepo.error)}
            now={now}
            tasks={patientTasks}
            tasksLoading={tasksRepo.loading}
            tasksError={Boolean(tasksRepo.error)}
            onOpenHistory={() => {
              handleTabChange("timeline");
              requestAnimationFrame(() =>
                document
                  .getElementById("record-tab-content")
                  ?.scrollIntoView({ block: "start" })
              );
            }}
            onOpenTask={(taskId) => {
              requestFocus("task", taskId);
              onNavigate("taches");
            }}
            onRetryTasks={() => void tasksRepo.refresh()}
          />
          {appointmentsRepo.loading ||
          vaccinationsRepo.loading ||
          weightsRepo.loading ? (
            <div
              className="medical-kpi-strip"
              aria-label="Chargement du suivi clinique"
              aria-busy="true"
            >
              {[0, 1, 2].map((index) => (
                <div className="medical-kpi" key={index}>
                  <SkeletonBlock className="h-24" />
                </div>
              ))}
            </div>
          ) : appointmentsRepo.error ||
            vaccinationsRepo.error ||
            weightsRepo.error ? (
            <div role="status" className="medical-kpi-load-error">
              <span>Une partie du suivi clinique n’a pas pu être chargée.</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void appointmentsRepo.refresh();
                  void vaccinationsRepo.refresh();
                  void weightsRepo.refresh();
                }}
              >
                Réessayer
              </Button>
            </div>
          ) : (
            <PatientKpiStrip
              lastVisit={lastAppointment?.startTime ?? patient.lastVisit}
              nextAppointment={nextAppointment ?? undefined}
              onAppointmentClick={() => onNavigate("agenda")}
              onTimelineClick={() => handleTabChange("timeline")}
              onWeightClick={() => handleTabChange("weight")}
              showLastVisit={false}
              weightEntries={weightEntries}
            />
          )}

        </section>


        {isProfileEditorOpen && profileDraft ? (
          <section className="rounded-2xl border border-border/80 bg-card/95 shadow-md p-5 sm:p-6 backdrop-blur-xl">
            <div className="flex flex-col gap-4 border-border/70 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-foreground text-lg tracking-[-0.02em]">
                  Modifier le dossier
                </p>
                <p className="mt-1 text-muted-foreground text-sm">
                  Les changements sont enregistrés directement dans la fiche
                  patient.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="h-9"
                  disabled={isSavingProfile}
                  onClick={closeProfileEditor}
                  size="sm"
                  variant="outline"
                >
                  <X className="size-4" weight="bold" />
                  Annuler
                </Button>
                <Button
                  className="h-9"
                  disabled={isSavingProfile}
                  onClick={saveProfile}
                  size="sm"
                >
                  {isSavingProfile ? (
                    <Spinner className="size-4" />
                  ) : (
                    <Check className="size-4" weight="bold" />
                  )}
                  Enregistrer
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Nom</span>
                <Input
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? { ...current, name: event.target.value }
                        : current
                    )
                  }
                  value={profileDraft.name}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Espèce</span>
                <Input
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? { ...current, species: event.target.value }
                        : current
                    )
                  }
                  placeholder="Chien, chat, NAC…"
                  value={profileDraft.species}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Race</span>
                <Input
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? { ...current, breed: event.target.value }
                        : current
                    )
                  }
                  value={profileDraft.breed}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Date de naissance</span>
                <DatePicker clearable
                  onChange={(value) =>
                    setProfileDraft((current) =>
                      current
                        ? { ...current, dateOfBirth: value }
                        : current
                    )
                  }
                  value={profileDraft.dateOfBirth ?? ""}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Sexe</span>
                <NativeSelect
                  className="w-full"
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? {
                            ...current,
                            sex: event.target.value as Patient["sex"],
                          }
                        : current
                    )
                  }
                  value={profileDraft.sex}
                >
                  <NativeSelectOption value="M">Mâle</NativeSelectOption>
                  <NativeSelectOption value="F">Femelle</NativeSelectOption>
                </NativeSelect>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Statut clinique</span>
                <NativeSelect
                  className="w-full"
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? {
                            ...current,
                            status: event.target.value as Patient["status"],
                          }
                        : current
                    )
                  }
                  value={profileDraft.status}
                >
                  {Object.entries(PATIENT_STATUS_META).map(([value, meta]) => (
                    <NativeSelectOption key={value} value={value}>
                      {meta.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-medium">Allergies</span>
                <Input
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? { ...current, allergies: event.target.value }
                        : current
                    )
                  }
                  placeholder="Aucune allergie connue"
                  value={profileDraft.allergies}
                />
              </label>
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-medium">
                  Antécédents / maladies chroniques
                </span>
                <Input
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? { ...current, chronicConditions: event.target.value }
                        : current
                    )
                  }
                  placeholder="Aucun antécédent signalé"
                  value={profileDraft.chronicConditions}
                />
              </label>
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-medium">Contention</span>
                <Input
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? { ...current, restraint: event.target.value }
                        : current
                    )
                  }
                  placeholder="Muselière, à deux personnes, sédation avant soins…"
                  value={profileDraft.restraint}
                />
              </label>
              <label className="grid gap-2 text-sm md:col-span-2 xl:col-span-4">
                <span className="font-medium">Notes générales</span>
                <Textarea
                  className="min-h-20 resize-y"
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? { ...current, generalNotes: event.target.value }
                        : current
                    )
                  }
                  placeholder="Informations utiles pour le suivi de ce patient…"
                  value={profileDraft.generalNotes}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">N° de puce électronique</span>
                <Input
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? { ...current, chipNumber: event.target.value }
                        : current
                    )
                  }
                  placeholder="15 chiffres…"
                  value={profileDraft.chipNumber}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Tatouage</span>
                <Input
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? { ...current, tattooNumber: event.target.value }
                        : current
                    )
                  }
                  placeholder="N° de tatouage…"
                  value={profileDraft.tattooNumber}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-sm md:col-span-2">
                <input
                  checked={Boolean(profileDraft.sterilized)}
                  className="size-4 accent-primary"
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? { ...current, sterilized: event.target.checked }
                        : current
                    )
                  }
                  type="checkbox"
                />
                <span className="font-medium">
                  Animal stérilisé / castré
                </span>
              </label>
            </div>
          </section>
        ) : null}

        <div className="medical-workspace">
          <section
            className="medical-register"
            aria-label={`Dossier clinique de ${patient.name}`}
          >
            <MedicalRecordTabs label="Sections du dossier médical">
              {PATIENT_RECORD_SECTIONS.map((section) => {
                const SectionIcon = section.icon;
                const isSelected = activeTab === section.value;
                return (
                  <button
                    key={section.value}
                    type="button"
                    role="tab"
                    tabIndex={isSelected ? 0 : -1}
                    id={`record-tab-${section.value}`}
                    aria-selected={isSelected}
                    aria-controls="record-tab-content"
                    className={cn(
                      "group cursor-pointer transition",
                      isSelected && ACTIVE_RECORD_TAB_CLASS
                    )}
                    onClick={() => handleTabChange(section.value)}
                  >
                    <SectionIcon
                      className={cn(
                        "size-4 shrink-0 transition-transform group-hover:scale-110",
                        section.color
                      )}
                      weight="duotone"
                      aria-hidden="true"
                    />
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </MedicalRecordTabs>
            <div
              className="medical-tab-content"
              id="record-tab-content"
              role="tabpanel"
              tabIndex={0}
              aria-labelledby={`record-tab-${activeTab}`}
            >
              {activeTab === "overview" && (
                <>
                  <PatientClinicalSummary
                    chronicConditions={patient.chronicConditions}
                    onOpenPrescriptions={() => handleTabChange("prescriptions")}
                    prevention={
                      <PatientPrevention
                        now={now}
                        onOpenVaccinations={() => handleTabChange("vaccinations")}
                        patientId={patientId}
                        vaccinations={vaccinations}
                      />
                    }
                    treatments={treatments}
                  />
                  <PatientOverview
                    error={Boolean(appointmentsRepo.error)}
                    getSoap={soapsRepo.forAppointment}
                    loading={appointmentsRepo.loading}
                    onOpenVisit={openSoapForAppointment}
                    onRetry={() => void appointmentsRepo.refresh()}
                    patientName={patient.name}
                    visits={recentVisits}
                  />
                  <section
                    aria-labelledby="patient-chronologie-title"
                    className="patient-chronologie"
                    id="patient-chronologie"
                  >
                    <RecordBlockHeading
                      as="h2"
                      className="patient-chronologie-title"
                      icon={History}
                      id="patient-chronologie-title"
                    >
                      Chronologie
                    </RecordBlockHeading>
                    <PatientTimeline
                      className="border-0 shadow-none"
                      onEditWeight={openEditWeight}
                      onJumpToAppointment={openSoapForAppointment}
                      onOpenNote={openOffVisitNote}
                      onOpenPiece={openPiece}
                      patientId={patientId}
                      summarizedVisitId={recentVisits[0]?.id}
                    />
                  </section>
                </>
              )}
              {activeTab === "vaccinations" &&
                (vaccinationsRepo.loading ? (
                  <SkeletonBlock className="h-48" />
                ) : vaccinationsRepo.error ? (
                  <div className="medical-empty">
                    Les vaccinations ne sont pas disponibles.{" "}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void vaccinationsRepo.refresh()}
                    >
                      Réessayer
                    </Button>
                  </div>
                ) : (
                  <VaccinationList
                    className="border-0 shadow-none"
                    onEdit={openEditVaccination}
                    onNew={openNewVaccination}
                    patientId={patientId}
                  />
                ))}
              {activeTab === "weight" &&
                (weightsRepo.loading ? (
                  <SkeletonBlock className="h-48" />
                ) : weightsRepo.error ? (
                  <div className="medical-empty">
                    Les pesées ne sont pas disponibles.{" "}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void weightsRepo.refresh()}
                    >
                      Réessayer
                    </Button>
                  </div>
                ) : (
                  <WeightEvolutionChart
                    className="border-0 shadow-none"
                    entries={weightEntries}
                    onAdd={openNewWeight}
                    onEditEntry={openEditWeight}
                    title="Évolution du poids"
                    emptyMessage={t("patientDetail.overview.weightEmpty")}
                  />
                ))}
              {activeTab === "documents" && (
                <PatientDocumentsList
                  className="border-0 shadow-none"
                  onOpenNotes={() => onNavigate("notes")}
                  onOpenOffVisitNote={openOffVisitNote}
                  patientId={patientId}
                />
              )}

              {activeTab === "prescriptions" ? (
                <PrescriptionList
                  onNew={async () => {
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    const todayEnd = new Date();
                    todayEnd.setHours(23, 59, 59, 999);

                    const todayApt = appointments.find((apt) => {
                      const d = new Date(apt.startTime);
                      return (
                        d >= todayStart &&
                        d <= todayEnd &&
                        apt.status !== "cancelled"
                      );
                    });

                    if (todayApt) {
                      setPrescriptionAppointmentId(todayApt.id);
                      setPrescriptionOpen(true);
                    } else {
                      const nowTime = new Date();
                      const endTime = new Date(
                        nowTime.getTime() + 30 * 60 * 1000
                      );

                      try {
                        const newApt = await appointmentsRepo.saveAppointment({
                          patientId,
                          title: `Consultation - ${patient.name}`,
                          type: "Consultation",
                          status: "in_progress",
                          startTime: nowTime,
                          endTime,
                          vetId: currentUser?.id,
                          reason: "Ordonnance",
                        });

                        if (newApt && newApt.id) {
                          setPrescriptionAppointmentId(newApt.id);
                          setAutoCreatedAppointmentId(newApt.id);
                          setPrescriptionOpen(true);
                          toast.success(
                            "Nouvelle session de consultation créée pour l'ordonnance."
                          );
                        }
                      } catch (err) {
                        console.error(
                          "Failed to create quick appointment",
                          err
                        );
                        toast.error(
                          "Impossible de créer une nouvelle session de consultation."
                        );
                      }
                    }
                  }}
                  patient={patient}
                />
              ) : null}

              {activeTab === "hospitalizations" && <PatientStays patientId={patientId} onOpen={() => onNavigate("clinique")}/>}
              {activeTab === "hospitalizations" ? (
                selectedHospitalization ? (
                  <HospitalizationDetail
                    hospitalization={selectedHospitalization}
                    onBack={() => setSelectedHospitalization(null)}
                    patient={patient}
                  />
                ) : (
                  <HospitalizationList
                    onSelect={setSelectedHospitalization}
                    patient={patient}
                  />
                )
              ) : null}

              {activeTab === "anesthesia" ? (
                selectedAnesthesia ? (
                  <AnesthesiaDetail
                    onBack={() => setSelectedAnesthesia(null)}
                    patient={patient}
                    sheet={selectedAnesthesia}
                  />
                ) : (
                  <AnesthesiaList
                    onSelect={setSelectedAnesthesia}
                    patient={patient}
                  />
                )
              ) : null}
            </div>
          </section>

        </div>

        <aside
          className="medical-permanent"
          aria-labelledby="medical-permanent-title"
        >
          <h2 className="medical-permanent-header" id="medical-permanent-title">
            Informations permanentes
          </h2>
          <div className="medical-permanent-grid">
          <section>
            <RecordBlockHeading icon={IdentificationBadge}>Identité</RecordBlockHeading>
            <dl className="medical-facts">
              <div>
                <dt>Date de naissance</dt>
                <dd>{recordDate(patient.dateOfBirth)}</dd>
              </div>
              <div>
                <dt>Enregistré le</dt>
                <dd>{recordDate(patient.createdAt)}</dd>
              </div>
              {patient.chipNumber ? (
                <div>
                  <dt>Puce</dt>
                  <dd>{patient.chipNumber}</dd>
                </div>
              ) : null}
              {patient.tattooNumber ? (
                <div>
                  <dt>Tatouage</dt>
                  <dd>{patient.tattooNumber}</dd>
                </div>
              ) : null}
            </dl>
          </section>
          {ownersRepo.loading ? (
            <section aria-busy="true">
              <RecordBlockHeading icon={User}>Propriétaire</RecordBlockHeading>
              <SkeletonBlock className="h-20" />
            </section>
          ) : ownersRepo.error ? (
            <section>
              <RecordBlockHeading icon={User}>Propriétaire</RecordBlockHeading>
              <p className="medical-empty">
                Les coordonnées ne sont pas disponibles.
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void ownersRepo.refresh()}
              >
                Réessayer
              </Button>
            </section>
          ) : (
            <OwnerContact owner={owner} />
          )}
          <section>
            <RecordBlockHeading icon={Notebook}>Notes générales</RecordBlockHeading>
            <p className="medical-note">
              {patient.generalNotes?.trim() ||
                "Aucune note générale enregistrée."}
            </p>
            <Button
              className="mt-3"
              size="sm"
              variant="ghost"
              onClick={openProfileEditor}
            >
              Modifier les informations
            </Button>
          </section>
          <PatientRecordHealth
            onCompleteCheck={completeRecordCheck}
            owner={owner}
            patient={patient}
            vaccinations={vaccinations}
            weightEntries={weightEntries}
          />
          </div>
        </aside>
      </div>

      <WeightEntryDialog
        onOpenChange={(open) => {
          setWeightDialogOpen(open);
          if (!open) {
            setEditingWeight(null);
          }
        }}
        open={weightDialogOpen}
        patientId={patientId}
        weightEntry={editingWeight}
      />

      <VaccinationDialog
        onOpenChange={(open) => {
          setVaccinationDialogOpen(open);
          if (!open) {
            setEditingVaccination(null);
          }
        }}
        open={vaccinationDialogOpen}
        patientId={patientId}
        vaccination={editingVaccination}
      />

      <PrescriptionSheet
        appointmentId={prescriptionAppointmentId ?? ""}
        onOpenChange={(next) => void handlePrescriptionOpenChange(next)}
        open={prescriptionOpen && Boolean(prescriptionAppointmentId)}
        patient={patient}
        vet={currentUser}
      />
    </div>
  );
}
