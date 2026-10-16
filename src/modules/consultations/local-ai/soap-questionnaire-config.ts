import type { LocalSoapNote } from "./soap-schema";

export interface SoapQuestionnaireOption {
  id: string;
  label: string;
  shortcut: string;
  textToInsert: string;
}

export interface SoapQuestionnaireStep {
  key: keyof LocalSoapNote;
  letter: "S" | "O" | "A" | "P";
  title: string;
  label: string;
  question: string;
  subtitle: string;
  mode: "single" | "multiple";
  options: SoapQuestionnaireOption[];
}

export const SOAP_QUESTIONNAIRE_STEPS: SoapQuestionnaireStep[] = [
  {
    key: "subjective",
    letter: "S",
    title: "S · Motif et antécédents",
    label: "S · Motif & Histoire",
    question: "Quel est le motif de consultation et l'histoire clinique ?",
    subtitle: "Sélectionnez les motifs fréquents ou dictez les observations du propriétaire.",
    mode: "multiple",
    options: [
      {
        id: "s-vac",
        label: "Vaccination & bilan",
        shortcut: "1",
        textToInsert: "Visite vaccinale annuelle et contrôle de santé pré-vaccinal.",
      },
      {
        id: "s-dig",
        label: "Troubles digestifs",
        shortcut: "2",
        textToInsert: "Vomissements et épisodes diarrhéiques récents signalés par le propriétaire.",
      },
      {
        id: "s-derm",
        label: "Dermatologie / Prurit",
        shortcut: "3",
        textToInsert: "Prurit cutané intense, léchage compulsif et dépilation localisée.",
      },
      {
        id: "s-boit",
        label: "Boiterie / Traumatisme",
        shortcut: "4",
        textToInsert: "Boiterie d'apparition brutale sans fracture évidente signalée.",
      },
      {
        id: "s-ano",
        label: "Abattement / Anorexie",
        shortcut: "5",
        textToInsert: "Baisse de forme notable, léthargie et refus d'alimentation depuis 24h.",
      },
      {
        id: "s-toux",
        label: "Toux / Éternuements",
        shortcut: "6",
        textToInsert: "Quintes de toux rauque et écoulement nasal séreux.",
      },
      {
        id: "s-ctrl",
        label: "Contrôle post-op",
        shortcut: "7",
        textToInsert: "Visite de contrôle post-chirurgical et vérification de la cicatrisation.",
      },
      {
        id: "s-beha",
        label: "Comportement / Soins",
        shortcut: "8",
        textToInsert: "Modification du comportement habituel et bilan de bien-être.",
      },
    ],
  },
  {
    key: "objective",
    letter: "O",
    title: "O · Examen clinique",
    label: "O · Examen clinique",
    question: "Quelles sont vos constatations à l'examen clinique ?",
    subtitle: "Cochez les constantes clés et complétez avec vos mesures.",
    mode: "multiple",
    options: [
      {
        id: "o-beg",
        label: "Bon état général (BEG)",
        shortcut: "1",
        textToInsert: "Bon état général, animal alerte, coopératif et réactif.",
      },
      {
        id: "o-muq",
        label: "Muqueuses roses, TRC < 2s",
        shortcut: "2",
        textToInsert: "Muqueuses bien roses et humides, temps de recoloration capillaire (TRC) normal < 2s.",
      },
      {
        id: "o-cardio",
        label: "Cardio-respi normal",
        shortcut: "3",
        textToInsert: "Auscultation cardio-pulmonaire normale, rythme régulier sans souffle audible.",
      },
      {
        id: "o-abd",
        label: "Abdomen souple, indolore",
        shortcut: "4",
        textToInsert: "Palpation abdominale souple, indolore, sans masse ni organomégalie palpable.",
      },
      {
        id: "o-temp",
        label: "Température normale (38.5°C)",
        shortcut: "5",
        textToInsert: "Température rectale dans les normes physiologiques à 38.5 °C.",
      },
      {
        id: "o-nl",
        label: "Ganglions normaux",
        shortcut: "6",
        textToInsert: "Nœuds lymphatiques périphériques (mandibulaires, poplités) de taille normale.",
      },
      {
        id: "o-fievre",
        label: "Hyperthermie (> 39.2°C)",
        shortcut: "7",
        textToInsert: "Hyperthermie constatée supérieure à 39.2 °C.",
      },
      {
        id: "o-doul",
        label: "Douleur abdominale",
        shortcut: "8",
        textToInsert: "Sensibilité douloureuse et tension marquée à la palpation abdominale.",
      },
    ],
  },
  {
    key: "assessment",
    letter: "A",
    title: "A · Évaluation",
    label: "A · Évaluation",
    question: "Quelle est votre évaluation diagnostique ?",
    subtitle: "Sélectionnez votre hypothèse principale ou votre conclusion.",
    mode: "multiple",
    options: [
      {
        id: "a-normal",
        label: "Bilan sans anomalie",
        shortcut: "1",
        textToInsert: "Examen clinique rassurant sans anomalie pathologique décelée.",
      },
      {
        id: "a-gastro",
        label: "Gastro-entérite aiguë",
        shortcut: "2",
        textToInsert: "Suspicion de gastro-entérite aiguë probablement réactionnelle ou indiscrétion.",
      },
      {
        id: "a-derm",
        label: "Dermatite atopique / allergique",
        shortcut: "3",
        textToInsert: "Présentation clinique en faveur d'une dermatite allergique prurigineuse.",
      },
      {
        id: "a-otite",
        label: "Otite externe",
        shortcut: "4",
        textToInsert: "Otite externe érythémato-cérumineuse avec présence d'exsudat.",
      },
      {
        id: "a-trauma",
        label: "Traumatisme musculo-squelettique",
        shortcut: "5",
        textToInsert: "Suspicion de contusion musculaire ou d'entorse sans suspicion de fracture.",
      },
      {
        id: "a-bact",
        label: "Infection bactérienne",
        shortcut: "6",
        textToInsert: "Suspicion d'infection d'origine bactérienne nécessitant couverture thérapeutique.",
      },
      {
        id: "a-irc",
        label: "Insuffisance rénale (IRC)",
        shortcut: "7",
        textToInsert: "Tableau clinique évocateur d'une décompensation d'insuffisance rénale chronique (IRC).",
      },
      {
        id: "a-uro",
        label: "Syndrome urinaire",
        shortcut: "8",
        textToInsert: "Suspicion d'affection du bas appareil urinaire (cystite / spasme vésical).",
      },
    ],
  },
  {
    key: "plan",
    letter: "P",
    title: "P · Plan de soins",
    label: "P · Plan & Traitements",
    question: "Quel plan de soins et traitements décidez-vous ?",
    subtitle: "Indiquez les prescriptions, examens et consignes de suivi.",
    mode: "multiple",
    options: [
      {
        id: "p-sympto",
        label: "Traitement symptomatique",
        shortcut: "1",
        textToInsert: "Mise en place d'un traitement médical symptomatique adapté.",
      },
      {
        id: "p-ains",
        label: "Anti-inflammatoire (AINS)",
        shortcut: "2",
        textToInsert: "Prescription d'un anti-inflammatoire non stéroïdien (AINS) en respectant la posologie.",
      },
      {
        id: "p-anti",
        label: "Antibiothérapie ciblée",
        shortcut: "3",
        textToInsert: "Prescription d'une antibiothérapie ciblée pendant 7 jours.",
      },
      {
        id: "p-pansement",
        label: "Pansement gastrique",
        shortcut: "4",
        textToInsert: "Administration d'un pansement protecteur gastrique et antiémétique.",
      },
      {
        id: "p-diete",
        label: "Régime hyperdigestible",
        shortcut: "5",
        textToInsert: "Prescription d'une alimentation hyperdigestible fractionnée sur plusieurs repas.",
      },
      {
        id: "p-bilan",
        label: "Bilan sanguin / Labo",
        shortcut: "6",
        textToInsert: "Réalisation d'un bilan hématologique et biochimique de contrôle.",
      },
      {
        id: "p-radio",
        label: "Imagerie (Radio / Écho)",
        shortcut: "7",
        textToInsert: "Programmation d'examens d'imagerie complémentaires (radiographie ou échographie).",
      },
      {
        id: "p-suivi",
        label: "Recontrôle sous 48-72h",
        shortcut: "8",
        textToInsert: "Recontrôle clinique en consultation sous 48 à 72 heures si absence d'amélioration.",
      },
    ],
  },
];
