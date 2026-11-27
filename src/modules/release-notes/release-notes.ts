import {
  Archive,
  Banknote,
  Building2,
  CalendarCheck,
  ChartColumn,
  FileText,
  FolderSearch,
  LayoutDashboard,
  LayoutGrid,
  type LucideIcon,
  MessageCircle,
  MessageSquareText,
  Palette,
  PanelLeft,
  Pencil,
  Phone,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Shapes,
  ShieldCheck,
  Stethoscope,
  Type,
  UserPen,
} from "lucide-react";

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
export interface ReleaseHighlight {
  icon: LucideIcon;
  text: string;
  title: string;
}

export interface ReleaseNote {
  /** Date de publication, `AAAA-MM-JJ`. Absente tant que la version est en brouillon. */
  date?: string;
  highlights: ReleaseHighlight[];
  status: "published" | "draft";
  version: string;
}

/** Les plus récentes en premier. */
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "5.4.0",
    status: "published",
    date: "2026-11-27",
    highlights: [
      {
        icon: Search,
        title: "Une recherche qui retrouve tout, et bien plus vite",
        text: "La barre de recherche retrouve toutes vos consultations, fiches patients et notes, même les plus anciennes, et répond bien plus vite, même avec des milliers de dossiers.",
      },
      {
        icon: Stethoscope,
        title: "Des cas similaires dans tous vos dossiers",
        text: "L'assistant retrouve les cas proches parmi les notes validées de tous vos patients, y compris celles écrites avant cette version.",
      },
      {
        icon: RefreshCw,
        title: "Une préparation qui se fait toute seule",
        text: "Chaque note validée est prise en compte aussitôt, et vos dossiers existants sont préparés en arrière-plan, sans gêner la dictée ni vos recherches.",
      },
      {
        icon: FolderSearch,
        title: "Où vous cherchez, d'un coup d'œil",
        text: "Dans l'assistant, vous voyez tout de suite si vous cherchez dans le dossier ouvert ou dans tous les dossiers, et un clic suffit pour élargir la recherche.",
      },
    ],
  },
  {
    version: "5.3.1",
    status: "published",
    date: "2026-11-26",
    highlights: [
      {
        icon: ShieldCheck,
        title: "Sécurité renforcée",
        text: "L'application contrôle désormais tout ce qu'elle affiche : une note reçue d'une sauvegarde ou d'un autre poste ne peut plus y glisser de contenu dangereux.",
      },
      {
        icon: FileText,
        title: "Pièces jointes encadrées",
        text: "Seuls les fichiers sûrs s'ouvrent depuis l'application, comme les PDF et les images. Un autre type de fichier affiche un message au lieu de s'ouvrir.",
      },
      {
        icon: Archive,
        title: "Vos dossiers restent à vous",
        text: "L'application ne travaille plus que dans ses propres fichiers : vos Documents, votre Bureau et vos Téléchargements sont hors de sa portée.",
      },
    ],
  },
  {
    version: "5.3.0",
    status: "published",
    date: "2026-11-26",
    highlights: [
      {
        icon: FileText,
        title: "Factures plus transparentes",
        text: "Le PDF détaille maintenant chaque règlement (date, moyen de paiement, montant), idéal pour les factures payées en plusieurs fois et pour faire vos comptes.",
      },
      {
        icon: LayoutGrid,
        title: "Interface plus claire et plus fluide",
        text: "Fenêtres refaites, tous les champs visibles d'un coup, boutons toujours en haut, un squelette pendant les chargements, et un démarrage allégé.",
      },
      {
        icon: ChartColumn,
        title: "Finances",
        text: "Un nouvel onglet Données pour vérifier vos chiffres en détail.",
      },
      {
        icon: Pill,
        title: "Correction",
        text: "Certaines doses ne se pré-remplissent plus à tort dans les ordonnances.",
      },
    ],
  },
  {
    version: "5.2.0",
    status: "published",
    date: "2026-11-19",
    highlights: [
      {
        icon: Pill,
        title: "Les doses relues par une vétérinaire, sur l'ordonnance",
        text: "Pour 24 médicaments, la ligne de l'ordonnance montre la dose de référence pour le poids de l'animal, avec son calcul, la voie, la fréquence, la durée et la mise en garde du RCP mot pour mot. Quand la référence ne permet pas de donner une dose (poids hors de la tranche, dose non chiffrée), elle le dit et dit pourquoi. La ligne reste la vôtre : rien n'est écrit à votre place.",
      },
      {
        icon: ChartColumn,
        title: "Vos données du cabinet en chiffres et en graphiques",
        text: "Dans l'Assistant, onglet Données, posez une question sur la caisse, les rendez-vous, les dossiers ou les tâches : la réponse vient avec ses chiffres clés, un graphique et un tableau que vous triez d'un clic. L'Assistant ne répond que s'il a compris toute la question, et ne lit que les données de cet ordinateur.",
      },
      {
        icon: LayoutDashboard,
        title:
          "Plus de chiffres faux pendant le chargement, un dessin plus net",
        text: "Pendant que le Tableau de bord lit vos données, les Chiffres clés montrent leur emplacement au lieu d'afficher « 0 DA ». La page Hospitalisation et les premières rangées de toutes les pages suivent le même dessin que le Tableau de bord, et dans l'Agenda le trait entre les heures et la journée a disparu.",
      },
      {
        icon: Search,
        title: "Une recherche plus directe",
        text: "La recherche, en haut de chaque page, met les actions rapides en tête et montre le passage trouvé dans chaque résultat : le bon dossier se reconnaît d'un coup d'œil.",
      },
    ],
  },
  {
    version: "5.1.1",
    status: "published",
    date: "2026-11-18",
    highlights: [
      {
        icon: Stethoscope,
        title:
          "Le dossier patient, Soins et Hospitalisation s'ouvrent de nouveau",
        text: "Ces trois pages affichaient « Cette vue n'a pas pu être chargée » dans l'application installée. Elles s'ouvrent normalement, avec la relance WhatsApp et la correction des coordonnées de la version 5.1.0.",
      },
      {
        icon: RefreshCw,
        title: "Une mise à jour qui n'a pas pu s'installer vous est reproposée",
        text: "Si l'installation échoue, la version n'est plus considérée comme refusée : elle vous est proposée de nouveau au prochain lancement. Seul « Plus tard » la met de côté.",
      },
      {
        icon: Search,
        title: "Recherchez une mise à jour quand vous le voulez",
        text: "Dans Paramètres, À propos, « Rechercher une mise à jour » vérifie si une version plus récente est publiée et propose de l'installer, même si vous l'aviez reportée.",
      },
    ],
  },
  {
    version: "5.1.0",
    status: "published",
    date: "2026-11-18",
    highlights: [
      {
        icon: MessageCircle,
        title: "Relancez vos clients sur WhatsApp en un clic",
        text: "Dans l'Agenda, « Relance WhatsApp » dans le menu du rendez-vous ouvre WhatsApp sur le numéro du propriétaire, avec un message prêt : le nom de l'animal, la date et l'heure. Une heure avant le rendez-vous, puis s'il est manqué ou marqué absent, la relance remonte aussi dans les Rappels. Vous relisez et envoyez vous-même : rien ne part tout seul.",
      },
      {
        icon: UserPen,
        title: "Corrigez les coordonnées du propriétaire en quelques secondes",
        text: "En haut de la fiche du patient, « Modifier les coordonnées » permet de corriger le nom, le téléphone, l'email, l'adresse ou le contact secondaire. Dans la liste des patients, le crayon à côté du propriétaire ouvre la même fenêtre sans quitter la liste. Un champ que vous videz est bien effacé, et la correction se retrouve partout.",
      },
      {
        icon: Phone,
        title: "Les numéros algériens prêts pour WhatsApp",
        text: "Un numéro enregistré en 0 (0555 12 34 56) reçoit l'indicatif +213 pour WhatsApp ; un numéro qui porte déjà son indicatif ne change pas. Le réglage est visible dans Paramètres, Mon cabinet.",
      },
      {
        icon: Pencil,
        title: "« Modifier les informations » vous amène au formulaire",
        text: "Le bouton sous les notes générales fait défiler la fiche jusqu'au formulaire et place le curseur dans le premier champ.",
      },
    ],
  },
  {
    version: "5.0.10",
    status: "published",
    date: "2026-11-16",
    highlights: [
      {
        icon: MessageSquareText,
        title: "Interrogez les données de votre cabinet",
        text: "Un nouvel onglet « Données » dans l'assistant répond sur les recettes, les rendez-vous, les tâches et les patients. Chaque chiffre est calculé sur vos propres dossiers et s'affiche avec sa source.",
      },
      {
        icon: CalendarCheck,
        title: "Des absences à relancer en un clic",
        text: "Quand l'assistant propose des tâches de suivi, vous les relisez sur une carte et rien n'est enregistré avant votre validation.",
      },
      {
        icon: FileText,
        title: "La note de consultation s'enregistre plus sûrement",
        text: "L'indicateur « Enregistré » et la sauvegarde automatique de la note SOAP suivent mieux vos modifications.",
      },
    ],
  },
  {
    version: "5.0.9",
    status: "published",
    date: "2026-11-12",
    highlights: [
      {
        icon: Banknote,
        title: "Le Journal de trésorerie fait peau neuve",
        text: "Il adopte la présentation des Factures : recherche, filtres par sens et montants plus lisibles, pour suivre entrées et sorties d'un coup d'œil.",
      },
      {
        icon: FileText,
        title: "Documents devient une page libre",
        text: "Documents, fichiers, images et liens vivent au même endroit. Chaque document part d'une page blanche et se compose par blocs, simplement.",
      },
      {
        icon: CalendarCheck,
        title: "Des alertes de vaccins fiables",
        text: "Le tableau de bord lit désormais vos rappels médicaux : seuls les vaccins réellement à venir s'affichent.",
      },
      {
        icon: MessageSquareText,
        title: "L'assistant et le calendrier soignés",
        text: "Le sélecteur de patient de l'assistant affiche le bon nom, et le calendrier parle français.",
      },
    ],
  },
  {
    version: "5.0.8",
    status: "published",
    date: "2026-11-11",
    highlights: [
      {
        icon: CalendarCheck,
        title: "L'agenda gère les imprévus",
        text: "Un client qui ne vient pas ou un rendez-vous annulé se marque en un clic depuis la liste. Et si le client arrive finalement, le rendez-vous se rouvre et la visite reprend normalement.",
      },
      {
        icon: Archive,
        title: "Archivez un dossier, sans rien perdre",
        text: "Un dossier qui ne sert plus quitte les listes et les recherches, tout en restant conservé en entier : consultations, soins et factures. Vous le retrouvez à tout moment parmi les dossiers archivés, prêt à être remis en service.",
      },
      {
        icon: PanelLeft,
        title: "Une barre latérale plus nette",
        text: "Fond plus profond et libellés en blanc franc : la navigation se lit mieux d'un coup d'œil, et le pied de la barre a été soigné.",
      },
      {
        icon: LayoutGrid,
        title: "Le tableau de bord, bien groupé",
        text: "Les choix de période et d'affichage du tableau de bord sont de nouveau présentés nettement dans leurs bandes, autour des chiffres clés.",
      },
    ],
  },
  {
    version: "5.0.7",
    status: "published",
    date: "2026-11-11",
    highlights: [
      {
        icon: Palette,
        title: "Une seule apparence, plus épurée",
        text: "Baitari adopte partout la même apparence épurée, en clair comme en sombre : chaque page se ressemble, et tout se retrouve plus vite.",
      },
      {
        icon: Type,
        title: "Des textes plus lisibles",
        text: "Les titres, les tableaux et les chiffres clés ont été retravaillés : les informations importantes se lisent d'un coup d'œil, du tableau de bord au dossier du patient.",
      },
      {
        icon: Shapes,
        title: "Des icônes partout pareilles",
        text: "La même famille d'icônes dans toutes les pages : chaque action se reconnaît immédiatement, où que vous soyez dans l'application.",
      },
    ],
  },
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
export function publishedReleaseNotes(
  notes: readonly ReleaseNote[] = RELEASE_NOTES
): ReleaseNote[] {
  return notes.filter(
    (note) => note.status === "published" && note.highlights.length > 0
  );
}

/** La note publiée d'une version, s'il y en a une. */
export function releaseNoteFor(
  version: string,
  notes: readonly ReleaseNote[] = RELEASE_NOTES
): ReleaseNote | null {
  return (
    publishedReleaseNotes(notes).find((note) => note.version === version) ??
    null
  );
}
