import {
  ArrowLeft,
  Check,
  FirstAid,
  Hospital,
  Pill,
  Syringe,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { PATIENT_STATUS_META } from "@/config/status-meta";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useVaccinationsRepository,
  useWeightEntriesRepository,
} from "@/data/repositories";
import { AnesthesiaDetail, AnesthesiaList } from "@/modules/anesthesia";
import { ConsultationSessionDrawer } from "@/modules/consultations";
import {
  HospitalizationDetail,
  HospitalizationList,
} from "@/modules/hospitalizations";
import { PrescriptionList, PrescriptionSheet } from "@/modules/prescriptions";
import { cn } from "@/lib/utils";
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
  | "timeline"
  | "prescriptions"
  | "hospitalizations"
  | "anesthesia";

const PATIENT_RECORD_SECTIONS = [
  { value: "timeline", label: "Chronologie", icon: FirstAid },
  { value: "prescriptions", label: "Ordonnances", icon: Pill },
  { value: "hospitalizations", label: "Hospitalisations", icon: Hospital },
  { value: "anesthesia", label: "Anesthésies", icon: Syringe },
] satisfies Array<{
  value: PatientRecordSection;
  label: string;
  icon: typeof FirstAid;
}>;

type PatientProfileDraft = Pick<
  Patient,
  | "allergies"
  | "breed"
  | "chronicConditions"
  | "dateOfBirth"
  | "generalNotes"
  | "name"
  | "sex"
  | "species"
  | "status"
>;

function createProfileDraft(patient: Patient): PatientProfileDraft {
  return {
    allergies: patient.allergies ?? "",
    breed: patient.breed ?? "",
    chronicConditions: patient.chronicConditions ?? "",
    dateOfBirth: patient.dateOfBirth ?? "",
    generalNotes: patient.generalNotes ?? "",
    name: patient.name,
    sex: patient.sex,
    species: patient.species,
    status: patient.status,
  };
}

