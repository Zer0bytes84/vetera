/**
 * Base de règles locale (hors ligne) du contrôle de sécurité des ordonnances.
 *
 * Pour ajouter une règle :
 * 1. décrire la molécule ou la classe dans `SAFETY_GROUPS` (mots-clés en
 *    minuscules, accents et casse indifférents, comparés en début de mot) ;
 * 2. ajouter une paire dans `INTERACTION_RULES` ou une affection dans
 *    `CONTRAINDICATION_RULES`.
 *
 * Liste volontairement courte : un garde-fou, pas un Vidal. Les règles
 * portant un champ `source` sont reprises des RCP officiels (Index des RCP
 * de l'ANMV) ; leur raison ne dit rien de plus que le RCP cité.
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
      "acide tolfenamique",
      "tolfenamique",
      "tolfedine",
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
  // Groupes ajoutés avec les règles sourcées sur les RCP (ANMV).
  tolfenamique: {
    label: "acide tolfénamique",
    keywords: ["acide tolfenamique", "tolfenamique", "tolfedine"],
  },
  ketoprofene: {
    label: "kétoprofène",
    keywords: ["ketoprofene", "ketofen", "ketodolor"],
  },
  butorphanol: {
    label: "butorphanol",
    keywords: ["butorphanol", "alvegesic", "butador", "torbugesic", "dolorex", "butorgesic"],
  },
  opioideAgonistePur: {
    label: "opioïde agoniste µ pur",
    keywords: ["morphine", "methadone", "comfortan", "fentanyl", "oxymorphone", "pethidine"],
  },
  opiace: {
    label: "opiacé",
    keywords: [
      "butorphanol",
      "alvegesic",
      "butador",
      "torbugesic",
      "dolorex",
      "buprenorphine",
      "vetergesic",
      "bupaq",
      "morphine",
      "methadone",
      "fentanyl",
      "oxymorphone",
    ],
  },
  alpha2Agoniste: {
    label: "agoniste alpha-2",
    keywords: [
      "medetomidine",
      "domitor",
      "dexmedetomidine",
      "dexdomitor",
      "sileo",
      "xylazine",
      "rompun",
      "detomidine",
      "romifidine",
    ],
  },
  atipamezole: {
    label: "atipamézole",
    keywords: ["atipamezole", "antisedan", "alzane", "antidorm", "atipam"],
  },
  benzodiazepine: {
    label: "benzodiazépine",
    keywords: ["benzodiazepine", "diazepam", "valium", "midazolam"],
  },
  xylazine: {
    label: "xylazine",
    keywords: ["xylazine", "rompun", "sedachem", "belazin"],
  },
  ara2: {
    label: "antagoniste de l'angiotensine II",
    keywords: ["telmisartan", "semintra", "telmitraxx", "antagoniste des recepteurs de l'angiotensine"],
  },
  diuretiqueEpargneK: {
    label: "diurétique d'épargne potassique",
    keywords: ["spironolactone", "prilactone", "epargneur potassium", "epargne potassique"],
  },
  antithyroidien: {
    label: "antithyroïdien",
    keywords: ["carbimazole", "vidalta", "felinta", "thiamazole", "methimazole", "felimazole", "apelka"],
  },
  phenobarbital: {
    label: "phénobarbital",
    keywords: ["phenobarbital", "gardenal", "phenoleptil", "soliphen", "barbiturique"],
  },
  benzimidazole: {
    label: "benzimidazole",
    keywords: ["benzimidazole", "fenbendazole", "panacur", "mebendazole", "oxfendazole", "dolthene", "flubendazole"],
  },
  bromure: {
    label: "bromure de potassium",
    keywords: ["bromure de potassium", "libromide", "solibrom"],
  },
  sympathomimetique: {
    label: "sympathomimétique",
    keywords: ["phenylpropanolamine", "propalin", "proin", "uriphex", "ephedrine", "caniphedrin"],
  },
  anticholinergique: {
    label: "anticholinergique",
    keywords: ["anticholinergique", "atropine", "butylscopolamine", "scopolamine", "scopalgine", "glycopyrrolate"],
  },
  tricyclique: {
    label: "antidépresseur tricyclique",
    keywords: ["tricyclique", "clomipramine", "clomicalm", "amitriptyline"],
  },
  metamizole: {
    label: "métamizole",
    keywords: ["metamizole", "calmagine", "dipyralgine", "mevalgine", "dipyrone"],
  },
  diuretique: {
    label: "diurétique",
    keywords: ["diuretique", "furosemide", "dimazon", "torasemide", "upcard", "spironolactone", "prilactone", "hydrochlorothiazide"],
  },
  neuroleptique: {
    label: "neuroleptique",
    keywords: ["neuroleptique", "acepromazine", "calmivet", "vetranquil", "chlorpromazine"],
  },
  phenylbutazone: {
    label: "phénylbutazone",
    keywords: ["phenylbutazone", "equipalazone", "phenylarthrite"],
  },
  cimetidine: {
    label: "cimétidine",
    keywords: ["cimetidine", "zitac"],
  },
  faibleIndiceCyp: {
    label: "médicament à marge thérapeutique étroite",
    keywords: [
      "beta-bloquant",
      "atenolol",
      "propranolol",
      "inhibiteur calcique",
      "amlodipine",
      "diltiazem",
      "diazepam",
      "midazolam",
      "phenobarbital",
      "phenytoine",
      "theophylline",
      "aminophylline",
      "warfarine",
      "lidocaine",
    ],
  },
  loperamide: {
    label: "lopéramide",
    keywords: ["loperamide", "loperal", "diarstop"],
  },
  inhibiteurCalcique: {
    label: "inhibiteur calcique",
    keywords: ["inhibiteur calcique", "amlodipine", "amodip", "diltiazem", "verapamil"],
  },
  vitamineK: {
    label: "vitamine K1",
    keywords: ["phytomenadione", "vitamine k1", "vitamivet k1", "keyvit"],
  },
  salicyle: {
    label: "salicylé",
    keywords: ["salicylate", "aspirine", "acide acetylsalicylique"],
  },
  propentofylline: {
    label: "propentofylline",
    keywords: ["propentofylline", "karsivan", "vitofyllin", "canergy"],
  },
  xanthique: {
    label: "dérivé xanthique",
    keywords: ["xanthique", "theophylline", "aminophylline", "propentofylline", "karsivan"],
  },
  telmisartan: {
    label: "telmisartan",
    keywords: ["telmisartan", "semintra", "telmitraxx"],
  },
  imidapril: {
    label: "imidapril",
    keywords: ["imidapril", "prilium"],
  },
  cabergoline: {
    label: "cabergoline",
    keywords: ["cabergoline", "galastop", "finilac", "kelactin", "kabergovet"],
  },
  antimonie: {
    label: "antimonié",
    keywords: ["antimoniate de meglumine", "glucantime", "antishmania"],
  },
} satisfies Record<string, SafetyGroup>;

export type SafetyGroupId = keyof typeof SAFETY_GROUPS;

/** Référence officielle d'une règle (RCP), pour la vérifier. */
export interface RuleSource {
  label: string;
  url: string;
}

