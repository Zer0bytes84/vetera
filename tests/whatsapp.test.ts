import { describe, expect, it } from "vitest";
import {
  contactMessage,
  reminderMessage,
  whatsAppLink,
  whatsAppNumber,
} from "../src/lib/whatsapp";
import { normalizeLinkUrl } from "../src/modules/documents/lib/library";

describe("whatsAppNumber : chiffres seulement, indicatif gardé, jamais deviné", () => {
  it.each([
    ["+213555123456", "213555123456", true],
    ["+213 555 12 34 56", "213555123456", true],
    ["+213\u00a0555\u00a012\u00a034\u00a056", "213555123456", true],
    ["00213 555 12 34 56", "213555123456", true],
    ["+33 6 12 34 56 78", "33612345678", true],
    ["+1 (415) 555-0132", "14155550132", true],
    ["0555 12 34 56", "0555123456", false],
    ["05.55.12.34.56", "0555123456", false],
    ["0555-12-34-56", "0555123456", false],
    ["021 23 45 67", "021234567", false],
    ["555123456", "555123456", false],
    ["213555123456", "213555123456", false],
  ])("%s → %s (indicatif écrit : %s)", (phone, digits, international) => {
    expect(whatsAppNumber(phone)).toEqual({ digits, international });
  });

  it.each([
    [undefined],
    [null],
    [""],
    ["   "],
    ["+"],
    ["à rappeler"],
    ["0555 12 34 56 (soir)"],
    ["0555 12 34 56 / 0661 22 33 44"],
    ["1234567"],
    ["+1234567890123456"],
    ["06+12345678"],
  ])("%s → aucun lien", (phone) => {
    expect(whatsAppNumber(phone)).toBeNull();
    expect(whatsAppLink(phone, "Bonjour")).toBeNull();
  });
});

// What must never reach the link unencoded.
const RAW_CHARACTERS = /[\s«»éÉ’\u00a0]/;

describe("whatsAppLink : le message encodé proprement", () => {
  const roundTrip = (link: string) => new URL(link).searchParams.get("text");

  it("forme wa.me/<chiffres>?text=<message>", () => {
    expect(whatsAppLink("+213 555 12 34 56", "Bonjour")).toBe(
      "https://wa.me/213555123456?text=Bonjour"
    );
  });

  it("encode accents, espaces, retours à la ligne, guillemets français et espaces insécables", () => {
    const message = reminderMessage({
      animal: "Zoé l’Écureuil",
      dueDate: "2026-12-03",
      reminder: "Vaccin trivalent félin",
      today: "2026-11-17",
    });
    const link = whatsAppLink("0555 12 34 56", message) ?? "";
    expect(link.startsWith("https://wa.me/0555123456?text=")).toBe(true);
    expect(link).not.toMatch(RAW_CHARACTERS);
    expect(link).toContain("%0A%0A");
    expect(link).toContain("%C3%A9");
    expect(roundTrip(link)).toBe(message);
  });

  it("garde « & », « ? », « # » et « + » dans le texte au lieu de couper le lien", () => {
    const message = "Rex & Mia : rappel ? n° #2 + 1";
    const link = whatsAppLink("+213555123456", message) ?? "";
    expect(roundTrip(link)).toBe(message);
    expect(new URL(link).hash).toBe("");
  });

  it("passe tel quel par le garde des liens externes de l’app", () => {
    const link =
      whatsAppLink("+213 555 12 34 56", contactMessage("Médor")) ?? "";
    expect(normalizeLinkUrl(link)).toBe(link);
  });

  it("sans message, le lien ouvre seulement la conversation", () => {
    expect(whatsAppLink("+213555123456", "  ")).toBe(
      "https://wa.me/213555123456"
    );
  });
});

// The desktop app opens links through tauri-plugin-shell; with no « open » setting in tauri.conf.json, the plugin checks
// every address against this default pattern (copied from tauri-plugin-shell 2.3.6, src/lib.rs, open_scope).
const SHELL_OPEN_DEFAULT = /^((mailto:\w+)|(tel:\w+)|(https?:\/\/\w+)).+/;
const ASCII_ONLY = /^[\x21-\x7e]+$/;

describe("ouverture par le plugin shell de l’app de bureau", () => {
  it.each([
    ["+213 555 12 34 56", contactMessage("Zoé l’Écureuil")],
    [
      "00213661223344",
      reminderMessage({
        animal: "Médor",
        dueDate: "2026-10-01",
        reminder: "Vermifuge",
        today: "2026-11-17",
      }),
    ],
    [
      "0555 12 34 56",
      reminderMessage({
        animal: "Rex",
        dueDate: "2026-11-17",
        reminder: "Vaccin",
        today: "2026-11-17",
      }),
    ],
  ])("le lien de %s passe le garde par défaut, en ASCII seul", (phone, message) => {
    const link = whatsAppLink(phone, message) ?? "";
    expect(link).toMatch(SHELL_OPEN_DEFAULT);
    expect(link).toMatch(ASCII_ONLY);
  });
});

describe("messages pré-remplis", () => {
  it("depuis la fiche : une prise de contact au nom de l’animal", () => {
    expect(contactMessage(" Médor ")).toBe(
      "Bonjour,\n\nNous vous écrivons au sujet de Médor."
    );
  });

  it("depuis un rappel : l’animal, le rappel et sa date, au présent quand elle est à venir", () => {
    expect(
      reminderMessage({
        animal: "Minou",
        dueDate: "2026-12-03",
        reminder: "Vaccin rage",
        today: "2026-11-17",
      })
    ).toBe(
      "Bonjour,\n\nLe rappel «\u00a0Vaccin rage\u00a0» de Minou est prévu le 3 décembre 2026.\nSouhaitez-vous prendre rendez-vous\u00a0?"
    );
  });

  it("le jour même reste au présent, une date passée passe au passé", () => {
    expect(
      reminderMessage({
        animal: "Minou",
        dueDate: "2026-11-17",
        reminder: "Vaccin rage",
        today: "2026-11-17",
      })
    ).toContain("est prévu le 17 novembre 2026");
    expect(
      reminderMessage({
        animal: "Minou",
        dueDate: "2026-10-01",
        reminder: "Vaccin rage",
        today: "2026-11-17",
      })
    ).toContain("était prévu le 1er octobre 2026");
  });
});
