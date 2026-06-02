import { useSQLite } from "@/hooks/useSQLite";
import * as AppSettingsService from "@/services/appSettingsService";
import { isTauriRuntime } from "@/services/browser-store";
import * as AuthService from "@/services/sqlite/auth";
import {
  generateId,
  runDbOperation,
  runDbTransaction,
  toSQLiteTimestamp,
} from "@/services/sqlite/database";
import type {
  Appointment,
  ConsultationDocument,
  ConsultationSoap,
  Note,
  Owner,
  Patient,
  Prescription,
  PrescriptionItem,
  Product,
  Task,
  Transaction,
  User,
  Vaccination,
  WeightEntry,
} from "@/types/db";
import { toCentimes } from "@/utils/currency";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const rowToOwner = (row: Record<string, unknown>): Owner => ({
  id: String(row.id),
  firstName: String(row.first_name ?? ""),
  lastName: String(row.last_name ?? ""),
  phone: String(row.phone ?? ""),
  email: row.email ? String(row.email) : undefined,
  address: row.address ? String(row.address) : undefined,
  city: row.city ? String(row.city) : undefined,
  createdAt: String(row.created_at ?? new Date().toISOString()),
});

const rowToPatient = (row: Record<string, unknown>): Patient => ({
  id: String(row.id),
  ownerId: String(row.owner_id ?? ""),
  name: String(row.name ?? ""),
  species: String(row.species ?? ""),
  breed: row.breed ? String(row.breed) : undefined,
  sex: ((row.sex ? String(row.sex) : "M") as Patient["sex"]) ?? "M",
  dateOfBirth: row.date_of_birth ? String(row.date_of_birth) : undefined,
  weightHistory: row.weight_history ? String(row.weight_history) : undefined,
  status:
    ((row.status ? String(row.status) : "sante") as Patient["status"]) ??
    "sante",
  lastVisit: row.last_visit ? String(row.last_visit) : undefined,
  allergies: row.allergies ? String(row.allergies) : undefined,
  chronicConditions: row.chronic_conditions
    ? String(row.chronic_conditions)
    : undefined,
  generalNotes: row.general_notes ? String(row.general_notes) : undefined,
  createdAt: String(row.created_at ?? new Date().toISOString()),
});

export const authRepository = {
  getCurrentUser: AuthService.getCurrentUser,
  login: AuthService.login,
  logout: AuthService.logout,
  register: AuthService.register,
  updatePassword: AuthService.updatePassword,
};

export const appSettingsRepository = {
  getSetting: AppSettingsService.getSetting,
  setSetting: AppSettingsService.setSetting,
  isSetupComplete: AppSettingsService.isSetupComplete,
  markSetupComplete: AppSettingsService.markSetupComplete,
  getLicenseInfo: AppSettingsService.getLicenseInfo,
  saveLicenseInfo: AppSettingsService.saveLicenseInfo,
};

export function useUsersRepository() {
  return useSQLite<User>("users");
}

export function useOwnersRepository() {
  return useSQLite<Owner>("owners");
}

