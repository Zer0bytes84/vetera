import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  trend: number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface DashboardData {
  consultations: number;
  appointmentsToday: number;
  activePatients: number;
  revenue: number;
}

export type View = 'dashboard' | 'agenda' | 'clinique' | 'patients' | 'notes' | 'stock' | 'finances' | 'parametres' | 'equipe' | 'taches' | 'aide';