function rcp(label: string, url: string): RuleSource {
  return { label: `RCP ${label} (ANMV)`, url };
}

export interface InteractionRule {
  /** Deux groupes ; un même groupe deux fois = association de deux molécules de la classe. */
  between: [SafetyGroupId, SafetyGroupId];
  id: string;
  reason: string;
  source?: RuleSource;
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
  // Règles sourcées sur les RCP officiels (ANMV), rubrique 3.8.
  {
    id: "ketoprofene-diuretique",
    between: ["ketoprofene", "diuretique"],
    reason:
      "Kétoprofène : contre-indiqué en association avec des diurétiques.",
    source: rcp("Ketofen 10 %", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=KETOFEN+10+%25"),
  },
  {
    id: "butorphanol-agoniste-mu",
    between: ["butorphanol", "opioideAgonistePur"],
    reason:
      "Le butorphanol, antagoniste µ, peut supprimer l'effet analgésique des agonistes µ purs (morphine…) ou imposer des doses plus élevées.",
    source: rcp("Alvegesic vet. 10 mg/mL", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=ALVEGESIC+VET.+10+MG%2FML%2C+SOLUTION+INJECTABLE+POUR+CHEVAUX%2C+CHIENS+ET+CHATS"),
  },
  {
    id: "butorphanol-alpha2",
    between: ["butorphanol", "alpha2Agoniste"],
    reason:
      "Butorphanol et agoniste alpha-2 : effets synergiques, réduire la posologie de chacun.",
    source: rcp("Alvegesic vet. 10 mg/mL", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=ALVEGESIC+VET.+10+MG%2FML%2C+SOLUTION+INJECTABLE+POUR+CHEVAUX%2C+CHIENS+ET+CHATS"),
  },
  {
    id: "butorphanol-benzodiazepine",
    between: ["butorphanol", "benzodiazepine"],
    reason:
      "Butorphanol et autre dépresseur du système nerveux central : effets potentialisés, utiliser avec prudence.",
    source: rcp("Alvegesic vet. 10 mg/mL", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=ALVEGESIC+VET.+10+MG%2FML%2C+SOLUTION+INJECTABLE+POUR+CHEVAUX%2C+CHIENS+ET+CHATS"),
  },
  {
    id: "atipamezole-benzodiazepine",
    between: ["atipamezole", "benzodiazepine"],
    reason:
      "Atipamézole : administration simultanée avec le diazépam (médicaments actifs sur le système nerveux central) non recommandée.",
    source: rcp("Antisedan", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=ANTISEDAN+SOLUTION+INJECTABLE+POUR+CHIENS+ET+CHATS"),
  },
  {
    id: "atipamezole-acepromazine",
    between: ["atipamezole", "acepromazine"],
    reason:
      "Atipamézole : administration simultanée avec l'acépromazine non recommandée.",
    source: rcp("Antisedan", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=ANTISEDAN+SOLUTION+INJECTABLE+POUR+CHIENS+ET+CHATS"),
  },
  {
    id: "atipamezole-opiace",
    between: ["atipamezole", "opiace"],
    reason:
      "Atipamézole : administration simultanée avec les opiacés non recommandée.",
    source: rcp("Antisedan", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=ANTISEDAN+SOLUTION+INJECTABLE+POUR+CHIENS+ET+CHATS"),
  },
  {
    id: "ieca-epargne-k",
    between: ["ieca", "diuretiqueEpargneK"],
    reason:
      "IECA et diurétique d'épargne potassique : surveiller la kaliémie (risque d'hyperkaliémie).",
    source: rcp("Vasotop P 2,5 mg", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=VASOTOP+P+2%2C5+MG+COMPRIMES+POUR+CHIENS"),
  },
  {
    id: "ara2-ieca",
    between: ["ara2", "ieca"],
    reason:
      "Telmisartan et autre agent du système rénine-angiotensine-aldostérone (IECA) : l'association peut modifier la fonction rénale chez le chat insuffisant rénal.",
    source: rcp("Telmitraxx 4 mg/mL", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=TELMITRAXX+4+MG%2FML+SOLUTION+BUVABLE+POUR+CHATS"),
  },
  {
    id: "antithyroidien-phenobarbital",
    between: ["antithyroidien", "phenobarbital"],
    reason:
      "Le phénobarbital peut réduire l'efficacité clinique du carbimazole.",
    source: rcp("Vidalta 10 mg", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=VIDALTA+10+MG+COMPRIMES+A+LIBERATION+PROLONGEE+POUR+CHATS"),
  },
  {
    id: "antithyroidien-benzimidazole",
    between: ["antithyroidien", "benzimidazole"],
    reason:
      "Carbimazole et benzimidazole (fenbendazole, mébendazole) : association non recommandée (oxydation hépatique réduite, taux circulants augmentés).",
    source: rcp("Vidalta 10 mg", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=VIDALTA+10+MG+COMPRIMES+A+LIBERATION+PROLONGEE+POUR+CHATS"),
  },
  {
    id: "bromure-diuretique-anse",
    between: ["bromure", "diuretiqueAnse"],
    reason:
      "Les diurétiques de l'anse (furosémide) augmentent l'excrétion du bromure : bromurémie diminuée, risque de crises.",
    source: rcp("Libromide 325 mg", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=LIBROMIDE+325+MG+COMPRIMES+POUR+CHIENS"),
  },
  {
    id: "sympathomimetique-imao",
    between: ["sympathomimetique", "imao"],
    reason:
      "Phénylpropanolamine : ne pas utiliser chez l'animal traité par un IMAO non sélectif ; prudence avec un IMAO de type B (sélégiline).",
    source: rcp("Propalin 40,28 mg/mL", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=PROPALIN+40%2C28+MG%2FML%2C+SIROP+POUR+CHIENS"),
  },
  {
    id: "sympathomimetique-anticholinergique",
    between: ["sympathomimetique", "anticholinergique"],
    reason:
      "Phénylpropanolamine et anticholinergique : association à manier avec précaution.",
    source: rcp("Propalin 40,28 mg/mL", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=PROPALIN+40%2C28+MG%2FML%2C+SIROP+POUR+CHIENS"),
  },
  {
    id: "sympathomimetique-tricyclique",
    between: ["sympathomimetique", "tricyclique"],
    reason:
      "Phénylpropanolamine et antidépresseur tricyclique : association à manier avec précaution.",
    source: rcp("Propalin 40,28 mg/mL", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=PROPALIN+40%2C28+MG%2FML%2C+SIROP+POUR+CHIENS"),
  },
  {
    id: "sympathomimetique-sympathomimetique",
    between: ["sympathomimetique", "sympathomimetique"],
    reason:
      "Phénylpropanolamine et autre sympathomimétique : association à manier avec précaution.",
    source: rcp("Propalin 40,28 mg/mL", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=PROPALIN+40%2C28+MG%2FML%2C+SIROP+POUR+CHIENS"),
  },
  {
    id: "metamizole-corticoide",
    between: ["metamizole", "corticoide"],
    reason:
      "Métamizole : ne pas utiliser en association avec des glucocorticoïdes.",
    source: rcp("Calmagine", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=CALMAGINE+SOLUTION+INJECTABLE"),
  },
  {
    id: "metamizole-diuretique",
    between: ["metamizole", "diuretique"],
    reason:
      "Métamizole : ne pas utiliser en association avec des diurétiques.",
    source: rcp("Calmagine", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=CALMAGINE+SOLUTION+INJECTABLE"),
  },
  {
    id: "metamizole-phenobarbital",
    between: ["metamizole", "phenobarbital"],
    reason:
      "Métamizole : ne pas utiliser en association avec des barbituriques.",
    source: rcp("Calmagine", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=CALMAGINE+SOLUTION+INJECTABLE"),
  },
  {
    id: "metamizole-neuroleptique",
    between: ["metamizole", "neuroleptique"],
    reason:
      "Métamizole : ne pas utiliser en association avec des neuroleptiques (acépromazine, chlorpromazine).",
    source: rcp("Calmagine", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=CALMAGINE+SOLUTION+INJECTABLE"),
  },
  {
    id: "metamizole-phenylbutazone",
    between: ["metamizole", "phenylbutazone"],
    reason:
      "Métamizole : ne pas utiliser en association avec la phénylbutazone.",
    source: rcp("Calmagine", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=CALMAGINE+SOLUTION+INJECTABLE"),
  },
  {
    id: "cimetidine-marge-etroite",
    between: ["cimetidine", "faibleIndiceCyp"],
    reason:
      "La cimétidine inhibe le cytochrome P-450 : élimination ralentie de ce médicament à marge thérapeutique étroite, sa dose peut devoir être réduite.",
    source: rcp("Zitac 100 mg", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=ZITAC+100+MG+COMPRIMES+POUR+CHIENS"),
  },
  {
    id: "loperamide-inhibiteur-calcique",
    between: ["loperamide", "inhibiteurCalcique"],
    reason:
      "Lopéramide : utilisation concomitante d'inhibiteurs calciques contre-indiquée.",
    source: rcp("Loperal 0,93 mg", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=LOPERAL+0%2C93+MG+COMPRIMES+PELLICULES+POUR+CHIENS"),
  },
  {
    id: "vitamine-k-salicyle",
    between: ["vitamineK", "salicyle"],
    reason:
      "Les salicylés réduisent l'effet de la vitamine K1 en inhibant son recyclage.",
    source: rcp("Vitamivet K1", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=VITAMIVET+K1+10+MG%2FML+SOLUTION+INJECTABLE+POUR+CHIENS"),
  },
  {
    id: "propentofylline-xanthique",
    between: ["propentofylline", "xanthique"],
    reason:
      "Propentofylline : ne pas associer d'autres dérivés xanthiques (théophylline, aminophylline).",
    source: rcp("Karsivan 100", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=KARSIVAN+100+COMPRIMES+PELLICULES+POUR+CHIENS"),
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
  source?: RuleSource;
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
  // Règles sourcées sur les RCP officiels (ANMV), rubrique 3.3.
  {
    id: "tolfenamique-coeur-foie",
    group: "tolfenamique",
    field: "conditions",
    keywords: ["insuffisance cardiaque", "cardiopathie", "saignement digestif", "hemorragie digestive", "dyscrasie"],
    reason:
      "Acide tolfénamique contre-indiqué en cas d'insuffisance cardiaque, de saignement digestif ou de dyscrasie sanguine.",
    source: rcp("Tolfedine 40 mg/mL", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=TOLFEDINE+40+MG%2FML+SOLUTION+INJECTABLE+POUR+CHIENS+ET+CHATS"),
  },
  {
    id: "butorphanol-organes",
    group: "butorphanol",
    field: "conditions",
    keywords: ["insuffisance hepatique", "hepatopathie", "insuffisance renale", "lesion cerebrale", "traumatisme cranien", "maladie respiratoire obstructive", "obstruction respiratoire", "insuffisance cardiaque", "cardiopathie"],
    reason:
      "Butorphanol contre-indiqué en cas de dysfonctionnement hépatique ou rénal sévère, de lésion cérébrale, de maladie respiratoire obstructive ou de dysfonctionnement cardiaque.",
    source: rcp("Alvegesic vet. 10 mg/mL", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=ALVEGESIC+VET.+10+MG%2FML%2C+SOLUTION+INJECTABLE+POUR+CHEVAUX%2C+CHIENS+ET+CHATS"),
  },
  {
    id: "atipamezole-organes",
    group: "atipamezole",
    field: "conditions",
    keywords: ["insuffisance hepatique", "hepatopathie", "insuffisance renale", "maladie renale", "insuffisance cardiaque", "cardiopathie", "reproducteur", "gestation", "gestante"],
    reason:
      "Atipamézole : ne pas utiliser chez les reproducteurs ni en cas de maladie hépatique, rénale ou cardiaque.",
    source: rcp("Antisedan", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=ANTISEDAN+SOLUTION+INJECTABLE+POUR+CHIENS+ET+CHATS"),
  },
  {
    id: "xylazine-organes",
    group: "xylazine",
    field: "conditions",
    keywords: ["insuffisance renale", "insuffisance hepatique", "insuffisance cardiaque", "obstruction oesophagienne", "torsion gastrique", "dilatation torsion", "hernie"],
    reason:
      "Xylazine contre-indiquée en cas d'insuffisance rénale, hépatique ou cardiaque sévère, d'obstruction œsophagienne, de torsion gastrique ou de hernie (chien, chat).",
    source: rcp("Rompun 2 %", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=ROMPUN+2+%25"),
  },
  {
    id: "telmisartan-gestation",
    group: "telmisartan",
    field: "conditions",
    keywords: ["gestation", "gestante", "lactation", "allaitante"],
    reason:
      "Telmisartan : ne pas utiliser pendant la gestation ou la lactation.",
    source: rcp("Telmitraxx 4 mg/mL", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=TELMITRAXX+4+MG%2FML+SOLUTION+BUVABLE+POUR+CHATS"),
  },
  {
    id: "imidapril-hemodynamique",
    group: "imidapril",
    field: "conditions",
    keywords: ["hypotension", "insuffisance renale aigue", "cardiopathie congenitale", "stenose aortique", "stenose mitrale", "stenose pulmonaire", "cardiomyopathie hypertrophique"],
    reason:
      "Imidapril contre-indiqué en cas d'hypotension, d'insuffisance rénale aiguë, de cardiopathie congénitale, de sténose valvulaire ou de cardiomyopathie hypertrophique obstructive.",
    source: rcp("Prilium", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=PRILIUM+POUDRE+POUR+SOLUTION+BUVABLE+POUR+PETITS+CHIENS"),
  },
  {
    id: "antithyroidien-terrain",
    group: "antithyroidien",
    field: "conditions",
    keywords: ["diabete", "hepatite", "anemie", "neutropenie", "lymphopenie", "thrombocytopenie", "coagulopathie", "maladie auto-immune", "auto-immun"],
    reason:
      "Carbimazole contre-indiqué en cas de diabète sucré, d'hépatite primaire grave, de maladie auto-immune, d'anémie, de neutropénie, de lymphopénie, de thrombocytopénie ou de coagulopathie.",
    source: rcp("Vidalta 10 mg", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=VIDALTA+10+MG+COMPRIMES+A+LIBERATION+PROLONGEE+POUR+CHATS"),
  },
  {
    id: "antithyroidien-allergie",
    group: "antithyroidien",
    field: "allergies",
    keywords: ["carbimazole", "thiamazole", "methimazole", "mercapto-imidazole"],
    reason:
      "Hypersensibilité aux mercapto-imidazoles (carbimazole, thiamazole) déclarée.",
    source: rcp("Vidalta 10 mg", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=VIDALTA+10+MG+COMPRIMES+A+LIBERATION+PROLONGEE+POUR+CHATS"),
  },
  {
    id: "bromure-rein",
    group: "bromure",
    field: "conditions",
    keywords: ["insuffisance renale", "irc", "maladie renale"],
    reason:
      "Bromure de potassium contre-indiqué en cas d'insuffisance rénale sévère.",
    source: rcp("Libromide 325 mg", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=LIBROMIDE+325+MG+COMPRIMES+POUR+CHIENS"),
  },
  {
    id: "cabergoline-gestation",
    group: "cabergoline",
    field: "conditions",
    keywords: ["gestation", "gestante"],
    reason:
      "Cabergoline contre-indiquée chez la femelle gestante (risque d'avortement).",
    source: rcp("Galastop", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=GALASTOP"),
  },
  {
    id: "metamizole-terrain",
    group: "metamizole",
    field: "conditions",
    keywords: ["ulcere", "insuffisance renale", "irc", "maladie renale", "asthme", "lesion hematopoietique", "aplasie medullaire", "gastro-enterite chronique", "enteropathie chronique"],
    reason:
      "Métamizole contre-indiqué en cas d'ulcération ou de trouble gastro-intestinal chronique, d'insuffisance rénale, d'asthme ou de lésion hématopoïétique.",
    source: rcp("Calmagine", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=CALMAGINE+SOLUTION+INJECTABLE"),
  },
  {
    id: "antimonie-organes",
    group: "antimonie",
    field: "conditions",
    keywords: ["insuffisance hepatique", "hepatopathie", "insuffisance renale", "irc", "maladie renale", "insuffisance cardiaque", "cardiopathie"],
    reason:
      "Antimoniate de méglumine contre-indiqué en cas d'insuffisance hépatique, rénale ou cardiaque.",
    source: rcp("Glucantime", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=GLUCANTIME+SOLUTION+INJECTABLE"),
  },
  {
    id: "propentofylline-cardiopathie",
    group: "propentofylline",
    field: "conditions",
    keywords: ["cardiopathie", "insuffisance cardiaque"],
    reason:
      "Propentofylline : ne pas administrer en cas de cardiopathie à un stade avancé.",
    source: rcp("Karsivan 100", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=KARSIVAN+100+COMPRIMES+PELLICULES+POUR+CHIENS"),
  },
  {
    id: "loperamide-mdr1",
    group: "loperamide",
    field: "conditions",
    keywords: ["mdr1", "abcb1", "colley"],
    reason:
      "Lopéramide : ne pas utiliser chez les Colleys et apparentés (mutation MDR1, toxicité neurologique).",
    source: rcp("Loperal 0,93 mg", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=LOPERAL+0%2C93+MG+COMPRIMES+PELLICULES+POUR+CHIENS"),
  },
  {
    id: "loperamide-occlusion",
    group: "loperamide",
    field: "conditions",
    keywords: ["occlusion", "obstruction intestinale", "enterite hemorragique", "gastro-enterite hemorragique"],
    reason:
      "Lopéramide contre-indiqué en cas d'occlusion intestinale (ou de suspicion) et d'entérite hémorragique.",
    source: rcp("Loperal 0,93 mg", "https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=LOPERAL+0%2C93+MG+COMPRIMES+PELLICULES+POUR+CHIENS"),
  },
];
