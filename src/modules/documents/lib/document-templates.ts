import { z } from "zod";
import type { Appointment, Owner, Patient } from "@/types/db";
import type { LocalSoapNote } from "@/modules/consultations/local-ai/soap-schema";

export const DOCUMENT_KINDS = {
  prescription: "Ordonnance",
  certificate: "Certificat",
  report: "Compte-rendu",
} as const;
export type ClinicalDocumentKind = keyof typeof DOCUMENT_KINDS;
export interface ClinicalDocumentTemplate {
  id: string;
  kind: ClinicalDocumentKind;
  name: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}
const date = "2026-10-07T00:00:00.000Z";
export const DEFAULT_DOCUMENT_TEMPLATES: ClinicalDocumentTemplate[] = [
  {
    id: "document-prescription",
    kind: "prescription",
    name: "Ordonnance de consultation",
    body: "ORDONNANCE\n\nPatient : {{patient.nom}} · {{patient.espece}}\nPropriétaire : {{proprietaire.nom}}\nConsultation du {{consultation.date}}\nVétérinaire : {{veterinaire.nom}}\n\nPlan de soins validé\n{{soap.p}}\n\nMédicaments, dose, voie et fréquence : à compléter par le vétérinaire.\nSignature : à compléter.",
    createdAt: date,
    updatedAt: date,
  },
  {
    id: "document-certificate",
    kind: "certificate",
    name: "Certificat de consultation",
    body: "CERTIFICAT DE CONSULTATION\n\nPatient : {{patient.nom}} · {{patient.espece}}\nPropriétaire : {{proprietaire.nom}}\nConsultation du {{consultation.date}}\nVétérinaire : {{veterinaire.nom}}\n\nObservations de l’examen\n{{soap.o}}\n\nÉvaluation consignée\n{{soap.a}}\n\nObjet et portée du certificat : à compléter par le vétérinaire.\nSignature : à compléter.",
    createdAt: date,
    updatedAt: date,
  },
  {
    id: "document-report",
    kind: "report",
    name: "Compte-rendu de consultation",
    body: "COMPTE-RENDU DE CONSULTATION\n\nPatient : {{patient.nom}} · {{patient.espece}}\nPropriétaire : {{proprietaire.nom}}\nConsultation du {{consultation.date}}\nVétérinaire : {{veterinaire.nom}}\n\nMotif et contexte\n{{soap.s}}\n\nExamen et observations\n{{soap.o}}\n\nÉvaluation\n{{soap.a}}\n\nPlan de soins\n{{soap.p}}",
    createdAt: date,
    updatedAt: date,
  },
];
export const TEMPLATE_FIELDS = [
  "patient.nom",
  "patient.espece",
  "patient.race",
  "proprietaire.nom",
  "consultation.date",
  "veterinaire.nom",
  "soap.s",
  "soap.o",
  "soap.a",
  "soap.p",
] as const;
export const documentTemplateSchema = z.object({
  name: z.string().trim().min(1, "Nommez le modèle.").max(100),
  kind: z.enum(["prescription", "certificate", "report"]),
  body: z.string().trim().min(1, "Le modèle est vide.").max(12000),
});
export function validateTemplate(input: unknown) {
  const value = documentTemplateSchema.parse(input);
  for (const match of value.body.matchAll(/\{\{([^{}]+)\}\}/g)) {
    if (!(TEMPLATE_FIELDS as readonly string[]).includes(match[1].trim()))
      throw new Error(
        `Champ inconnu dans le modèle : ${match[1]}. Utilisez les champs proposés.`
      );
  }
  const residue = value.body.replace(/\{\{([^{}]+)\}\}/g, "");
  if (residue.includes("{{") || residue.includes("}}"))
    throw new Error("Un champ du modèle est mal fermé.");
  return value;
}
export function renderClinicalDocument(
  template: ClinicalDocumentTemplate,
  context: {
    patient: Patient;
    owner?: Owner;
    appointment: Appointment;
    soap: LocalSoapNote;
    vetName: string;
  }
): string {
  const { body } = validateTemplate(template);
  const { patient, owner, appointment, soap, vetName } = context;
  const values: Record<(typeof TEMPLATE_FIELDS)[number], string> = {
    "patient.nom": patient.name,
    "patient.espece": patient.species,
    "patient.race": patient.breed ?? "",
    "proprietaire.nom": owner
      ? `${owner.firstName} ${owner.lastName}`.trim()
      : "",
    "consultation.date": new Date(appointment.startTime).toLocaleDateString(
      "fr-FR"
    ),
    "veterinaire.nom": vetName,
    "soap.s": soap.subjective,
    "soap.o": soap.objective,
    "soap.a": soap.assessment,
    "soap.p": soap.plan,
  };
  // Exact substitution: no model invents a medicine, dose or certification.
  // Missing clinical fields stay empty.
  return body.replace(
    /\{\{([^{}]+)\}\}/g,
    (_, key: string) => values[key.trim() as keyof typeof values]
  );
}
export const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
export const documentToHtml = (text: string) =>
  text
    .split(/\n\n+/)
    .map((part) => `<p>${escapeHtml(part).replace(/\n/g, "<br>")}</p>`)
    .join("");
