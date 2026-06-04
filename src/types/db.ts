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
  room?: string;
  startTime: string; // ISO string
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show";
  title: string;
  treatment?: string;
  type: "Consultation" | "Vaccin" | "Chirurgie" | "Urgence" | "Contrôle";
  vetId: string;
}

export type RecurrenceFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "yearly";

export interface AppointmentRecurrence {
  id: string;
  parentAppointmentId: string;
  frequency: RecurrenceFrequency;
  intervalCount: number;
  /** JSON-encoded array of weekday indexes 0..6 (0=Sun). null for non-weekly. */
  daysOfWeek?: string | null;
  /** ISO date string YYYY-MM-DD. null = no end. */
  endDate?: string | null;
  maxOccurrences?: number | null;
  generatedCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ReminderChannel = "in_app" | "email" | "sms";
export type ReminderStatus = "pending" | "sent" | "snoozed" | "dismissed";

export interface Reminder {
  id: string;
  appointmentId: string;
  minutesBefore: number;
  channel: ReminderChannel;
  status: ReminderStatus;
  /** ISO datetime — appointment.start_time − minutes_before. */
  scheduledFor: string;
  sentAt?: string | null;
  snoozedUntil?: string | null;
  message?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "login"
  | "logout"
  | "export"
  | "import"
  | "backup"
  | "restore_backup";

export type AuditEntity =
  | "patient"
  | "appointment"
  | "consultation"
  | "prescription"
  | "hospitalization"
  | "anesthesia"
  | "billing"
  | "user"
  | "reminder"
  | "backup"
  | "session";

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | null;
  userId?: string | null;
  userDisplayName?: string | null;
  /** JSON sérialisé (champs modifiés, ancienne valeur, etc.). */
  payload?: string | null;
  /** JSON libre (reason, ip, userAgent, source, etc.). */
  metadata?: string | null;
  createdAt: string;
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

// =====================================================================================
// Prescriptions & ordonnances (Migration 006)
// =====================================================================================

export type PrescriptionStatus = "draft" | "signed" | "dispensed" | "cancelled";

export type PrescriptionDosageUnit =
  | "mg/kg"
  | "mg/tot"
  | "mL/kg"
  | "UI/kg"
  | "cp/kg";

export interface Prescription {
  id: string;
  appointmentId: string;
  patientId: string;
  vetId?: string;
  /** Date affichée sur l'ordonnance (par défaut, date du jour). */
  prescriptionDate: string;
  /** Poids utilisé pour le calcul des doses (snapshot, en kg). */
  weightKg?: number;
  diagnosis?: string;
  /** Instructions globales (ex: "À donner pendant les repas"). */
  generalInstructions?: string;
  status: PrescriptionStatus;
  signedAt?: string;
  templateVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  /** Référence au catalogue (nullable : médicament hors base). */
  medicationId?: string;
  /** Snapshot du nom (DCI ou commercial). */
  medicationName: string;
  medicationClass?: string;
  /** Comprimé, solution buvable, injectable, gel, pommade… */
  form?: string;
  dosagePerKg: number;
  dosageUnit: PrescriptionDosageUnit;
  dosageMin?: number;
  dosageMax?: number;
  /** Concentration pour conversion mg → mL. */
  concentrationMgPerMl?: number;
  computedDoseMg?: number;
  computedVolumeMl?: number;
  /** "2x/jour", "toutes les 8h"… */
  frequency: string;
  /** "5-7 jours", "14 jours"… */
  duration: string;
  /** PO, IM, SC, IV, topique… */
  route?: string;
  /** "1 boîte de 30 comprimés" */
  quantity?: string;
  instructions?: string;
  warnings?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Hospitalisation 24h & feuille d'anesthésie (Migration 007)
// ---------------------------------------------------------------------------

export type HospitalizationStatus =
  | "admitted"
  | "monitoring"
  | "critical"
  | "discharged"
  | "transferred"
  | "deceased";

export type MucousMembrane = "pink" | "pale" | "cyanotic" | "icteric";
export type MentalState = "alert" | "lethargic" | "comatose" | "agitated";

export interface Hospitalization {
  id: string;
  patientId: string;
  appointmentId?: string | null;
  reason: string;
  diagnosis?: string | null;
  status: HospitalizationStatus;
  admissionDate: string;
  dischargeDate?: string | null;
  cage?: string | null;
  weightKg?: number | null;
  temperatureC?: number | null;
  ivFluids?: string | null;
  feedingPlan?: string | null;
  specialCare?: string | null;
  dischargeSummary?: string | null;
  vetId?: string | null;
  templateVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface HospitalizationVital {
  id: string;
  hospitalizationId: string;
  recordedAt: string;
  temperatureC?: number | null;
  heartRateBpm?: number | null;
  respiratoryRateBpm?: number | null;
  spo2Percent?: number | null;
  weightKg?: number | null;
  bloodGlucoseMmolL?: number | null;
  bloodPressureSys?: number | null;
  bloodPressureDia?: number | null;
  capillaryRefillTimeS?: number | null;
  mucousMembranes?: MucousMembrane | null;
  mentalState?: MentalState | null;
  painScore?: number | null;
  notes?: string | null;
  recordedBy?: string | null;
}

export type AnesthesiaStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type AnesthesiaPhase = "premed" | "induction" | "maintenance" | "recovery";
export type AnesthesiaRoute = "IM" | "SC" | "IV" | "IO" | "IR" | "PO" | "IN";

export interface AnesthesiaSheet {
  id: string;
  patientId: string;
  hospitalizationId?: string | null;
  appointmentId?: string | null;
  procedureName: string;
  asaStatus?: number | null;
  emergency: boolean;
  status: AnesthesiaStatus;
  scheduledAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  weightKg?: number | null;
  fastingSince?: string | null;
  premedication?: string | null;
  induction?: string | null;
  inductionAgent?: string | null;
  maintenance?: string | null;
  monitoringPlan?: string | null;
  recoveryNotes?: string | null;
  recoveryScore?: number | null;
  complications?: string | null;
  vetId?: string | null;
  templateVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnesthesiaDrugLogEntry {
  id: string;
  anesthesiaSheetId: string;
  administeredAt: string;
  phase: AnesthesiaPhase;
  drugName: string;
  dose?: string | null;
  route?: AnesthesiaRoute | null;
  administeredBy?: string | null;
  notes?: string | null;
}

export interface AnesthesiaMonitoringEntry {
  id: string;
  anesthesiaSheetId: string;
  recordedAt: string;
  phase: AnesthesiaPhase;
  heartRateBpm?: number | null;
  respiratoryRateBpm?: number | null;
  spo2Percent?: number | null;
  etco2Mmhg?: number | null;
  mapMmhg?: number | null;
  temperatureC?: number | null;
  isofluranePct?: number | null;
  oxygenFlowLMin?: number | null;
  notes?: string | null;
}
