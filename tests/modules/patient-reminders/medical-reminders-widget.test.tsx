import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { PatientReminder, ReminderType } from "@/modules/patient-reminders/store";

vi.mock("@/data/repositories", () => ({ usePatientsRepository: () => ({ data: [] }) }));
vi.mock("@/modules/patient-reminders/use-patient-reminders", () => ({ usePatientReminders: () => ({}) }));

const { MedicalRemindersWidgetContent } = await import("@/modules/patient-reminders/medical-reminders-widget");

const reminder = (id: string, echeance: string, statut: PatientReminder["statut"] = "en_cours"): PatientReminder => ({
  id, echeance, statut, patient_id: "p1", type: "vaccin", acte_source_id: null, client_id: null, completed_at: null,
  created_at: "2026-01-01T00:00:00Z", intervalle_mois: 12, motif_annulation: null, note: null, updated_at: "2026-01-01T00:00:00Z",
});
const types = [{ id: "vaccin", name: "Vaccination annuelle", active: 1, code: "vaccin", interval_months: 12 }] as ReminderType[];
const render = (reminders: PatientReminder[]) => renderToStaticMarkup(
  <MedicalRemindersWidgetContent
    model={{ reminders, types, error: null, loading: false, refresh: async () => {} } as never}
    onAll={() => {}}
    patients={[{ id: "p1", name: "Mocha" }]}
    today="2026-10-17"
  />,
);

it("sépare des compteurs libellés et une liste d’échéances nommée", () => {
  const html = render([reminder("late", "2026-10-01"), reminder("today", "2026-10-17"), reminder("a", "2026-11-02"), reminder("b", "2026-12-01"), reminder("c", "2027-01-05"), reminder("d", "2027-02-01"), reminder("done", "2026-11-01", "termine")]);
  expect(html).toContain("Situation");
  expect(html).toContain("Prochaines échéances");
  // Every counter has its own label: late, today and the total still to come.
  expect(html).toMatch(/En retard<\/dt><dd[^>]*>1</);
  expect(html).toMatch(/Aujourd’hui<\/dt><dd[^>]*>1</);
  expect(html).toMatch(/À venir<\/dt><dd[^>]*>4</);
  // The labelled list holds only dated reminders, three at most, never counters.
  const list = html.slice(html.indexOf("<ul"), html.indexOf("</ul>"));
  expect(list.match(/<li/g)).toHaveLength(3);
  expect(list).toContain("Mocha");
  expect(list).toContain("Vaccination annuelle");
  expect(list).not.toMatch(/en retard|aujourd/i);
});

it("garde la zone d’échéances libellée quand aucun rappel futur n’existe", () => {
  const html = render([]);
  expect(html).toContain("Prochaines échéances");
  expect(html).toContain("Suivi à jour");
});

it("masque le badge d’état tant qu’une erreur de chargement est affichée", () => {
  const html = renderToStaticMarkup(
    <MedicalRemindersWidgetContent
      model={{ reminders: [], types, error: "Les rappels patients n’ont pas pu être chargés.", loading: false, refresh: async () => {} } as never}
      onAll={() => {}}
      patients={[]}
      today="2026-10-17"
    />,
  );
  expect(html).toContain("Les rappels patients n’ont pas pu être chargés.");
  expect(html).not.toContain("À jour");
  expect(html).toContain("Voir les rappels");
});
