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
