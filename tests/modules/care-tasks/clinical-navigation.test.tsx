import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { CareStatus } from "../../../src/modules/care-tasks/domain";

type Task = { id: string; patient_id: string; heure_prevue: string; statut: CareStatus };
const harness = vi.hoisted(() => ({
  tasks: [] as Task[],
  now: new Date("2026-10-13T12:00:00Z"),
  focus: null as { kind: "care_patient"; id: string } | null,
}));
vi.mock("@/modules/care-tasks/use-care-tasks", () => ({ useCareTasks: () => harness }));
vi.mock("@/contexts/focus-provider", () => ({
  useFocus: () => ({ focus: harness.focus, clearFocus: () => {}, registerHandler: () => {} }),
}));
vi.mock("@/modules/care-tasks/care-page", () => ({ default: () => null }));
vi.mock("@/modules/patients/pages/patients-page", () => ({ default: () => null }));
vi.mock("@/modules/hospitalizations/stays/stays-page", () => ({ default: () => null }));
vi.mock("../../../src/modules/clinique/pages/clinique-page", () => ({ default: () => null }));

import ClinicalWorkspace from "../../../src/modules/clinique/pages/clinical-workspace";
const render = () => renderToStaticMarkup(<ClinicalWorkspace onNavigate={() => {}} />);
const task = (id: string, statut: CareStatus, heure_prevue: string, patient_id = "patient-a"): Task =>
  ({ id, patient_id, statut, heure_prevue });
beforeEach(() => { harness.tasks = []; harness.focus = null; });

it("signale dans la navigation les soins réellement en retard et ignore les futurs et terminaux", () => {
  harness.tasks = [
    task("todo", "a_faire", "2026-10-13T11:00:00Z"),
    task("started", "en_cours", "2026-10-13T11:30:00Z"),
    task("future", "a_faire", "2026-10-13T13:00:00Z"),
    task("done", "fait", "2026-10-13T10:00:00Z"),
    task("cancelled", "annule", "2026-10-13T10:00:00Z"),
  ];
  const html = render();
  expect(html).toContain('aria-label="Soins, 2 soins en retard"');
  expect(html).toContain("care-nav-badge");
});

it("n’affiche pas de badge à zéro ni à l’heure prévue exacte", () => {
  harness.tasks = [task("due", "a_faire", harness.now.toISOString())];
  const html = render();
  expect(html).toContain('aria-label="Soins"');
  expect(html).not.toContain("care-nav-badge");
});

it("respecte le patient du dossier pour le compteur et son libellé accessible", () => {
  harness.focus = { kind: "care_patient", id: "patient-a" };
  harness.tasks = [
    task("one", "a_faire", "2026-10-13T11:00:00Z"),
    task("other", "a_faire", "2026-10-13T11:00:00Z", "patient-b"),
  ];
  expect(render()).toContain('aria-label="Soins, 1 soin en retard"');
});
