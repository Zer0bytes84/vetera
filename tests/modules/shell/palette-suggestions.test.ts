import { describe, expect, it } from "vitest";
import { suggestedPatients } from "@/modules/shell/model/palette-suggestions";
import type { Patient, Appointment } from "@/types/db";
const patients = [
  {id:"rex", status:"sante", lastVisit:"2026-10-08"},
  {id:"mocha", status:"traitement", lastVisit:"2026-10-09"},
  {id:"deceased", status:"decede", lastVisit:"2026-10-09"},
] as Patient[];
const visit = (patientId: string, status = "scheduled", startTime = "2026-10-10") => ({patientId,status,startTime}) as Appointment;
describe("Suggestions locales de la palette", () => {
  it("propose le prochain rendez-vous avant les patients récemment consultés sans doublon", () => {
    expect(suggestedPatients(patients, [visit("rex"),visit("rex")], Date.parse("2026-10-09")).map(p => p.id)).toEqual(["rex","mocha"]);
  });
  it("écarte les rendez-vous annulés, terminés et les patients supprimés ou décédés", () => {
    expect(suggestedPatients(patients, [visit("rex","cancelled"),visit("rex","completed"),visit("missing"),visit("deceased")], Date.parse("2026-10-09")).map(p => p.id)).toEqual(["mocha","rex"]);
  });
  it("ignore les dates invalides et renvoie un résultat déterministe", () => {
    const visits = [visit("rex","scheduled","invalid")];
    expect(suggestedPatients(patients, visits, 0)).toEqual(suggestedPatients(patients, visits, 0));
    expect(suggestedPatients([], visits, 0)).toEqual([]);
  });
});