export function useAppointmentsRepository() {
  const appointmentsStore = useSQLite<Appointment>("appointments");
  const patientsStore = useSQLite<Patient>("patients");
  const usersStore = useSQLite<User>("users");
  const transactionsStore = useSQLite<Transaction>("transactions");

  type AppointmentDraft = Omit<
    Appointment,
    "id" | "ownerId" | "startTime" | "endTime" | "createdAt"
  > & {
    startTime: string | Date;
    endTime: string | Date;
    id?: string;
    ownerId?: string;
    vetId?: string;
    status?: Appointment["status"];
  };

  const toIso = (value: string | Date) =>
    value instanceof Date ? value.toISOString() : new Date(value).toISOString();

  const saveAppointment = async (input: AppointmentDraft) => {
    const patient = patientsStore.data.find(
      (entry) => entry.id === input.patientId
    );
    if (!patient) {
      throw new Error("Patient introuvable pour ce rendez-vous.");
    }

    const fallbackVet = usersStore.data.find(
      (user) =>
        user.status === "active" &&
        (user.role === "vet_principal" || user.role === "vet_adjoint")
    );
    const finalVetId = input.vetId || fallbackVet?.id;

    if (!finalVetId) {
      throw new Error("Aucun vétérinaire actif n'est disponible.");
    }

    const payload = {
      ...input,
      ownerId: patient.ownerId,
      vetId: finalVetId,
      status: input.status ?? "scheduled",
      startTime: toIso(input.startTime),
      endTime: toIso(input.endTime),
    } as Partial<Appointment>;

    if (input.id) {
      const ok = await appointmentsStore.update(input.id, payload);
      if (!ok) {
        return null;
      }
      return (
        appointmentsStore.data.find((entry) => entry.id === input.id) ?? null
      );
    }

    return appointmentsStore.add(
      payload as Omit<Appointment, "id" | "createdAt" | "updatedAt">
    );
  };

  const completeWithBilling = async ({
    appointmentId,
    items,
    category,
    method,
  }: {
    appointmentId: string;
    items: Array<{ desc: string; amount: number }>;
    category?: string;
    method?: "cash" | "card";
  }) => {
    const appointment = appointmentsStore.data.find(
      (entry) => entry.id === appointmentId
    );
    if (!appointment) {
      throw new Error("Rendez-vous introuvable.");
    }

    const totalAmountDa = items.reduce(
      (sum, item) => sum + Math.max(0, Number(item.amount) || 0),
      0
    );
    const totalAmount = toCentimes(totalAmountDa);

    // Ordre: RDV d'abord (essentiel), puis patient, puis transaction (peut être refaite)
    // Si la transaction échoue, on peut la recréer manuellement plus tard
    const appointmentUpdated = await appointmentsStore.update(appointment.id, {
      status: "completed",
    });
    if (!appointmentUpdated) {
      throw new Error("Impossible de mettre à jour le rendez-vous.");
    }

    const patientUpdated = await patientsStore.update(appointment.patientId, {
      lastVisit: new Date().toISOString(),
    } as Partial<Patient>);
    if (!patientUpdated) {
      console.warn(
        "[completeWithBilling] Patient non mis à jour, mais rendez-vous complété"
      );
    }

    if (totalAmount > 0) {
      try {
        await transactionsStore.add({
          amount: totalAmount,
          type: "income",
          category: category ?? "Consultation",
          description: `Prestation: ${appointment.title}`,
          referenceId: appointment.id,
          method: method ?? "cash",
          status: "paid",
          date: new Date().toISOString(),
        } as Omit<Transaction, "id" | "createdAt" | "updatedAt">);
      } catch (err) {
        console.error(
          "[completeWithBilling] Erreur lors de la création de la transaction:",
          err
        );
        // On ne bloque pas le flow car le RDV est déjà complété
        // L'utilisateur pourra créer la transaction manuellement depuis Finances
      }
    }

    return { totalAmount, totalAmountDa };
  };

  return {
    ...appointmentsStore,
    saveAppointment,
    completeWithBilling,
  };
}

