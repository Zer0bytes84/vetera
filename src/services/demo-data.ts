import {
  getBrowserTable,
  isTauriRuntime,
  replaceBrowserTable,
  setBrowserRow,
} from "@/services/browser-store"
import { generateId, getDatabase } from "@/services/sqlite/database"
import type { Appointment, Note, Owner, Patient, Product, Task, Transaction, User } from "@/types/db"

type CurrentUser = {
  id: string
  email: string | null
  displayName: string | null
}

function startOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function addDays(date: Date, amount: number) {
  const value = new Date(date)
  value.setDate(value.getDate() + amount)
  return value
}

function withTime(date: Date, hours: number, minutes: number) {
  const value = new Date(date)
  value.setHours(hours, minutes, 0, 0)
  return value
}

function emitTableChanged(tableName: string) {
  window.dispatchEvent(new CustomEvent("sqlite-data-changed", { detail: { tableName } }))
}

function dedupeRowsById<T extends { id: string }>(rows: T[]) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values())
}

function buildDemoUsers(currentUser: CurrentUser): User[] {
  const now = new Date().toISOString()

  return [
    {
      id: currentUser.id,
      displayName: currentUser.displayName || "Zohir Kherroubi",
      email: currentUser.email || "zohir.kh@gmail.com",
      role: "admin",
      status: "active",
      specialty: "Direction clinique",
      createdAt: now,
      avatarUrl: "",
    },
    {
      id: "demo_vet_01",
      displayName: "Dr. Lina Ait Salem",
      email: "lina@luma.vet",
      role: "vet_principal",
      status: "active",
      specialty: "Médecine interne",
      phone: "+213550100107",
      createdAt: now,
      avatarUrl: "",
    },
    {
      id: "demo_vet_02",
      displayName: "Dr. Karim Messaoud",
      email: "karim@luma.vet",
      role: "vet_adjoint",
      status: "active",
      specialty: "Chirurgie",
      phone: "+213550100108",
      createdAt: now,
      avatarUrl: "",
    },
  ]
}

function buildDemoOwners(now: Date): Owner[] {
  const createdAt = now.toISOString()

  return [
    {
      id: "demo_owner_01",
      firstName: "Nadia",
      lastName: "Benali",
      phone: "+213550100101",
      email: "nadia.benali@example.com",
      address: "12 rue des Jasmins",
      city: "Alger",
      createdAt,
    },
    {
      id: "demo_owner_02",
      firstName: "Karim",
      lastName: "Messaoud",
      phone: "+213550100102",
      email: "karim.messaoud@example.com",
      address: "4 cite El Badr",
      city: "Blida",
      createdAt,
    },
    {
      id: "demo_owner_03",
      firstName: "Samira",
      lastName: "Touati",
      phone: "+213550100103",
      email: "samira.touati@example.com",
      address: "18 lotissement Sahel",
      city: "Tipaza",
      createdAt,
    },
    {
      id: "demo_owner_04",
      firstName: "Yacine",
      lastName: "Bouras",
      phone: "+213550100104",
      email: "yacine.bouras@example.com",
      address: "7 avenue Emir Abdelkader",
      city: "Boumerdes",
      createdAt,
    },
  ]
}

