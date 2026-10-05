import {
  ArrowLeft,
  Check,
  FirstAid,
  Hospital,
  Pill,
  Syringe,
  X,
} from "@/lib/icons";
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
import { SkeletonBlock } from "@/design-system/primitives";
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
import {
  OwnerContact,
  recordDate,
  handleRecordTabKeys,
} from "./components/medical-record-summary";
import { prepareAppointment } from "@/modules/shell/model/clinical-actions";
import { PatientKpiStrip } from "./components/patient-kpi-strip";
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
  { value: "overview", label: "Synthèse", icon: FirstAid },
  { value: "timeline", label: "Chronologie", icon: FirstAid },
  { value: "prescriptions", label: "Ordonnances", icon: Pill },
  { value: "hospitalizations", label: "Hospitalisations", icon: Hospital },
  { value: "anesthesia", label: "Anesthésies", icon: Syringe },
  { value: "vaccinations", label: "Vaccinations", icon: Syringe },
  { value: "weight", label: "Poids", icon: FirstAid },
  { value: "documents", label: "Documents", icon: FirstAid },
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
  const [activeTab, setActiveTab] = useState<PatientRecordSection>("overview");
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
  const clinicalNoteAppointment = useMemo(
    () =>
      appointments.find(
        (appointment) => appointment.status === "in_progress"
      ) ??
      appointments.find((appointment) => appointment.status === "completed") ??
      null,
    [appointments]
  );

  useEffect(() => {
    setActiveTab("overview");
    setIsProfileEditorOpen(false);
    setSoapOpen(false);
    setSelectedHospitalization(null);
    setSelectedAnesthesia(null);
    setPrescriptionOpen(false);
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
  const recentVisits = appointments.filter((appointment) =>
    ["completed", "in_progress"].includes(appointment.status)
  );
  const openSoapForAppointment = (appointmentId: string) => {
    setSoapAppointmentId(appointmentId);
    setSoapOpen(true);
  };

  return (
    <div className="patient-record-page dashboard-stage flex w-full min-w-0 flex-col gap-5 px-4 pb-8 lg:px-6">
      <div className="mx-auto w-full max-w-7xl space-y-4">
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
        >
          {appointmentsRepo.loading ||
          vaccinationsRepo.loading ||
          weightsRepo.loading ? (
            <div
              className="grid grid-cols-2 gap-4 border-t border-border p-5 xl:grid-cols-4"
              aria-label="Chargement du suivi clinique"
              aria-busy="true"
            >
              {[0, 1, 2, 3].map((index) => (
                <SkeletonBlock key={index} className="h-16" />
              ))}
            </div>
          ) : appointmentsRepo.error ||
            vaccinationsRepo.error ||
            weightsRepo.error ? (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm"
            >
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
              className="rounded-none border-x-0 border-b-0 bg-card/60"
              lastVisit={lastAppointment?.startTime ?? patient.lastVisit}
              nextAppointment={nextAppointment ?? undefined}
              nextVaccination={getNextDueVaccination(vaccinations)}
              now={now}
              onAppointmentClick={() => onNavigate("agenda")}
              onTimelineClick={() => handleTabChange("timeline")}
              onVaccinationClick={() => handleTabChange("vaccinations")}
              onWeightClick={() => handleTabChange("weight")}
              weightEntries={weightEntries}
            />
          )}
        </PatientHeader>

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

        <div className="medical-workspace">
          <section
            className="medical-register"
            aria-labelledby="medical-record-title"
          >
            <div className="medical-register-header">
              <h2 id="medical-record-title">Dossier clinique</h2>
              <p>Consultations, traitements et suivi de {patient.name}.</p>
            </div>
            <div
              role="tablist"
              onKeyDown={handleRecordTabKeys}
              aria-label="Sections du dossier médical"
              className="medical-tabs"
            >
              {PATIENT_RECORD_SECTIONS.map((section) => (
                <button
                  key={section.value}
                  type="button"
                  role="tab"
                  tabIndex={activeTab === section.value ? 0 : -1}
                  id={`record-tab-${section.value}`}
                  aria-selected={activeTab === section.value}
                  aria-controls="record-tab-content"
                  onClick={() => handleTabChange(section.value)}
                >
                  {section.label}
                </button>
              ))}
            </div>
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
                      <h3>Prise en charge</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTabChange("timeline")}
                      >
                        Voir l’historique
                      </Button>
                    </div>
                    <dl className="medical-facts">
                      <div>
                        <dt>Dernière consultation terminée</dt>
                        <dd>
                          {appointmentsRepo.loading
                            ? "Chargement…"
                            : appointmentsRepo.error
                              ? "Indisponible"
                              : lastAppointment
                                ? recordDate(lastAppointment.startTime)
                                : patient.lastVisit
                                  ? recordDate(patient.lastVisit)
                                  : "Aucune enregistrée"}
                        </dd>
                      </div>
                      <div>
                        <dt>Prochain rendez-vous</dt>
                        <dd>
                          {appointmentsRepo.loading
                            ? "Chargement…"
                            : appointmentsRepo.error
                              ? "Indisponible"
                              : nextAppointment
                                ? recordDate(nextAppointment.startTime, true)
                                : "Aucun rendez-vous prévu"}
                        </dd>
                      </div>
                    </dl>
                    {lastAppointment && (
                      <p className="medical-secondary mt-4">
                        {lastAppointment.reason || lastAppointment.title}
                      </p>
                    )}
                    <div className="medical-action-row">
                      {clinicalNoteAppointment && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openSoapForAppointment(clinicalNoteAppointment.id)
                          }
                        >
                          Consulter la note clinique
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={openNewWeight}
                      >
                        Enregistrer un poids
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={openNewVaccination}
                      >
                        Enregistrer un vaccin
                      </Button>
                    </div>
                  </section>
                  <section>
                    <h3 className="medical-section-title">Dernières visites</h3>
                    {appointmentsRepo.loading ? (
                      <Spinner className="size-5" />
                    ) : appointmentsRepo.error ? (
                      <div className="medical-empty">
                        Les visites ne sont pas disponibles.{" "}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void appointmentsRepo.refresh()}
                        >
                          Réessayer
                        </Button>
                      </div>
                    ) : recentVisits.length ? (
                      <div>
                        {recentVisits.slice(0, 4).map((appointment) => (
                          <button
                            className="medical-visit"
                            type="button"
                            key={appointment.id}
                            onClick={() =>
                              openSoapForAppointment(appointment.id)
                            }
                          >
                            <time>{recordDate(appointment.startTime)}</time>
                            <div>
                              <strong>
                                {appointment.type} ·{" "}
                                {
                                  {
                                    scheduled: "Planifiée",
                                    confirmed: "Confirmée",
                                    arrived: "Arrivé",
                                    waiting: "En attente",
                                    in_progress: "En cours",
                                    completed: "Terminée",
                                    cancelled: "Annulée",
                                    no_show: "Absent",
                                  }[appointment.status]
                                }
                              </strong>
                              <p>{appointment.reason || appointment.title}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="medical-empty">
                        Aucune visite enregistrée. Planifiez un rendez-vous pour
                        commencer le suivi.
                      </p>
                    )}
                  </section>
                  <section>
                    <h3 className="medical-section-title">
                      Informations de suivi
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
                              : weightEntries.length
                                ? `${[...weightEntries].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0].weightKg.toLocaleString("fr-FR")} kg`
                                : "Non renseignée"}
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
