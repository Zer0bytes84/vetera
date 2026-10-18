import type { DocumentKind } from "./document-domain";

export interface DocumentVariable {
  key: string;
  label: string;
  group: string;
  kinds?: DocumentKind[];
}

export const DOCUMENT_VARIABLES: readonly DocumentVariable[] = [
  { key: "patient.nom", label: "Nom du patient", group: "Patient" },
  { key: "patient.espece", label: "Espèce", group: "Patient" },
  { key: "patient.race", label: "Race", group: "Patient" },
  { key: "patient.sexe", label: "Sexe", group: "Patient" },
  { key: "patient.naissance", label: "Date de naissance", group: "Patient" },
  { key: "patient.identification", label: "Identification", group: "Patient" },
  { key: "client.nom", label: "Nom du propriétaire", group: "Propriétaire" },
  { key: "client.telephone", label: "Téléphone", group: "Propriétaire" },
  { key: "client.email", label: "Adresse email", group: "Propriétaire" },
  { key: "client.adresse", label: "Adresse", group: "Propriétaire" },
  { key: "consultation.date", label: "Date de consultation", group: "Consultation" },
  { key: "clinicien.nom", label: "Vétérinaire", group: "Consultation" },
  { key: "clinique.nom", label: "Nom du cabinet", group: "Cabinet" },
  { key: "clinique.adresse", label: "Adresse du cabinet", group: "Cabinet" },
  { key: "clinique.telephone", label: "Téléphone du cabinet", group: "Cabinet" },
  { key: "clinique.email", label: "Email du cabinet", group: "Cabinet" },
  { key: "clinique.mentions_legales", label: "Mentions du cabinet", group: "Cabinet" },
  { key: "soap.motif", label: "Motif et contexte", group: "Note clinique" },
  { key: "soap.examen", label: "Examen et observations", group: "Note clinique" },
  { key: "soap.diagnostic", label: "Évaluation", group: "Note clinique" },
  { key: "soap.plan", label: "Plan de soins", group: "Note clinique" },
  { key: "prescription.medicaments", label: "Médicaments et doses validés", group: "Ordonnance", kinds: ["prescription"] },
  { key: "certificat.type", label: "Objet du certificat", group: "Certificat", kinds: ["certificate"] },
  { key: "reference.destinataire", label: "Destinataire", group: "Référence", kinds: ["referral"] },
  { key: "reference.motif", label: "Motif de référence", group: "Référence", kinds: ["referral"] },
  // Compatibility aliases are deliberately supported without changing the old renderer.
  { key: "proprietaire.nom", label: "Nom du propriétaire (modèles existants)", group: "Compatibilité" },
  { key: "veterinaire.nom", label: "Vétérinaire (modèles existants)", group: "Compatibilité" },
  { key: "soap.s", label: "Subjectif", group: "Compatibilité" },
  { key: "soap.o", label: "Objectif", group: "Compatibilité" },
  { key: "soap.a", label: "Analyse", group: "Compatibilité" },
  { key: "soap.p", label: "Plan", group: "Compatibilité" },
];

const allowedVariables = new Set(DOCUMENT_VARIABLES.map(({ key }) => key));
export const DOCUMENT_MISSING_VALUE = "[à compléter]";

/** A closed catalogue prevents property traversal and never executes expressions. */
export function renderDocumentVariables(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{([^{}]*)\}\}/g, (_match, variable: string) => {
    const key = variable.trim();
    if (!allowedVariables.has(key)) return DOCUMENT_MISSING_VALUE;
    const value = Object.hasOwn(values, key) ? values[key] : undefined;
    return typeof value === "string" && value.trim() ? value : DOCUMENT_MISSING_VALUE;
  });
}

export function validateDocumentTemplate(body: string): void {
  if (!body.trim() || body.length > 12000) throw new Error("Le modèle doit contenir entre 1 et 12 000 caractères.");
  const residue = body.replace(/\{\{([^{}]*)\}\}/g, "");
  if (residue.includes("{{") || residue.includes("}}")) throw new Error("Une variable du modèle est mal fermée.");
}