export function usePatientsRepository() {
  const patientsStore = useSQLite<Patient>("patients");
  const ownersStore = useSQLite<Owner>("owners");

  const waitForOwner = async (ownerId: string) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const rows = await runDbOperation((db) =>
        db.select<Record<string, unknown>[]>(
          "SELECT * FROM owners WHERE id = ?",
          [ownerId]
        )
      );
      if (rows?.[0]) {
        return rowToOwner(rows[0]);
      }
      await sleep(120 * (attempt + 1));
    }

    return null;
  };

  const waitForPatient = async (patientId: string) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const rows = await runDbOperation((db) =>
        db.select<Record<string, unknown>[]>(
          "SELECT * FROM patients WHERE id = ?",
          [patientId]
        )
      );
      if (rows?.[0]) {
        return rowToPatient(rows[0]);
      }
      await sleep(120 * (attempt + 1));
    }

    return null;
  };

  const createWithOwner = async ({
    ownerId,
    owner,
    patient,
  }: {
    ownerId?: string | null;
    owner: Omit<Owner, "id" | "createdAt" | "updatedAt">;
    patient: Omit<Patient, "id" | "ownerId" | "createdAt" | "updatedAt">;
  }) => {
    const patientName = patient.name?.trim();
    const patientSpecies = patient.species?.trim();

    if (!patientName) {
      throw new Error("Le nom du patient est obligatoire.");
    }

    if (!patientSpecies) {
      throw new Error("L'espèce du patient est obligatoire.");
    }

    if (!isTauriRuntime()) {
      let finalOwnerId = ownerId ?? null;
      let finalOwner: Owner | null =
        (finalOwnerId
          ? ownersStore.data.find((entry) => entry.id === finalOwnerId)
          : null) ?? null;

      if (finalOwnerId) {
        finalOwnerId = finalOwnerId.trim();
      } else {
        const createdOwner = await ownersStore.add({
          firstName: owner.firstName?.trim() || "",
          lastName: owner.lastName?.trim() || "",
          phone: owner.phone?.trim() || "",
          email: owner.email?.trim() || "",
          address: owner.address?.trim() || "",
          city: owner.city?.trim() || "",
        } as Omit<Owner, "id" | "createdAt" | "updatedAt">);
        finalOwnerId = createdOwner?.id ?? null;
        finalOwner = createdOwner ?? null;
      }

      if (!finalOwnerId) {
        throw new Error("Impossible de créer le propriétaire.");
      }

      const createdPatient = await patientsStore.add({
        ...patient,
        name: patientName,
        species: patientSpecies,
        breed: patient.breed?.trim() || "",
        ownerId: finalOwnerId,
      } as Omit<Patient, "id" | "createdAt" | "updatedAt">);

      if (!createdPatient) {
        return null;
      }

      return {
        owner:
          finalOwner ??
          ownersStore.data.find((entry) => entry.id === finalOwnerId) ??
          null,
        patient: createdPatient,
      };
    }

    let finalOwnerId = ownerId ?? null;
    let finalOwner: Owner | null = null;

    if (finalOwnerId) {
      finalOwnerId = finalOwnerId.trim();
      finalOwner = await waitForOwner(finalOwnerId);
      if (!finalOwner) {
        throw new Error("Le propriétaire sélectionné est introuvable.");
      }
    }

    const now = toSQLiteTimestamp(new Date());
    const createdOwnerId = finalOwnerId ?? generateId();
    const createdPatientId = generateId();

    await runDbTransaction(async (db) => {
      if (!finalOwnerId) {
        await db.execute(
          `INSERT INTO owners (
            id, first_name, last_name, phone, email, address, city, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            createdOwnerId,
            owner.firstName?.trim() || "",
            owner.lastName?.trim() || "",
            owner.phone?.trim() || "",
            owner.email?.trim() || "",
            owner.address?.trim() || "",
            owner.city?.trim() || "",
            now,
            now,
          ]
        );
      }

      await db.execute(
        `INSERT INTO patients (
          id, owner_id, name, species, breed, sex, date_of_birth, status, allergies,
          chronic_conditions, general_notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createdPatientId,
          createdOwnerId,
          patientName,
          patientSpecies,
          patient.breed?.trim() || "",
          patient.sex || "M",
          patient.dateOfBirth || null,
          patient.status || "sante",
          patient.allergies || null,
          patient.chronicConditions || null,
          patient.generalNotes || null,
          now,
          now,
        ]
      );
    });

    finalOwner = finalOwner ?? (await waitForOwner(createdOwnerId));
    const createdPatient = await waitForPatient(createdPatientId);

    if (!finalOwner) {
      throw new Error(
        "Le propriétaire n'a pas été sauvegardé correctement dans la base."
      );
    }

    if (!createdPatient) {
      throw new Error(
        "Le patient n'a pas été sauvegardé correctement dans la base."
      );
    }

    await Promise.all([ownersStore.refresh(), patientsStore.refresh()]);

    return {
      owner: finalOwner,
      patient: createdPatient,
    };
  };

  return {
    ...patientsStore,
    owners: ownersStore.data,
    createWithOwner,
  };
}

