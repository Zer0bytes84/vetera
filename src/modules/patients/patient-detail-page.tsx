import { PatientStays } from "@/modules/hospitalizations/stays/patient-stays";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  FileText,
  FirstAid,
  Hospital,
  Pill,
  Scales,
  Syringe,
  X,
} from "@/lib/icons";
import { useEffect, useMemo, useRef, useState } from "react";
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
  useOwnersRepository,
  usePatientsRepository,
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
import { MedicalRecordTabs } from "./components/medical-record-tabs";
import { prepareAppointment } from "@/modules/shell/model/clinical-actions";
import { PatientKpiStrip } from "./components/patient-kpi-strip";
import { PatientRecordHealth } from "./components/patient-record-health";
import { PatientTimeline } from "./components/patient-timeline";
import { VaccinationDialog } from "./components/vaccination-dialog";
import { VaccinationList } from "./components/vaccination-list";
import { WeightEntryDialog } from "./components/weight-entry-dialog";
import { WeightEvolutionChart } from "./components/weight-evolution-chart";
import { getNextDueVaccination } from "./lib";

interface PatientDetailPageProps {
  onNavigate: (view: View) => void;
  patientId: string;
}

type PatientRecordSection =
  | "overview"
  | "vaccinations"
  | "weight"
  | "documents"
  | "timeline"
  | "prescriptions"
  | "hospitalizations"
  | "anesthesia";

const PATIENT_RECORD_SECTIONS = [
  {
    value: "overview",
    label: "Synthèse",
    icon: FirstAid,
    color: "text-rose-600 dark:text-rose-400",
    activeClass: "!bg-rose-50 !text-rose-700 !border-rose-200/80 dark:!bg-rose-950/50 dark:!text-rose-300 dark:!border-rose-800/40 shadow-xs",
  },
  {
    value: "timeline",
    label: "Chronologie",
    icon: Clock,
    color: "text-sky-600 dark:text-sky-400",
    activeClass: "!bg-sky-50 !text-sky-700 !border-sky-200/80 dark:!bg-sky-950/50 dark:!text-sky-300 dark:!border-sky-800/40 shadow-xs",
  },
  {
    value: "prescriptions",
    label: "Ordonnances",
    icon: Pill,
    color: "text-violet-600 dark:text-violet-400",
    activeClass: "!bg-violet-50 !text-violet-700 !border-violet-200/80 dark:!bg-violet-950/50 dark:!text-violet-300 dark:!border-violet-800/40 shadow-xs",
  },
  {
    value: "hospitalizations",
    label: "Hospitalisations",
    icon: Hospital,
    color: "text-amber-600 dark:text-amber-400",
    activeClass: "!bg-amber-50 !text-amber-700 !border-amber-200/80 dark:!bg-amber-950/50 dark:!text-amber-300 dark:!border-amber-800/40 shadow-xs",
  },
  {
    value: "anesthesia",
    label: "Anesthésies",
    icon: Syringe,
    color: "text-teal-600 dark:text-teal-400",
    activeClass: "!bg-teal-50 !text-teal-700 !border-teal-200/80 dark:!bg-teal-950/50 dark:!text-teal-300 dark:!border-teal-800/40 shadow-xs",
  },
  {
    value: "vaccinations",
    label: "Vaccinations",
    icon: Syringe,
    color: "text-emerald-600 dark:text-emerald-400",
    activeClass: "!bg-emerald-50 !text-emerald-700 !border-emerald-200/80 dark:!bg-emerald-950/50 dark:!text-emerald-300 dark:!border-emerald-800/40 shadow-xs",
  },
  {
    value: "weight",
    label: "Poids",
    icon: Scales,
    color: "text-indigo-600 dark:text-indigo-400",
    activeClass: "!bg-indigo-50 !text-indigo-700 !border-indigo-200/80 dark:!bg-indigo-950/50 dark:!text-indigo-300 dark:!border-indigo-800/40 shadow-xs",
  },
  {
    value: "documents",
    label: "Documents",
    icon: FileText,
    color: "text-slate-600 dark:text-slate-300",
    activeClass: "!bg-slate-100 !text-slate-800 !border-slate-300/80 dark:!bg-slate-800/60 dark:!text-slate-200 dark:!border-slate-700/60 shadow-xs",
  },
] satisfies Array<{
  value: PatientRecordSection;
  label: string;
  icon: typeof FirstAid;
  color: string;
  activeClass: string;
}>;

