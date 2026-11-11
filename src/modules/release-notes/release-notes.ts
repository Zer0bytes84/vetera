import { Banknote, Building2, FileText, LayoutGrid, MessageSquareText, Plus, type LucideIcon } from "lucide-react";

/**
 * Les notes de version : une entrée par version, à remplir à chaque publication.
 *
 * Règles d'écriture : 3 ou 4 nouveautés par version, en langage vétérinaire (ce que la personne fait dans son cabinet),
 * jamais de vocabulaire technique ; un titre court, une ou deux phrases.
 *
 * - `published` : la version est sortie. Seules les entrées publiées s'affichent, dans la fenêtre « Quoi de neuf » au
 *   premier lancement de cette version après une mise à jour, puis dans Paramètres > Nouveautés.
 * - `draft` : en préparation pour la prochaine version, jamais montrée. À la publication, passer l'entrée en `published`
 *   (avec la date) et vérifier que `version` est bien celle du `package.json`.
 */
export type ReleaseHighlight = {
  icon: LucideIcon;
  title: string;
  text: string;
};

export type ReleaseNote = {
  version: string;
  status: "published" | "draft";
  /** Date de publication, `AAAA-MM-JJ`. Absente tant que la version est en brouillon. */
  date?: string;
  highlights: ReleaseHighlight[];
};

/** Les plus récentes en premier. */
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "5.0.6",
    status: "published",
    date: "2026-11-10",
    highlights: [
      {
        icon: FileText,
        title: "Des documents enfin fluides",
        text: "La page Documents est refaite : vos notes s'enregistrent sans perte, la recherche retrouve aussi le texte à l'intérieur des notes, et les modèles suivent la vraie structure d'une consultation, prêts à remplir.",
      },
      {
        icon: Plus,
        title: "Actions rapides au bout du +",
        text: "Le bouton + de la barre du haut ouvre une barre de créations : rendez-vous, patient, consultation, soin, document, produit et facture, dans l'ordre du parcours de l'animal au cabinet.",
      },
      {
        icon: LayoutGrid,
        title: "Des blocs plus doux",
        text: "Les blocs de chaque page sont redessinés, sans trait autour : plus calmes à l'œil, avec exactement les mêmes informations.",
      },
    ],
  },
  {
    version: "5.0.5",
    status: "published",
    date: "2026-11-08",
    highlights: [
      {
        icon: MessageSquareText,
        title: "Un assistant plus large et plus clair",
        text: "Le panneau de l'assistant est refait : plus large, plus sobre. Votre dictée, les passages retrouvés dans les dossiers et la relecture de la note se lisent mieux, l'un sous l'autre.",
      },
      {
        icon: Building2,
        title: "Paramètres et « Mon cabinet »",
        text: "Les Paramètres ont une présentation plus claire. Le nom, l'adresse, les coordonnées et le logo de votre cabinet ont désormais leur propre rubrique, « Mon cabinet ».",
      },
      {
        icon: Banknote,
        title: "Une analyse financière plus riche",
        text: "Dans Finances, l'onglet Analyse montre mieux vos encaissements et votre trésorerie : graphiques plus lisibles, origine des encaissements, évolution d'une période à l'autre.",
      },
    ],
  },
];

/** Les versions sorties, les plus récentes en premier : ce que l'archive de Paramètres liste. */
export function publishedReleaseNotes(notes: readonly ReleaseNote[] = RELEASE_NOTES): ReleaseNote[] {
  return notes.filter((note) => note.status === "published" && note.highlights.length > 0);
}

/** La note publiée d'une version, s'il y en a une. */
export function releaseNoteFor(version: string, notes: readonly ReleaseNote[] = RELEASE_NOTES): ReleaseNote | null {
  return publishedReleaseNotes(notes).find((note) => note.version === version) ?? null;
}
