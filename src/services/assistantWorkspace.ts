import type {
  Appointment,
  ConsultationSoap,
  Patient,
  Vaccination,
  WeightEntry,
} from "@/types/db";

export type AssistantTask = "summary" | "soap" | "email" | "appointments";
export interface AssistantRecord {
  patient: Patient;
  ownerName?: string;
  weight?: WeightEntry;
  soaps: ConsultationSoap[];
  appointments: Appointment[];
  vaccinations: Vaccination[];
}
const date = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Date non renseignée"
    : parsed.toLocaleDateString("fr-FR");
};
const text = (value?: string) => value?.trim() || "Non renseigné";

/** These documents are assembled from records, never inferred by a model. */
export function buildAssistantDocument(
  task: AssistantTask,
  record: AssistantRecord,
  now = new Date()
): string {
  const { patient, ownerName, weight } = record;
  const soaps = record.soaps
    .filter((s) => s.patientId === patient.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const latest = soaps[0];
  if (task === "soap") {
    return `Brouillon SOAP · ${patient.name}\n${latest ? `Reprise du dernier SOAP enregistré le ${date(latest.updatedAt)}. À actualiser pour la consultation en cours.` : "Aucun SOAP enregistré. Complétez les observations de la consultation."}\n\nSubjectif\n${text(latest?.subjective)}\n\nObjectif\n${text(latest?.objective)}\n\nÉvaluation\n${text(latest?.assessment)}\n\nPlan\n${text(latest?.plan)}`;
  }
  if (task === "email") {
    return `Brouillon de message · ${patient.name}\n\nBonjour${ownerName ? ` ${ownerName}` : ""},\n\nNous vous contactons au sujet du suivi de ${patient.name}.\n\n[Précisez ici le motif et les consignes validées pour ce patient.]\n\nN’hésitez pas à contacter le cabinet pour toute question.\n\nBien cordialement,\nL’équipe vétérinaire\n\nCe message n’a pas été envoyé.`;
  }
  if (task === "appointments") {
    const upcoming = record.appointments
      .filter(
        (a) =>
          a.patientId === patient.id &&
          new Date(a.startTime) >= now &&
          a.status !== "cancelled"
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return `Rendez-vous à venir · ${patient.name}\n\n${upcoming.length ? upcoming.map((a) => `${date(a.startTime)} à ${new Date(a.startTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} — ${a.title}`).join("\n") : "Aucun rendez-vous à venir enregistré."}\n\nSource : agenda du cabinet. Aucun rendez-vous n’a été créé.`;
  }
  const vaccines = record.vaccinations
    .filter((v) => v.patientId === patient.id)
    .sort((a, b) => b.administeredAt.localeCompare(a.administeredAt));
  return `Dossier · ${patient.name}\n\nIdentité\n${patient.species} · ${patient.breed || "Race non renseignée"}\nPropriétaire : ${text(ownerName)}\n\nPoints de vigilance\nAllergies : ${text(patient.allergies)}\nAntécédents : ${text(patient.chronicConditions)}\n\nDernière pesée\n${weight && weight.patientId === patient.id ? `${weight.weightKg} kg · ${date(weight.measuredAt)}` : "Aucune pesée enregistrée"}\n\nDernière consultation documentée\n${latest ? `${date(latest.updatedAt)}\nÉvaluation : ${text(latest.assessment)}\nPlan : ${text(latest.plan)}` : "Aucun SOAP enregistré"}\n\nVaccinations\n${
    vaccines.length
      ? vaccines
          .slice(0, 5)
          .map(
            (v) =>
              `${v.vaccineName} · ${date(v.administeredAt)}${v.nextDueAt ? ` · échéance ${date(v.nextDueAt)}` : ""}`
          )
          .join("\n")
      : "Aucune vaccination enregistrée"
  }\n\nSource : dossier patient, SOAP, pesées et vaccinations. Les informations absentes ne sont pas interprétées.`;
}

export function escapeAssistantHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Stop waiting for a shared model download without cancelling it for other views. */
export function waitForAssistant<T>(
  promise: Promise<T>,
  signal: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () =>
      reject(new DOMException("Demande arrêtée", "AbortError"));
    if (signal.aborted) {
      promise.catch(() => {});
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}
