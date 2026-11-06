export const PREMIUM_SHORTCUTS = [
  { id: "appointment", label: "Rendez-vous", tone: "blue" },
  { id: "consultation", label: "Consultation", tone: "green" },
  { id: "patient", label: "Patients", tone: "blue" },
  { id: "care", label: "Soin", tone: "orange" },
] as const;
export type PremiumShortcut = (typeof PREMIUM_SHORTCUTS)[number]["id"];
