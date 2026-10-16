import { describe, expect, it } from "vitest";
import { matchesSearchTerms, rankPatientChunks } from "../../../src/modules/consultations/local-ai/embedding-index";
const vector = (axis: number) => Array.from({length:768}, (_,i)=>i===axis?1:0);
describe("Recherche hybride exacte", () => {
  it("retrouve les molécules et dosages avec virgule ou point et unités accolées", () => {
    expect(matchesSearchTerms("méloxicam 0,5 mg/kg", "Méloxicam 0.5mg/kg prescrit")).toBe(true);
    expect(matchesSearchTerms("méloxicam 0,5 mg/kg", "Méloxicam 5 mg/kg prescrit")).toBe(false);
    expect(matchesSearchTerms("amoxicilline 5 mg", "Amoxicilline 10 mg pour un patient de 5 kg")).toBe(false);
  });
  it("conserve une correspondance exacte malgré un faible cosinus, sans mélanger les patients", () => {
    const row={patientId:"p1",sourceId:"s1",sourceType:"soap" as const,documentType:"consultation" as const,section:"plan" as const,chunkIndex:0,text:"Méloxicam 0,5 mg/kg",sourceKey:"key",vector:vector(1)};
    const result=rankPatientChunks([row,{...row,patientId:"p2",sourceId:"s2"}],vector(0),{patientId:"p1",sourceTypes:["soap"],sections:["plan"]},5,0.3,"méloxicam 0.5mg/kg");
    expect(result).toHaveLength(1);expect(result[0].match).toBe("text");
  });
  it("exclut un dosage différent même si le vecteur est identique", () => {
    const row={patientId:"p1",sourceId:"s1",sourceType:"soap" as const,documentType:"consultation" as const,section:"plan" as const,chunkIndex:0,text:"Méloxicam 5 mg/kg",sourceKey:"key",vector:vector(0)};
    expect(rankPatientChunks([row],vector(0),{patientId:"p1",sourceTypes:["soap"],sections:["plan"]},5,0.3,"méloxicam 0,5 mg/kg")).toEqual([]);
  });
});
