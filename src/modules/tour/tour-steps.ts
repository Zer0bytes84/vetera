import type { TourStepId } from "./tour-state";

/**
 * Les quatre étapes du circuit du premier patient, et rien d'autre. Les textes sont courts : une consigne pour agir, puis ce qu'il reste à faire une fois sur l'écran.
 */
export interface TourStepCopy {
  id: TourStepId;
  title: string;
  /** Avant le geste d'ouverture (le « + », ou l'Agenda). */
  open: (patientName: string | null) => string;
  /** Une fois l'écran ouvert : ce qui fait réellement avancer l'étape. */
  then: (patientName: string | null) => string;
  /** Le libellé de l'entrée du menu « + » à montrer, ou celui de l'entrée de la barre latérale. */
  target: { menuLabel: string } | { sidebarLabel: string };
  /** La consigne quand le geste est à moitié fait (déduit des données) : elle remplace `open` et `then`. */
  partial?: (patientName: string | null) => string;
  /** Un écran plus avant dans le geste (la consultation ouverte) : sa consigne remplace `then`. */
  deeper?: { hashes: readonly string[]; text: (patientName: string | null) => string };
}

const forPatient = (name: string | null) => (name ? name : "le patient que vous venez de créer");

export const TOUR_STEPS: readonly TourStepCopy[] = [
  {
    id: "patient",
    title: "Créez le dossier de votre premier patient",
    open: () => "Cliquez sur « + » en haut de l’écran, puis sur « Patient ».",
    then: () => "Renseignez l’animal et son propriétaire, puis enregistrez.",
    target: { menuLabel: "Patient" },
  },
  {
    id: "appointment",
    title: "Donnez-lui un rendez-vous",
    open: () => "Cliquez sur « + », puis sur « Rendez-vous ».",
    then: (name) => `Choisissez ${forPatient(name)}, la date et l’heure, puis enregistrez.`,
    target: { menuLabel: "Rendez-vous" },
  },
  {
    id: "consultation",
    title: "Faites la consultation",
    open: () => "Ouvrez l’Agenda dans la barre de gauche.",
    then: (name) => `Repérez le rendez-vous de ${forPatient(name)}, ouvrez son menu « ⋯ » puis cliquez sur « Ouvrir ».`,
    target: { sidebarLabel: "Agenda" },
    deeper: {
      hashes: ["flux"],
      text: () => "Écrivez la note (SOAP), puis cliquez sur « Valider la note pour les documents ».",
    },
  },
  {
    id: "invoice",
    title: "Facturez et encaissez",
    open: () => "Cliquez sur « + », puis sur « Facture ».",
    then: () => "Ajoutez les actes, émettez la facture, puis enregistrez le paiement.",
    target: { menuLabel: "Facture" },
    partial: () => "La facture est émise. Ouvrez-la dans Finances, puis enregistrez le paiement.",
  },
];

export const TOUR_INVITATION_COPY = {
  title: "Votre premier patient, du rendez-vous à la facture, en quelques minutes",
  body: "Un petit tour, dans votre vraie application : vous créez un dossier, un rendez-vous, la consultation, puis la facture payée.",
  start: "Faire le tour",
  close: "Fermer",
} as const;
