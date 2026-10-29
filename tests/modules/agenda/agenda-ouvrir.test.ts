import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

it("fait démarrer la visite dans Flux depuis « Ouvrir » de l'Agenda", () => {
  const model = read("src/modules/agenda/hooks/use-agenda-page-model.tsx");
  expect(model).toMatch(/const openAppointmentInFlux = \(appointment: Appointment\) => \{[\s\S]*?startInFlux\(appointment\.id, onNavigate\)/);
  expect(read("src/modules/agenda/components/agenda-view.tsx")).toContain("onOpenAppointment={openAppointmentInFlux}");
  expect(read("src/components/AgendaListView.tsx")).toMatch(/\(onOpenAppointment \?\? onSelectAppointment\)\(appointment\)[\s\S]{0,80}Ouvrir/);
  expect(read("src/app/config/view-registry.tsx")).toContain("<AgendaPage onNavigate={props.onNavigate} />");
});

it("démarre une visite neuve et cible une visite terminée sans la redémarrer", () => {
  const flux = read("src/modules/flow-board/open-in-flux.ts");
  // Only a visit not yet in consultation moves to in_progress; any other is focused.
  expect(flux).toMatch(/key === START_KEY && PRE_CONSULTATION_STATUSES\.includes\(target\.status\)[\s\S]*?transitionStatus\(target\.id, "in_progress"\)/);
  expect(flux).toMatch(/else focus\(target\.id\)/);
  expect(read("src/domain/clinical/scheduling.ts")).not.toMatch(/PRE_CONSULTATION_STATUSES[^\]]*"completed"/);
});
