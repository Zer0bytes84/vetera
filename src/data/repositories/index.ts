import { useSQLite } from "@/hooks/useSQLite"
import * as AppSettingsService from "@/services/appSettingsService"
import * as AuthService from "@/services/sqlite/auth"
import { toCentimes } from "@/utils/currency"
import type { Appointment, Note, Owner, Patient, Product, Task, Transaction, User } from "@/types/db"

export const authRepository = {
  getCurrentUser: AuthService.getCurrentUser,
  login: AuthService.login,
  logout: AuthService.logout,
  register: AuthService.register,
  updatePassword: AuthService.updatePassword,
}

export const appSettingsRepository = {
  getSetting: AppSettingsService.getSetting,
  setSetting: AppSettingsService.setSetting,
  isSetupComplete: AppSettingsService.isSetupComplete,
  markSetupComplete: AppSettingsService.markSetupComplete,
  getLicenseInfo: AppSettingsService.getLicenseInfo,
  saveLicenseInfo: AppSettingsService.saveLicenseInfo,
}

export function useUsersRepository() {
  return useSQLite<User>("users")
}

export function useOwnersRepository() {
  return useSQLite<Owner>("owners")
}

export function useAppointmentsRepository() {
  const appointmentsStore = useSQLite<Appointment>("appointments")
  const patientsStore = useSQLite<Patient>("patients")
  const usersStore = useSQLite<User>("users")
  const transactionsStore = useSQLite<Transaction>("transactions")

  type AppointmentDraft = Omit<Appointment, "id" | "ownerId" | "startTime" | "endTime" | "createdAt"> & {
    startTime: string | Date
    endTime: string | Date
    id?: string
    ownerId?: string
    vetId?: string
    status?: Appointment["status"]
  }

  const toIso = (value: string | Date) =>
    value instanceof Date ? value.toISOString() : new Date(value).toISOString()

  const saveAppointment = async (
    input: AppointmentDraft
  ) => {
    const patient = patientsStore.data.find((entry) => entry.id === input.patientId)
    if (!patient) {
      throw new Error("Patient introuvable pour ce rendez-vous.")
    }

    const fallbackVet = usersStore.data.find(
      (user) => user.status === "active" && (user.role === "vet_principal" || user.role === "vet_adjoint")
    )
    const finalVetId = input.vetId || fallbackVet?.id

    if (!finalVetId) {
      throw new Error("Aucun vétérinaire actif n'est disponible.")
    }

    const payload = {
      ...input,
      ownerId: patient.ownerId,
      vetId: finalVetId,
      status: input.status ?? "scheduled",
      startTime: toIso(input.startTime),
      endTime: toIso(input.endTime),
    } as Partial<Appointment>

    if (input.id) {
      const ok = await appointmentsStore.update(input.id, payload)
      if (!ok) return null
      return appointmentsStore.data.find((entry) => entry.id === input.id) ?? null
    }

    return appointmentsStore.add(payload as Omit<Appointment, "id" | "createdAt" | "updatedAt">)
  }

  const completeWithBilling = async ({
    appointmentId,
    items,
    category,
    method,
  }: {
    appointmentId: string
    items: Array<{ desc: string; amount: number }>
    category?: string
    method?: "cash" | "card"
  }) => {
    const appointment = appointmentsStore.data.find((entry) => entry.id === appointmentId)
    if (!appointment) {
      throw new Error("Rendez-vous introuvable.")
    }

    const totalAmountDa = items.reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0)
    const totalAmount = toCentimes(totalAmountDa)

    if (totalAmount > 0) {
      await transactionsStore.add({
        amount: totalAmount,
        type: "income",
        category: category ?? "Consultation",
        description: `Prestation: ${appointment.title}`,
        referenceId: appointment.id,
        method: method ?? "cash",
        status: "paid",
        date: new Date().toISOString(),
      } as Omit<Transaction, "id" | "createdAt" | "updatedAt">)
    }

    await appointmentsStore.update(appointment.id, { status: "completed" })
    await patientsStore.update(appointment.patientId, { lastVisit: new Date().toISOString() } as Partial<Patient>)

    return { totalAmount, totalAmountDa }
  }

  return {
    ...appointmentsStore,
    saveAppointment,
    completeWithBilling,
  }
}

