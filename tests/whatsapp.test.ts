import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  contactMessage,
  reminderMessage,
  WHATSAPP_APP_LINK,
  WHATSAPP_COUNTRY_CODE,
  whatsAppLink,
  whatsAppNumber,
} from "../src/lib/whatsapp";
import { normalizeLinkUrl } from "../src/modules/documents/lib/library";
import { openExternalLink } from "../src/modules/documents/lib/open-external";

describe("whatsAppNumber : chiffres seulement, indicatif écrit gardé, +213 de la clinique sur les numéros nationaux", () => {
  it.each([
    // Indicatif écrit dans le dossier : inchangé.
    ["+213555123456", "213555123456", "written"],
    ["+213 555 12 34 56", "213555123456", "written"],
    ["+213\u00a0555\u00a012\u00a034\u00a056", "213555123456", "written"],
    ["00213 555 12 34 56", "213555123456", "written"],
    ["+33 6 12 34 56 78", "33612345678", "written"],
    ["+1 (415) 555-0132", "14155550132", "written"],
    ["+33 06 12 34 56 78", "330612345678", "written"],
    // Numéros algériens nationaux : le 0 tombe, 213 devant.
    ["0555 12 34 56", "213555123456", "clinic"],
    ["0661 22 33 44", "213661223344", "clinic"],
    ["0770 98 76 54", "213770987654", "clinic"],
    ["0555123456", "213555123456", "clinic"],
    ["05.55.12.34.56", "213555123456", "clinic"],
    ["0661-22-33-44", "213661223344", "clinic"],
    ["0770 98\u00a076\u00a054", "213770987654", "clinic"],
    ["021 23 45 67", "21321234567", "clinic"],
    // Ni +, ni 00, ni 0 : les chiffres tels quels, rien n'est deviné.
    ["555123456", "555123456", "none"],
    ["213555123456", "213555123456", "none"],
  ])("%s → %s (indicatif : %s)", (phone, digits, countryCode) => {
    expect(whatsAppNumber(phone)).toEqual({ countryCode, digits });
  });

  it("l’indicatif de la clinique est +213", () => {
    expect(WHATSAPP_COUNTRY_CODE).toBe("213");
  });

  it("un numéro national dont le résultat dépasserait 15 chiffres ne donne pas de lien", () => {
    expect(whatsAppNumber("0123 456 789 012 34")).toBeNull();
    expect(whatsAppNumber("0123 456 789 012")).toEqual({
      countryCode: "clinic",
      digits: "213123456789012",
    });
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
const ASCII_ONLY = /^[\x21-\x7e]+$/;
const ZOE_REMINDER = reminderMessage({
  animal: "Zoé l’Écureuil",
  dueDate: "2026-12-03",
  reminder: "Vaccin trivalent félin",
  today: "2026-11-17",
});

describe("whatsAppLink : lien direct vers l’application, message encodé proprement", () => {
  const roundTrip = (link: string) => new URL(link).searchParams.get("text");

  it("forme whatsapp://send?phone=<chiffres>&text=<message>", () => {
    expect(whatsAppLink("+213 555 12 34 56", "Bonjour")).toBe(
      "whatsapp://send?phone=213555123456&text=Bonjour"
    );
  });

  it.each([
    ["0555 12 34 56", "213555123456"],
    ["0661 22 33 44", "213661223344"],
    ["0770 98 76 54", "213770987654"],
    ["+213 555 12 34 56", "213555123456"],
    ["00213 661 22 33 44", "213661223344"],
  ])("%s → phone=%s", (phone, digits) => {
    expect(
      new URL(whatsAppLink(phone, "Bonjour") ?? "").searchParams.get("phone")
    ).toBe(digits);
  });

  it("encode accents, espaces, retours à la ligne, guillemets français et espaces insécables", () => {
    const link = whatsAppLink("0555 12 34 56", ZOE_REMINDER) ?? "";
    expect(link.startsWith("whatsapp://send?phone=213555123456&text=")).toBe(
      true
    );
    expect(link).not.toMatch(RAW_CHARACTERS);
    expect(link).toMatch(ASCII_ONLY);
    expect(link).toContain("%0A%0A");
    expect(link).toContain("%C3%A9");
    expect(roundTrip(link)).toBe(ZOE_REMINDER);
  });

  it("garde « & », « ? », « # », « + » et « = » dans le texte au lieu de couper le lien", () => {
    const message = "Rex & Mia : rappel ? n° #2 + 1 = 3";
    const link = whatsAppLink("+213555123456", message) ?? "";
    expect(roundTrip(link)).toBe(message);
    expect(new URL(link).hash).toBe("");
    expect([...new URL(link).searchParams.keys()]).toEqual(["phone", "text"]);
  });

  it("sans message, le lien ouvre seulement la conversation", () => {
    expect(whatsAppLink("+213555123456", "  ")).toBe(
      "whatsapp://send?phone=213555123456"
    );
  });

  it("aucune adresse web de WhatsApp dans le code du bouton : pas de repli vers wa.me", () => {
    for (const file of [
      "src/lib/whatsapp.ts",
      "src/components/whatsapp-link.tsx",
      "src/modules/documents/lib/open-external.ts",
    ]) {
      expect(readFileSync(file, "utf8")).not.toMatch(WEB_WHATSAPP);
    }
  });
});

const WEB_WHATSAPP =
  /https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/;

// Links the WhatsApp guard must refuse: another WhatsApp screen, a bad number, raw or extra text, other schemes.
const REFUSED = [
  "whatsapp://call?phone=213555123456",
  "whatsapp://send?phone=2135",
  "whatsapp://send?phone=2135551234567890",
  "whatsapp://send?phone=+213555123456",
  "whatsapp://send?phone=213555123456&text=a b",
  "whatsapp://send?phone=213555123456&text=a\nb",
  "whatsapp://send?phone=213555123456&text=a&phone=1",
  "whatsapp://send?text=a&phone=213555123456",
  "whatsapp://send?phone=213555123456&text=a#b",
  "WHATSAPP://send?phone=213555123456",
  "whatsapp:send?phone=213555123456",
  "whatsapp://send?phone=213555123456 --flag",
  "-i",
  "/R",
  "file:///etc/passwd",
  "javascript:alert(1)",
  "sms:0555123456",
];

describe("garde du module d’ouverture de l’app : le schéma whatsapp:// en plus, ni plus ni moins", () => {
  it("accepte les liens que le bouton construit", () => {
    for (const phone of [
      "0555 12 34 56",
      "+213 555 12 34 56",
      "00213661223344",
      "555123456",
    ]) {
      expect(whatsAppLink(phone, ZOE_REMINDER)).toMatch(WHATSAPP_APP_LINK);
      expect(whatsAppLink(phone, "")).toMatch(WHATSAPP_APP_LINK);
    }
  });

  it.each(REFUSED)("refuse %j", (link) => {
    expect(link).not.toMatch(WHATSAPP_APP_LINK);
  });

  it("le garde des liens enregistrés (bibliothèque) reste fermé à whatsapp://", () => {
    expect(
      normalizeLinkUrl(whatsAppLink("0555123456", "Bonjour") ?? "")
    ).toBeNull();
  });

  it("openExternalLink ouvre le lien WhatsApp et refuse les autres variantes", async () => {
    const open = vi.fn(() => ({}));
    vi.stubGlobal("window", { open });
    try {
      const link = whatsAppLink("0555 12 34 56", ZOE_REMINDER) ?? "";
      expect(await openExternalLink(link)).toBe(true);
      expect(open).toHaveBeenLastCalledWith(
        link,
        "_blank",
        "noopener,noreferrer"
      );
      for (const refused of REFUSED) {
        expect(await openExternalLink(refused)).toBe(false);
      }
      expect(open).toHaveBeenCalledTimes(1);
      expect(await openExternalLink("https://example.org/page")).toBe(true);
      expect(await openExternalLink("mailto:a@b.org")).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

// The desktop app opens links through tauri-plugin-shell 2.3.6. Its default pattern (src/lib.rs, open_scope) is
// replaced by the one in tauri.conf.json, which the plugin wraps in ^…$ (src/config.rs, Validate).
const SHELL_OPEN_DEFAULT = /^((mailto:\w+)|(tel:\w+)|(https?:\/\/\w+)).+/;
const SHELL_OPEN_CONFIG = (
  JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")) as {
    plugins: { shell: { open: string } };
  }
).plugins.shell.open;
const SHELL_OPEN = new RegExp(`^${SHELL_OPEN_CONFIG}$`);

describe("garde du plugin shell de l’app de bureau (tauri.conf.json)", () => {
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
    ["0770 98 76 54", ""],
  ])("accepte le lien de %s", (phone, message) => {
    expect(whatsAppLink(phone, message)).toMatch(SHELL_OPEN);
  });

  it.each(REFUSED)("refuse %j", (link) => {
    expect(link).not.toMatch(SHELL_OPEN);
  });

  it.each([
    "https://example.org/page?x=1",
    "http://localhost:3000/",
    "mailto:contact@clinique.dz",
    "tel:+213555123456",
    "https://wa.me/213555123456",
    "ftp://example.org",
    "whatsapp://send?phone=213555123456",
    "-i",
    "https://",
    "mailto:",
  ])("hors WhatsApp, même verdict que le garde par défaut : %j", (link) => {
    const expected = link.startsWith("whatsapp://")
      ? true
      : SHELL_OPEN_DEFAULT.test(link);
    expect(SHELL_OPEN.test(link)).toBe(expected);
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
