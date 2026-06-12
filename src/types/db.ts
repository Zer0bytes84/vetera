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

export type RecurrenceFrequency = "weekly" | "biweekly" | "monthly" | "yearly";

export interface AppointmentRecurrence {
  createdAt: string;
  /** JSON-encoded array of weekday indexes 0..6 (0=Sun). null for non-weekly. */
  daysOfWeek?: string | null;
  /** ISO date string YYYY-MM-DD. null = no end. */
  endDate?: string | null;
  frequency: RecurrenceFrequency;
  generatedCount: number;
  id: string;
  intervalCount: number;
  maxOccurrences?: number | null;
  parentAppointmentId: string;
  updatedAt: string;
}

export type ReminderChannel = "in_app" | "email" | "sms";
export type ReminderStatus = "pending" | "sent" | "snoozed" | "dismissed";

export interface Reminder {
  appointmentId: string;
  channel: ReminderChannel;
  createdAt: string;
  id: string;
  message?: string | null;
  minutesBefore: number;
  /** ISO datetime — appointment.start_time − minutes_before. */
  scheduledFor: string;
  sentAt?: string | null;
  snoozedUntil?: string | null;
  status: ReminderStatus;
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
  action: AuditAction;
  createdAt: string;
  entity: AuditEntity;
  entityId?: string | null;
  id: string;
  /** JSON libre (reason, ip, userAgent, source, etc.). */
  metadata?: string | null;
  /** JSON sérialisé (champs modifiés, ancienne valeur, etc.). */
  payload?: string | null;
  userDisplayName?: string | null;
  userId?: string | null;
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
  /** Score de confiance 0-1 retourné par l'IA */
  aiConfidence: number | null;
  /** Brouillon généré par l'IA (JSON.stringify) ou null */
  aiDraft: string | null;
  appointmentId: string;
  assessment: string;
  /** JSON libre sérialisé (signes vitaux, médocs, etc.) — extension future */
  content: string;
  createdAt: string;
  id: string;
  objective: string;
  patientId: string;
  plan: string;
  subjective: string;
  templateVersion: string;
  /** Texte brut dicté par le véto avant structuration */
  transcript: string | null;
  updatedAt: string;
  vetId?: string;
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
  appointmentId: string;
  createdAt: string;
  diagnosis?: string;
  /** Instructions globales (ex: "À donner pendant les repas"). */
  generalInstructions?: string;
  id: string;
  patientId: string;
  /** Date affichée sur l'ordonnance (par défaut, date du jour). */
  prescriptionDate: string;
  signedAt?: string;
  status: PrescriptionStatus;
  templateVersion: string;
  updatedAt: string;
  vetId?: string;
  /** Poids utilisé pour le calcul des doses (snapshot, en kg). */
  weightKg?: number;
}

export interface PrescriptionItem {
  computedDoseMg?: number;
  computedVolumeMl?: number;
  /** Concentration pour conversion mg → mL. */
  concentrationMgPerMl?: number;
  createdAt: string;
  dosageMax?: number;
  dosageMin?: number;
  dosagePerKg: number;
  dosageUnit: PrescriptionDosageUnit;
  /** "5-7 jours", "14 jours"… */
  duration: string;
  /** Comprimé, solution buvable, injectable, gel, pommade… */
  form?: string;
  /** "2x/jour", "toutes les 8h"… */
  frequency: string;
  id: string;
  instructions?: string;
  medicationClass?: string;
  /** Référence au catalogue (nullable : médicament hors base). */
  medicationId?: string;
  /** Snapshot du nom (DCI ou commercial). */
  medicationName: string;
  prescriptionId: string;
  /** "1 boîte de 30 comprimés" */
  quantity?: string;
  /** PO, IM, SC, IV, topique… */
  route?: string;
  sortOrder: number;
  updatedAt: string;
  warnings?: string;
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
  admissionDate: string;
  appointmentId?: string | null;
  cage?: string | null;
  createdAt: string;
  diagnosis?: string | null;
  dischargeDate?: string | null;
  dischargeSummary?: string | null;
  feedingPlan?: string | null;
  id: string;
  ivFluids?: string | null;
  patientId: string;
  reason: string;
  specialCare?: string | null;
  status: HospitalizationStatus;
  temperatureC?: number | null;
  templateVersion: string;
  updatedAt: string;
  vetId?: string | null;
  weightKg?: number | null;
}

export interface HospitalizationVital {
  bloodGlucoseMmolL?: number | null;
  bloodPressureDia?: number | null;
  bloodPressureSys?: number | null;
  capillaryRefillTimeS?: number | null;
  heartRateBpm?: number | null;
  hospitalizationId: string;
  id: string;
  mentalState?: MentalState | null;
  mucousMembranes?: MucousMembrane | null;
  notes?: string | null;
  painScore?: number | null;
  recordedAt: string;
  recordedBy?: string | null;
  respiratoryRateBpm?: number | null;
  spo2Percent?: number | null;
  temperatureC?: number | null;
  weightKg?: number | null;
}

export type AnesthesiaStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type AnesthesiaPhase =
  | "premed"
  | "induction"
  | "maintenance"
  | "recovery";
export type AnesthesiaRoute = "IM" | "SC" | "IV" | "IO" | "IR" | "PO" | "IN";

export interface AnesthesiaSheet {
  appointmentId?: string | null;
  asaStatus?: number | null;
  complications?: string | null;
  createdAt: string;
  emergency: boolean;
  endedAt?: string | null;
  fastingSince?: string | null;
  hospitalizationId?: string | null;
  id: string;
  induction?: string | null;
  inductionAgent?: string | null;
  maintenance?: string | null;
  monitoringPlan?: string | null;
  patientId: string;
  premedication?: string | null;
  procedureName: string;
  recoveryNotes?: string | null;
  recoveryScore?: number | null;
  scheduledAt?: string | null;
  startedAt?: string | null;
  status: AnesthesiaStatus;
  templateVersion: string;
  updatedAt: string;
  vetId?: string | null;
  weightKg?: number | null;
}

export interface AnesthesiaDrugLogEntry {
  administeredAt: string;
  administeredBy?: string | null;
  anesthesiaSheetId: string;
  dose?: string | null;
  drugName: string;
  id: string;
  notes?: string | null;
  phase: AnesthesiaPhase;
  route?: AnesthesiaRoute | null;
}

export interface AnesthesiaMonitoringEntry {
  anesthesiaSheetId: string;
  etco2Mmhg?: number | null;
  heartRateBpm?: number | null;
  id: string;
  isofluranePct?: number | null;
  mapMmhg?: number | null;
  notes?: string | null;
  oxygenFlowLMin?: number | null;
  phase: AnesthesiaPhase;
  recordedAt: string;
  respiratoryRateBpm?: number | null;
  spo2Percent?: number | null;
  temperatureC?: number | null;
}