export function PatientDetailPage({
  onNavigate,
  patientId,
}: PatientDetailPageProps) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const patientsRepo = usePatientsRepository();
  const appointmentsRepo = useAppointmentsRepository();
  const vaccinationsRepo = useVaccinationsRepository();
  const weightsRepo = useWeightEntriesRepository();
  const ownersRepo = useOwnersRepository();

  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [editingWeight, setEditingWeight] = useState<WeightEntry | null>(null);
  const [vaccinationDialogOpen, setVaccinationDialogOpen] = useState(false);
  const [editingVaccination, setEditingVaccination] =
    useState<Vaccination | null>(null);
  const [activeTab, setActiveTab] = useState<PatientRecordSection>("timeline");
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<PatientProfileDraft | null>(
    null
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [soapAppointmentId, setSoapAppointmentId] = useState<string | null>(
    null
  );
  const [soapOpen, setSoapOpen] = useState<boolean>(false);

  const [selectedHospitalization, setSelectedHospitalization] =
    useState<Hospitalization | null>(null);
  const [selectedAnesthesia, setSelectedAnesthesia] =
    useState<AnesthesiaSheet | null>(null);

  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [prescriptionAppointmentId, setPrescriptionAppointmentId] = useState<
    string | null
  >(null);

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
  const lastAppointment = appointments[0] ?? null;
  const nextAppointment = useMemo(
    () =>
      appointments
        .filter(
          (apt) =>
            (apt.status === "scheduled" || apt.status === "in_progress") &&
            new Date(apt.startTime).getTime() > now
        )
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )[0] ?? null,
    [appointments, now]
  );

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
        chronicConditions: profileDraft.chronicConditions?.trim() || undefined,
        dateOfBirth: profileDraft.dateOfBirth || undefined,
        generalNotes: profileDraft.generalNotes?.trim() || undefined,
        name: profileDraft.name.trim(),
        species: profileDraft.species.trim(),
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
  const openSoapForAppointment = (appointmentId: string) => {
    setSoapAppointmentId(appointmentId);
    setSoapOpen(true);
  };

  return (
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-5 px-4 pt-16 pb-8 md:pt-24 lg:px-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <Button
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => onNavigate("patients")}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft className="size-4" weight="duotone" />
          {t("patientDetail.back")}
        </Button>

        <PatientHeader
          onEditProfile={openProfileEditor}
          onNewAppointment={() => onNavigate("agenda")}
          owner={owner}
          patient={patient}
        />

        {patient.allergies || patient.chronicConditions ? (
          <section
            aria-label="Vigilance clinique"
            className="clinical-subtle-surface grid gap-3 px-4 py-3 sm:grid-cols-2"
          >
            {patient.allergies ? (
              <div className="min-w-0">
                <p className="clinical-eyebrow text-rose-600 dark:text-rose-400">
                  Allergies
                </p>
                <p className="mt-1 truncate font-medium text-sm">
                  {patient.allergies}
                </p>
              </div>
            ) : null}
            {patient.chronicConditions ? (
              <div className="min-w-0">
                <p className="clinical-eyebrow">Antécédents</p>
                <p className="mt-1 truncate font-medium text-sm">
                  {patient.chronicConditions}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {isProfileEditorOpen && profileDraft ? (
          <section className="clinical-feature-surface p-5 sm:p-6">
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
            </div>
          </section>
        ) : null}

        <PatientKpiStrip
          lastVisit={lastAppointment?.startTime}
          nextAppointment={nextAppointment ?? undefined}
          nextVaccination={getNextDueVaccination(vaccinations)}
          now={now}
          onAppointmentClick={() => onNavigate("agenda")}
          onTimelineClick={() => handleTabChange("timeline")}
          onVaccinationClick={openNewVaccination}
          onWeightClick={openNewWeight}
          weightEntries={weightEntries}
        />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <section
            className="clinical-surface min-w-0 overflow-hidden"
            aria-labelledby="medical-record-title"
          >
            <div className="flex items-center justify-between gap-4 border-border/70 border-b px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900">
                  <FirstAid className="size-4" weight="duotone" />
                </span>
                <h2
                  className="font-semibold text-foreground text-lg tracking-[-0.03em]"
                  id="medical-record-title"
                >
                  Dossier médical
                </h2>
              </div>
            </div>
            <div className="grid lg:min-h-[440px] lg:grid-cols-[190px_minmax(0,1fr)]">
              <nav
                aria-label="Sections du dossier médical"
                className="flex gap-1 overflow-x-auto border-border/70 border-b bg-muted/15 p-3 lg:flex-col lg:border-r lg:border-b-0 lg:p-4"
              >
                {PATIENT_RECORD_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeTab === section.value;
                  const activeTone =
                    section.value === "timeline"
                      ? "bg-sky-50 text-sky-800 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900"
                      : section.value === "prescriptions"
                        ? "bg-emerald-50 text-emerald-800 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900"
                        : section.value === "hospitalizations"
                          ? "bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900"
                          : "bg-rose-50 text-rose-800 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900";
                  return (
                    <button
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex h-10 shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-3 font-semibold text-xs transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:w-full lg:hover:translate-x-0.5",
                        isActive
                          ? cn("ring-1", activeTone)
                          : "text-muted-foreground hover:bg-card hover:text-foreground"
                      )}
                      key={section.value}
                      onClick={() => handleTabChange(section.value)}
                      type="button"
                    >
                      <Icon className="size-4" weight="duotone" />
                      <span>{section.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="min-w-0 space-y-4 p-3 sm:p-4">
                {activeTab === "timeline" ? (
                  <PatientTimeline
                    className="border-0 shadow-none"
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
                          const newApt = await appointmentsRepo.saveAppointment(
                            {
                              patientId,
                              title: `Consultation - ${patient.name}`,
                              type: "Consultation",
                              status: "in_progress",
                              startTime: nowTime,
                              endTime,
                              vetId: currentUser?.id,
                              reason: "Ordonnance",
                            }
                          );

                          if (newApt && newApt.id) {
                            setPrescriptionAppointmentId(newApt.id);
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
            </div>
          </section>

          <aside className="space-y-5 xl:sticky xl:top-5">
            <PatientRecordHealth
              onCompleteProfile={openProfileEditor}
              owner={owner}
              patient={patient}
              vaccinations={vaccinations}
              weightEntries={weightEntries}
            />
            <WeightEvolutionChart
              className="@container/card"
              emptyMessage={t("patientDetail.overview.weightEmpty")}
              entries={weightEntries}
              onAdd={openNewWeight}
              onEditEntry={openEditWeight}
              title={t("patientDetail.weight.title")}
            />
            <VaccinationList
              className="@container/card"
              onEdit={openEditVaccination}
              onNew={openNewVaccination}
              patientId={patientId}
            />
            <PatientDocumentsList patientId={patientId} />
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

      <ConsultationSessionDrawer
        appointmentId={soapAppointmentId ?? ""}
        onOpenChange={(next) => {
          setSoapOpen(next);
          if (!next) {
            setSoapAppointmentId(null);
          }
        }}
        open={soapOpen && Boolean(soapAppointmentId)}
        patientId={patientId}
        patientName={patient.name}
      />

      <PrescriptionSheet
        appointmentId={prescriptionAppointmentId ?? ""}
        onOpenChange={(next) => {
          setPrescriptionOpen(next);
          if (!next) {
            setPrescriptionAppointmentId(null);
          }
        }}
        open={prescriptionOpen && Boolean(prescriptionAppointmentId)}
        patient={patient}
        vet={currentUser}
      />
    </div>
  );
}
