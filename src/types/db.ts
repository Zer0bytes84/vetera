// Types pour les données locales SQLite
// Remplace les types Firebase Firestore

export type UserRole =
  | "admin"
  | "vet_principal"
  | "vet_adjoint"
  | "assistant"
  | "stagiaire";

export interface Owner {
  address?: string;
  city?: string;
  createdAt: string; // ISO string
  email?: string;
  firstName: string;
  id: string;
  lastName: string;
  phone: string;
}

export interface Patient {
  allergies?: string;
  breed?: string;
  chronicConditions?: string; // Maladies chroniques

  createdAt: string;
  dateOfBirth?: string; // ISO string YYYY-MM-DD
  generalNotes?: string; // Notes générales
  id: string;

  // Champs Médicaux
  lastVisit?: string; // ISO string
  name: string;
  ownerId: string;
  sex: "M" | "F";
  species: "Chien" | "Chat" | "NAC" | "Cheval" | string;
  status: "sante" | "traitement" | "hospitalise" | "decede";
  weightHistory?: string; // JSON string
}

export interface User {
  avatarUrl?: string;
  createdAt: string;
  displayName: string;
  email: string;
  id: string;
  phone?: string;
  role: UserRole;
  specialty?: string;
  status: "active" | "inactive";
}

export interface Product {
  category: string;
  createdAt: string;
  expiryDate?: string;
  id: string;
  minStock: number;
  name: string;
  purchasePriceAmount: number; // In centimes
  quantity: number;
  salePriceAmount: number; // In centimes
  subCategory?: string;
  unit: string;
}

export interface Appointment {
  createdAt: string;
  diagnosis?: string;
  endTime: string; // ISO string
  id: string;
  notes?: string;
  ownerId: string;
  patientId: string;

  reason?: string;
  startTime: string; // ISO string
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show";
  title: string;
  treatment?: string;
  type: "Consultation" | "Vaccin" | "Chirurgie" | "Urgence" | "Contrôle";
  vetId: string;
}

export interface Transaction {
  amount: number; // In centimes
  category: string;
  createdAt: string;
  date: string; // ISO string
  description: string;
  id: string;
  method: "cash" | "card";
  referenceId?: string;
  status: "paid" | "pending";
  type: "income" | "expense";
}

export interface Note {
  content: string; // HTML string from TipTap
  createdAt: string;
  id: string;
  isFavorite: boolean;
  tags?: string; // JSON string
  title: string;
  updatedAt: string;
  userId: string;
}

export interface ConsultationDocument {
  appointmentId: string;
  category: "pdf" | "image" | "other";
  createdAt: string;
  createdBy?: string;
  dataUrl: string;
  description?: string;
  fileName: string;
  id: string;
  mimeType: string;
  ownerId?: string;
  patientId: string;
  sizeBytes: number;
  updatedAt: string;
}

export interface Task {
  assignedTo?: string;
  createdAt: string;
  description?: string;
  dueDate?: string; // ISO Date YYYY-MM-DD
  endTime?: string; // HH:mm
  id: string;
  isReminder: boolean;
  patientId?: string;
  priority: "low" | "medium" | "high";
  startTime?: string; // HH:mm
  status: "todo" | "in_progress" | "done";
  title: string;
}

export interface WeightEntry {
  bcs?: number; // Body Condition Score 1-9
  createdAt: string;
  id: string;
  measuredAt: string; // ISO date
  notes?: string;
  patientId: string;
  updatedAt: string;
  vetId?: string;
  weightKg: number;
}

export interface Vaccination {
  administeredAt: string; // ISO date
  batchNumber?: string;
  createdAt: string;
  id: string;
  manufacturer?: string;
  nextDueAt?: string; // ISO date
  notes?: string;
  patientId: string;
  updatedAt: string;
  vaccineName: string;
  vaccineType?: string; // ex: CHPL, FeLV, Rage
  vetId?: string;
}

/**
 * SOAP structuré pour une consultation.
 * Lié 1-1 à un `Appointment` via `appointmentId` (UNIQUE).
 * `content` est un blob JSON libre pour des extensions futures
 * (signes vitaux structurés, médicaments, etc.) ; les 4 champs
 * S/O/A/P sont la source de vérité.
 */
export interface ConsultationSoap {
  id: string;
  appointmentId: string;
  patientId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  /** JSON libre sérialisé (signes vitaux, médocs, etc.) — extension future */
  content: string;
  /** Brouillon généré par l'IA (JSON.stringify) ou null */
  aiDraft: string | null;
  /** Score de confiance 0-1 retourné par l'IA */
  aiConfidence: number | null;
  /** Texte brut dicté par le véto avant structuration */
  transcript: string | null;
  templateVersion: string;
  vetId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Type pratique pour les appels S/O/A/P. */
export type SoapSectionKey = "subjective" | "objective" | "assessment" | "plan";
