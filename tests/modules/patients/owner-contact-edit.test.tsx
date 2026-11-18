import { DatabaseSync } from "node:sqlite";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Owner } from "@/types/db";

// The owners store of the app, kept in a real SQLite base migrated like the app's. Its update follows useSQLite's
// native path (updateRow): undefined entries are dropped, camelCase becomes snake_case, null is written as NULL.
const harness = vi.hoisted(() => ({
  sqlite: null as DatabaseSync | null,
  owners: [] as Owner[],
  patches: [] as Record<string, unknown>[],
}));
vi.mock("@/hooks/useSQLite", () => ({
  useSQLite: (table: string) => ({
    data: table === "owners" ? harness.owners : [],
    update: (id: string, updates: Record<string, unknown>) => {
      harness.patches.push(updates);
      const patch = Object.entries(updates).filter(
        ([, value]) => value !== undefined
      );
      if (!patch.length) {
        return Promise.resolve(true);
      }
      const columns = patch.map(
        ([key]) => `${key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)} = ?`
      );
      const result = base()
        .prepare(`UPDATE owners SET ${columns.join(", ")} WHERE id = ?`)
        .run(...patch.map(([, value]) => (value as string | null) ?? null), id);
      return Promise.resolve(result.changes > 0);
    },
  }),
  emitSQLiteDataChanged: vi.fn(),
}));

function base(): DatabaseSync {
  if (!harness.sqlite) {
    throw new Error("base de test absente");
  }
  return harness.sqlite;
}

import { useOwnersRepository } from "@/data/repositories";
import { OwnerContact } from "@/modules/patients/components/medical-record-summary";
import { PatientRecordActions } from "@/modules/patients/components/patient-header";
import { PatientsTable } from "@/modules/patients/components/patients-table";
import {
  ownerContactDraft,
  ownerContactError,
  ownerContactPatch,
  saveOwnerContact,
} from "@/modules/patients/owner-contact-edit";

const LEA: Owner = {
  id: "zz-o3",
  firstName: "ZZ-TEST Léa",
  lastName: "Martn",
  phone: "0555123456",
  email: "lea@example.invalid",
  address: "12 rue des Oliviers",
  city: "Alger",
  preferredContact: "sms",
  secondaryContactName: "Karim",
  secondaryContactPhone: "0661223344",
  communicationNotes: "Appeler après 17 h",
  createdAt: "2026-11-01 10:00:00",
  updatedAt: "2026-11-01 10:00:00",
};

const row = (id: string) =>
  base().prepare("SELECT * FROM owners WHERE id = ?").get(id) as Record<
    string,
    unknown
  >;

beforeEach(() => {
  harness.patches = [];
  harness.owners = [{ ...LEA }];
  harness.sqlite = new DatabaseSync(":memory:");
  harness.sqlite.exec(`CREATE TABLE owners (
    id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT,
    city TEXT, preferred_contact TEXT, secondary_contact_name TEXT, secondary_contact_phone TEXT,
    communication_notes TEXT, created_at TEXT, updated_at TEXT)`);
  harness.sqlite
    .prepare("INSERT INTO owners VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(
      LEA.id,
      LEA.firstName,
      LEA.lastName,
      LEA.phone,
      LEA.email ?? null,
      LEA.address ?? null,
      LEA.city ?? null,
      LEA.preferredContact ?? null,
      LEA.secondaryContactName ?? null,
      LEA.secondaryContactPhone ?? null,
      LEA.communicationNotes ?? null,
      LEA.createdAt,
      LEA.updatedAt
    );
});