function buildDemoPatients(baseDate: Date): Patient[] {
  return [
    {
      id: "demo_patient_01",
      ownerId: "demo_owner_01",
      name: "Nala",
      species: "Chien",
      breed: "Berger allemand",
      sex: "F",
      dateOfBirth: "2021-04-14",
      weightHistory: JSON.stringify([
        { date: addDays(baseDate, -30).toISOString().slice(0, 10), weight: 27.4 },
        { date: addDays(baseDate, -5).toISOString().slice(0, 10), weight: 27.9 },
      ]),
      status: "sante",
      lastVisit: addDays(baseDate, -5).toISOString(),
      generalNotes: "Patiente calme, bonne observance.",
      createdAt: addDays(baseDate, -90).toISOString(),
    },
    {
      id: "demo_patient_02",
      ownerId: "demo_owner_01",
      name: "Milo",
      species: "Chat",
      breed: "Europeen",
      sex: "M",
      dateOfBirth: "2022-08-09",
      weightHistory: JSON.stringify([
        { date: addDays(baseDate, -20).toISOString().slice(0, 10), weight: 4.6 },
        { date: addDays(baseDate, -2).toISOString().slice(0, 10), weight: 4.7 },
      ]),
      status: "traitement",
      lastVisit: addDays(baseDate, -2).toISOString(),
      allergies: "Sensibilite digestive",
      generalNotes: "Sous traitement antibiotique 5 jours.",
      createdAt: addDays(baseDate, -75).toISOString(),
    },
    {
      id: "demo_patient_03",
      ownerId: "demo_owner_02",
      name: "Bella",
      species: "Chien",
      breed: "Caniche",
      sex: "F",
      dateOfBirth: "2020-02-20",
      weightHistory: JSON.stringify([{ date: addDays(baseDate, -1).toISOString().slice(0, 10), weight: 8.1 }]),
      status: "sante",
      lastVisit: addDays(baseDate, -1).toISOString(),
      generalNotes: "Vaccinations a jour.",
      createdAt: addDays(baseDate, -120).toISOString(),
    },
    {
      id: "demo_patient_04",
      ownerId: "demo_owner_03",
      name: "Simba",
      species: "Chat",
      breed: "British Shorthair",
      sex: "M",
      dateOfBirth: "2019-11-03",
      weightHistory: JSON.stringify([{ date: baseDate.toISOString().slice(0, 10), weight: 5.0 }]),
      status: "hospitalise",
      lastVisit: baseDate.toISOString(),
      chronicConditions: "Insuffisance renale debutante",
      generalNotes: "Surveillance perfusion et diurese.",
      createdAt: addDays(baseDate, -60).toISOString(),
    },
    {
      id: "demo_patient_05",
      ownerId: "demo_owner_04",
      name: "Rex",
      species: "Chien",
      breed: "Labrador",
      sex: "M",
      dateOfBirth: "2018-07-01",
      weightHistory: JSON.stringify([{ date: addDays(baseDate, -10).toISOString().slice(0, 10), weight: 31.0 }]),
      status: "sante",
      lastVisit: addDays(baseDate, -10).toISOString(),
      chronicConditions: "Arthrose legere",
      generalNotes: "Suivi locomoteur trimestriel.",
      createdAt: addDays(baseDate, -140).toISOString(),
    },
  ]
}

function buildDemoProducts(baseDate: Date): Product[] {
  const createdAt = addDays(baseDate, -45).toISOString()

  return [
    {
      id: "demo_product_01",
      name: "Vaccin rage canine",
      category: "Vaccins",
      subCategory: "Canin",
      quantity: 8,
      unit: "dose",
      minStock: 5,
      purchasePriceAmount: 180000,
      salePriceAmount: 260000,
      expiryDate: "2027-01-31",
      createdAt,
    },
    {
      id: "demo_product_02",
      name: "Vaccin trivalent felin",
      category: "Vaccins",
      subCategory: "Felin",
      quantity: 3,
      unit: "dose",
      minStock: 5,
      purchasePriceAmount: 170000,
      salePriceAmount: 250000,
      expiryDate: "2026-11-30",
      createdAt,
    },
    {
      id: "demo_product_03",
      name: "Antibiotique large spectre",
      category: "Pharmacie",
      subCategory: "Infectiologie",
      quantity: 12,
      unit: "boite",
      minStock: 6,
      purchasePriceAmount: 95000,
      salePriceAmount: 150000,
      expiryDate: "2027-04-30",
      createdAt,
    },
    {
      id: "demo_product_04",
      name: "Perfuseur sterile",
      category: "Consommables",
      subCategory: "Hospitalisation",
      quantity: 4,
      unit: "unite",
      minStock: 10,
      purchasePriceAmount: 12000,
      salePriceAmount: 22000,
      expiryDate: "2028-06-30",
      createdAt,
    },
    {
      id: "demo_product_05",
      name: "Sutures resorbables",
      category: "Chirurgie",
      subCategory: "Bloc",
      quantity: 15,
      unit: "sachet",
      minStock: 8,
      purchasePriceAmount: 45000,
      salePriceAmount: 78000,
      expiryDate: "2027-08-15",
      createdAt,
    },
  ]
}

