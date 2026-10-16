export interface PrescriptionVet {
  displayName?: string | null;
  email?: string | null;
  id: string;
  phone?: string;
  specialty?: string;
}

export interface PreviewItem {
  computedDoseMg?: number;
  computedVolumeMl?: number;
  concentrationMgPerMl?: number;
  dosageMax?: number;
  dosageMin?: number;
  dosagePerKg: number;
  dosageUnit: string;
  duration: string;
  form?: string;
  frequency: string;
  id: string;
  instructions?: string;
  medicationClass?: string;
  medicationName: string;
  quantity?: string;
  route?: string;
  sortOrder: number;
  warnings?: string;
  weightKgSnapshot?: number;
}
