import StaysPage from "@/modules/hospitalizations/stays/stays-page";
import { useEffect, useState } from "react";
import CliniquePage from "./clinique-page";
import CarePage from "@/modules/care-tasks/care-page";
import { careDisplayStatus } from "@/modules/care-tasks/domain";
import { useCareTasks } from "@/modules/care-tasks/use-care-tasks";
import { Badge } from "@/components/ui/badge";
import PatientsPage from "@/modules/patients/pages/patients-page";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useFocus, type FocusRequest } from "@/contexts/focus-provider";
import type { View } from "@/types";
export default function ClinicalWorkspace({
  onNavigate,
  onNavigateToPatient,
  initialTab = "consultations",
}: {
  onNavigate: (view: View) => void;
  onNavigateToPatient?: (id: string) => void;
  initialTab?: string;
}) {
  const { focus, clearFocus, registerHandler } = useFocus();
  const [tab, setTab] = useState(() =>
    typeof sessionStorage !== "undefined" && sessionStorage.getItem("vetera:pending-clinical-tab") === "consultations" ? "consultations" : focus?.kind === "stay" ? "hospitalisation" : focus?.kind === "care_patient" || focus?.kind === "care_task"
      ? "soins"
      : initialTab
  );
  useEffect(() => {
    const openConsultation = () => {
      setTab("consultations");
      sessionStorage.removeItem("vetera:pending-clinical-tab");
    };
    if (sessionStorage.getItem("vetera:pending-clinical-tab") === "consultations") openConsultation();
    window.addEventListener("vetera:open-consultation", openConsultation);
    return () => window.removeEventListener("vetera:open-consultation", openConsultation);
  }, []);
  const [patientId, setPatientId] = useState<string | undefined>(() =>
    focus?.kind === "care_patient" ? focus.id : undefined
  );
  const { tasks, now } = useCareTasks();
  const overdueCount = tasks.filter(
    (task) =>
      (!patientId || task.patient_id === patientId) &&
      careDisplayStatus(task, now) === "en_retard",
  ).length;
  const overdueLabel = `${overdueCount} soin${overdueCount > 1 ? "s" : ""} en retard`;
  const [stayId,setStayId]=useState<string | undefined>(() => focus?.kind === "stay" ? focus.id : undefined);
  const [taskId, setTaskId] = useState<string | undefined>(() =>
    focus?.kind === "care_task" ? focus.id : undefined
  );
  useEffect(() => {
    const handleFocus = (request: FocusRequest) => {
      if (request.kind === "stay") {setTab("hospitalisation");setStayId(request.id);clearFocus();return;}
      if (request.kind !== "care_patient" && request.kind !== "care_task")
        return;
      setTab("soins");
      setPatientId(request.kind === "care_patient" ? request.id : undefined);
      setTaskId(request.kind === "care_task" ? request.id : undefined);
      clearFocus();
    };
    registerHandler(handleFocus);
    // Consume requests received before the workspace mounted, once only.
    if (focus) handleFocus(focus);
    return () => registerHandler(null);
  }, [registerHandler, clearFocus, focus]);
  return (
    <div className="clinical-workspace min-w-0">
      <Tabs value={tab} onValueChange={setTab} className="clinical-workspace-navigation w-full px-4 pt-4 lg:px-6">
        <TabsList aria-label="Sections de la clinique" className="engraved-view-tabs w-full justify-start">
          <TabsTrigger value="dossiers">Dossiers</TabsTrigger>
          <TabsTrigger value="consultations">Consultations</TabsTrigger>
          <TabsTrigger
            value="soins"
            className="gap-2"
            aria-label={overdueCount ? `Soins, ${overdueLabel}` : "Soins"}
          >
            Soins
            {overdueCount > 0 && (
              <Badge
                variant="outline"
                aria-hidden="true"
                title={overdueLabel}
                className="care-nav-badge min-w-5 border-rose-200 bg-rose-50 px-1.5 text-[12px] text-rose-700 tabular-nums dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
              >
                {overdueCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="hospitalisation">Hospitalisation</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "dossiers" ? (
        <PatientsPage onNavigateToPatient={onNavigateToPatient} />
      ) : tab === "hospitalisation" ? (
        <StaysPage key={stayId || "all"} initialStayId={stayId} />
      ) : tab === "soins" ? (
        <>
          {patientId && (
            <Button
              variant="ghost"
              className="mx-6 mt-4"
              onClick={() => setPatientId(undefined)}
            >
              Afficher tous les patients
            </Button>
          )}
          <CarePage
            key={`${patientId ?? "all"}-${taskId ?? ""}`}
            patientId={patientId}
            initialTaskId={taskId}
            onNavigateToPatient={onNavigateToPatient}
          />
        </>
      ) : (
        <CliniquePage onNavigate={onNavigate} />
      )}
    </div>
  );
}
