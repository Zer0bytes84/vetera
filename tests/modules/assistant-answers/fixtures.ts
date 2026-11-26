import type { ClinicData } from "@/modules/assistant-answers/types";
import type {
  Appointment,
  Owner,
  Patient,
  Task,
  Transaction,
} from "@/types/db";

/** Thursday 12 November 2026, 10:00, local time. Every test reads the cabinet « as of » this moment. */
export const NOW = new Date(2026, 10, 12, 10, 0, 0);

export const owner = (
  id: string,
  firstName = "Sara",
  lastName = "Benali"
): Owner =>
  ({
    id,
    firstName,
    lastName,
    phone: "",
    email: "",
    address: "",
    city: "",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  }) as Owner;

export const patient = (
  id: string,
  name: string,
  ownerId = "o1",
  extra: Partial<Patient> = {}
): Patient =>
  ({
    id,
    name,
    ownerId,
    species: "Chien",
    sex: "M",
    status: "sante",
    createdAt: "2026-01-01T09:00:00",
    ...extra,
  }) as Patient;

export const line = (
  id: string,
  type: "income" | "expense",
  amount: number,
  date: string,
  extra: Partial<Transaction> = {}
): Transaction =>
  ({
    id,
    type,
    amount,
    date,
    status: "paid",
    description: `Ligne ${id}`,
    category: "Soins",
    method: "cash",
    createdAt: date,
    ...extra,
  }) as Transaction;

export const appointment = (
  id: string,
  patientId: string,
  startTime: string,
  status: Appointment["status"],
  extra: Partial<Appointment> = {}
): Appointment =>
  ({
    id,
    patientId,
    ownerId: "o1",
    startTime,
    endTime: startTime,
    status,
    title: "Consultation",
    type: "Consultation",
    vetId: "v1",
    createdAt: startTime,
    ...extra,
  }) as Appointment;

export const task = (
  id: string,
  title: string,
  dueDate: string | undefined,
  extra: Partial<Task> = {}
): Task =>
  ({
    id,
    title,
    dueDate,
    status: "todo",
    priority: "medium",
    isReminder: false,
    createdAt: "2026-11-01",
    ...extra,
  }) as Task;

export function clinic(extra: Partial<ClinicData> = {}): ClinicData {
  return {
    patients: [
      patient("p1", "Rex"),
      patient("p2", "Mila", "o1", {
        species: "Chat",
        createdAt: "2026-11-05T09:00:00",
      }),
      patient("p3", "Nova", "o2", { species: "Chat", status: "decede" }),
    ],
    owners: [owner("o1"), owner("o2", "Karim", "Haddad")],
    appointments: [
      appointment("a1", "p1", "2026-11-10T09:00:00", "completed"),
      appointment("a2", "p1", "2026-11-11T14:00:00", "no_show"),
      appointment("a3", "p2", "2026-11-12T11:00:00", "scheduled"),
      appointment("a4", "p2", "2026-10-01T11:00:00", "cancelled"),
    ],
    tasks: [
      task("t1", "Rappeler le propriétaire", "2026-11-10", { patientId: "p1" }),
      task("t2", "Commander des gants", "2026-11-20"),
      task("t3", "Archiver", undefined),
      task("t4", "Fait", "2026-11-01", { status: "done" }),
    ],
    transactions: [
      line("c1", "income", 1_250_000, "2026-11-10T09:30:00"),
      line("c2", "income", 700_050, "2026-11-12T08:00:00"),
      line("c3", "expense", 312_575, "2026-11-11T12:00:00"),
      line("c4", "income", 99_999, "2026-11-11T12:00:00", {
        status: "pending",
      }),
      line("c5", "income", 500_000, "2026-09-01T12:00:00"),
    ],
    ...extra,
  };
}
