import type { CareDatabase, CarePersistence } from "../care-tasks/store";
import {
  addCalendarMonths,
  assertDateOnly,
  assertReminderTransition,
  localToday,
  type MedicalReminderStatus,
} from "./domain";

export interface MedicalReminder {
  acte_source_id: string | null;
  client_id: string | null;
  completed_at: string | null;
  created_at: string;
  echeance: string;
  id: string;
  intervalle_mois: number;
  motif_annulation: string | null;
  note: string | null;
  patient_id: string;
  statut: MedicalReminderStatus;
  type: string;
  updated_at: string;
}

export type PatientReminder = MedicalReminder;

export interface ReminderType {
  active: number;
  code: string;
  id: string;
  interval_months: number;
  name: string;
}

export interface MedicalAct {
  clientId?: string | null;
  date: string;
  id: string;
  note?: string;
  patientId: string;
  type: string;
}

export interface MedicalReminderProposal {
  acteSourceId: string;
  clientId: string | null;
  dateActe: string;
  echeance: string;
  intervalleMois: number;
  note?: string;
  patientId: string;
  type: string;
  typeLabel: string;
}

export interface VaccineReminderDraft {
  administeredDate: string;
  batchNumber?: string;
  dueDate?: string;
  id: string;
  manufacturer?: string;
  notes?: string;
  origin?: "auto" | "manuel";
  patientId: string;
  vaccineName: string;
  vaccineType?: string;
}

const TYPE_ALIASES: Record<string, string> = {
  antiparasitaire: "vermifuge",
  vaccination: "vaccin",
};

function canonicalType(value: string): string {
  return TYPE_ALIASES[value] ?? value;
}

