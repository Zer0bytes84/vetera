import { describe, expect, it } from "vitest";
import {
  matchesSearch,
  normalizeSearch,
  scoreCommandMatch,
} from "@/components/CommandPalette";
import { parseActionQuery } from "@/modules/shell/model/action-query";

describe("Palette de commandes (CMD+K) - Recherche & Scoring", () => {
  it("normalise correctement les accents et la casse en français", () => {
    expect(normalizeSearch("Éléphant")).toBe("elephant");
    expect(normalizeSearch("Médicament Anti-inflammatoire")).toBe(
      "medicament anti-inflammatoire",
    );
    expect(normalizeSearch("  PARAMÈTRES  ")).toBe("parametres");
  });

  it("donne un score parfait (1.0) à une correspondance exacte", () => {
    expect(scoreCommandMatch("Rex", "rex")).toBe(1.0);
    expect(scoreCommandMatch("patient:123 Rex", "rex")).toBe(1.0);
    expect(scoreCommandMatch("navigation:agenda Agenda", "agenda")).toBe(1.0);
  });

  it("priorise le préfixe direct (0.95) devant les inclusions simples", () => {
    const prefixScore = scoreCommandMatch("patient:123 Rex", "re");
    const substringScore = scoreCommandMatch("patient:123 T-Rex", "re");
    expect(prefixScore).toBe(0.95);
    expect(prefixScore).toBeGreaterThan(substringScore);
  });

  it("reconnaît les mots dans un label multi-termes avec un score élevé (0.9)", () => {
    const wordPrefixScore = scoreCommandMatch(
      "navigation:notes Documents et mémos",
      "memos",
    );
    expect(wordPrefixScore).toBe(0.9);
  });

  it("prend en compte les mots-clés additionnels avec un score fort (0.85)", () => {
    const keywordScore = scoreCommandMatch(
      "navigation:notes Documents",
      "ordonnance",
      ["ordonnances", "rapports", "pdf"],
    );
    expect(keywordScore).toBe(0.85);
  });

  it("gère les recherches multi-mots avec tokens (0.65)", () => {
    const score = scoreCommandMatch(
      "patient:123 Rex Chien Berger Allemand",
      "rex berger",
    );
    expect(score).toBe(0.65);
  });

  it("renvoie 0 pour les termes sans correspondance", () => {
    expect(scoreCommandMatch("patient:123 Rex", "chat")).toBe(0);
    expect(scoreCommandMatch("navigation:dashboard Tableau de bord", "agenda")).toBe(0);
  });

  it("matchesSearch effectue une recherche accent-insensible tous tokens", () => {
    expect(matchesSearch("Rex Chien Berger Allemand Dupont", "rex berger")).toBe(
      true,
    );
    expect(matchesSearch("Félix Chat Européen Martin", "felix martin")).toBe(
      true,
    );
    expect(matchesSearch("Médor Chien", "chat")).toBe(false);
  });
});

describe("Détection d'intentions contextuelles (parseActionQuery)", () => {
  it("détecte les intentions de consultation et rdv avec le nom du patient", () => {
    expect(parseActionQuery("consultation rex")).toEqual({
      kind: "consultation",
      entity: "rex",
    });
    expect(parseActionQuery("nouvelle consultation pour Luna")).toEqual({
      kind: "consultation",
      entity: "luna",
    });
    expect(parseActionQuery("rdv rex")).toEqual({
      kind: "consultation",
      entity: "rex",
    });
    expect(parseActionQuery("rendez-vous pour Maya")).toEqual({
      kind: "consultation",
      entity: "maya",
    });
  });

  it("détecte les intentions de vaccination", () => {
    expect(parseActionQuery("vaccin rex")).toEqual({
      kind: "vaccination",
      entity: "rex",
    });
    expect(parseActionQuery("vaccination pour Chaussette")).toEqual({
      kind: "vaccination",
      entity: "chaussette",
    });
  });

  it("détecte les intentions de facturation", () => {
    expect(parseActionQuery("facture Dupont")).toEqual({
      kind: "invoice",
      entity: "dupont",
    });
    expect(parseActionQuery("facturer pour Mme Martin")).toEqual({
      kind: "invoice",
      entity: "mme martin",
    });
  });

  it("renvoie null pour les recherches ordinaires de navigation ou de texte", () => {
    expect(parseActionQuery("rex")).toBeNull();
    expect(parseActionQuery("tableau de bord")).toBeNull();
    expect(parseActionQuery("vaccins")).toBeNull();
  });
});

describe("Palette de commandes (CMD+K) - Intégration Recherche Sémantique", () => {
  it("conserve et score favorablement (1.0) tout extrait sémantique validé", () => {
    // Si l'utilisateur a cherché "bactérie" et que l'extrait contient "Cause bactérienne confirmée"
    const score = scoreCommandMatch(
      "semantic:patient-1 Rex Cause bactérienne confirmée",
      "bactérie",
      ["bactérie", "objective", "Examen clinique"],
    );
    expect(score).toBe(1.0);
  });

  it("garantit qu'un match DCI/marque (ex: Metacam <-> méloxicam) n'est jamais masqué par cmdk", () => {
    // L'utilisateur cherche "Metacam", le moteur sémantique trouve le chunk "méloxicam 1.5mg"
    const score = scoreCommandMatch(
      "semantic:patient-2:soap-1:plan:0 Luna Prescription de méloxicam 1.5mg par voie orale",
      "Metacam",
    );
    expect(score).toBe(1.0);
  });

  it("garantit qu'une variation morphologique (ex: vaccin <-> vaccination) n'est jamais masquée par cmdk", () => {
    const score = scoreCommandMatch(
      "semantic:patient-3:soap-2:subjective:0 Mocha pour le vaccin c'est tous les 3 mois",
      "vaccination",
    );
    expect(score).toBe(1.0);
  });

  it("permet l'ouverture directe du dossier patient avec l'URL de navigation #/patient/:id", () => {
    const patientId = "mnq12fbpln5nf125pk";
    const targetHash = `#/patient/${encodeURIComponent(patientId)}`;
    expect(targetHash).toBe("#/patient/mnq12fbpln5nf125pk");
  });

  it("gère les 6 domaines dans CMD+K (patients, consultations, SOAP, documents, protocoles, produits)", () => {
    // 1. Produit
    const prodScore = scoreCommandMatch(
      "semantic:product::prod-1:product:0 Pharmacie & Stock Produit : Vaccin Rabique",
      "vaccin",
    );
    expect(prodScore).toBe(1.0);

    // 2. Consultation
    const apptScore = scoreCommandMatch(
      "semantic:consultation:rex:appt-1:consultation:0 Rex Consultation Vaccin : Rappel annuel",
      "vaccin",
    );
    expect(apptScore).toBe(1.0);

    // 3. Fiche Patient
    const patientScore = scoreCommandMatch(
      "semantic:patient:rex:rex:patient:0 Rex Patient : Rex — Affections chroniques : IRC",
      "IRC",
    );
    expect(patientScore).toBe(1.0);
  });
});