describe("édition du propriétaire depuis la fiche : les champs et les règles du dialogue de la liste", () => {
  it("le brouillon reprend toutes les coordonnées, champs absents en vide", () => {
    expect(ownerContactDraft(LEA)).toEqual({
      address: "12 rue des Oliviers",
      city: "Alger",
      communicationNotes: "Appeler après 17 h",
      email: "lea@example.invalid",
      firstName: "ZZ-TEST Léa",
      lastName: "Martn",
      phone: "0555123456",
      preferredContact: "sms",
      secondaryContactName: "Karim",
      secondaryContactPhone: "0661223344",
    });
    const bare = ownerContactDraft({
      id: "x",
      firstName: "A",
      lastName: "B",
      phone: "",
      createdAt: "",
    } as Owner);
    expect(bare.email).toBe("");
    expect(bare.secondaryContactPhone).toBe("");
  });

  it("le correctif envoie le même lot que la liste (handleSaveAll) : un champ vidé part en undefined", () => {
    expect(
      ownerContactPatch({
        ...ownerContactDraft(LEA),
        email: "",
        address: "",
        secondaryContactPhone: "",
      })
    ).toEqual({
      firstName: "ZZ-TEST Léa",
      lastName: "Martn",
      phone: "0555123456",
      email: undefined,
      address: undefined,
      city: "Alger",
      preferredContact: "sms",
      secondaryContactName: "Karim",
      secondaryContactPhone: undefined,
      communicationNotes: "Appeler après 17 h",
    });
  });

  it.each([
    [
      { firstName: " ", lastName: "" },
      "Le nom du propriétaire est obligatoire.",
    ],
    [
      { phone: "", email: "" },
      "Ajoutez un téléphone ou un email pour pouvoir contacter le propriétaire.",
    ],
    [
      { phone: "0555 12 3" },
      "Le numéro de téléphone doit contenir entre 8 et 15 chiffres.",
    ],
    [
      { phone: "+213 555 12 34 56 78 90 12" },
      "Le numéro de téléphone doit contenir entre 8 et 15 chiffres.",
    ],
    [
      { secondaryContactPhone: "123" },
      "Le numéro de téléphone doit contenir entre 8 et 15 chiffres.",
    ],
    [{ email: "lea@" }, "L'adresse email du propriétaire n'est pas valide."],
  ])("refuse %j : « %s »", (change, message) => {
    expect(
      ownerContactError(LEA, { ...ownerContactDraft(LEA), ...change })
    ).toBe(message);
  });

  it.each([
    [{ lastName: "Martin" }],
    [{ firstName: "", lastName: "Martin" }],
    [{ firstName: "Léa", lastName: "" }],
    [{ phone: "", email: "lea@example.invalid" }],
    [{ phone: "0661 22 33 44", email: "" }],
    [{ phone: "+213 661 22 33 44" }],
    [{ secondaryContactPhone: "", secondaryContactName: "" }],
  ])("accepte %j", (change) => {
    expect(
      ownerContactError(LEA, { ...ownerContactDraft(LEA), ...change })
    ).toBeNull();
  });
});

describe("enregistrement réel : ownersRepo.update de la page, base SQLite", () => {
  it("corrige le nom et le numéro, normalisés, et les retrouve en base", async () => {
    const repo = useOwnersRepository();
    const result = await saveOwnerContact(repo.update, LEA, {
      ...ownerContactDraft(LEA),
      lastName: "  Martin ",
      phone: "0661 22 33 44",
    });
    expect(result).toEqual({ ok: true });
    expect(row("zz-o3")).toMatchObject({
      first_name: "ZZ-TEST Léa",
      last_name: "Martin",
      phone: "0661223344",
      email: "lea@example.invalid",
      city: "Alger",
      secondary_contact_phone: "0661223344",
    });
  });

  it("toutes les coordonnées s’enregistrent", async () => {
    const repo = useOwnersRepository();
    await saveOwnerContact(repo.update, LEA, {
      address: "3 place des Martyrs",
      city: "Oran",
      communicationNotes: "Plutôt le matin",
      email: "LEA.MARTIN@Example.invalid",
      firstName: "Léa",
      lastName: "Martin",
      phone: "+213 555 98 76 54",
      preferredContact: "email",
      secondaryContactName: "Nadia Martin",
      secondaryContactPhone: "0770 98 76 54",
    });
    expect(row("zz-o3")).toMatchObject({
      address: "3 place des Martyrs",
      city: "Oran",
      communication_notes: "Plutôt le matin",
      email: "lea.martin@example.invalid",
      first_name: "Léa",
      last_name: "Martin",
      phone: "+213555987654",
      preferred_contact: "email",
      secondary_contact_name: "Nadia Martin",
      secondary_contact_phone: "0770987654",
    });
  });

  it("un champ facultatif vidé est vraiment effacé en base (avant le correctif, l’ancienne valeur restait)", async () => {
    const repo = useOwnersRepository();
    await saveOwnerContact(repo.update, LEA, {
      ...ownerContactDraft(LEA),
      address: "",
      communicationNotes: "",
      email: "",
      secondaryContactName: "",
      secondaryContactPhone: "",
    });
    expect(row("zz-o3")).toMatchObject({
      address: null,
      communication_notes: null,
      email: null,
      secondary_contact_name: null,
      secondary_contact_phone: null,
      phone: "0555123456",
      city: "Alger",
    });
  });

  it("un brouillon refusé n’écrit rien, et le message dit quoi corriger", async () => {
    const repo = useOwnersRepository();
    const result = await saveOwnerContact(repo.update, LEA, {
      ...ownerContactDraft(LEA),
      phone: "12",
      email: "",
    });
    expect(result).toEqual({
      error: "Le numéro de téléphone doit contenir entre 8 et 15 chiffres.",
      ok: false,
    });
    expect(harness.patches).toHaveLength(0);
    expect(row("zz-o3").phone).toBe("0555123456");
  });

  it("un échec d’écriture se dit sans technique", async () => {
    const refused = await saveOwnerContact(
      () => Promise.resolve(false),
      LEA,
      ownerContactDraft(LEA)
    );
    expect(refused).toEqual({
      error: "Les coordonnées n'ont pas pu être enregistrées. Réessayez.",
      ok: false,
    });
    const thrown = await saveOwnerContact(
      () => Promise.reject(new Error("SQLITE_BUSY")),
      LEA,
      ownerContactDraft(LEA)
    );
    expect(thrown).toEqual({
      error: "Les coordonnées n'ont pas pu être enregistrées. Réessayez.",
      ok: false,
    });
  });
});