export function createPatientReminderStore(
  persistence: CarePersistence,
  id: () => string,
  clock = () => new Date()
) {
  const requireAuthor = (author: string) => {
    if (!author.trim()) {
      throw new Error("Un utilisateur connecté est requis.");
    }
  };

  async function get(db: CareDatabase, reminderId: string) {
    const reminder = (
      await db.select<MedicalReminder[]>(
        "SELECT * FROM medical_reminders WHERE id = ?",
        [reminderId]
      )
    )[0];
    if (!reminder) {
      throw new Error("Ce rappel n’existe plus.");
    }
    return reminder;
  }

  async function record(
    db: CareDatabase,
    reminder: MedicalReminder,
    action: string,
    author: string,
    status: MedicalReminderStatus,
    dueDate: string,
    reason: string | null
  ) {
    await db.execute(
      `INSERT INTO medical_reminder_history(
        id, reminder_id, action, old_status, new_status, old_due_date,
        new_due_date, reason, author_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id(), reminder.id, action, reminder.statut, status,
        reminder.echeance, dueDate, reason, author, clock().toISOString(),
      ]
    );
  }

  async function listTypes(db: CareDatabase) {
    return db.select<ReminderType[]>(
      `SELECT id, code,
        COALESCE(libelle, name) AS name,
        COALESCE(intervalle_defaut_mois, interval_months) AS interval_months,
        COALESCE(actif, active) AS active
       FROM reminder_types
       ORDER BY COALESCE(libelle, name), id`
    );
  }

  return {
    async saveVaccination(draft: VaccineReminderDraft, author: string) {
      requireAuthor(author);
      assertDateOnly(draft.administeredDate);
      if (!draft.id || !draft.patientId || !draft.vaccineName.trim()) {
        throw new Error("Choisissez un patient et indiquez le vaccin.");
      }
      return persistence.transaction(async (db) => {
        const existing = (
          await db.select<{ next_due_at: string | null; patient_id: string }[]>(
            "SELECT patient_id, next_due_at FROM vaccinations WHERE id = ?",
            [draft.id]
          )
        )[0];
        if (existing && existing.patient_id !== draft.patientId) {
          throw new Error("Le patient de la vaccination ne peut pas être changé.");
        }
        const now = clock().toISOString();
        const values = [
          draft.vaccineName.trim(), draft.vaccineType?.trim() || null,
          new Date(`${draft.administeredDate}T12:00:00`).toISOString(),
          draft.dueDate
            ? new Date(`${draft.dueDate}T12:00:00`).toISOString()
            : existing?.next_due_at ?? null,
          draft.batchNumber || null, draft.manufacturer || null, author,
          draft.notes || null, now,
        ];
        if (existing) {
          await db.execute(
            `UPDATE vaccinations SET vaccine_name = ?, vaccine_type = ?,
             administered_at = ?, next_due_at = ?, batch_number = ?,
             manufacturer = ?, vet_id = ?, notes = ?, updated_at = ? WHERE id = ?`,
            [...values, draft.id]
          );
        } else {
          await db.execute(
            `INSERT INTO vaccinations(vaccine_name, vaccine_type, administered_at,
             next_due_at, batch_number, manufacturer, vet_id, notes, updated_at,
             id, patient_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [...values, draft.id, draft.patientId]
          );
          const open = await db.select<(MedicalReminder & { vaccine_family: string | null })[]>(
            `SELECT mr.*, COALESCE(NULLIF(v.vaccine_type, ''), v.vaccine_name) AS vaccine_family
             FROM medical_reminders mr
             LEFT JOIN vaccinations v ON v.id = mr.acte_source_id
             WHERE mr.patient_id = ? AND mr.type = 'vaccin' AND mr.statut = 'en_cours'`,
            [draft.patientId]
          );
          const family = (value: string) => value.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("fr-FR");
          for (const reminder of open) {
            if (!reminder.vaccine_family || family(reminder.vaccine_family) !== family(draft.vaccineType?.trim() || draft.vaccineName)) continue;
            await db.execute(
              `UPDATE medical_reminders SET statut = 'termine', completed_at = ?,
               updated_at = ? WHERE id = ?`,
              [now, now, reminder.id]
            );
            await record(db, reminder, "traitement_acte", author, "termine",
              reminder.echeance, "Nouvelle vaccination enregistrée.");
          }
        }
        return draft.id;
      });
    },

    async proposeForAct(act: MedicalAct): Promise<MedicalReminderProposal | null> {
      assertDateOnly(act.date);
      if (!(act.id && act.patientId && act.type)) {
        throw new Error("L’acte médical est incomplet.");
      }
      return persistence.read(async (db) => {
        const typeId = canonicalType(act.type);
        const type = (await listTypes(db)).find(
          (entry) => entry.id === typeId && entry.active === 1
        );
        if (!type) {
          return null;
        }
        const patient = (
          await db.select<{ owner_id: string | null }[]>(
            "SELECT owner_id FROM patients WHERE id = ?",
            [act.patientId]
          )
        )[0];
        if (!patient) {
          throw new Error("Le patient de cet acte n’existe plus.");
        }
        return {
          acteSourceId: act.id,
          clientId: act.clientId ?? patient.owner_id,
          dateActe: act.date,
          echeance: addCalendarMonths(act.date, type.interval_months),
          intervalleMois: type.interval_months,
          note: act.note,
          patientId: act.patientId,
          type: type.id,
          typeLabel: type.name,
        };
      });
    },

    async createFromProposal(proposal: MedicalReminderProposal, author: string) {
      requireAuthor(author);
      assertDateOnly(proposal.dateActe);
      assertDateOnly(proposal.echeance);
      if (!Number.isInteger(proposal.intervalleMois) || proposal.intervalleMois < 1 || proposal.intervalleMois > 120) {
        throw new Error("L’intervalle doit être compris entre 1 et 120 mois.");
      }
      if (proposal.echeance < proposal.dateActe) {
        throw new Error("L’échéance ne peut pas précéder l’acte.");
      }
      return persistence.transaction(async (db) => {
        const patient = (await db.select<{ owner_id: string | null }[]>(
          "SELECT owner_id FROM patients WHERE id = ?", [proposal.patientId]
        ))[0];
        const typeId = canonicalType(proposal.type);
        if (!patient || !(await listTypes(db)).some((type) => type.id === typeId && type.active === 1)) {
          throw new Error("Choisissez un patient et un type de rappel actif.");
        }
        const existing = proposal.acteSourceId ? (
          await db.select<{ id: string; patient_id: string; type: string }[]>(
            "SELECT id, patient_id, type FROM medical_reminders WHERE acte_source_id = ?",
            [proposal.acteSourceId]
          )
        )[0] : undefined;
        if (existing) {
          if (existing.patient_id !== proposal.patientId || existing.type !== typeId) {
            throw new Error("Cet acte possède déjà un rappel différent.");
          }
          return existing.id;
        }
        const reminderId = id();
        const now = clock().toISOString();
        await db.execute(
          `INSERT INTO medical_reminders(id, patient_id, client_id, type,
           intervalle_mois, echeance, statut, acte_source_id, note, created_at,
           updated_at) VALUES (?, ?, ?, ?, ?, ?, 'en_cours', ?, ?, ?, ?)`,
          [reminderId, proposal.patientId, patient.owner_id,
            typeId, proposal.intervalleMois,
            proposal.echeance, proposal.acteSourceId || null,
            proposal.note?.trim() || null, now, now]
        );
        await db.execute(
          `INSERT INTO medical_reminder_history(id, reminder_id, action,
           new_status, new_due_date, author_id, created_at)
           VALUES (?, ?, 'creation', 'en_cours', ?, ?, ?)`,
          [id(), reminderId, proposal.echeance, author, now]
        );
        if (canonicalType(proposal.type) === "vaccin" && proposal.acteSourceId) {
          await db.execute(
            "UPDATE vaccinations SET next_due_at = ?, updated_at = ? WHERE id = ?",
            [new Date(`${proposal.echeance}T12:00:00`).toISOString(), now,
              proposal.acteSourceId]
          );
        }
        return reminderId;
      });
    },

    list() {
      return persistence.read((db) => db.select<MedicalReminder[]>(
        "SELECT * FROM medical_reminders ORDER BY echeance, id"
      ));
    },

    types() {
      return persistence.read(listTypes);
    },

    history(reminderId: string) {
      return persistence.read((db) => db.select<Record<string, unknown>[]>(
        `SELECT * FROM medical_reminder_history
         WHERE reminder_id = ? ORDER BY created_at, rowid`, [reminderId]
      ));
    },

    async transition(reminderId: string, to: MedicalReminderStatus, author: string, reason?: string) {
      requireAuthor(author);
      return persistence.transaction(async (db) => {
        const reminder = await get(db, reminderId);
        assertReminderTransition(reminder.statut, to, reason);
        const now = clock().toISOString();
        const result = await db.execute(
          `UPDATE medical_reminders SET statut = ?, completed_at = ?,
           motif_annulation = ?, updated_at = ?
           WHERE id = ? AND statut = 'en_cours'`,
          [to, to === "termine" ? now : null,
            to === "annule" ? reason?.trim() : null, now, reminderId]
        );
        if (result.rowsAffected !== 1) {
          throw new Error("Le rappel a été modifié. Actualisez la liste.");
        }
        await record(db, reminder,
          to === "termine" ? "traitement_manuel" : "annulation",
          author, to, reminder.echeance, reason?.trim() || null);
      });
    },

    async postpone(reminderId: string, dueDate: string, author: string, reason: string) {
      requireAuthor(author);
      assertDateOnly(dueDate);
      if (!reason.trim()) {
        throw new Error("Indiquez le motif du report.");
      }
      return persistence.transaction(async (db) => {
        const reminder = await get(db, reminderId);
        if (reminder.statut !== "en_cours") {
          throw new Error("Seul un rappel en cours peut être reporté.");
        }
        if (dueDate <= reminder.echeance) {
          throw new Error("Choisissez une date postérieure à l’échéance actuelle.");
        }
        await db.execute(
          "UPDATE medical_reminders SET echeance = ?, updated_at = ? WHERE id = ?",
          [dueDate, clock().toISOString(), reminderId]
        );
        await record(db, reminder, "report", author, reminder.statut,
          dueDate, reason.trim());
      });
    },

    async nextProposal(reminderId: string): Promise<MedicalReminderProposal> {
      return persistence.read(async (db) => {
        const reminder = await get(db, reminderId);
        if (reminder.statut !== "termine") {
          throw new Error("Terminez le rappel avant de planifier le suivant.");
        }
        const type = (await listTypes(db)).find((entry) => entry.id === reminder.type);
        const dateActe = localToday(new Date(reminder.completed_at ?? clock()));
        return {
          acteSourceId: `rappel-suivant:${reminder.id}`,
          clientId: reminder.client_id,
          dateActe,
          echeance: addCalendarMonths(dateActe, reminder.intervalle_mois),
          intervalleMois: reminder.intervalle_mois,
          note: reminder.note ?? undefined,
          patientId: reminder.patient_id,
          type: reminder.type,
          typeLabel: type?.name ?? "Rappel médical",
        };
      });
    },

    async saveType(draft: { active: boolean; id?: string; intervalMonths: number; name: string }, author: string) {
      requireAuthor(author);
      if (!draft.name.trim() || !Number.isInteger(draft.intervalMonths) || draft.intervalMonths < 1 || draft.intervalMonths > 120) {
        throw new Error("Indiquez un nom et un intervalle de 1 à 120 mois.");
      }
      return persistence.transaction(async (db) => {
        const now = clock().toISOString();
        if (draft.id) {
          const result = await db.execute(
            `UPDATE reminder_types SET name = ?, interval_months = ?, active = ?,
             libelle = ?, intervalle_defaut_mois = ?, actif = ?, updated_at = ?
             WHERE id = ?`,
            [draft.name.trim(), draft.intervalMonths, Number(draft.active),
              draft.name.trim(), draft.intervalMonths, Number(draft.active),
              now, draft.id]
          );
          if (result.rowsAffected !== 1) {
            throw new Error("Ce type n’existe plus.");
          }
          return draft.id;
        }
        const typeId = id();
        await db.execute(
          `INSERT INTO reminder_types(id, code, name, interval_months, active,
           libelle, intervalle_defaut_mois, actif, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [typeId, typeId, draft.name.trim(), draft.intervalMonths,
            Number(draft.active), draft.name.trim(), draft.intervalMonths,
            Number(draft.active), now, now]
        );
        return typeId;
      });
    },
  };
}