export function usePatientsRepository() {
  const patientsStore = useSQLite<Patient>("patients")
  const ownersStore = useSQLite<Owner>("owners")

  const createWithOwner = async ({
    ownerId,
    owner,
    patient,
  }: {
    ownerId?: string | null
    owner: Omit<Owner, "id" | "createdAt" | "updatedAt">
    patient: Omit<Patient, "id" | "ownerId" | "createdAt" | "updatedAt">
  }) => {
    let finalOwnerId = ownerId ?? null

    if (finalOwnerId) {
      await ownersStore.update(finalOwnerId, owner as Partial<Owner>)
    } else {
      const createdOwner = await ownersStore.add(owner as Omit<Owner, "id" | "createdAt" | "updatedAt">)
      finalOwnerId = createdOwner?.id ?? null
    }

    if (!finalOwnerId) {
      throw new Error("Impossible de créer le propriétaire.")
    }

    return patientsStore.add({
      ...patient,
      ownerId: finalOwnerId,
    } as Omit<Patient, "id" | "createdAt" | "updatedAt">)
  }

  return {
    ...patientsStore,
    owners: ownersStore.data,
    createWithOwner,
  }
}

export function useTransactionsRepository() {
  const transactionsStore = useSQLite<Transaction>("transactions")

  const recordIncome = async (
    input: Omit<Transaction, "id" | "type" | "createdAt" | "updatedAt"> & { type?: "income" }
  ) => {
    return transactionsStore.add({
      ...input,
      type: "income",
    } as Omit<Transaction, "id" | "createdAt" | "updatedAt">)
  }

  const recordExpense = async (
    input: Omit<Transaction, "id" | "type" | "createdAt" | "updatedAt"> & { type?: "expense" }
  ) => {
    return transactionsStore.add({
      ...input,
      type: "expense",
    } as Omit<Transaction, "id" | "createdAt" | "updatedAt">)
  }

  return {
    ...transactionsStore,
    recordIncome,
    recordExpense,
  }
}

export function useProductsRepository() {
  const productsStore = useSQLite<Product>("products")
  const transactionsStore = useSQLite<Transaction>("transactions")

  const restockProduct = async ({
    productId,
    quantity,
    unitCostAmount,
    createExpense = true,
  }: {
    productId: string
    quantity: number
    unitCostAmount: number
    createExpense?: boolean
  }) => {
    if (quantity <= 0) {
      throw new Error("La quantité de réapprovisionnement doit être supérieure à 0.")
    }

    const product = productsStore.data.find((entry) => entry.id === productId)
    if (!product) {
      throw new Error("Produit introuvable.")
    }

    const newQuantity = Number(product.quantity) + Number(quantity)
    await productsStore.update(product.id, { quantity: newQuantity })

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
      } as Omit<Transaction, "id" | "createdAt" | "updatedAt">)
    }
  }

  return {
    ...productsStore,
    restockProduct,
  }
}

export function useTasksRepository() {
  const tasksStore = useSQLite<Task>("tasks")
  const usersStore = useSQLite<User>("users")

  const assignTask = async (taskId: string, userId: string | null) => {
    if (userId) {
      const user = usersStore.data.find((entry) => entry.id === userId)
      if (!user) {
        throw new Error("Utilisateur introuvable pour cette affectation.")
      }
    }
    await tasksStore.update(taskId, { assignedTo: userId ?? undefined } as Partial<Task>)
  }

  return {
    ...tasksStore,
    assignTask,
  }
}

export function useNotesRepository() {
  const notesStore = useSQLite<Note>("notes")

  const createEmptyNote = async (userId: string) => {
    return notesStore.add({
      userId,
      title: "",
      content: "",
      isFavorite: false,
    } as Omit<Note, "id" | "createdAt" | "updatedAt">)
  }

  return {
    ...notesStore,
    createEmptyNote,
  }
}
