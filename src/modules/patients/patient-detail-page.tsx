import { ArrowLeft, FirstAid, ShieldCheck, Pill, Hospital, Syringe, Notebook } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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
import type { Vaccination, WeightEntry, Hospitalization, AnesthesiaSheet } from "@/types/db";

import { PatientDocumentsList } from "./components/patient-documents-list";
import { PrescriptionList, PrescriptionSheet } from "@/modules/prescriptions";
import { AnesthesiaList, AnesthesiaDetail } from "@/modules/anesthesia";
import { HospitalizationList, HospitalizationDetail } from "@/modules/hospitalizations";
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
  const { currentUser } = useAuth();
  const patientsRepo = usePatientsRepository();
  const appointmentsRepo = useAppointmentsRepository();
  const vaccinationsRepo = useVaccinationsRepository();
  const weightsRepo = useWeightEntriesRepository();
  const ownersRepo = useOwnersRepository();

  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [editingWeight, setEditingWeight] = useState<WeightEntry | null>(null);
  const [vaccinationDialogOpen, setVaccinationDialogOpen] = useState(false);
  const [editingVaccination, setEditingVaccination] = useState<Vaccination | null>(null);
  const [activeTab, setActiveTab] = useState("timeline");
  const [soapAppointmentId, setSoapAppointmentId] = useState<string | null>(null);
  const [soapOpen, setSoapOpen] = useState<boolean>(false);
  
  const [selectedHospitalization, setSelectedHospitalization] = useState<Hospitalization | null>(null);
  const [selectedAnesthesia, setSelectedAnesthesia] = useState<AnesthesiaSheet | null>(null);

  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [prescriptionAppointmentId, setPrescriptionAppointmentId] = useState<string | null>(null);

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

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSelectedHospitalization(null);
    setSelectedAnesthesia(null);
    setPrescriptionAppointmentId(null);
    setPrescriptionOpen(false);
  };

  const handleNewNote = async () => {
    // Check if there is an appointment today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayApt = appointments.find((apt) => {
      const d = new Date(apt.startTime);
      return d >= todayStart && d <= todayEnd && apt.status !== "cancelled";
    });

    if (todayApt) {
      // If today has an appointment, open the SOAP for it!
      openSoapForAppointment(todayApt.id);
    } else {
      // Otherwise, create a new "Consultation" appointment for today right now!
      const nowTime = new Date();
      const endTime = new Date(nowTime.getTime() + 30 * 60 * 1000); // 30 minutes duration

      try {
        const newApt = await appointmentsRepo.saveAppointment({
          patientId: patientId,
          title: `Consultation - ${patient?.name || ""}`,
          type: "Consultation",
          status: "in_progress",
          startTime: nowTime,
          endTime: endTime,
          vetId: currentUser?.id,
          reason: "Consultation rapide / Note médicale",
        });

        if (newApt && newApt.id) {
          openSoapForAppointment(newApt.id);
          toast.success("Nouvelle session de consultation créée.");
        }
      } catch (err) {
        console.error("Failed to create quick appointment", err);
        toast.error("Impossible de créer une nouvelle session de consultation.");
      }
    }
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
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => onNavigate("patients")}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft weight="duotone" className="size-4" />
          {t("patientDetail.back")}
        </Button>

        <PatientHeader
          onNewNote={handleNewNote}
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Clinical Section (2/3 columns wide) */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs
              className="w-full"
              onValueChange={handleTabChange}
              value={activeTab}
            >
              <TabsList className="inline-flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/60 p-1 rounded-full border border-zinc-200/50 dark:border-white/[0.04] backdrop-blur-sm shadow-sm" variant="line">
                <TabsTrigger 
                  value="timeline" 
                  className="rounded-full px-4 py-1.5 text-xs font-semibold gap-1.5 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
                >
                  <FirstAid weight="duotone" className="size-4" />
                  Chronologie
                </TabsTrigger>
                <TabsTrigger 
                  value="prescriptions" 
                  className="rounded-full px-4 py-1.5 text-xs font-semibold gap-1.5 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
                >
                  <Pill weight="duotone" className="size-4" />
                  Ordonnances
                </TabsTrigger>
                <TabsTrigger 
                  value="hospitalizations" 
                  className="rounded-full px-4 py-1.5 text-xs font-semibold gap-1.5 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
                >
                  <Hospital weight="duotone" className="size-4" />
                  Hospitalisations
                </TabsTrigger>
                <TabsTrigger 
                  value="anesthesia" 
                  className="rounded-full px-4 py-1.5 text-xs font-semibold gap-1.5 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
                >
                  <Syringe weight="duotone" className="size-4" />
                  Anesthésies
                </TabsTrigger>
              </TabsList>

              <TabsContent className="mt-4 space-y-4 focus-visible:outline-none" value="timeline">
                <PatientTimeline
                  onJumpToAppointment={openSoapForAppointment}
                  patientId={patientId}
                />
              </TabsContent>

              <TabsContent className="mt-4 space-y-4 focus-visible:outline-none" value="prescriptions">
                {patient ? (
                  <PrescriptionList 
                    patient={patient} 
                    onNew={async () => {
                      const todayStart = new Date();
                      todayStart.setHours(0, 0, 0, 0);
                      const todayEnd = new Date();
                      todayEnd.setHours(23, 59, 59, 999);

                      const todayApt = appointments.find((apt) => {
                        const d = new Date(apt.startTime);
                        return d >= todayStart && d <= todayEnd && apt.status !== "cancelled";
                      });

                      if (todayApt) {
                        setPrescriptionAppointmentId(todayApt.id);
                        setPrescriptionOpen(true);
                      } else {
                        const nowTime = new Date();
                        const endTime = new Date(nowTime.getTime() + 30 * 60 * 1000);

                        try {
                          const newApt = await appointmentsRepo.saveAppointment({
                            patientId: patientId,
                            title: `Consultation - ${patient.name}`,
                            type: "Consultation",
                            status: "in_progress",
                            startTime: nowTime,
                            endTime: endTime,
                            vetId: currentUser?.id,
                            reason: "Ordonnance",
                          });

                          if (newApt && newApt.id) {
                            setPrescriptionAppointmentId(newApt.id);
                            setPrescriptionOpen(true);
                            toast.success("Nouvelle session de consultation créée pour l'ordonnance.");
                          }
                        } catch (err) {
                          console.error("Failed to create quick appointment", err);
                          toast.error("Impossible de créer une nouvelle session de consultation.");
                        }
                      }
                    }}
                  />
                ) : null}
              </TabsContent>

              <TabsContent className="mt-4 space-y-4 focus-visible:outline-none" value="hospitalizations">
                {patient ? (
                  selectedHospitalization ? (
                    <HospitalizationDetail
                      hospitalization={selectedHospitalization}
                      onBack={() => setSelectedHospitalization(null)}
                      patient={patient}
                    />
                  ) : (
                    <HospitalizationList
                      patient={patient}
                      onSelect={setSelectedHospitalization}
                    />
                  )
                ) : null}
              </TabsContent>

              <TabsContent className="mt-4 space-y-4 focus-visible:outline-none" value="anesthesia">
                {patient ? (
                  selectedAnesthesia ? (
                    <AnesthesiaDetail
                      sheet={selectedAnesthesia}
                      onBack={() => setSelectedAnesthesia(null)}
                      patient={patient}
                    />
                  ) : (
                    <AnesthesiaList
                      patient={patient}
                      onSelect={setSelectedAnesthesia}
                    />
                  )
                ) : null}
              </TabsContent>
            </Tabs>
          </div>

          {/* Quick-Reference Sidebar (1/3 column wide) */}
          <div className="space-y-6">
            <WeightEvolutionChart
              className="@container/card"
              emptyMessage={t("patientDetail.weight.empty")}
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
          </div>
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
