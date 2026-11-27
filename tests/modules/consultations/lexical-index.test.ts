import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { syncLexicalIndex } from "../../../src/modules/consultations/local-ai/lexical-index";
import { SEARCH_LEXICAL_INDEX_MIGRATION_SQL } from "../../../src/modules/consultations/local-ai/lexical-index-migration";
import {
  exactTermsExpression,
  lexicalMatchExpression,
  lexicalWords,
  matchesExactSearchTerms,
  matchesSearchTerms,
  stemFrenchWord,
  stemPrefixes,
} from "../../../src/modules/consultations/local-ai/veterinary-lexicon";

// The word index only pre-selects passages: matchesSearchTerms still decides. The search stays the same as long as the
// FTS5 expression of a query selects every passage matchesSearchTerms accepts. These tests check that property.

let seed = 11;
const random = () => {
  seed = (seed * 16_807) % 2_147_483_647;
  return seed / 2_147_483_647;
};
const pick = <T>(items: readonly T[]) =>
  items[Math.floor(random() * items.length)];

const QUERIES = [
  "boiterie",
  "boiteries",
  "claudication",
  "vomissements",
  "vomir",
  "diarrhée",
  "prurit",
  "démangeaisons",
  "grattage",
  "otite externe",
  "dermatite",
  "toux",
  "tousse",
  "fièvre",
  "fébrile",
  "hyperthermie",
  "léthargie",
  "abattement",
  "anorexie",
  "inappétence",
  "polyurie polydipsie",
  "PUPD",
  "PU PD",
  "méloxicam",
  "Metacam",
  "Synulox",
  "amoxicilline",
  "amoxicilline acide clavulanique",
  "Convenia",
  "céfovécine",
  "Cerenia",
  "maropitant",
  "IRC",
  "insuffisance rénale chronique",
  "créatinine 2",
  "méloxicam 0,1 mg/kg",
  "mg",
  "kg",
  "10 jours",
  "œdème",
  "oedeme",
  "œil",
  "cœur",
  "dyspnée",
  "polypnée",
  "vaccination",
  "vacciner",
  "bactérienne",
  "antibiotiques",
  "inflammatoire",
  "allergique",
  "AINS",
  "anti-inflammatoire",
  "l'otite",
  "d’otite",
  "le",
  "la les",
  "a",
  "x",
  "BOITERIE",
  "luxation rotule",
  "chat qui ne mange plus",
  "castré",
];
const WORDS = [
  "boiterie",
  "boite",
  "boiter",
  "claudication",
  "claudique",
  "vomissements",
  "vomit",
  "vomir",
  "diarrhée",
  "diarrhéique",
  "prurit",
  "démangeaisons",
  "grattage",
  "se gratte",
  "otite",
  "otites",
  "externe",
  "dermatite",
  "toux",
  "tousse",
  "toussait",
  "fièvre",
  "fébrile",
  "hyperthermie",
  "léthargie",
  "léthargique",
  "abattement",
  "abattu",
  "anorexie",
  "inappétence",
  "polyurie",
  "polydipsie",
  "PU/PD",
  "PUPD",
  "Metacam",
  "Metacam®",
  "méloxicam",
  "meloxicam",
  "Synulox",
  "amoxicilline",
  "acide",
  "clavulanique",
  "Convenia",
  "céfovécine",
  "Cerenia",
  "maropitant",
  "IRC",
  "insuffisance",
  "rénale",
  "chronique",
  "créatinine",
  "2",
  "2,5",
  "0,1",
  "0,1mg/kg",
  "0,1 mg/kg",
  "10mg",
  "mg/kg",
  "10",
  "jours",
  "œdème",
  "oedème",
  "œil",
  "cœur",
  "dyspnée",
  "polypnée",
  "vaccination",
  "vacciné",
  "bactérie",
  "bactérienne",
  "antibiotique",
  "antibiotiques",
  "inflammation",
  "anti-inflammatoire",
  "AINS",
  "l'otite",
  "d’otite",
  "luxation",
  "rotule",
  "chat",
  "mange",
  "plus",
  "castré",
  "castration",
  "le",
  "la",
  "les",
  "a",
  "et",
  "chien",
  "contrôle",
  "plaie",
];
const TEXTS = Array.from({ length: 500 }, () =>
  Array.from({ length: 3 + Math.floor(random() * 12) }, () => {
    const word = pick(WORDS);
    return random() < 0.1 ? word.toUpperCase() : word;
  }).join(random() < 0.2 ? ", " : " ")
);

function index(texts: string[]) {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE embeddings (id TEXT PRIMARY KEY, chunk_text TEXT)");
  db.exec(SEARCH_LEXICAL_INDEX_MIGRATION_SQL);
  const insert = db.prepare(
    "INSERT INTO embeddings_lexical(rowid, words) VALUES (?, ?)"
  );
  for (const [i, text] of texts.entries()) {
    insert.run(i + 1, lexicalWords(text));
  }
  return db;
}
const selected = (db: DatabaseSync, expression: string | null) =>
  new Set(
    expression === null
      ? []
      : (
          db
            .prepare(
              "SELECT rowid AS id FROM embeddings_lexical WHERE embeddings_lexical MATCH ?"
            )
            .all(expression) as Array<{ id: number }>
        ).map((row) => row.id)
  );

