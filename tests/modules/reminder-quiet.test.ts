import { describe, expect, it } from "vitest";
import { buildReminderQuiet, type QuietReminder } from "../../src/components/reminder-quiet";

const now = new Date(2026, 10, 12, 10, 0);
const day = (d: number) => new Date(2026, 10, d, 9, 0);
const items: QuietReminder[] = [
  { kind: "manual", date: day(14), completed: false, title: "Commander les vaccins" },
  { kind: "medical", date: day(13), completed: false, title: "Vaccin", patientName: "Lisa" },
  { kind: "manual", date: day(30), completed: false, title: "Dossier ferme pilote" },
  { kind: "manual", date: day(13), completed: true, title: "Déjà fait" },
  { kind: "automatic", date: day(12), completed: true, title: "SMS" },
  { kind: "manual", date: null, completed: false, title: "Sans date" },
];

describe("« Rien à traiter » : ce qui vient, lu dans les rappels de la page", () => {
  it("le prochain rappel ouvert après aujourd'hui, jamais un terminé", () => {
    expect(buildReminderQuiet(items, now).next).toMatchObject({ title: "Vaccin", patientName: "Lisa" });
  });
  it("les ouverts par origine, ceux des sept prochains jours, les terminés", () => {
    expect(buildReminderQuiet(items, now)).toMatchObject({ openManual: 3, openMedical: 1, week: 2, completed: 2 });
  });
  it("rien d'ouvert : pas de prochain rappel", () => {
    expect(buildReminderQuiet(items.filter((item) => item.completed), now).next).toBeNull();
  });
});
