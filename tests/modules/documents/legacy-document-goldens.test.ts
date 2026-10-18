import { expect, it } from "vitest";
import { DEFAULT_DOCUMENT_TEMPLATES, renderClinicalDocument } from "@/modules/documents/lib/document-templates";
import type { Appointment, Owner, Patient } from "@/types/db";

const context = {
  patient: { name: "Rex", species: "Chien", breed: "Berger", id: "rex" } as Patient,
  owner: { firstName: "Sarah", lastName: "Martin" } as Owner,
  appointment: { startTime: "2026-10-07T12:00:00Z" } as Appointment,
  vetName: "Dr Nadia",
  soap: { subjective: "Boiterie depuis deux jours.", objective: "38,5 °C. Poids : 12 kg.", assessment: "Entorse suspectée.", plan: "Médicament déjà prescrit : 2 mg, voie orale, une fois par jour pendant 3 jours." },
};
const expected = [
  "ORDONNANCE\n\nPatient : Rex · Chien\nPropriétaire : Sarah Martin\nConsultation du 07/10/2026\nVétérinaire : Dr Nadia\n\nPlan de soins validé\nMédicament déjà prescrit : 2 mg, voie orale, une fois par jour pendant 3 jours.\n\nMédicaments, dose, voie et fréquence : à compléter par le vétérinaire.\nSignature : à compléter.",
  "CERTIFICAT DE CONSULTATION\n\nPatient : Rex · Chien\nPropriétaire : Sarah Martin\nConsultation du 07/10/2026\nVétérinaire : Dr Nadia\n\nObservations de l’examen\n38,5 °C. Poids : 12 kg.\n\nÉvaluation consignée\nEntorse suspectée.\n\nObjet et portée du certificat : à compléter par le vétérinaire.\nSignature : à compléter.",
  "COMPTE-RENDU DE CONSULTATION\n\nPatient : Rex · Chien\nPropriétaire : Sarah Martin\nConsultation du 07/10/2026\nVétérinaire : Dr Nadia\n\nMotif et contexte\nBoiterie depuis deux jours.\n\nExamen et observations\n38,5 °C. Poids : 12 kg.\n\nÉvaluation\nEntorse suspectée.\n\nPlan de soins\nMédicament déjà prescrit : 2 mg, voie orale, une fois par jour pendant 3 jours.",
];
it.each([0, 1, 2])("conserve à l’identique le rendu du modèle historique %i du 7 octobre", (index) => {
  expect(renderClinicalDocument(DEFAULT_DOCUMENT_TEMPLATES[index], context)).toBe(expected[index]);
});
