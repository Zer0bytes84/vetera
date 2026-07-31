import type { DashboardMetrics } from "@/lib/metrics";
import type { View } from "@/types";
import type {
  Appointment,
  Owner,
  Patient,
  Product,
  Task,
  Transaction,
  Vaccination,
} from "@/types/db";

export interface DashboardV2Data {
  appointments: Appointment[];
  metrics: DashboardMetrics;
  owners: Owner[];
  patients: Patient[];
  products: Product[];
  tasks: Task[];
  transactions: Transaction[];
  vaccinations: Vaccination[];
}

export interface DashboardV2Props extends DashboardV2Data {
  isCustomizing: boolean;
  isLoading?: boolean;
  onCustomizingChange: (value: boolean) => void;
  onNavigate?: (view: View) => void;
  onNavigateToPatient?: (patientId: string) => void;
}
