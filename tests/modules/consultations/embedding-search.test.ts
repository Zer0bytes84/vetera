import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runSqliteMigrations } from "../../../src/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "../../../src/services/sqlite/migrations";
import { reviewedSoapContent } from "../../../src/modules/consultations/local-ai/soap-review";
import {
  EMBEDDING_MODEL_KEY,
  documentSearchChunks,
  embeddingFromHex,
  embeddingToHex,
  normalizedEmbedding,
  rankPatientChunks,
  matchesSearchTerms,
  soapSearchChunks,
  type SearchScope,
} from "../../../src/modules/consultations/local-ai/embedding-index";
import type { ConsultationSoap, Note } from "../../../src/types/db";
const fixture = vi.hoisted(() => ({
  db: null as DatabaseSync | null,
  nextId: 0,
  embeds: 0,
  failInsert: false,
  failEmbedding: false,
  leases: 0,
  maximum: 0,
}));
const vector = (index = 0) =>
  Array.from({ length: 768 }, (_, i) => (i === index ? 1 : 0));
vi.mock("../../../src/modules/consultations/local-ai/models", () => ({
  getLocalModels: async () => ({ embeddingReady: true, root: "local" }),
  getLocalModelUrls: () => ({ modelRoot: "local/", runtimeRoot: "runtime/" }),
}));
vi.mock("../../../src/modules/consultations/local-ai/inference-client", () => ({
  LocalInferenceSession: {
    create: async () => {
      fixture.leases++;
      fixture.maximum = Math.max(fixture.maximum, fixture.leases);
      return {
        request: async (message: { texts: string[] }) => {
          if (fixture.failEmbedding) throw new Error("Modèle indisponible");
          fixture.embeds++;
          return {
            type: "embedded",
            vectors: message.texts.map(() => vector()),
          };
        },
        close: () => {
          fixture.leases--;
        },
      };
    },
  },
}));
vi.mock("../../../src/services/sqlite/database", () => ({
  generateId: () => `embedding-${++fixture.nextId}`,
  runDbRead: async (fn: (db: unknown) => unknown) => fn(adapter()),
  runDbTransaction: async (fn: (db: unknown) => unknown) => {
    fixture.db!.exec("BEGIN");
    try {
      const result = await fn(adapter());
      fixture.db!.exec("COMMIT");
      return result;
    } catch (error) {
      fixture.db!.exec("ROLLBACK");
      throw error;
    }
  },
}));
function adapter() {
  return {
    select: async <T>(sql: string, params: unknown[] = []) =>
      fixture.db!.prepare(sql).all(...params) as T,
    execute: async (sql: string, params: unknown[] = []) => {
      if (fixture.failInsert && sql.startsWith("INSERT INTO embeddings"))
        throw new Error("Écriture échouée");
      return fixture.db!.prepare(sql).run(...params);
    },
  };
}
import {
  detectSearchOrphans,
  indexPatientDocuments,
  persistSearchChunks,
  readPatientSearchRows,
  searchPatientDocuments,
  searchAllPatientsDocuments,
  searchAllPatientsClinical,
} from "../../../src/modules/consultations/local-ai/embedding-store";
let directory: string;
const scope: SearchScope = {
  patientId: "rex",
  sourceTypes: ["soap"],
  sections: ["assessment"],
};
function soap(
  patientId = "rex",
  id = "soap-rex",
  fields = {
    subjective: "Toux depuis hier.",
    objective: "Température normale.",
    assessment: "Infection respiratoire.",
    plan: "Contrôle demain.",
  }
): ConsultationSoap {
  return {
    ...fields,
    id,
    patientId,
    appointmentId: `visit-${patientId}`,
    content: reviewedSoapContent(fields, "{}", "vet"),
    aiDraft: null,
  } as ConsultationSoap;
}
function insertSoap(note: ConsultationSoap) {
  fixture
    .db!.prepare(
      "INSERT INTO consultation_soaps (id,appointment_id,patient_id,subjective,objective,assessment,plan,content) VALUES (?,?,?,?,?,?,?,?)"
    )
    .run(
      note.id,
      note.appointmentId,
      note.patientId,
      note.subjective,
      note.objective,
      note.assessment,
      note.plan,
      note.content
    );
}
async function persist(note = soap()) {
  const chunks = soapSearchChunks(note);
  return persistSearchChunks(
    adapter(),
    chunks,
    chunks.map(() => vector())
  );
}
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "baitari-embedding-"));
  fixture.db = new DatabaseSync(join(directory, "search.db"));
  fixture.nextId = 0;
  fixture.embeds = 0;
  fixture.leases = 0;
  fixture.maximum = 0;
  fixture.failInsert = false;
  fixture.failEmbedding = false;
  await runSqliteMigrations(
    {
      execute: async (sql, params = []) =>
        params.length
          ? fixture.db!.prepare(sql).run(...params)
          : fixture.db!.exec(sql),
      select: async <T>(sql, params = []) =>
        fixture.db!.prepare(sql).all(...params) as T,
    },
    SQLITE_MIGRATIONS
  );
  fixture.db.exec(
    "PRAGMA foreign_keys=ON; INSERT INTO users(id,email,password_hash,display_name,role) VALUES('vet','test@example.invalid','test','Dr Test','admin'); INSERT INTO owners(id,first_name,last_name,phone) VALUES('owner','Sarah','Martin','0');"
  );
  for (const patient of ["rex", "mocha"]) {
    fixture.db
      .prepare(
        "INSERT INTO patients(id,owner_id,name,species,sex) VALUES(?,'owner',?,'Chien','M')"
      )
      .run(patient, patient);
    fixture.db
      .prepare(
        "INSERT INTO appointments(id,patient_id,owner_id,vet_id,title,start_time,end_time,status,type) VALUES(?,?,'owner','vet','Consultation','2026-10-09 10:00:00','2026-10-09 10:30:00','in_progress','Consultation')"
      )
      .run(`visit-${patient}`, patient);
    insertSoap(soap(patient, `soap-${patient}`));
  }
});
afterEach(() => {
  fixture.db?.close();
  rmSync(directory, { recursive: true, force: true });
});
describe("Recherche sémantique locale : index et isolation", () => {
  it("retrouve bactérie dans une rubrique bactérienne sans abaisser le seuil sémantique", () => {
    const chunk = soapSearchChunks(soap()).find(row => row.section === "assessment")!;
    const withScore = (score: number) => {
      const result = vector(); result[0] = score; result[1] = Math.sqrt(1 - score * score); return result;
    };
    const rows = [{ ...chunk, text: "Perte de poids\n\nCause bactérienne", vector: withScore(0.284146) },
      { ...chunk, sourceId: "viral", text: "Cause virale", vector: withScore(0.189) }];
    expect(rankPatientChunks(rows, vector(), scope)).toEqual([]);
    const found = rankPatientChunks(rows, vector(), scope, 5, 0.6, "bactérie");
    expect(found).toHaveLength(1);
    expect(found[0].text).toContain("Cause bactérienne");
    expect(found[0].score).toBeCloseTo(0.284146);
  });
  it("ne confond pas variantes textuelles avec des synonymes ni préfixes arbitraires", () => {
    expect(matchesSearchTerms("bactérie", "Cause bactérienne")).toBe(true);
    expect(matchesSearchTerms("bactéries", "Cause bactérienne")).toBe(true);
    expect(matchesSearchTerms("bactérie résistance", "Cause bactérienne")).toBe(false);
    expect(matchesSearchTerms("bact", "Cause bactérienne")).toBe(false);
    expect(matchesSearchTerms("bactérie", "Cause virale")).toBe(false);
  });
  it("autorise tous les patients uniquement via la recherche explicite et conserve leur identité", async () => {
    const found = await searchAllPatientsDocuments({sourceTypes:["soap"],sections:["assessment"]}, "Infection");
    expect(found.map(row => row.patientId).sort()).toEqual(["mocha", "rex"]);
    expect(found.every(row => row.patientName === row.patientId && row.section === "assessment")).toBe(true);
    const own = await searchPatientDocuments(scope, "Infection");
    expect(own.map(row => row.patientId)).toEqual(["rex"]);
  });
  it("garde les filtres source et rubrique dans le mode tous les patients", async () => {
    expect(await searchAllPatientsDocuments({sourceTypes:["document"],sections:["document"]}, "Infection")).toEqual([]);
    expect(await searchAllPatientsDocuments({sourceTypes:["soap"],sections:["plan"]}, "Contrôle")).toHaveLength(2);
    await expect(searchAllPatientsDocuments({sourceTypes:[],sections:["plan"]}, "Contrôle")).rejects.toThrow();
  });
  it("ne permet pas au mode global de rechercher une note non validée", async () => {
    fixture.db!.prepare("UPDATE consultation_soaps SET ai_draft='{}' WHERE patient_id='mocha'").run();
    expect((await searchAllPatientsDocuments({sourceTypes:["soap"],sections:["assessment"]}, "Infection")).map(row => row.patientId)).toEqual(["rex"]);
  });
  it("respecte l’annulation avant l’indexation globale", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(searchAllPatientsDocuments({sourceTypes:["soap"],sections:["assessment"]}, "Infection", controller.signal)).rejects.toThrow("Tâche annulée");
    expect(fixture.embeds).toBe(0);
  });
  it("keeps complete semantic sections, even beyond the former character limit", () => {
    const note = soap("rex", "soap-rex", {
      subjective: "Observation. ".repeat(300),
      objective: "",
      assessment: "Évaluation.",
      plan: "",
    });
    const chunks = soapSearchChunks(note);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].text).toBe(note.subjective);
    expect(chunks.map((c) => c.section)).toEqual(["subjective", "assessment"]);
  });
  it("excludes unreviewed notes and invalidated approvals", () => {
    expect(() => soapSearchChunks({ ...soap(), aiDraft: "{}" })).toThrow();
    expect(() => soapSearchChunks({ ...soap(), plan: "Modifié" })).toThrow();
  });
  it("stores actual 3072-byte float32 blobs with source and timestamps", async () => {
    await persist();
    const rows = fixture
      .db!.prepare(
        "SELECT typeof(embedding) AS type,length(embedding) AS bytes,created_at,updated_at,source_type,source_id FROM embeddings"
      )
      .all();
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.type).toBe("blob");
      expect(row.bytes).toBe(3072);
      expect(row.created_at).toBeTruthy();
      expect(row.updated_at).toBeTruthy();
      expect(row.source_id).toBe("soap-rex");
    }
  });
  it("retrieves an indexed section after closing and reopening SQLite", async () => {
    await persist();
    fixture.db!.close();
    fixture.db = new DatabaseSync(join(directory, "search.db"));
    const rows = await readPatientSearchRows(adapter(), scope);
    expect(rows).toHaveLength(1);
    expect(rankPatientChunks(rows, vector(), scope)[0].text).toBe(
      "Infection respiratoire."
    );
  });
  it("filters patient, source and section in the database", async () => {
    await persist();
    await persist(soap("mocha", "soap-mocha"));
    const rows = await readPatientSearchRows(adapter(), scope);
    expect(rows).toHaveLength(1);
    expect(rows[0].patientId).toBe("rex");
    expect(rows[0].section).toBe("assessment");
    expect(
      await readPatientSearchRows(adapter(), {
        ...scope,
        sourceTypes: ["document"],
      })
    ).toEqual([]);
  });
  it("defends patient and section scope even if a database adapter returns excess rows", () => {
    const rows = soapSearchChunks(soap()).map((row) => ({
      ...row,
      vector: vector(),
    }));
    rows.push({ ...rows[0], patientId: "mocha", section: "assessment" });
    const result = rankPatientChunks(rows, vector(), scope);
    expect(result).toHaveLength(1);
    expect(result[0].patientId).toBe("rex");
    expect(result[0].section).toBe("assessment");
  });
  it("rejects a forged patient/source association at the SQL boundary", async () => {
    await persist();
    const row = fixture.db!.prepare("SELECT id FROM embeddings LIMIT 1").get()!;
    expect(() =>
      fixture
        .db!.prepare("UPDATE embeddings SET patient_id='mocha' WHERE id=?")
        .run(row.id)
    ).toThrow(/incompatible/);
  });
  it("rejects cross-patient batches before writing", async () => {
    const chunks = soapSearchChunks(soap());
    chunks[1] = { ...chunks[1], patientId: "mocha" };
    await expect(
      persistSearchChunks(
        adapter(),
        chunks,
        chunks.map(() => vector())
      )
    ).rejects.toThrow(/seul/);
    expect(
      fixture.db!.prepare("SELECT COUNT(*) AS n FROM embeddings").get()!.n
    ).toBe(0);
  });
  it("requires all scope filters explicitly", async () => {
    for (const invalid of [
      { ...scope, patientId: "" },
      { ...scope, sourceTypes: [] },
      { ...scope, sections: [] },
    ])
      await expect(readPatientSearchRows(adapter(), invalid)).rejects.toThrow();
  });
  it("returns no irrelevant result and applies a minimum threshold", () => {
    const rows = soapSearchChunks(soap()).map((row) => ({
      ...row,
      vector: vector(1),
    }));
    expect(rankPatientChunks(rows, vector(), scope)).toEqual([]);
    expect(() => rankPatientChunks(rows, vector(), scope, 5, 0)).toThrow();
  });
  it("has deterministic byte encoding and stable tie ordering", () => {
    const encoded = embeddingToHex(vector());
    expect(embeddingToHex(vector())).toBe(encoded);
    expect(embeddingFromHex(encoded)).toEqual(vector());
    const a = {
        ...soapSearchChunks(soap())[2],
        vector: vector(),
        sourceId: "a",
      },
      b = { ...a, sourceId: "b" };
    expect(
      rankPatientChunks([b, a], vector(), scope).map((r) => r.sourceId)
    ).toEqual(["a", "b"]);
  });
  it("rejects wrong dimensions, nonfinite, empty and damaged vectors", () => {
    for (const v of [
      [],
      Array(768).fill(0),
      Array(768).fill(NaN),
      Array(768).fill(Infinity),
    ])
      expect(() => normalizedEmbedding(v)).toThrow();
    expect(() => embeddingFromHex("not-a-blob")).toThrow();
  });
  it("rejects the source if it changed while inference was running", async () => {
    const chunks = soapSearchChunks(soap());
    fixture.db!.exec(
      "UPDATE consultation_soaps SET assessment='Autre évaluation' WHERE id='soap-rex'"
    );
    await expect(
      persistSearchChunks(
        adapter(),
        chunks,
        chunks.map(() => vector())
      )
    ).rejects.toThrow();
  });
  it("invalidates changed sections immediately then regenerates after renewed human review", async () => {
    await persist();
    fixture.db!.exec(
      "UPDATE consultation_soaps SET assessment='Nouvelle évaluation' WHERE id='soap-rex'"
    );
    expect(await readPatientSearchRows(adapter(), scope)).toEqual([]);
    await indexPatientDocuments("rex", new AbortController().signal, () => {});
    expect(await readPatientSearchRows(adapter(), scope)).toEqual([]);
    const changed = { ...soap(), assessment: "Nouvelle évaluation" };
    fixture
      .db!.prepare(
        "UPDATE consultation_soaps SET content=? WHERE id='soap-rex'"
      )
      .run(reviewedSoapContent(changed, "{}", "vet"));
    const results = await searchPatientDocuments(scope, "Évaluation");
    expect(results[0].text).toBe("Nouvelle évaluation");
    expect(fixture.maximum).toBe(1);
    expect(fixture.leases).toBe(0);
  });
  it("does not re-embed unchanged indexed sources", async () => {
    expect(
      await indexPatientDocuments("rex", new AbortController().signal, () => {})
    ).toBe(4);
    const count = fixture.embeds;
    expect(
      await indexPatientDocuments("rex", new AbortController().signal, () => {})
    ).toBe(0);
    expect(fixture.embeds).toBe(count);
  });
  it("deletes embeddings with the source and leaves the other patient intact", async () => {
    await persist();
    await persist(soap("mocha", "soap-mocha"));
    fixture.db!.exec("DELETE FROM consultation_soaps WHERE id='soap-rex'");
    expect(await readPatientSearchRows(adapter(), scope)).toEqual([]);
    expect(
      await readPatientSearchRows(adapter(), { ...scope, patientId: "mocha" })
    ).toHaveLength(1);
  });
  it("cascades through patient deletion", async () => {
    await persist();
    fixture.db!.exec("DELETE FROM patients WHERE id='rex'");
    expect(
      fixture.db!.prepare("SELECT COUNT(*) AS n FROM embeddings").get()!.n
    ).toBe(0);
  });
  it("detects orphaned rows even if foreign keys were disabled externally", async () => {
    await persist();
    fixture.db!.exec(
      "PRAGMA foreign_keys=OFF; DELETE FROM consultation_soaps WHERE id='soap-rex'"
    );
    expect(await detectSearchOrphans(adapter(), "rex")).toHaveLength(4);
    expect(await readPatientSearchRows(adapter(), scope)).toEqual([]);
    await indexPatientDocuments("rex", new AbortController().signal, () => {});
    expect(await detectSearchOrphans(adapter(), "rex")).toEqual([]);
  });
  it("rolls back an index replacement if insertion fails", async () => {
    await persist();
    fixture.failInsert = true;
    fixture.db!.exec("BEGIN");
    try {
      await persist();
    } catch {
      fixture.db!.exec("ROLLBACK");
    }
    expect(await readPatientSearchRows(adapter(), scope)).toHaveLength(1);
  });
  it("indexes validated patient-linked protocols separately from clinical notes", async () => {
    const note = {
      id: "protocol",
      patientId: "rex",
      content: "<p>Suivi validé</p>",
      tags: JSON.stringify({
        clinicalDocument: { reviewedAt: "2026-10-09", type: "protocol" },
      }),
    } as Note;
    fixture
      .db!.prepare(
        "INSERT INTO notes(id,user_id,title,content,tags,patient_id) VALUES(?,'vet','Protocole',?,?,?)"
      )
      .run(note.id, note.content, note.tags, note.patientId);
    const chunks = documentSearchChunks(note, "Suivi validé", "protocol");
    await persistSearchChunks(adapter(), chunks, [vector()]);
    expect(await readPatientSearchRows(adapter(), scope)).toEqual([]);
    expect(
      await readPatientSearchRows(adapter(), {
        patientId: "rex",
        sourceTypes: ["protocol"],
        sections: ["protocol"],
      })
    ).toHaveLength(1);
    fixture.db!.exec("DELETE FROM notes WHERE id='protocol'");
    expect(
      fixture.db!.prepare("SELECT COUNT(*) AS n FROM embeddings").get()!.n
    ).toBe(0);
  });
  it("does not index unapproved or unlinked documents", () => {
    expect(() =>
      documentSearchChunks({ patientId: "rex", tags: "{}" } as Note, "Texte")
    ).toThrow();
    expect(() =>
      documentSearchChunks(
        {
          tags: JSON.stringify({ clinicalDocument: { reviewedAt: "today" } }),
        } as Note,
        "Texte"
      )
    ).toThrow();
  });
  it("uses the versioned local model key", () => {
    expect(EMBEDDING_MODEL_KEY).toContain("sections-v2");
  });
  it("trouve les variations morphologiques : Vaccination -> vaccin, Antibiotique -> antibiotiques", () => {
    expect(
      matchesSearchTerms(
        "Vaccination",
        "Donc pour les antibiotiques ça sera pour 5 jours et pour le vaccin c'est tous les 3 mois."
      )
    ).toBe(true);
    expect(
      matchesSearchTerms(
        "Antibiotique",
        "Donc pour les antibiotiques ça sera pour 5 jours"
      )
    ).toBe(true);
    expect(
      matchesSearchTerms(
        "antibiotiques",
        "Le patient a besoin d'un traitement d'antibiotique"
      )
    ).toBe(true);
  });
  it("assure le mapping bi-directionnel obligatoire marque <-> DCI", () => {
    expect(matchesSearchTerms("Metacam", "Prescription de méloxicam 1.5 mg")).toBe(true);
    expect(matchesSearchTerms("méloxicam", "Metacam buvable 10ml")).toBe(true);
    expect(
      matchesSearchTerms("Synulox", "Traitement amoxicilline-acide clavulanique")
    ).toBe(true);
    expect(
      matchesSearchTerms("amoxicilline-acide clavulanique", "Synulox 50 mg comprimés")
    ).toBe(true);
    expect(
      matchesSearchTerms("Clavaseptin", "Prescription amoxicilline-acide clavulanique")
    ).toBe(true);
    expect(matchesSearchTerms("Convenia", "Injection SC de céfovécine")).toBe(true);
    expect(matchesSearchTerms("céfovécine", "Convenia injectable longue action")).toBe(true);
    expect(matchesSearchTerms("Cerenia", "Administration de maropitant 1 mg/kg")).toBe(true);
    expect(matchesSearchTerms("maropitant", "Cerenia comprimés anti-vomitif")).toBe(true);
  });
  it("assure l’expansion bi-directionnelle des acronymes vétérinaires (IRC, AINS)", () => {
    expect(
      matchesSearchTerms("IRC", "Suivi pour insuffisance rénale chronique stade 2")
    ).toBe(true);
    expect(
      matchesSearchTerms("insuffisance rénale chronique", "Bilan annuel IRC féline")
    ).toBe(true);
    expect(
      matchesSearchTerms("AINS", "Arrêt de l'anti-inflammatoire non stéroïdien")
    ).toBe(true);
  });
  it("couvre le vocabulaire clinique et les reformulations synonymiques", () => {
    expect(
      matchesSearchTerms("vomissement", "Le chat a vomi deux fois ce matin")
    ).toBe(true);
    expect(
      matchesSearchTerms("fièvre", "Hyperthermie modérée à 39.8°C")
    ).toBe(true);
    expect(
      matchesSearchTerms("diarrhée", "Épisode de selles liquides depuis hier")
    ).toBe(true);
  });
  it("calibre et justifie le seuil de pertinence : accepte les correspondances au-dessus du plancher lexical (0.15) et rejette le bruit (< 0.15)", () => {
    const chunk = soapSearchChunks(soap())[0];
    const withScore = (score: number) => {
      const result = vector();
      result[0] = score;
      result[1] = Math.sqrt(Math.max(0, 1 - score * score));
      return result;
    };
    // Score lexical avec DCI/acronyme à 0.214 (IRC) est accepté car >= 0.15
    const rowsWithLexical = [
      {
        ...chunk,
        text: "Suivi pour insuffisance rénale chronique",
        vector: withScore(0.214),
      },
    ];
    const foundLexical = rankPatientChunks(
      rowsWithLexical,
      vector(),
      { ...scope, sections: [chunk.section] },
      5,
      0.3,
      "IRC"
    );
    expect(foundLexical).toHaveLength(1);
    expect(foundLexical[0].match).toBe("text");
    expect(foundLexical[0].score).toBeCloseTo(0.214);

    // Score inférieur au plancher lexical (< 0.15) est rejeté même si mot-clé présent
    const rowsCorrupt = [
      {
        ...chunk,
        text: "Suivi pour insuffisance rénale chronique",
        vector: withScore(0.08),
      },
    ];
    const foundCorrupt = rankPatientChunks(
      rowsCorrupt,
      vector(),
      { ...scope, sections: [chunk.section] },
      5,
      0.3,
      "IRC"
    );
    expect(foundCorrupt).toHaveLength(0);

    // Score purement sémantique sans mot-clé : accepté si >= 0.30, rejeté si < 0.30
    const rowsSemantic = [
      {
        ...chunk,
        text: "Animal très abattu et prostré",
        vector: withScore(0.35),
      },
      {
        ...chunk,
        sourceId: "noise",
        text: "Température 38.5 normale",
        vector: withScore(0.12),
      },
    ];
    const foundSemantic = rankPatientChunks(
      rowsSemantic,
      vector(),
      { ...scope, sections: [chunk.section] },
      5,
      0.3,
      ""
    );
    expect(foundSemantic).toHaveLength(1);
    expect(foundSemantic[0].text).toContain("Animal très abattu");
  });
  it("résout les cas réels rapportés : Vaccination, bactérie, Antibiotique, Metacam, Synulox, IRC", async () => {
    fixture.db
      .prepare(
        "INSERT INTO appointments(id,patient_id,owner_id,vet_id,title,start_time,end_time,status,type) VALUES('visit-rex-clinical','rex','owner','vet','Consultation','2026-10-09 11:00:00','2026-10-09 11:30:00','in_progress','Consultation')"
      )
      .run();
    const realSoap = soap("rex", "soap-rex-clinical", {
      subjective: "Donc pour les antibiotiques ça sera pour 5 jours et pour le vaccin c'est tous les 3 mois. Fier et vomissement du patient",
      objective: "Microbes. L'examen clinique a montré que le patient avait une fièvre aiguë.",
      assessment: "Perte de poids. Cause bactérienne. Suspicion IRC.",
      plan: "Traitement par Metacam (méloxicam) et Synulox (amoxicilline-acide clavulanique).",
    });
    realSoap.appointmentId = "visit-rex-clinical";
    insertSoap(realSoap);

    await persist(realSoap);

    // 1) "Vaccination" retrouve subjective avec texte prioritaire
    const resVaccin = await searchPatientDocuments(
      { patientId: "rex", sourceTypes: ["soap"], sections: ["subjective"] },
      "Vaccination"
    );
    expect(resVaccin.length).toBeGreaterThanOrEqual(1);
    expect(resVaccin[0].text).toContain("pour le vaccin c'est tous les 3 mois");

    // 2) "bactérie" retrouve assessment
    const resBacterie = await searchPatientDocuments(
      { patientId: "rex", sourceTypes: ["soap"], sections: ["assessment"] },
      "bactérie"
    );
    expect(resBacterie.length).toBeGreaterThanOrEqual(1);
    expect(resBacterie[0].text).toContain("Cause bactérienne");

    // 3) "Antibiotique" retrouve subjective
    const resAntibio = await searchPatientDocuments(
      { patientId: "rex", sourceTypes: ["soap"], sections: ["subjective"] },
      "Antibiotique"
    );
    expect(resAntibio.length).toBeGreaterThanOrEqual(1);
    expect(resAntibio[0].text).toContain("antibiotiques");

    // 4) "Metacam" retrouve plan avec méloxicam
    const resMetacam = await searchPatientDocuments(
      { patientId: "rex", sourceTypes: ["soap"], sections: ["plan"] },
      "Metacam"
    );
    expect(resMetacam.length).toBeGreaterThanOrEqual(1);
    expect(resMetacam[0].text).toContain("méloxicam");

    // 5) "Synulox" retrouve plan avec amoxicilline-acide clavulanique
    const resSynulox = await searchPatientDocuments(
      { patientId: "rex", sourceTypes: ["soap"], sections: ["plan"] },
      "Synulox"
    );
    expect(resSynulox.length).toBeGreaterThanOrEqual(1);
    expect(resSynulox[0].text).toContain("amoxicilline-acide clavulanique");

    // 6) "IRC" retrouve assessment avec Suspicion IRC
    const resIRC = await searchPatientDocuments(
      { patientId: "rex", sourceTypes: ["soap"], sections: ["assessment"] },
      "IRC"
    );
    expect(resIRC.length).toBeGreaterThanOrEqual(1);
    expect(resIRC[0].text).toContain("Suspicion IRC");

    // 7) Isolement patient : mocha n'a pas accès à la note de rex
    const resMocha = await searchPatientDocuments(
      { patientId: "mocha", sourceTypes: ["soap"], sections: ["subjective"] },
      "Vaccination"
    );
    expect(resMocha.filter(r => r.patientId === "rex")).toHaveLength(0);
  });

  it("indexe et retrouve les données à travers l'ensemble des 6 domaines cliniques (patients, consultations, SOAP, documents, protocoles, produits)", async () => {
    // 1. Ajouter un produit (Vaccin rage, antibiotique Synulox)
    fixture.db!
      .prepare(
        "INSERT INTO products (id, name, category, sub_category, quantity, unit, min_stock, purchase_price_amount, sale_price_amount) VALUES (?, ?, ?, ?, ?, ?, 0, 100, 200)"
      )
      .run("prod-vaccin", "Vaccin Rabique Canin", "Pharmacie", "Vaccin", 15, "flacon");
    fixture.db!
      .prepare(
        "INSERT INTO products (id, name, category, sub_category, quantity, unit, min_stock, purchase_price_amount, sale_price_amount) VALUES (?, ?, ?, ?, ?, ?, 0, 150, 300)"
      )
      .run("prod-synulox", "Synulox 250mg", "Pharmacie", "Antibiotique", 20, "boîte");

    // 2. Ajouter une consultation (appointment) de type Vaccin
    fixture.db!
      .prepare(
        "INSERT INTO appointments (id, patient_id, owner_id, vet_id, title, start_time, end_time, status, type, reason, diagnosis, treatment, notes) VALUES (?, ?, 'owner', 'vet', ?, '2026-10-10 14:00:00', '2026-10-10 14:30:00', 'completed', 'Vaccin', ?, ?, ?, ?)"
      )
      .run(
        "appt-vaccin-rex",
        "rex",
        "Vaccination annuelle",
        "Rappel annuel vaccins",
        "Statut vaccinal à jour",
        "Injection vaccin",
        "Aucune réaction indésirable"
      );

    // 3. Ajouter une note document et protocole
    fixture.db!
      .prepare(
        "INSERT INTO notes (id, user_id, title, content, patient_id, tags) VALUES (?, 'vet', ?, ?, ?, ?)"
      )
      .run(
        "note-proto-vaccin",
        "Protocole Vaccinal Chiot",
        "Protocole vaccinal complet: primo-vaccination à 8 semaines puis rappel.",
        "rex",
        JSON.stringify({ clinicalDocument: { type: "protocol", reviewedAt: "2026-10-10T10:00:00Z" } })
      );

    // 4. Mettre à jour les informations du patient rex (IRC dans affections chroniques)
    fixture.db!
      .prepare(
        "UPDATE patients SET chronic_conditions = 'Insuffisance rénale chronique (IRC)' WHERE id = 'rex'"
      )
      .run();

    const allFilters = {
      sourceTypes: [
        "soap",
        "document",
        "protocol",
        "patient",
        "consultation",
        "product",
      ] as const,
      sections: [
        "subjective",
        "objective",
        "assessment",
        "plan",
        "document",
        "protocol",
        "patient",
        "consultation",
        "product",
      ] as const,
    };

    // A) Recherche "vaccin" : doit trouver dans produits, consultations, protocoles et SOAP
    const resultsVaccin = await searchAllPatientsClinical(allFilters, "vaccin");
    expect(resultsVaccin.length).toBeGreaterThanOrEqual(3);
    const sourceTypesVaccin = resultsVaccin.map((r) => r.sourceType);
    expect(sourceTypesVaccin).toContain("product");
    expect(sourceTypesVaccin).toContain("consultation");
    expect(sourceTypesVaccin).toContain("protocol");

    // B) Recherche "Synulox" : trouve le produit et le plan SOAP
    const resultsSynulox = await searchAllPatientsClinical(allFilters, "Synulox");
    expect(resultsSynulox.length).toBeGreaterThanOrEqual(1);
    expect(resultsSynulox.some((r) => r.sourceType === "product" && r.text.includes("Synulox"))).toBe(true);

    // C) Recherche "IRC" : trouve la fiche patient de Rex (et son assessment SOAP)
    const resultsIRC = await searchAllPatientsClinical(allFilters, "IRC");
    expect(resultsIRC.length).toBeGreaterThanOrEqual(1);
    expect(resultsIRC.some((r) => r.patientId === "rex" && r.sourceType === "patient")).toBe(true);
  });
});





describe("recherche clinique exacte dans les sources validées", () => {
  it("retrouve bactérie sans modèle et garde le patient et la rubrique", async () => {
    const fields = { ...soap(), assessment: "Cause bactérienne" };
    const updated = soap("rex", "soap-rex", fields);
    fixture.db!.prepare("UPDATE consultation_soaps SET assessment=?,content=? WHERE id=?")
      .run(updated.assessment, updated.content, updated.id);
    fixture.failEmbedding = true;
    const results = await searchPatientDocuments(scope, "bactérie");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ patientId: "rex", section: "assessment", text: "Cause bactérienne", match: "text" });
    expect(await searchPatientDocuments({ ...scope, sections: ["plan"] }, "bactérie").catch(() => [])).toEqual([]);
  });
  it("ne restitue pas une note modifiée sans nouvelle validation", async () => {
    fixture.db!.exec("UPDATE consultation_soaps SET assessment='Cause bactérienne' WHERE id='soap-rex'");
    fixture.failEmbedding = true;
    expect(await searchPatientDocuments(scope, "bactérie")).toEqual([]);
  });
});