export function useTransactionsRepository() {
  const transactionsStore = useSQLite<Transaction>("transactions");

  const recordIncome = async (
    input: Omit<Transaction, "id" | "type" | "createdAt" | "updatedAt"> & {
      type?: "income";
    }
  ) =>
    transactionsStore.add({
      ...input,
      type: "income",
    } as Omit<Transaction, "id" | "createdAt" | "updatedAt">);

  const recordExpense = async (
    input: Omit<Transaction, "id" | "type" | "createdAt" | "updatedAt"> & {
      type?: "expense";
    }
  ) =>
    transactionsStore.add({
      ...input,
      type: "expense",
    } as Omit<Transaction, "id" | "createdAt" | "updatedAt">);

  return {
    ...transactionsStore,
    recordIncome,
    recordExpense,
  };
}

export function useProductsRepository() {
  const productsStore = useSQLite<Product>("products");
  const transactionsStore = useSQLite<Transaction>("transactions");

  const restockProduct = async ({
    productId,
    quantity,
    unitCostAmount,
    createExpense = true,
  }: {
    productId: string;
    quantity: number;
    unitCostAmount: number;
    createExpense?: boolean;
  }) => {
    if (quantity <= 0) {
      throw new Error(
        "La quantité de réapprovisionnement doit être supérieure à 0."
      );
    }

    const product = productsStore.data.find((entry) => entry.id === productId);
    if (!product) {
      throw new Error("Produit introuvable.");
    }

    const newQuantity = Number(product.quantity) + Number(quantity);
    await productsStore.update(product.id, { quantity: newQuantity });

    if (createExpense && unitCostAmount > 0) {
      await transactionsStore.add({
        amount: Math.round(unitCostAmount * quantity),
        type: "expense",
        category: "Stock",
        description: `Réappro: ${product.name} (x${quantity})`,
        referenceId: product.id,
        method: "cash",
        status: "paid",
        date: new Date().toISOString(),
      } as Omit<Transaction, "id" | "createdAt" | "updatedAt">);
    }
  };

  return {
    ...productsStore,
    restockProduct,
  };
}

export function useTasksRepository() {
  const tasksStore = useSQLite<Task>("tasks");
  const usersStore = useSQLite<User>("users");

  const assignTask = async (taskId: string, userId: string | null) => {
    if (userId) {
      const user = usersStore.data.find((entry) => entry.id === userId);
      if (!user) {
        throw new Error("Utilisateur introuvable pour cette affectation.");
      }
    }
    await tasksStore.update(taskId, {
      assignedTo: userId ?? undefined,
    } as Partial<Task>);
  };

  return {
    ...tasksStore,
    assignTask,
  };
}

export function useNotesRepository() {
  const notesStore = useSQLite<Note>("notes");

  const createEmptyNote = async (userId: string) =>
    notesStore.add({
      userId,
      title: "",
      content: "",
      isFavorite: false,
    } as Omit<Note, "id" | "createdAt" | "updatedAt">);

  return {
    ...notesStore,
    createEmptyNote,
  };
}

export function useConsultationDocumentsRepository() {
  return useSQLite<ConsultationDocument>("consultation_documents");
}