describe("lexical index expansion", () => {
  it("knows every dedicated root of the stemmer and the word beginnings that lead to it", () => {
    const source = readFileSync(
      "src/modules/consultations/local-ai/veterinary-lexicon.ts",
      "utf8"
    );
    const stemmer = source.slice(
      source.indexOf("export function stemFrenchWord"),
      source.indexOf("// Standard French medical")
    );
    const prefixes = [...stemmer.matchAll(/startsWith\("([a-z]+)"\)/g)].map(
      (match) => match[1]
    );
    expect(prefixes.length).toBeGreaterThan(20);
    for (const prefix of prefixes) {
      const root = stemFrenchWord(`${prefix}zz`);
      expect(
        stemPrefixes(root).some((start) => prefix.startsWith(start)),
        `${prefix} -> ${root}`
      ).toBe(true);
    }
    expect(stemPrefixes(stemFrenchWord("toux"))).toContain("toux");
  });

  it("selects every passage matchesSearchTerms accepts", () => {
    const db = index(TEXTS);
    let accepted = 0;
    for (const query of QUERIES) {
      const candidates = selected(db, lexicalMatchExpression(query));
      TEXTS.forEach((text, i) => {
        if (matchesSearchTerms(query, text)) {
          accepted++;
          expect(candidates.has(i + 1), `« ${query} » dans « ${text} »`).toBe(
            true
          );
        }
      });
    }
    expect(accepted).toBeGreaterThan(500);
  });

  it("selects every passage matchesExactSearchTerms accepts", () => {
    const db = index(TEXTS);
    for (const query of QUERIES) {
      const candidates = selected(db, exactTermsExpression(query));
      TEXTS.forEach((text, i) => {
        if (matchesExactSearchTerms(query, text)) {
          expect(candidates.has(i + 1), `« ${query} » dans « ${text} »`).toBe(
            true
          );
        }
      });
    }
  });

  it("indexes the words the lexicon compares, not the raw text", () => {
    expect(lexicalWords("Œdème, 0,1mg/kg de Metacam® ; l'otite")).toBe(
      "dème 0 1 mg kg de metacam l otite".replace("dème", "deme")
    );
  });
});

describe("lexical index synchronisation", () => {
  const database = () => {
    const db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE embeddings (id TEXT PRIMARY KEY, chunk_text TEXT)");
    db.exec(SEARCH_LEXICAL_INDEX_MIGRATION_SQL);
    return {
      db,
      adapter: {
        execute: (sql: string, params: unknown[] = []) =>
          Promise.resolve(db.prepare(sql).run(...(params as never[]))),
        select: <T>(sql: string, params: unknown[] = []) =>
          Promise.resolve(db.prepare(sql).all(...(params as never[])) as T),
      },
    };
  };
  const count = (db: DatabaseSync, expression: string) =>
    (
      db
        .prepare(
          "SELECT count(*) AS n FROM embeddings_lexical WHERE embeddings_lexical MATCH ?"
        )
        .get(expression) as { n: number }
    ).n;

  it("adds the missing passages once, in batches, and stays idempotent", async () => {
    const { db, adapter } = database();
    const insert = db.prepare(
      "INSERT INTO embeddings(id, chunk_text) VALUES (?, ?)"
    );
    for (let i = 0; i < 450; i++) {
      insert.run(`e${i}`, i % 2 ? "Boiterie postérieure" : "Otite externe");
    }
    expect(await syncLexicalIndex(adapter)).toBe(true);
    expect(await syncLexicalIndex(adapter)).toBe(true);
    expect(count(db, '"boiterie"')).toBe(225);
    expect(count(db, '"otite"')).toBe(225);
  });

  it("forgets a passage that is deleted or rewritten, then indexes the new text", async () => {
    const { db, adapter } = database();
    db.prepare(
      "INSERT INTO embeddings(id, chunk_text) VALUES ('a', 'Otite externe'), ('b', 'Otite moyenne')"
    ).run();
    await syncLexicalIndex(adapter);
    db.prepare("DELETE FROM embeddings WHERE id = 'a'").run();
    db.prepare(
      "UPDATE embeddings SET chunk_text = 'Boiterie' WHERE id = 'b'"
    ).run();
    expect(count(db, '"otite"')).toBe(0);
    await syncLexicalIndex(adapter);
    expect(count(db, '"otite"')).toBe(0);
    expect(count(db, '"boiterie"')).toBe(1);
  });

  it("reports an unusable index instead of failing the search", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE embeddings (id TEXT PRIMARY KEY, chunk_text TEXT)");
    const adapter = {
      execute: () => Promise.resolve(),
      select: <T>(sql: string) => Promise.resolve(db.prepare(sql).all() as T),
    };
    expect(await syncLexicalIndex(adapter)).toBe(false);
  });
});
