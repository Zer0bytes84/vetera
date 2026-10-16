import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Patient, Reminder, Task } from "@/types/db";
import type { PatientReminder, ReminderType } from "@/modules/patient-reminders/store";

const harness = vi.hoisted(() => ({
  tasks: [] as Task[],
  appointmentsReminders: [] as Reminder[],
  medicalReminders: [] as PatientReminder[],
  types: [] as ReminderType[],
  patients: [] as Patient[],
  error: null as string | null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: { id: "vet", uid: "vet", displayName: "Vétérinaire" } }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "fr" } }),
}));
vi.mock("@/contexts/focus-provider", () => ({
  useFocus: () => ({ focus: null, clearFocus: () => {} }),
}));
vi.mock("@/data/repositories", () => ({
  useTasksRepository: () => ({ data: harness.tasks }),
  useRemindersRepository: () => ({ data: harness.appointmentsReminders }),
  usePatientsRepository: () => ({ data: harness.patients }),
  useAppointmentsRepository: () => ({ data: [] }),
  useOwnersRepository: () => ({ data: [] }),
  useUsersRepository: () => ({ data: [] }),
}));
vi.mock("@/modules/patient-reminders/use-patient-reminders", () => ({
  usePatientReminders: () => ({
    reminders: harness.medicalReminders, types: harness.types,
    error: harness.error, loading: false, refresh: async () => {},
  }),
  announcePatientRemindersChanged: () => {},
}));

import Tasks from "@/components/Tasks";

const render = () => renderToStaticMarkup(<Tasks />);
const task = (id: string, dueDate = "2026-10-14", status: Task["status"] = "todo") => ({
  id, title: `Rappel ${id}`, dueDate, status, priority: "medium", assignedTo: "vet",
} as Task);
const medical = (id: string, due_date: string, status: PatientReminder["status"] = "en_cours") => ({
  id, patient_id: "patient", type_id: "vaccination", family_key: "vaccination", due_date,
  status, origin: "manuel",
} as PatientReminder);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-14T12:00:00"));
  harness.tasks = [];
  harness.appointmentsReminders = [];
  harness.medicalReminders = [];
  harness.patients = [{ id: "patient", name: "Patient test" } as Patient];
  harness.types = [{ id: "vaccination", name: "Vaccination", active: 1 } as ReminderType];
  harness.error = null;
});
afterEach(() => vi.useRealTimers());

it("affiche les quatre rappels à traiter même en l’absence de rappels médicaux", () => {
  harness.tasks = [task("1"), task("2"), task("3"), task("4")];
  const html = render();
  expect(html).toMatch(/À traiter[\s\S]*?class="[^"]*\bsection-atlas-value\b[^"]*"[^>]*>4<\/span>/);
  for (const id of ["1", "2", "3", "4"]) expect(html).toContain(`data-task-id="${id}"`);
  expect(html).not.toContain("Aucun rappel dans cette vue.");
});

it("compte et affiche les mêmes échéances médicales et manuelles, sans inclure les futures ou terminées", () => {
  harness.tasks = [task("manuel"), task("futur", "2026-10-15"), task("termine", "2026-10-14", "done")];
  harness.medicalReminders = [medical("du", "2026-10-13"), medical("futur", "2026-10-15"), medical("termine", "2026-10-12", "traite")];
  const html = render();
  expect(html).toMatch(/À traiter[\s\S]*?class="[^"]*\bsection-atlas-value\b[^"]*"[^>]*>2<\/span>/);
  expect(html).toContain('data-task-id="manuel"');
  expect(html).toContain("Patient test · Vaccination");
  expect(html).not.toContain('data-task-id="futur"');
  expect(html).not.toContain('data-task-id="termine"');
  expect((html.match(/Patient test · Vaccination/g) || []).length).toBe(1);
});

it("propose le type et une date préremplie dans le formulaire rapide", () => {
  const html = render();
  expect(html).toContain('aria-label="Type du nouveau rappel"');
  expect(html).toMatch(/aria-label="Date du nouveau rappel"[^>]*value="2026-10-14"/);
});

it("signale un échec de chargement des rappels patients au lieu de le masquer derrière la liste manuelle", () => {
  harness.tasks = [task("manuel")];
  harness.error = "Les rappels patients n’ont pas pu être chargés.";
  const html = render();
  expect(html).toContain(harness.error);
  expect(html).toContain('role="alert"');
  expect(html).toContain('data-task-id="manuel"');
});
