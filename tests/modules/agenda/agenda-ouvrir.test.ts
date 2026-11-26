import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { codeText } from "../../helpers/code-text";

const OPEN_APPOINTMENT_STARTS_FLUX =
  /const openAppointmentInFlux = \(appointment: Appointment\) => \{[\s\S]*?startInFlux\(appointment\.id, onNavigate\)/;
const OPEN_BUTTON_CALLS_OPEN_HANDLER =
  /\(onOpenAppointment \?\? onSelectAppointment\)\(appointment\)[\s\S]{0,80}Ouvrir/;
const START_KEY_STARTS_CONSULTATION =
  /key === START_KEY && PRE_CONSULTATION_STATUSES\.includes\(target\.status\)[\s\S]*?transitionStatus\(target\.id, "in_progress"\)/;
const ELSE_FOCUS_TARGET = /else (\{)?focus\(target\.id\)/;
const PRE_CONSULTATION_INCLUDES_COMPLETED =
  /PRE_CONSULTATION_STATUSES[^\]]*"completed"/;

const read = (path: string) => readFileSync(path, "utf8");

it("fait démarrer la visite dans Flux depuis « Ouvrir » de l'Agenda", () => {
  const model = read("src/modules/agenda/hooks/use-agenda-page-model.tsx");
  expect(model).toMatch(OPEN_APPOINTMENT_STARTS_FLUX);
  expect(read("src/modules/agenda/components/agenda-view.tsx")).toContain(
    "onOpenAppointment={openAppointmentInFlux}"
  );
  expect(read("src/components/AgendaListView.tsx")).toMatch(
    OPEN_BUTTON_CALLS_OPEN_HANDLER
  );
  expect(read("src/app/config/view-registry.tsx")).toContain(
    "<AgendaPage onNavigate={props.onNavigate} />"
  );
});

it("démarre une visite neuve et cible une visite terminée sans la redémarrer", () => {
  const flux = codeText(read("src/modules/flow-board/open-in-flux.ts"));
  // Only a visit not yet in consultation moves to in_progress; any other is focused (with or without a block).
  expect(flux).toMatch(START_KEY_STARTS_CONSULTATION);
  expect(flux).toMatch(ELSE_FOCUS_TARGET);
  expect(read("src/domain/clinical/scheduling.ts")).not.toMatch(
    PRE_CONSULTATION_INCLUDES_COMPLETED
  );
});
