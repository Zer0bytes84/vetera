export type DocumentNoteTemplate = "consultation" | "followup" | "discharge" | "phone" | "hospitalization";

export const documentNoteTemplates: Record<DocumentNoteTemplate, {
  title: string;
  description: string;
  content: string;
}> = {
  consultation: {
    title: "Note de consultation",
    description: "Motif, examen, analyse et conduite à tenir",
    content: "<h2>Motif et contexte</h2><p></p><h2>Examen clinique</h2><p></p><h2>Évaluation</h2><p></p><h2>Plan de soins</h2><p></p><h2>Suivi prévu</h2><p></p>",
  },
  followup: {
    title: "Suivi clinique",
    description: "Évolution, traitement et prochain contrôle",
    content: "<h2>Évolution depuis la dernière visite</h2><p></p><h2>Examen et observations</h2><p></p><h2>Traitement et ajustements</h2><p></p><h2>Points de vigilance</h2><p></p><h2>Prochain contrôle</h2><p></p>",
  },
  discharge: {
    title: "Consignes de sortie",
    description: "À remettre ou expliquer au propriétaire",
    content: "<h2>Soins à domicile</h2><p></p><h2>Traitement prescrit</h2><p></p><h2>Signes à surveiller</h2><p></p><h2>Prochain contrôle</h2><p></p><h2>Contact en cas de besoin</h2><p></p>",
  },
  phone: {
    title: "Échange avec le propriétaire",
    description: "Appel, décision et suite à donner",
    content: "<h2>Motif de l’échange</h2><p></p><h2>Informations communiquées</h2><p></p><h2>Décision et conseils</h2><p></p><h2>Suite à donner</h2><p></p>",
  },
  hospitalization: {
    title: "Transmission d’hospitalisation",
    description: "État, soins effectués et relais d’équipe",
    content: "<h2>État actuel</h2><p></p><h2>Constantes et observations</h2><p></p><h2>Soins effectués</h2><p></p><h2>À faire / à surveiller</h2><p></p><h2>Transmission à l’équipe</h2><p></p>",
  },
};

export const documentNoteTemplateOrder: DocumentNoteTemplate[] = [
  "consultation", "followup", "discharge", "phone", "hospitalization",
];
