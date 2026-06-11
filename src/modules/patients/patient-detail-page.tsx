import { ArrowLeft, FirstAid, Notepad, ShieldCheck } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppointmentsRepository, usePatientsRepository } from "@/data/repositories";
import {
  useVaccinationsRepository,
  useWeightEntriesRepository,
  useOwnersRepository,
} from "@/data/repositories";
import { ConsultationSessionDrawer } from "@/modules/consultations";
import type { View } from "@/types";
import type { Vaccination, WeightEntry } from "@/types/db";

import { PatientDocumentsList } from "./components/patient-documents-list";
import { PrescriptionList } from "@/modules/prescriptions";
import { AnesthesiaList } from "@/modules/anesthesia";
import { HospitalizationList } from "@/modules/hospitalizations";
import { PatientHeader } from "./components/patient-header";
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

export function PatientDetailPage({
  onNavigate,
  patientId,
}: PatientDetailPageProps) {
  const { t } = useTranslation();
  const patientsRepo = usePatientsRepository();
  const appointmentsRepo = useAppointmentsRepository();
  const vaccinationsRepo = useVaccinationsRepository();
  const weightsRepo = useWeightEntriesRepository();
  const ownersRepo = useOwnersRepository();

  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [editingWeight, setEditingWeight] = useState<WeightEntry | null>(null);
  const [vaccinationDialogOpen, setVaccinationDialogOpen] = useState(false);
  const [editingVaccination, setEditingVaccination] = useState<Vaccination | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [soapAppointmentId, setSoapAppointmentId] = useState<string | null>(null);
  const [soapOpen, setSoapOpen] = useState<boolean>(false);
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
        <p className="text-lg font-semibold">
          {t("patientDetail.notFoundDetails.title")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("patientDetail.notFoundDetails.description")}
        </p>
        <Button
          onClick={() => onNavigate("patients")}
          variant="outline"
        >
          <ArrowLeft weight="duotone" className="size-4" />
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
  const openSoapForAppointment = (appointmentId: string) => {
    setSoapAppointmentId(appointmentId);
    setSoapOpen(true);
  };

  return (
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-6 px-4 lg:px-6 pb-8 pt-16 md:pt-28">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <Button
          className="h-8 gap-1.5 text-muted-foreground"
          onClick={() => onNavigate("patients")}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft weight="duotone" className="size-4" />
          {t("patientDetail.back")}
        </Button>

        <PatientHeader
          onNewNote={() => {
            if (lastAppointment) {
              openSoapForAppointment(lastAppointment.id);
            }
          }}
          onNewAppointment={() => onNavigate("agenda")}
          patient={patient}
          owner={owner}
        />

        <PatientKpiStrip
          lastVisit={lastAppointment?.startTime}
          nextAppointment={nextAppointment ?? undefined}
          nextVaccination={getNextDueVaccination(vaccinations)}
          weightEntries={weightEntries}
        />

        <Tabs
          className="w-full"
          onValueChange={setActiveTab}
          value={activeTab}
        >
          <TabsList className="w-full justify-start rounded-lg border-b bg-background/50 p-1 backdrop-blur" variant="line">
            <TabsTrigger value="overview">
              <FirstAid weight="duotone" className="size-4" />
              {t("patientDetail.tabs.overview")}
            </TabsTrigger>
            <TabsTrigger value="history">
              <Notepad weight="duotone" className="size-4" />
              {t("patientDetail.tabs.history")}
            </TabsTrigger>
            <TabsTrigger value="vaccinations">
              <ShieldCheck weight="duotone" className="size-4" />
              {t("patientDetail.tabs.vaccinations")}
              {vaccinations.length > 0 ? (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px] font-medium">
                  {vaccinations.length}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="documents">
              {t("patientDetail.tabs.documents")}
            </TabsTrigger>
            <TabsTrigger value="prescriptions">
              {t("patientDetail.tabs.prescriptions", "Ordonnances")}
            </TabsTrigger>
            <TabsTrigger value="hospitalizations">
              {t("patientDetail.tabs.hospitalizations", "Hospitalisations")}
            </TabsTrigger>
            <TabsTrigger value="anesthesia">
              {t("patientDetail.tabs.anesthesia", "Anesthésies")}
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-4 space-y-4" value="overview">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <WeightEvolutionChart
                  className="@container/card"
                  emptyMessage={t("patientDetail.weight.empty")}
                  entries={weightEntries}
                  onAdd={openNewWeight}
                  onEditEntry={openEditWeight}
                  title={t("patientDetail.weight.title")}
                />
                <PatientTimeline
                  className="@container/card"
                  onJumpToAppointment={openSoapForAppointment}
                  patientId={patientId}
                />
              </div>
              <div className="space-y-4">
                <VaccinationList
                  className="@container/card"
                  onEdit={openEditVaccination}
                  onNew={openNewVaccination}
                  patientId={patientId}
                />
                <PatientDocumentsList patientId={patientId} />
              </div>
            </div>
          </TabsContent>

          <TabsContent className="mt-4 space-y-4" value="history">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <WeightEvolutionChart
                className="@container/card"
                emptyMessage={t("patientDetail.weight.empty")}
                entries={weightEntries}
                onAdd={openNewWeight}
                onEditEntry={openEditWeight}
                title={t("patientDetail.weight.title")}
              />
              <PatientTimeline
                className="@container/card"
                onJumpToAppointment={openSoapForAppointment}
                patientId={patientId}
              />
            </div>
          </TabsContent>

          <TabsContent className="mt-4 space-y-4" value="vaccinations">
            <VaccinationList
              onEdit={openEditVaccination}
              onNew={openNewVaccination}
              patientId={patientId}
            />
          </TabsContent>

          <TabsContent className="mt-4 space-y-4" value="documents">
            <PatientDocumentsList patientId={patientId} />
          </TabsContent>

          <TabsContent
            className="mt-4 space-y-4"
            value="prescriptions"
          >
            {patient ? (
              <PrescriptionList patient={patient} />
            ) : null}
          </TabsContent>

          <TabsContent
            className="mt-4 space-y-4"
            value="hospitalizations"
          >
            {patient ? (
              <HospitalizationList patient={patient} />
            ) : null}
          </TabsContent>

          <TabsContent
            className="mt-4 space-y-4"
            value="anesthesia"
          >
            {patient ? (
              <AnesthesiaList patient={patient} />
            ) : null}
          </TabsContent>
        </Tabs>
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
    </div>
  );
}