function buildDemoAppointments(baseDate: Date): Appointment[] {
  const today = startOfDay(baseDate)

  return [
    {
      id: "demo_appt_01",
      patientId: "demo_patient_03",
      ownerId: "demo_owner_02",
      vetId: "demo_vet_01",
      title: "Bella - Consultation",
      startTime: withTime(addDays(today, -1), 8, 30).toISOString(),
      endTime: withTime(addDays(today, -1), 9, 0).toISOString(),
      status: "completed",
      type: "Consultation",
      reason: "Controle digestif",
      diagnosis: "Etat general bon",
      treatment: "Poursuite ration legere",
      notes: "Client ponctuel.",
      createdAt: addDays(today, -2).toISOString(),
    },
    {
      id: "demo_appt_02",
      patientId: "demo_patient_04",
      ownerId: "demo_owner_03",
      vetId: "demo_vet_01",
      title: "Simba - Urgence",
      startTime: withTime(today, 10, 15).toISOString(),
      endTime: withTime(today, 11, 0).toISOString(),
      status: "in_progress",
      type: "Urgence",
      reason: "Abattement aigu",
      diagnosis: "Deshydratation moderee",
      treatment: "Mise sous perfusion et bilan sanguin",
      notes: "Patient surveille en hospitalisation.",
      createdAt: withTime(today, 9, 40).toISOString(),
    },
    {
      id: "demo_appt_03",
      patientId: "demo_patient_01",
      ownerId: "demo_owner_01",
      vetId: "demo_vet_02",
      title: "Nala - Vaccin",
      startTime: withTime(today, 9, 30).toISOString(),
      endTime: withTime(today, 10, 0).toISOString(),
      status: "completed",
      type: "Vaccin",
      reason: "Rappel vaccinal annuel",
      diagnosis: "RAS",
      treatment: "Injection rage + carnet mis a jour",
      notes: "Prevoir rappel dans 12 mois.",
      createdAt: addDays(today, -1).toISOString(),
    },
    {
      id: "demo_appt_04",
      patientId: "demo_patient_02",
      ownerId: "demo_owner_01",
      vetId: "demo_vet_02",
      title: "Milo - Controle",
      startTime: withTime(today, 14, 0).toISOString(),
      endTime: withTime(today, 14, 30).toISOString(),
      status: "scheduled",
      type: "Contrôle",
      reason: "Suivi post-traitement",
      notes: "Reevaluer transit et appetit.",
      createdAt: addDays(today, -1).toISOString(),
    },
    {
      id: "demo_appt_05",
      patientId: "demo_patient_05",
      ownerId: "demo_owner_04",
      vetId: "demo_vet_01",
      title: "Rex - Chirurgie",
      startTime: withTime(addDays(today, 1), 8, 0).toISOString(),
      endTime: withTime(addDays(today, 1), 9, 30).toISOString(),
      status: "scheduled",
      type: "Chirurgie",
      reason: "Exerese masse cutanee",
      notes: "Pre-op a confirmer 24h avant.",
      createdAt: today.toISOString(),
    },
  ]
}

function buildDemoTransactions(baseDate: Date): Transaction[] {
  const today = startOfDay(baseDate)

  return [
    {
      id: "demo_tx_01",
      date: withTime(today, 9, 0).toISOString(),
      amount: 450000,
      type: "income",
      category: "Consultation",
      description: "Consultation Bella",
      referenceId: "demo_appt_01",
      method: "cash",
      status: "paid",
      createdAt: withTime(today, 9, 0).toISOString(),
    },
    {
      id: "demo_tx_02",
      date: withTime(today, 10, 0).toISOString(),
      amount: 320000,
      type: "income",
      category: "Vaccination",
      description: "Vaccin Nala",
      referenceId: "demo_appt_03",
      method: "card",
      status: "paid",
      createdAt: withTime(today, 10, 0).toISOString(),
    },
    {
      id: "demo_tx_03",
      date: addDays(today, -7).toISOString(),
      amount: 295000,
      type: "expense",
      category: "Stock",
      description: "Commande vaccins et consommables",
      method: "card",
      status: "paid",
      createdAt: addDays(today, -7).toISOString(),
    },
    {
      id: "demo_tx_04",
      date: addDays(today, -14).toISOString(),
      amount: 740000,
      type: "income",
      category: "Chirurgie",
      description: "Actes chirurgicaux",
      method: "card",
      status: "paid",
      createdAt: addDays(today, -14).toISOString(),
    },
  ]
}

function buildDemoTasks(baseDate: Date): Task[] {
  const dueToday = baseDate.toISOString().slice(0, 10)
  const dueTomorrow = addDays(baseDate, 1).toISOString().slice(0, 10)

  return [
    {
      id: "demo_task_01",
      title: "Appeler le proprietaire de Simba",
      description: "Confirmer l'evolution apres mise sous perfusion.",
      status: "todo",
      priority: "high",
      dueDate: dueToday,
      startTime: "12:30",
      endTime: "12:45",
      isReminder: true,
      assignedTo: "demo_vet_02",
      patientId: "demo_patient_04",
      createdAt: withTime(baseDate, 8, 45).toISOString(),
    },
    {
      id: "demo_task_02",
      title: "Preparer la chirurgie de Rex",
      description: "Verifier le dossier pre-op et le consentement.",
      status: "in_progress",
      priority: "high",
      dueDate: dueToday,
      startTime: "17:00",
      endTime: "17:20",
      isReminder: true,
      assignedTo: "demo_vet_01",
      patientId: "demo_patient_05",
      createdAt: withTime(baseDate, 9, 0).toISOString(),
    },
    {
      id: "demo_task_03",
      title: "Reapprovisionner les perfuseurs",
      description: "Le stock est sous le seuil minimal.",
      status: "todo",
      priority: "medium",
      dueDate: dueTomorrow,
      startTime: "09:00",
      endTime: "09:20",
      isReminder: false,
      assignedTo: "demo_vet_02",
      createdAt: withTime(baseDate, 9, 15).toISOString(),
    },
  ]
}

