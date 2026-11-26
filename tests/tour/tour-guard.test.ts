import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getThemeConfig,
  REMOVED_DISPLAY_KEYS,
} from "../../src/lib/theme-store";
import { TOUR_STORAGE_KEY } from "../../src/modules/tour/tour-state";

const SOURCE_OR_CSS_FILE = /\.(tsx?|css)$/;
const TS_FILE = /\.tsx?$/;
const ADD_CALL = /\.add\(/;
const INSERT_CALL = /\.insert/;
const INSERT_BROWSER_ROW = /insertBrowserRow/;
const SET_BROWSER_ROW = /setBrowserRow/;
const CREATE_INVOICE_CALL = /createInvoice/;
const RECORD_PAYMENT_CALL = /recordPayment/;
const ISSUE_INVOICE_CALL = /issueInvoice/;
const SAVE_APPOINTMENT_CALL = /saveAppointment/;
const REMOVE_CALL = /\.remove\(/;
const UPDATE_CALL = /\.update\(\s*['"`]/;
const GET_DATABASE_CALL = /getDatabase/;
const RUN_DB_OPERATION_CALL = /runDbOperation/;
const DEMO_WORD = /demo/i;
const TEST_DATA_MARKER = /ZZ-TEST/;
const CARE_WORDING = /soin|hospital|séjour|sejour|care/i;
const CARE_WORDING_FR = /soin|hospital|séjour|sejour/i;
const TOUR_LIBRARY =
  /shepherd|intro\.js|driver\.js|react-joyride|reactour|onboarding|tour/i;

const DIR = "src/modules/tour";
const sources = readdirSync(DIR)
  .filter((name) => SOURCE_OR_CSS_FILE.test(name))
  .map((name) => ({ name, text: readFileSync(join(DIR, name), "utf8") }));
const code = sources.filter(({ name }) => TS_FILE.test(name));

describe("tour guidé : ce qu'il ne fait jamais", () => {
  it("ne crée aucune donnée : aucune écriture dans la base, aucun service de création", () => {
    const forbidden = [
      ADD_CALL,
      INSERT_CALL,
      INSERT_BROWSER_ROW,
      SET_BROWSER_ROW,
      CREATE_INVOICE_CALL,
      RECORD_PAYMENT_CALL,
      ISSUE_INVOICE_CALL,
      SAVE_APPOINTMENT_CALL,
      REMOVE_CALL,
      UPDATE_CALL,
      GET_DATABASE_CALL,
      RUN_DB_OPERATION_CALL,
      DEMO_WORD,
      TEST_DATA_MARKER,
    ];
    for (const { name, text } of code.filter(
      ({ name }) => name !== "tour-store.ts"
    )) {
      for (const pattern of forbidden) {
        expect(text, `${name} ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("ne parle ni de soins ni d'hospitalisation : ni étape, ni mention", () => {
    const copy = readFileSync(join(DIR, "tour-steps.ts"), "utf8");
    expect(copy).not.toMatch(CARE_WORDING);
    const ui =
      readFileSync(join(DIR, "tour-guide.tsx"), "utf8") +
      readFileSync(join(DIR, "tour-invitation.tsx"), "utf8");
    expect(ui).not.toMatch(CARE_WORDING_FR);
  });

  it("garde une seule clé de stockage, qui n'est pas un réglage d'affichage retiré", () => {
    expect(TOUR_STORAGE_KEY).toBe("baitari-guided-tour-v1");
    expect(REMOVED_DISPLAY_KEYS as readonly string[]).not.toContain(
      TOUR_STORAGE_KEY
    );
  });

  it("ajoute aucune bibliothèque de visite guidée", () => {
    const manifest = readFileSync("package.json", "utf8");
    expect(manifest).not.toMatch(TOUR_LIBRARY);
  });

  it("reste hors du cycle de vie de « Quoi de neuf » : les deux marqueurs sont distincts", () => {
    const seen = readFileSync(
      "src/modules/release-notes/release-seen.ts",
      "utf8"
    );
    expect(seen).not.toContain("guided-tour");
  });
});

describe("tour guidé : la migration du thème, déjà livrée, n'est pas perturbée", () => {
  it("un poste dont le thème Premium a disparu garde son tour, et réciproquement", () => {
    const storage = new Map<string, string>([
      ["theme-config", JSON.stringify({ skin: "premium", cleanFont: "geist" })],
      [
        TOUR_STORAGE_KEY,
        JSON.stringify({
          invitation: "closed",
          status: "running",
          step: 2,
          startedAt: "2026-11-12T10:00:00.000Z",
          patientId: "p1",
          appointmentId: null,
        }),
      ],
      ["theme", "dark"],
    ]);
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
    };
    try {
      expect(getThemeConfig()).toEqual({ cleanFont: "geist" });
      expect(storage.get(TOUR_STORAGE_KEY)).toContain('"step":2');
      expect(storage.get("theme")).toBe("dark");
      expect(storage.get("baitari-clean-only-v1")).toBe("true");
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });
});
