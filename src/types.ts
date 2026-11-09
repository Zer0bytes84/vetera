import type React from "react";

export interface StatCardProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  subtitle: string;
  title: string;
  trend: number;
  value: string | number;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

export interface DashboardData {
  activePatients: number;
  appointmentsToday: number;
  consultations: number;
  revenue: number;
}

export type View =
  | "dashboard"
  | "agenda"
  | "clinique"
  | "flux"
  | "patients"
  | "notes"
  | "stock"
  | "finances"
  | "finances_analytics"
  | "parametres"
  | "equipe"
  | "soins"
  | "taches"
  | "patient_detail";
