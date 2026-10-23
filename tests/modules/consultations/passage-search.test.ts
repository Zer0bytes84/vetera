import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LEXICAL_BONUS,
  LEXICAL_ONLY_SCORE,
  PASSAGE_CHARACTERS,
  bestPassage,
  passageChunks,
  rankPassages,
  splitPassages,
} from "@/modules/consultations/local-ai/passage-search";
import type { SearchChunk, SearchScope } from "@/modules/consultations/local-ai/embedding-index";

const sentence = (n: number) =>
  `Phrase ${n} décrivant l’examen clinique du patient avec suffisamment de détails pour remplir le passage.`;
const scope: SearchScope = { patientId: "rex", sourceTypes: ["soap", "document"], sections: ["assessment", "document"] };
// Unit vector whose cosine with `axis(0)` is exactly `cos`.
const axis = (index: number) => Array.from({ length: 768 }, (_, i) => (i === index ? 1 : 0));
const towards = (cos: number) => Array.from({ length: 768 }, (_, i) => (i === 0 ? cos : i === 1 ? Math.sqrt(1 - cos * cos) : 0));
const row = (sourceId: string, text: string, cos: number, extra: Partial<SearchChunk> = {}) => ({
  patientId: "rex", sourceId, sourceType: "soap" as const, documentType: "consultation" as const,
  section: "assessment" as const, chunkIndex: 0, text, sourceKey: sourceId, vector: towards(cos), ...extra,
});

describe("découpage en extraits", () => {
  it("coupe aux fins de phrase, environ 800 caractères, avec une phrase de chevauchement", () => {
    const text = Array.from({ length: 30 }, (_, i) => sentence(i + 1)).join(" ");
    const passages = splitPassages(text);
    expect(passages.length).toBeGreaterThan(3);
    for (const passage of passages) {
      expect(passage.length).toBeLessThanOrEqual(PASSAGE_CHARACTERS + 1);
      expect(passage).toMatch(/\.$/);
    }
    for (let i = 1; i < passages.length; i++) {
      const previousLast = passages[i - 1].split(/(?<=\.)\s+/).at(-1)!;
      expect(passages[i].startsWith(previousLast)).toBe(true);
    }
  });
  it("ne refuse plus une section longue : aucun extrait ne dépasse la limite, même sans ponctuation", () => {
    const longSection = Array.from({ length: 3000 }, (_, i) => `mot${i}`).join(" ");
    const passages = splitPassages(longSection);
    expect(passages.length).toBeGreaterThan(20);
    expect(Math.max(...passages.map((p) => p.length))).toBeLessThanOrEqual(PASSAGE_CHARACTERS);
    expect(passages.join(" ")).toContain("mot2999");
  });
  it("garde un texte court en un seul extrait et numérote les extraits par rubrique", () => {
    expect(splitPassages("Toux depuis hier.")).toEqual(["Toux depuis hier."]);
    const chunk = row("soap-1", Array.from({ length: 20 }, (_, i) => sentence(i)).join(" "), 0);
    const passages = passageChunks([chunk]);
    expect(passages.map((p) => p.chunkIndex)).toEqual(passages.map((_, i) => i));
    expect(passages.every((p) => p.sourceId === "soap-1" && p.section === "assessment")).toBe(true);
  });
  it("accepte une taille de 1 200 caractères pour la comparaison du banc", () => {
    const text = Array.from({ length: 30 }, (_, i) => sentence(i + 1)).join(" ");
    expect(splitPassages(text, 1200).length).toBeLessThan(splitPassages(text, 800).length);
  });
});