export function useWeightEntriesRepository() {
  const store = useSQLite<WeightEntry>("weight_entries");
  return {
    ...store,
    /** Toutes les pesées d'un patient, triées par date croissante */
    forPatient: (patientId: string) =>
      store.data
        .filter((entry) => entry.patientId === patientId)
        .sort(
          (a, b) =>
            new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
        ),
    /** Dernière pesée connue */
    latestFor: (patientId: string) => {
      const entries = store.data
        .filter((entry) => entry.patientId === patientId)
        .sort(
          (a, b) =>
            new Date(b.measuredAt).getTime() -
            new Date(a.measuredAt).getTime()
        );
      return entries[0] ?? null;
    },
  };
}

export function useVaccinationsRepository() {
  const store = useSQLite<Vaccination>("vaccinations");
  return {
    ...store,
    /** Carnet de vaccination d'un patient, trié par date d'administration décroissante */
    forPatient: (patientId: string) =>
      store.data
        .filter((entry) => entry.patientId === patientId)
        .sort(
          (a, b) =>
            new Date(b.administeredAt).getTime() -
            new Date(a.administeredAt).getTime()
        ),
  };
}

export function useConsultationSoapsRepository() {
  const store = useSQLite<ConsultationSoap>("consultation_soaps");
  return {
    ...store,
    /** SOAP d'une consultation (par appointmentId, 1-1). */
    forAppointment: (appointmentId: string) =>
      store.data.find((soap) => soap.appointmentId === appointmentId) ?? null,
    /** Tous les SOAPs d'un patient, triés par updatedAt desc. */
    forPatient: (patientId: string) =>
      store.data
        .filter((soap) => soap.patientId === patientId)
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),
    /**
     * Upsert : crée le SOAP s'il n'existe pas, met à jour sinon.
     * Respecte la contrainte UNIQUE(appointment_id) en faisant
     * `INSERT OR REPLACE` côté hook (re-add après remove).
     */
    upsertForAppointment: async (
      appointmentId: string,
      patientId: string,
      patch: Partial<
        Omit<
          ConsultationSoap,
          "id" | "appointmentId" | "patientId" | "createdAt" | "updatedAt"
        >
      >,
      vetId?: string
    ): Promise<ConsultationSoap | null> => {
      const existing = store.data.find(
        (soap) => soap.appointmentId === appointmentId
      );
      if (existing) {
        const ok = await store.update(existing.id, patch);
        if (!ok) {
          return null;
        }
        return (
          store.data.find((soap) => soap.appointmentId === appointmentId) ??
          null
        );
      }
      const draft = {
        appointmentId,
        patientId,
        vetId,
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
        content: "{}",
        aiDraft: null,
        aiConfidence: null,
        transcript: null,
        templateVersion: "1.0",
        ...patch,
      };
      return store.add(
        draft as unknown as Omit<
          ConsultationSoap,
          "id" | "createdAt" | "updatedAt"
        >
      );
    },
  };
}

export function usePrescriptionsRepository() {
  const store = useSQLite<Prescription>("prescriptions");
  return {
    ...store,
    forAppointment: (appointmentId: string) =>
      store.data
        .filter((row) => row.appointmentId === appointmentId)
        .sort((a, b) => (a.prescriptionDate < b.prescriptionDate ? 1 : -1)),
    forPatient: (patientId: string) =>
      store.data
        .filter((row) => row.patientId === patientId)
        .sort((a, b) => (a.prescriptionDate < b.prescriptionDate ? 1 : -1)),
  };
}

export function usePrescriptionItemsRepository() {
  const store = useSQLite<PrescriptionItem>("prescription_items");
  return {
    ...store,
    forPrescription: (prescriptionId: string) =>
      store.data
        .filter((row) => row.prescriptionId === prescriptionId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    forPrescriptions: (prescriptionIds: string[]) => {
      const set = new Set(prescriptionIds);
      return store.data
        .filter((row) => set.has(row.prescriptionId))
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    forPatient: (patientId: string, prescriptions: Prescription[]) => {
      const ids = new Set(
        prescriptions.filter((p) => p.patientId === patientId).map((p) => p.id)
      );
      return store.data
        .filter((row) => ids.has(row.prescriptionId))
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
  };
}