function buildDemoNotes(baseDate: Date, currentUser: CurrentUser): Note[] {
  return [
    {
      id: "demo_note_01",
      userId: currentUser.id,
      title: "Brief equipe - aujourd'hui",
      content: "<h2>Points du jour</h2><ul><li>Surveillance de Simba en hospitalisation</li><li>Preparer la chirurgie de Rex</li><li>Reassort vaccins felins</li></ul>",
      isFavorite: true,
      tags: JSON.stringify(["equipe", "brief"]),
      createdAt: withTime(baseDate, 7, 45).toISOString(),
      updatedAt: withTime(baseDate, 7, 45).toISOString(),
    },
    {
      id: "demo_note_02",
      userId: currentUser.id,
      title: "Protocoles vaccination",
      content: "<p>Rappel interne sur les protocoles vaccinaux canins et felins pour la consultation de routine.</p>",
      isFavorite: false,
      tags: JSON.stringify(["vaccins", "procedure"]),
      createdAt: addDays(baseDate, -2).toISOString(),
      updatedAt: addDays(baseDate, -2).toISOString(),
    },
  ]
}

export async function seedDemoDataIfNeeded(currentUser: CurrentUser | null) {
  if (!currentUser || isTauriRuntime()) {
    return
  }

  const dedupeTable = <T extends { id: string }>(tableName: Parameters<typeof getBrowserTable>[0]) => {
    const rows = getBrowserTable<T>(tableName)
    const deduped = dedupeRowsById(rows)

    if (deduped.length !== rows.length) {
      replaceBrowserTable(tableName, deduped)
      emitTableChanged(tableName)
    }
  }

  dedupeTable<User>("users")
  dedupeTable<Owner>("owners")
  dedupeTable<Patient>("patients")
  dedupeTable<Product>("products")
  dedupeTable<Appointment>("appointments")
  dedupeTable<Transaction>("transactions")
  dedupeTable<Task>("tasks")
  dedupeTable<Note>("notes")

  const existingPatients = getBrowserTable<Patient>("patients")
  if (existingPatients.length > 0) {
    return
  }

  const now = new Date()

  buildDemoUsers(currentUser).forEach((user) => setBrowserRow("users", user.id, user))
  buildDemoOwners(now).forEach((owner) => setBrowserRow("owners", owner.id, owner))
  buildDemoPatients(now).forEach((patient) => setBrowserRow("patients", patient.id, patient))
  buildDemoProducts(now).forEach((product) => setBrowserRow("products", product.id, product))
  buildDemoAppointments(now).forEach((appointment) =>
    setBrowserRow("appointments", appointment.id, appointment)
  )
  buildDemoTransactions(now).forEach((transaction) =>
    setBrowserRow("transactions", transaction.id, transaction)
  )
  buildDemoTasks(now).forEach((task) => setBrowserRow("tasks", task.id, task))
  buildDemoNotes(now, currentUser).forEach((note) => setBrowserRow("notes", note.id, note))

  ;[
    "users",
    "owners",
    "patients",
    "products",
    "appointments",
    "transactions",
    "tasks",
    "notes",
  ].forEach(emitTableChanged)
}

export async function purgeDemoDataInTauriIfNeeded() {
  if (!isTauriRuntime()) return

  const db = await getDatabase()
  await db.execute("BEGIN")
  try {
    await db.execute("DELETE FROM consultation_documents WHERE id LIKE 'demo_%' OR appointment_id LIKE 'demo_%' OR patient_id LIKE 'demo_%' OR owner_id LIKE 'demo_%'")
    await db.execute("DELETE FROM appointments WHERE id LIKE 'demo_%' OR patient_id LIKE 'demo_%' OR owner_id LIKE 'demo_%' OR vet_id LIKE 'demo_%'")
    await db.execute("DELETE FROM tasks WHERE id LIKE 'demo_%' OR patient_id LIKE 'demo_%' OR assigned_to LIKE 'demo_%'")
    await db.execute("DELETE FROM transactions WHERE id LIKE 'demo_%' OR reference_id LIKE 'demo_%'")
    await db.execute("DELETE FROM notes WHERE id LIKE 'demo_%'")
    await db.execute("DELETE FROM products WHERE id LIKE 'demo_%'")
    await db.execute("DELETE FROM patients WHERE id LIKE 'demo_%' OR owner_id LIKE 'demo_%'")
    await db.execute("DELETE FROM owners WHERE id LIKE 'demo_%'")
    await db.execute("DELETE FROM users WHERE id LIKE 'demo_%'")
    await db.execute("COMMIT")
  } catch (error) {
    await db.execute("ROLLBACK")
    throw error
  }
}
