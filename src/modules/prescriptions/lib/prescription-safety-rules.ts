/**
 * Base de règles locale (hors ligne) du contrôle de sécurité des ordonnances.
 *
 * Pour ajouter une règle :
 * 1. décrire la molécule ou la classe dans `SAFETY_GROUPS` (mots-clés en
 *    minuscules, accents et casse indifférents, comparés en début de mot) ;
 * 2. ajouter une paire dans `INTERACTION_RULES` ou une affection dans
 *    `CONTRAINDICATION_RULES`.
 *
 * Liste volontairement courte : un garde-fou, pas un Vidal.
 */

export interface SafetyGroup {
  /** Mots-clés : DCI, noms commerciaux ou libellé de classe. */
  keywords: string[];
  /** Libellé affiché (« AINS », « corticoïde »…). */
  label: string;
}

export const SAFETY_GROUPS = {
  ains: {
    label: "AINS",
    keywords: [
      "ains",
      "anti-inflammatoire non steroidien",
      "meloxicam",
      "metacam",
      "loxicom",
      "meloxidyl",
      "carprofen",
      "rimadyl",
      "carprodyl",
      "carprieve",
      "robenacoxib",
      "onsior",
      "firocoxib",
      "previcox",
      "tepoxalin",
      "zubrin",
      "cimicoxib",
      "cimalgex",
      "mavacoxib",
      "trocoxil",
      "ketoprofen",
      "ketofen",
      "aspirine",
      "acide acetylsalicylique",
      "flunixine",
      "finadyne",
    ],
  },
  corticoide: {
    label: "corticoïde",
    keywords: [
      "corticosteroide",
      "corticoide",
      "prednisolone",
      "prednisone",
      "dermipred",
      "megasolone",
      "dexamethasone",
      "dexafort",
      "dexadreson",
      "methylprednisolone",
      "medrol",
      "hydrocortisone",
      "triamcinolone",
      "cortavance",
    ],
  },
  penicilline: {
    label: "pénicilline",
    keywords: [
      "penicilline",
      "beta-lactamine",
      "amoxicilline",
      "ampicilline",
      "cloxacilline",
      "benzylpenicilline",
      "clamoxyl",
      "suramox",
      "amoxival",
      "synulox",
      "clavaseptin",
      "kesium",
      "clavamox",
    ],
  },
  cephalosporine: {
    label: "céphalosporine",
    keywords: [
      "cephalosporine",
      "cefalexine",
      "cephalexine",
      "cefovecine",
      "cefquinome",
      "convenia",
      "rilexine",
      "therios",
    ],
  },
  sulfamide: {
    label: "sulfamide",
    keywords: [
      "sulfamide",
      "sulfadiazine",
      "sulfadimethoxine",
      "trimethoprime",
      "tribrissen",
      "borgal",
    ],
  },
  fluoroquinolone: {
    label: "fluoroquinolone",
    keywords: [
      "fluoroquinolone",
      "enrofloxacine",
      "baytril",
      "enroxil",
      "marbofloxacine",
      "marbocyl",
      "pradofloxacine",
      "veraflox",
      "ibafloxacine",
      "orbifloxacine",
    ],
  },
  aminoside: {
    label: "aminoside",
    keywords: [
      "aminoside",
      "gentamicine",
      "pangram",
      "gentavet",
      "amikacine",
      "amikin",
      "neomycine",
      "streptomycine",
    ],
  },
  ieca: {
    label: "IECA",
    keywords: [
      "ieca",
      "inhibiteur de l'enzyme de conversion",
      "enalapril",
      "enacard",
      "prilenal",
      "benazepril",
      "fortekor",
      "benefortin",
      "ramipril",
      "vasotop",
      "imidapril",
      "prilium",
    ],
  },
  diuretiqueAnse: {
    label: "diurétique de l'anse",
    keywords: [
      "diuretique de l'anse",
      "furosemide",
      "dimazon",
      "lasilix",
      "torasemide",
      "upcard",
    ],
  },
  azoleSystemique: {
    label: "antifongique azolé",
    keywords: [
      "ketoconazole",
      "nizoral",
      "itraconazole",
      "itrafungol",
      "sporanox",
      "fluconazole",
      "diflucan",
    ],
  },
  ciclosporine: {
    label: "ciclosporine",
    keywords: ["ciclosporine", "cyclosporine", "atopica"],
  },
  tramadol: {
    label: "tramadol",
    keywords: ["tramadol", "topalgic", "contramal", "tralieve"],
  },
  imao: {
    label: "IMAO",
    keywords: ["imao", "selegiline", "selgian", "amitraz", "preventic"],
  },
  ivermectine: {
    label: "ivermectine",
    keywords: ["ivermectine", "ivomec", "oramec"],
  },
  acepromazine: {
    label: "acépromazine",
    keywords: ["acepromazine", "calmivet", "vetranquil"],
  },
  metronidazole: {
    label: "métronidazole",
    keywords: ["metronidazole", "flagyl", "metrobactin"],
  },
} satisfies Record<string, SafetyGroup>;

export type SafetyGroupId = keyof typeof SAFETY_GROUPS;

export interface InteractionRule {
  /** Deux groupes ; un même groupe deux fois = association de deux molécules de la classe. */
  between: [SafetyGroupId, SafetyGroupId];
  id: string;
  reason: string;
}

