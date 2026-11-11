export type DocumentNoteTemplate = "consultation" | "followup" | "discharge" | "phone" | "hospitalization";

export const documentNoteTemplates: Record<DocumentNoteTemplate, {
  title: string;
  description: string;
  content: string;
}> = {
  consultation: {
    title: "Note de consultation",
    description: "Structure SOAP complète, prête à remplir",
    content: "<h2>S · Motif et contexte</h2><p><strong>Motif de la visite :</strong> </p><p><strong>Depuis quand :</strong> </p><p><strong>Évolution :</strong> </p><ul><li>Appétit et soif : </li><li>Comportement et niveau d'activité : </li><li>Antécédents pertinents : </li><li>Traitements en cours : </li></ul><h2>O · Examen clinique</h2><ul><li>État général : </li><li>Poids : · Note d'état corporel : /9</li><li>Température : °C</li><li>Fréquence cardiaque : · Pouls : </li><li>Fréquence respiratoire : </li><li>Muqueuses : · Temps de remplissage capillaire : </li><li>Hydratation : </li><li>Auscultation : </li><li>Palpation abdominale : </li><li>Examen ciblé selon le motif : </li></ul><h2>Examens complémentaires</h2><p><strong>Réalisés :</strong> </p><p><strong>Résultats :</strong> </p><h2>A · Évaluation</h2><p><strong>Hypothèses diagnostiques :</strong> </p><p><strong>Diagnostic retenu :</strong> </p><h2>P · Plan de soins</h2><ul><li>Traitement mis en place : </li><li>Examens à prévoir : </li><li>Conseils donnés au propriétaire : </li><li>Signes qui doivent faire revenir : </li><li>Suivi et prochain contrôle : </li></ul>",
  },
  followup: {
    title: "Suivi clinique",
    description: "Évolution, traitement et prochain contrôle",
    content: "<h2>Évolution depuis la dernière visite</h2><ul><li>Amélioration, stabilité ou aggravation : </li><li>Observance du traitement : </li><li>Effets indésirables signalés : </li><li>Appétit, soif et comportement : </li></ul><h2>Examen du jour</h2><ul><li>État général : </li><li>Poids : · Note d'état corporel : /9</li><li>Constantes : </li><li>Points ciblés de l'examen : </li></ul><h2>Traitement et ajustements</h2><ul><li>À poursuivre : </li><li>À modifier : </li><li>À arrêter : </li><li>Nouveaux examens décidés : </li></ul><h2>Points de vigilance</h2><p></p><h2>Prochain contrôle</h2><p><strong>Date visée :</strong> </p><p><strong>Objectif du contrôle :</strong> </p>",
  },
  discharge: {
    title: "Consignes de sortie",
    description: "À remettre ou expliquer au propriétaire",
    content: "<h2>Ce qui a été fait aujourd'hui</h2><p></p><h2>Soins à domicile</h2><ul><li>Repos et activité : </li><li>Surveillance de la plaie ou du pansement : </li><li>Collier de protection : à garder en permanence, sauf indication contraire du vétérinaire</li><li>Alimentation et eau : </li></ul><h2>Traitement à donner</h2><p><strong>Médicament :</strong> </p><ul><li>Dose et fréquence : </li><li>Durée : </li><li>À donner avec ou sans nourriture : </li></ul><p>En cas d'oubli d'une prise, ne doublez jamais la suivante : appelez le cabinet.</p><h2>Signes à surveiller</h2><ul><li>Refus de manger pendant plus de 24 heures</li><li>Vomissements répétés ou diarrhée importante</li><li>Saignement, gonflement ou écoulement au niveau de la plaie</li><li>Abattement marqué ou difficulté à respirer</li><li>Animal chaud, tremblements, prostration</li></ul><p>Si l'un de ces signes apparaît, contactez le cabinet sans attendre le prochain contrôle.</p><h2>Prochain contrôle</h2><p><strong>Date :</strong> </p><p><strong>Motif :</strong> </p><h2>Contact en cas de besoin</h2><p><strong>Cabinet :</strong> </p><p><strong>En dehors des heures d'ouverture :</strong> </p>",
  },
  phone: {
    title: "Échange avec le propriétaire",
    description: "Appel, décision et suite à donner",
    content: "<h2>Motif de l'échange</h2><p><strong>Interlocuteur :</strong> </p><p><strong>Ce que rapporte le propriétaire :</strong> </p><h2>Informations communiquées</h2><p></p><h2>Décision et conseils</h2><ul><li>Conduite décidée (rendez-vous, surveillance à domicile, venue immédiate) : </li><li>Conseils donnés : </li><li>Signes qui doivent alerter le propriétaire : </li></ul><h2>Suite à donner</h2><p><strong>Action :</strong> </p><p><strong>Responsable et échéance :</strong> </p>",
  },
  hospitalization: {
    title: "Transmission d'hospitalisation",
    description: "État, soins effectués et relais d'équipe",
    content: "<h2>État actuel</h2><ul><li>État général : </li><li>Douleur : </li><li>Appétit et soif : </li></ul><h2>Constantes et observations</h2><ul><li>Température : °C · Fréquence cardiaque : · Fréquence respiratoire : </li><li>Hydratation : </li><li>Émissions (urine, selles) : </li></ul><h2>Soins effectués</h2><ul><li>Traitements administrés : </li><li>Perfusion : </li><li>Pansement et soins locaux : </li><li>Alimentation : </li><li>Résultats reçus : </li></ul><h2>À faire / à surveiller</h2><p></p><h2>Transmission à l'équipe</h2><p><strong>Consignes pour la relève :</strong> </p><p><strong>Points d'attention :</strong> </p>",
  },
};

export const documentNoteTemplateOrder: DocumentNoteTemplate[] = [
  "consultation", "followup", "discharge", "phone", "hospitalization",
];