describe("points d’entrée : la bande de la fiche et le crayon du tableau", () => {
  const actions = (onEditOwner?: () => void) =>
    renderToStaticMarkup(
      <PatientRecordActions
        onEditOwner={onEditOwner}
        onEditProfile={() => undefined}
        onNewAppointment={() => undefined}
        onNewOffVisitNote={() => undefined}
      />
    );

  it("le bloc Propriétaire de la fiche redevient une lecture pure", () => {
    const html = renderToStaticMarkup(<OwnerContact owner={LEA} />);
    expect(html).not.toContain("Modifier les coordonnées");
    expect(html).not.toContain("<button");
    expect(html).toContain("Martn");
  });

  it("tel que la fiche le rend (avec l’animal), le seul bouton du bloc est la ligne WhatsApp", () => {
    const html = renderToStaticMarkup(
      <OwnerContact animal="Rex" owner={LEA} />
    );
    const buttons = [...html.matchAll(/<button[^>]*>(.*?)<\/button>/g)];
    expect(buttons).toHaveLength(1);
    expect(buttons[0][0]).toContain(
      'aria-label="Écrire sur WhatsApp à ZZ-TEST Léa Martn"'
    );
    expect(buttons[0][1].replace(/<[^>]+>/g, "").trim()).toBe("WhatsApp");
    expect(html).not.toContain("Modifier les coordonnées");
  });

  it("« Modifier les coordonnées » est la dernière pilule de la bande, après l’action principale", () => {
    const html = actions(() => undefined);
    const buttons = [...html.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map(
      (match) => match[1].replace(/<[^>]+>/g, "").trim()
    );
    expect(buttons.at(-1)).toBe("Modifier les coordonnées");
    expect(buttons.at(-2)).toBe("Note hors visite");
    const pill = html.slice(html.lastIndexOf("<button"));
    expect(pill).toContain('data-testid="patient-owner-edit"');
    expect(pill).toContain("rounded-full");
    expect(pill).toContain("medical-action-primary");
  });

  it("sans propriétaire, la bande n’a pas la pilule", () => {
    expect(actions()).not.toContain("Modifier les coordonnées");
  });

  const tableFor = (
    owner: Owner | undefined,
    onEditOwner?: (owner: Owner) => void
  ) =>
    renderToStaticMarkup(
      <PatientsTable
        entries={[
          {
            lastVisit: undefined,
            owner,
            patient: {
              createdAt: "2026-11-01",
              id: "zz-p3",
              name: "Rex",
              ownerId: "zz-o3",
              sex: "F",
              species: "Chien",
              status: "sante",
            },
            upcomingAppointment: undefined,
          } as unknown as Parameters<
            typeof PatientsTable
          >[0]["entries"][number],
        ]}
        filters={null}
        filtersActive={false}
        listRef={null}
        onEditOwner={onEditOwner}
        onOpen={() => undefined}
        onResetFilters={() => undefined}
      />
    );

  it("chaque ligne du tableau porte le crayon du propriétaire, avec son nom pour les lecteurs d’écran", () => {
    const html = tableFor(LEA, () => undefined);
    expect(html).toContain('data-owner-edit="zz-o3"');
    expect(html).toContain(
      'aria-label="Modifier les coordonnées de ZZ-TEST Léa Martn"'
    );
  });

  it("pas de crayon sans propriétaire, ni quand la liste ne le propose pas", () => {
    expect(tableFor(undefined, () => undefined)).not.toContain(
      "data-owner-edit"
    );
    expect(tableFor(LEA)).not.toContain("data-owner-edit");
  });

  it("depuis le tableau : le dialogue enregistre par ownersRepo.update, et la ligne relue montre les valeurs corrigées", async () => {
    const repo = useOwnersRepository();
    expect(tableFor(LEA, () => undefined)).toContain("0555123456");
    const result = await saveOwnerContact(repo.update, LEA, {
      ...ownerContactDraft(LEA),
      lastName: "Martin",
      phone: "0661 22 33 44",
    });
    expect(result).toEqual({ ok: true });
    const stored = row("zz-o3");
    const reread = {
      ...LEA,
      lastName: String(stored.last_name),
      phone: String(stored.phone),
    };
    const html = tableFor(reread, () => undefined);
    expect(html).toContain("ZZ-TEST Léa Martin");
    expect(html).toContain("0661223344");
    expect(html).not.toContain("0555123456");
  });
});
