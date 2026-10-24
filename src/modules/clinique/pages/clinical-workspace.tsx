import StaysPage from "@/modules/hospitalizations/stays/stays-page";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageSubnavContext } from "@/design-system/patterns/page-header";
import CarePage from "@/modules/care-tasks/care-page";
import { careDisplayStatus } from "@/modules/care-tasks/domain";
import { useCareTasks } from "@/modules/care-tasks/use-care-tasks";
import { Badge } from "@/components/ui/badge";
import { MedicalRemindersModule } from "@/modules/patient-reminders/medical-reminders-widget";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFocus, type FocusRequest } from "@/contexts/focus-provider";
import type { View } from "@/types";
import {
  CLINIC_TAB_EVENT,
  CLINIC_TAB_OPEN_EVENT,
  takePendingClinicTab,
} from "@/modules/clinique/clinic-tab-events";
export default function ClinicalWorkspace({
  onNavigate,
  onNavigateToPatient,
  initialTab = "soins",
}: {
  onNavigate: (view: View) => void;
  onNavigateToPatient?: (id: string) => void;
  initialTab?: string;
}) {
  const { focus, clearFocus, registerHandler } = useFocus();
  // Consultations live in Flux and patient records in Patients: this section
  // keeps the day's care and the hospital stays.
  const [tab, setTab] = useState(() =>
    focus?.kind === "stay"
      ? "hospitalisation"
      : focus?.kind === "care_patient" || focus?.kind === "care_task"
        ? "soins"
        : (takePendingClinicTab() ?? initialTab),
  );
  // The sidebar opens a section from outside, and marks the one shown.
  useEffect(() => {
    const open = (event: Event) => setTab((event as CustomEvent<string>).detail);
    window.addEventListener(CLINIC_TAB_OPEN_EVENT, open);
    return () => window.removeEventListener(CLINIC_TAB_OPEN_EVENT, open);
  }, []);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(CLINIC_TAB_EVENT, { detail: tab }));
  }, [tab]);
  const [patientId, setPatientId] = useState<string | undefined>(() =>
    focus?.kind === "care_patient" ? focus.id : undefined,
  );
  const { tasks, now } = useCareTasks();
  const overdueCount = tasks.filter(
    (task) =>
      (!patientId || task.patient_id === patientId) &&
      careDisplayStatus(task, now) === "en_retard",
  ).length;
  const overdueLabel = `${overdueCount} soin${overdueCount > 1 ? "s" : ""} en retard`;
  const [stayId, setStayId] = useState<string | undefined>(() =>
    focus?.kind === "stay" ? focus.id : undefined,
  );
  const [taskId, setTaskId] = useState<string | undefined>(() =>
    focus?.kind === "care_task" ? focus.id : undefined,
  );
  useEffect(() => {
    const handleFocus = (request: FocusRequest) => {
      if (request.kind === "stay") {
        setTab("hospitalisation");
        setStayId(request.id);
        clearFocus();
        return;
      }
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
  // The section tabs sit right under each page's common header; the workspace
  // only draws them itself when the shown page has no common header.
  const [claims, setClaims] = useState(0);
  const claim = useCallback(
    (claimed: boolean) =>
      setClaims((count) => Math.max(0, count + (claimed ? 1 : -1))),
    [],
  );
  const tabsList = useMemo(
    () => (
      <TabsList
        aria-label="Sections soins et hospitalisation"
        className="w-full justify-start"
        tabsStyle="nav"
      >
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
              className="care-nav-badge min-w-5 border-rose-200 bg-rose-50 px-1.5 t-12 text-rose-700 tabular-nums dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            >
              {overdueCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="hospitalisation">Hospitalisation</TabsTrigger>
      </TabsList>
    ),
    [overdueCount, overdueLabel],
  );
  const subnav = useMemo(() => ({ node: tabsList, claim }), [tabsList, claim]);
  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className="clinical-workspace clinical-workspace-navigation min-w-0 gap-0"
    >
      <PageSubnavContext.Provider value={subnav}>
        {claims === 0 && <div className="px-4 pt-4 lg:px-6">{tabsList}</div>}
        {tab === "hospitalisation" ? (
          <StaysPage key={stayId || "all"} initialStayId={stayId} />
        ) : (
          <CarePage
            key={`${patientId ?? "all"}-${taskId ?? ""}`}
            patientId={patientId}
            onShowAll={() => setPatientId(undefined)}
            initialTaskId={taskId}
            onNavigateToPatient={onNavigateToPatient}
            reminders={
              <MedicalRemindersModule
                onAll={() => {
                  window.sessionStorage.setItem("baitari:reminders-source", "medical");
                  onNavigate("taches");
                }}
              />
            }
          />
        )}
      </PageSubnavContext.Provider>
    </Tabs>
  );
}