type PatientProfileDraft = Pick<
  Patient,
  | "allergies"
  | "breed"
  | "chipNumber"
  | "chronicConditions"
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
  const vaccinationsRepo = useVaccinationsRepository();
  const weightsRepo = useWeightEntriesRepository();
  const ownersRepo = useOwnersRepository();
  const tasksRepo = useTasksRepository();

  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
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
  // Référence unique pour la dernière pesée (tri par date décroissante).
  const latestWeight = useMemo(
    () => weightsRepo.latestFor(patientId),
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

  const handleTabChange = (val: PatientRecordSection) => {
    setActiveTab(val);
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
    if (label === "Poids") {
      openNewWeight();
      return;
    }
    if (label === "Vaccins") {
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
  const openSoapForAppointment = (appointmentId: string) => {
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
        <header className="patient-record-heading">
          <h2>Dossier patient</h2>
        </header>
        <PatientContextWidgets
          patientName={patient.name}
          appointments={appointments}
          appointmentsLoading={appointmentsRepo.loading}
          appointmentsError={Boolean(appointmentsRepo.error)}
          lastAppointment={lastAppointment}
          lastVisit={patient.lastVisit}
          nextAppointment={nextAppointment}
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
          onOpenLastConsultation={() => {
            if (lastAppointment) {
              openSoapForAppointment(lastAppointment.id);
            } else {
              handleTabChange("timeline");
              requestAnimationFrame(() =>
                document
                  .getElementById("record-tab-content")
                  ?.scrollIntoView({ block: "start" })
              );
            }
          }}
          onOpenTask={(taskId) => {
            requestFocus("task", taskId);
            onNavigate("taches");
          }}
          onRetryTasks={() => void tasksRepo.refresh()}
        />
        <div className="patient-record-actions flex flex-wrap items-center gap-2">
          <Button
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => onNavigate("patients")}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft className="size-4" weight="duotone" />
            {t("patientDetail.back")}
          </Button>
          <Button variant="outline" onClick={() => { requestFocus("care_patient", patientId); onNavigate("clinique"); }}>Ouvrir les soins de ce patient</Button>
        </div>

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
        <PatientHeader
          onEditProfile={openProfileEditor}
          onNewAppointment={() => {
            prepareAppointment(patient.id);
            onNavigate("agenda");
          }}
          onOpenClinicalNote={
            clinicalNoteAppointment
              ? () => openSoapForAppointment(clinicalNoteAppointment.id)
              : undefined
          }
          owner={owner}
          patient={patient}
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
            nextVaccination={getNextDueVaccination(vaccinations)}
            now={now}
            onAppointmentClick={() => onNavigate("agenda")}
            onTimelineClick={() => handleTabChange("timeline")}
            onVaccinationClick={() => handleTabChange("vaccinations")}
            onWeightClick={() => handleTabChange("weight")}
            showLastVisit={false}
            weightEntries={weightEntries}
          />
        )}

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
                  placeholder="Chien, chat, NAC..."
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
                <Input
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? { ...current, dateOfBirth: event.target.value }
                        : current
                    )
                  }
                  type="date"
                  value={profileDraft.dateOfBirth}
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
                  placeholder="Informations utiles pour le suivi de ce patient..."
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
                  placeholder="15 chiffres..."
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
                  placeholder="N° de tatouage..."
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
            aria-labelledby="medical-record-title"
          >
            <div className="medical-register-header">
              <h2 id="medical-record-title">Dossier clinique</h2>
              <p>Consultations, traitements et suivi de {patient.name}.</p>
            </div>
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
                      "group cursor-pointer transition-all",
                      isSelected && section.activeClass
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
                <div className="medical-overview">
                  <section>
                    <div className="medical-overview-heading">
                      <h3>Actes & Dernières consultations</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[12px] text-[#5D5D5D] hover:text-[#292929] cursor-pointer"
                        onClick={() => handleTabChange("timeline")}
                      >
                        Voir tout l’historique
                      </Button>
                    </div>

                    {appointmentsRepo.loading ? (
                      <div className="py-6 flex justify-center">
                        <Spinner className="size-5" />
                      </div>
                    ) : appointmentsRepo.error ? (
                      <div className="medical-empty">
                        Les consultations ne sont pas disponibles.{" "}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void appointmentsRepo.refresh()}
                        >
                          Réessayer
                        </Button>
                      </div>
                    ) : recentVisits.length ? (
                      <div className="space-y-2">
                        {recentVisits.slice(0, 4).map((appointment) => {
                          const statusConfig: Record<string, { label: string; className: string }> = {
                            scheduled: { label: "Planifiée", className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
                            confirmed: { label: "Confirmée", className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
                            arrived: { label: "Arrivé", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
                            waiting: { label: "En attente", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
                            in_progress: { label: "En cours", className: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300" },
                            completed: { label: "Terminée", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
                            cancelled: { label: "Annulée", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
                            no_show: { label: "Absent", className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
                          };
                          const currentStatus = statusConfig[appointment.status] || {
                            label: appointment.status,
                            className: "bg-muted text-muted-foreground",
                          };

                          return (
                            <button
                              className="medical-visit group justify-between cursor-pointer"
                              type="button"
                              key={appointment.id}
                              onClick={() =>
                                openSoapForAppointment(appointment.id)
                              }
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <time>{recordDate(appointment.startTime)}</time>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <strong>{appointment.type}</strong>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${currentStatus.className}`}>
                                      {currentStatus.label}
                                    </span>
                                  </div>
                                  <p className="truncate">{appointment.reason || appointment.title}</p>
                                </div>
                              </div>
                              <ChevronRight className="size-4 shrink-0 text-[#7F7F7F] transition-transform duration-200 group-hover:text-[#292929] dark:group-hover:text-white group-hover:translate-x-0.5" />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-[#F5F5F5] dark:bg-white/[0.04] text-center text-[13px] text-[#5D5D5D]">
                        <p>Aucune visite enregistrée pour {patient.name}.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2.5 h-8 text-[12px] cursor-pointer"
                          onClick={() => {
                            prepareAppointment(patient.id);
                            onNavigate("agenda");
                          }}
                        >
                          Planifier la première consultation
                        </Button>
                      </div>
                    )}

                    <div className="medical-action-row">
                      {clinicalNoteAppointment && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[12px] border-[#F2F2F2] dark:border-white/[0.1] cursor-pointer"
                          onClick={() =>
                            openSoapForAppointment(clinicalNoteAppointment.id)
                          }
                        >
                          Dernière note clinique
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[12px] border-[#F2F2F2] dark:border-white/[0.1] cursor-pointer"
                        onClick={openNewWeight}
                      >
                        + Pesée
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[12px] border-[#F2F2F2] dark:border-white/[0.1] cursor-pointer"
                        onClick={openNewVaccination}
                      >
                        + Vaccin
                      </Button>
                    </div>
                  </section>
                  <section>
                    <h3 className="medical-section-title">
                      Informations permanentes
                    </h3>
                    <dl className="medical-facts">
                      <div>
                        <dt>Date de naissance</dt>
                        <dd>{recordDate(patient.dateOfBirth)}</dd>
                      </div>
                      <div>
                        <dt>Dernière pesée</dt>
                        <dd>
                          {weightsRepo.loading
                            ? "Chargement…"
                            : weightsRepo.error
                              ? "Indisponible"
                              : latestWeight
                                ? `${latestWeight.weightKg.toLocaleString("fr-FR")} kg`
                                : "Aucune pesée"}
                        </dd>
                      </div>
                    </dl>
                  </section>
                </div>
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
                  patientId={patientId}
                />
              )}
              {activeTab === "timeline" ? (
                <PatientTimeline
                  className="border-0 shadow-none"
                  onEditWeight={openEditWeight}
                  onJumpToAppointment={openSoapForAppointment}
                  patientId={patientId}
                />
              ) : null}

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

          <aside
            className="medical-rail"
            aria-label="Informations permanentes du patient"
          >
            {ownersRepo.loading ? (
              <section aria-busy="true">
                <h3 className="medical-section-title">Propriétaire</h3>
                <SkeletonBlock className="h-20" />
              </section>
            ) : ownersRepo.error ? (
              <section>
                <h3 className="medical-section-title">Propriétaire</h3>
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
              <h3 className="medical-section-title">Notes générales</h3>
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
          </aside>
        </div>
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