export const INTERACTION_RULES: InteractionRule[] = [
  {
    id: "ains-ains",
    between: ["ains", "ains"],
    reason:
      "Deux AINS associés : risque majoré d'ulcère digestif et d'atteinte rénale, sans gain d'efficacité.",
  },
  {
    id: "ains-corticoide",
    between: ["ains", "corticoide"],
    reason:
      "AINS et corticoïde associés : risque d'ulcération et de perforation digestive. Respecter une fenêtre thérapeutique.",
  },
  {
    id: "corticoide-corticoide",
    between: ["corticoide", "corticoide"],
    reason:
      "Deux corticoïdes associés : effets cumulés (polyurie, immunodépression, ulcère).",
  },
  {
    id: "ains-ieca",
    between: ["ains", "ieca"],
    reason:
      "AINS et IECA associés : baisse de la perfusion rénale, risque d'insuffisance rénale aiguë.",
  },
  {
    id: "ains-diuretique",
    between: ["ains", "diuretiqueAnse"],
    reason:
      "AINS et diurétique de l'anse associés : risque rénal accru et effet diurétique diminué.",
  },
  {
    id: "aminoside-diuretique",
    between: ["aminoside", "diuretiqueAnse"],
    reason:
      "Aminoside et furosémide associés : néphrotoxicité et ototoxicité majorées.",
  },
  {
    id: "fluoroquinolone-ains",
    between: ["fluoroquinolone", "ains"],
    reason:
      "Fluoroquinolone et AINS associés : abaissement du seuil convulsivant.",
  },
  {
    id: "azole-ciclosporine",
    between: ["azoleSystemique", "ciclosporine"],
    reason:
      "L'antifongique azolé freine l'élimination de la ciclosporine : concentrations et toxicité augmentées, adapter la dose.",
  },
  {
    id: "tramadol-imao",
    between: ["tramadol", "imao"],
    reason:
      "Tramadol et IMAO (sélégiline, amitraz) associés : risque de syndrome sérotoninergique.",
  },
];

export interface ContraindicationRule {
  /** Champ du dossier comparé : allergies ou affections chroniques. */
  field: "allergies" | "conditions";
  group: SafetyGroupId;
  id: string;
  /** Mots-clés recherchés dans le champ du dossier. */
  keywords: string[];
  reason: string;
}

export const CONTRAINDICATION_RULES: ContraindicationRule[] = [
  {
    id: "allergie-penicilline",
    group: "penicilline",
    field: "allergies",
    keywords: ["penicilline", "amoxicilline", "ampicilline", "beta-lactamine"],
    reason: "Allergie aux pénicillines déclarée : risque de réaction allergique.",
  },
  {
    id: "allergie-penicilline-cephalosporine",
    group: "cephalosporine",
    field: "allergies",
    keywords: ["penicilline", "amoxicilline", "beta-lactamine", "cephalosporine"],
    reason:
      "Allergie aux bêta-lactamines déclarée : réaction croisée possible avec les céphalosporines.",
  },
  {
    id: "allergie-sulfamide",
    group: "sulfamide",
    field: "allergies",
    keywords: ["sulfamide", "sulfa", "trimethoprime"],
    reason: "Allergie aux sulfamides déclarée.",
  },
  {
    id: "allergie-ains",
    group: "ains",
    field: "allergies",
    keywords: ["ains", "anti-inflammatoire", "meloxicam", "carprofen", "aspirine"],
    reason: "Intolérance ou allergie aux AINS déclarée.",
  },
  {
    id: "ains-rein-foie",
    group: "ains",
    field: "conditions",
    keywords: [
      "insuffisance renale",
      "irc",
      "maladie renale",
      "nephropathie",
      "insuffisance hepatique",
      "ulcere",
      "deshydratation",
    ],
    reason:
      "Les AINS réduisent la perfusion rénale et sont mal tolérés en cas d'atteinte rénale, hépatique ou d'ulcère.",
  },
  {
    id: "corticoide-diabete-ulcere",
    group: "corticoide",
    field: "conditions",
    keywords: ["diabete", "ulcere", "cushing", "hypercorticisme", "hyperadrenocorticisme"],
    reason:
      "Les corticoïdes déséquilibrent le diabète, aggravent l'ulcère et le syndrome de Cushing.",
  },
  {
    id: "fluoroquinolone-epilepsie",
    group: "fluoroquinolone",
    field: "conditions",
    keywords: ["epilepsie", "epileptique", "convulsion"],
    reason: "Les fluoroquinolones abaissent le seuil convulsivant.",
  },
  {
    id: "tramadol-epilepsie",
    group: "tramadol",
    field: "conditions",
    keywords: ["epilepsie", "epileptique", "convulsion"],
    reason: "Le tramadol peut abaisser le seuil convulsivant.",
  },
  {
    id: "acepromazine-epilepsie",
    group: "acepromazine",
    field: "conditions",
    keywords: ["epilepsie", "epileptique", "convulsion"],
    reason: "L'acépromazine est déconseillée chez l'animal épileptique.",
  },
  {
    id: "aminoside-rein",
    group: "aminoside",
    field: "conditions",
    keywords: ["insuffisance renale", "irc", "maladie renale", "nephropathie"],
    reason: "Les aminosides sont néphrotoxiques.",
  },
  {
    id: "ivermectine-mdr1",
    group: "ivermectine",
    field: "conditions",
    keywords: ["mdr1", "abcb1"],
    reason:
      "Mutation MDR1 : l'ivermectine franchit la barrière hémato-méningée (risque neurologique grave).",
  },
  {
    id: "metronidazole-foie",
    group: "metronidazole",
    field: "conditions",
    keywords: ["insuffisance hepatique", "hepatopathie"],
    reason:
      "Le métronidazole est métabolisé par le foie : risque de toxicité neurologique.",
  },
  {
    id: "sulfamide-kcs",
    group: "sulfamide",
    field: "conditions",
    keywords: ["keratoconjonctivite seche", "kcs", "oeil sec"],
    reason: "Les sulfamides peuvent provoquer ou aggraver une kératoconjonctivite sèche.",
  },
];
