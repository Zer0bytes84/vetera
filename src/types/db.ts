// Types pour les données locales SQLite
// Remplace les types Firebase Firestore

export type UserRole = 'admin' | 'vet_principal' | 'vet_adjoint' | 'assistant' | 'stagiaire';

export interface Owner {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  createdAt: string; // ISO string
}

export interface Patient {
  id: string;
  ownerId: string;
  name: string;
  species: 'Chien' | 'Chat' | 'NAC' | 'Cheval' | string;
  breed?: string;
  sex: 'M' | 'F';
  dateOfBirth?: string; // ISO string YYYY-MM-DD
  weightHistory?: string; // JSON string
  status: 'sante' | 'traitement' | 'hospitalise' | 'decede';

  // Champs Médicaux
  lastVisit?: string; // ISO string
  allergies?: string;
  chronicConditions?: string; // Maladies chroniques
  generalNotes?: string; // Notes générales

  createdAt: string;
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  phone?: string;
  specialty?: string;
  status: 'active' | 'inactive';
  avatarUrl?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  quantity: number;
  unit: string;
  minStock: number;
  purchasePriceAmount: number; // In centimes
  salePriceAmount: number; // In centimes
  expiryDate?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  ownerId: string;
  vetId: string;
  title: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  type: 'Consultation' | 'Vaccin' | 'Chirurgie' | 'Urgence' | 'Contrôle';

  reason?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;

  createdAt: string;
}

export interface Transaction {
  id: string;
  date: string; // ISO string
  amount: number; // In centimes
  type: 'income' | 'expense';
  category: string;
  description: string;
  referenceId?: string;
  method: 'cash' | 'card';
  status: 'paid' | 'pending';
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string; // HTML string from TipTap
  isFavorite: boolean;
  tags?: string; // JSON string
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationDocument {
  id: string;
  appointmentId: string;
  patientId: string;
  ownerId?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category: "pdf" | "image" | "other";
  dataUrl: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string; // ISO Date YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  isReminder: boolean;
  assignedTo?: string;
  patientId?: string;
  createdAt: string;
}