describe("classement par score vectoriel avec bonus lexical", () => {
  it("le lexique ajoute 0,05 au score sans imposer de priorité absolue", () => {
    const ranked = rankPassages(
      [row("lexical", "Otite bactérienne chronique.", 0.4), row("semantic", "Infection de l’oreille externe.", 0.6)],
      axis(0), scope, "otite",
    );
    expect(ranked.map((r) => r.sourceId)).toEqual(["semantic", "lexical"]);
    expect(ranked[1].score).toBeCloseTo(0.4 + LEXICAL_BONUS);
    expect(ranked[1].match).toBe("text");
  });
  it("départage deux extraits proches en faveur de celui qui contient le terme", () => {
    const ranked = rankPassages(
      [row("a", "Infection de l’oreille externe.", 0.5), row("b", "Otite externe purulente.", 0.47)],
      axis(0), scope, "otite",
    );
    expect(ranked[0].sourceId).toBe("b");
  });
  it("un document vaut son meilleur extrait et affiche ce passage", () => {
    const ranked = rankPassages(
      [row("doc", "Premier extrait sans rapport.", 0.31), row("doc", "Boiterie du postérieur droit.", 0.7, { chunkIndex: 1 })],
      axis(0), scope, "boiterie",
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0].text).toBe("Boiterie du postérieur droit.");
    expect(ranked[0].chunkIndex).toBe(1);
  });
  it("conserve un terme exact malgré un cosinus faible, mais écarte le hors-sujet", () => {
    const ranked = rankPassages(
      [row("exact", "Leishmaniose confirmée.", 0.05), row("bruit", "Facturation du mois.", 0.1)],
      axis(0), scope, "leishmaniose",
    );
    expect(ranked.map((r) => r.sourceId)).toEqual(["exact"]);
  });
  it("garde-fou numérique : un passage dont la dose diffère n’est jamais proposé", () => {
    const ranked = rankPassages(
      [row("dose5", "Méloxicam 5 mg une fois par jour.", 0.9), row("dose2", "Méloxicam 2 mg une fois par jour.", 0.8)],
      axis(0), scope, "méloxicam 2 mg",
    );
    expect(ranked.map((r) => r.sourceId)).toEqual(["dose2"]);
  });
  it("fusionne les sources sans vecteur au score lexical seul, avec leur meilleur passage", () => {
    const document: SearchChunk = {
      patientId: "rex", sourceId: "patient-document:1", sourceType: "document", documentType: "prescription",
      section: "document", chunkIndex: 0, sourceKey: "1",
      text: [...Array.from({ length: 12 }, (_, i) => sentence(i)), "Amoxicilline pendant sept jours."].join(" "),
    };
    const ranked = rankPassages([row("soap", "Bilan rénal normal.", 0.6)], axis(0), scope, "amoxicilline", 5, [document]);
    const lexical = ranked.find((r) => r.sourceId === "patient-document:1")!;
    expect(lexical.score).toBe(LEXICAL_ONLY_SCORE);
    expect(lexical.text).toContain("Amoxicilline");
    expect(lexical.text.length).toBeLessThanOrEqual(PASSAGE_CHARACTERS + 1);
    expect(ranked[0].sourceId).toBe("soap");
  });
  it("affiche le passage qui contient le terme cherché", () => {
    const text = [...Array.from({ length: 15 }, (_, i) => sentence(i)), "Vaccin contre la rage à jour."].join(" ");
    expect(bestPassage(text, "rage")).toContain("rage");
  });
});

describe("génération active de l’index", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("lit l’index par extraits par défaut depuis la bascule, et revient sur les rubriques à la demande", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    });
    const { getActiveSearchGeneration, setActiveSearchGeneration } = await import(
      "@/modules/consultations/local-ai/search-generation"
    );
    expect(getActiveSearchGeneration()).toBe("passages");
    setActiveSearchGeneration("sections");
    expect(getActiveSearchGeneration()).toBe("sections");
    setActiveSearchGeneration("passages");
    expect(getActiveSearchGeneration()).toBe("passages");
    store.set("baitari.search.generation", "inconnue");
    expect(getActiveSearchGeneration()).toBe("passages");
  });
});

describe("surlignage du passage trouvé", () => {
  it("surligne le terme, ses variantes et un équivalent du lexique présent en entier", async () => {
    const { highlightPassage } = await import("@/modules/consultations/local-ai/search-highlight");
    const hits = (text: string, query: string) =>
      highlightPassage(text, query).filter((s) => s.hit).map((s) => s.text.trim());
    expect(hits("Le chien vomit depuis hier, vomissements répétés.", "vomissements")).toEqual(["vomit", "vomissements"]);
    expect(hits("Suivi d’une insuffisance rénale chronique stable.", "IRC")).toEqual(["insuffisance", "rénale", "chronique"]);
    expect(hits("Maladie infectieuse aiguë.", "IRC")).toEqual([]);
    expect(highlightPassage("Texte.", "").every((s) => !s.hit)).toBe(true);
    expect(highlightPassage("Toux sèche.", "toux").map((s) => s.text).join("")).toBe("Toux sèche.");
  });
});

describe("aperçu court centré sur le terme", () => {
  it("commence près du terme quand il est loin dans le passage, sinon garde le début", async () => {
    const { focusExcerpt } = await import("@/modules/consultations/local-ai/passage-search");
    const text = "ORDONNANCE Patient : Mocha. Consultation du 05/10/2026 avec le vétérinaire traitant. Plan de soins validé. Traitement antibiotique pendant cinq jours.";
    expect(focusExcerpt(text, "antibiotique").startsWith("… Traitement antibiotique")).toBe(true);
    expect(focusExcerpt("Antibiotique pendant cinq jours.", "antibiotique")).toBe("Antibiotique pendant cinq jours.");
  });
});

describe("surlignage après une élision", () => {
  it("surligne le mot après d’ ou l’", async () => {
    const { highlightPassage } = await import("@/modules/consultations/local-ai/search-highlight");
    expect(highlightPassage("Traitement d’antibiotique et d'antibiotique.", "antibiotique").filter((s) => s.hit).map((s) => s.text)).toEqual(["antibiotique", "antibiotique"]);
  });
});
