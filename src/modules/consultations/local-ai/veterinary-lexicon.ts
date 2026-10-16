/**
 * Veterinary medical terminology, morphological normalizer, brand/INN (DCI) mapping,
 * and clinical acronym expansion for local semantic search.
 *
 * 100% offline, local-only dictionary calibrated for French veterinary practice.
 */

export function normalizeLexical(text: string): string {
  return text
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/(\d)(mg|mcg|µg|ug|ml|kg|g|ui)\b/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * French veterinary morphological stemmer.
 * Reduces morphological variations (gender, plural, verbal inflections, medical derivations)
 * while preserving distinct clinical roots.
 */
export function stemFrenchWord(raw: string): string {
  const word = normalizeLexical(raw);
  if (word.length <= 3) return word;

  // Dedicated veterinary / clinical root normalizations
  if (word.startsWith("bacteri")) return "bacteri";
  if (word.startsWith("vaccin")) return "vaccin";
  if (word.startsWith("antibiot")) return "antibiot";
  if (word.startsWith("infect")) return "infect";
  if (word.startsWith("vom")) return "vom";
  if (word.startsWith("diarrhe")) return "diarrhe";
  if (word.startsWith("respir")) return "respir";
  if (word.startsWith("inflamm")) return "inflamm";
  if (word.startsWith("allerg")) return "allerg";
  if (word.startsWith("dermat")) return "dermat";
  if (word.startsWith("arthr")) return "arthr";
  if (word.startsWith("digest")) return "digest";
  if (word.startsWith("claudic") || word.startsWith("boit")) return "boit";
  if (word.startsWith("letharg") || word.startsWith("abatt")) return "abatt";
  if (word.startsWith("anorex") || word.startsWith("inappet")) return "inappet";
  if (word.startsWith("fievre") || word.startsWith("febril") || word.startsWith("hypertherm")) return "fievre";
  if (word.startsWith("prurit") || word.startsWith("demange") || word.startsWith("gratt")) return "prurit";
  if (word.startsWith("touss") || word === "toux") return "toux";
  if (word.startsWith("dyspne") || word.startsWith("polypne")) return "dyspne";

  // Standard French medical and grammatical suffix stripping (longest match first)
  const stripped = word
    .replace(
      /(?:ations?|itions?|ements?|ances?|ences?|iennes?|iens?|iques?|aires?|ales?|aux|euses?|eux|ables?|ibles?|istes?|ismes?|ites?|oses?|ies?)$/u,
      ""
    )
    .replace(
      /(?:assions|assent|erions|eraient|eront|erait|eras|erez|aient|antes?|ants?|ait|ais|ees?|es?|er|ez|e|s)$/u,
      ""
    );

  return stripped.length >= 3 ? stripped : word;
}

/**
 * Veterinary Brand <-> DCI (INN) bi-directional equivalences.
 * Mandatory pairs:
 * - Metacam <-> méloxicam
 * - Synulox / Clavaseptin <-> amoxicilline-acide clavulanique
 * - Convenia <-> céfovécine
 * - Cerenia <-> maropitant
 */
const BRAND_TO_DCI_RAW: Record<string, string[]> = {
  metacam: ["meloxicam"],
  loxicom: ["meloxicam"],
  meloxidyl: ["meloxicam"],
  synulox: ["amoxicilline acide clavulanique", "amoxicilline", "acide clavulanique"],
  clavaseptin: ["amoxicilline acide clavulanique", "amoxicilline", "acide clavulanique"],
  kesium: ["amoxicilline acide clavulanique", "amoxicilline", "acide clavulanique"],
  augmentin: ["amoxicilline acide clavulanique", "amoxicilline", "acide clavulanique"],
  convenia: ["cefovecine"],
  cerenia: ["maropitant"],
  clamoxyl: ["amoxicilline"],
  suramox: ["amoxicilline"],
  amoxival: ["amoxicilline"],
  rilexine: ["cefalexine"],
  therios: ["cefalexine"],
  kefavet: ["cefalexine"],
  baytril: ["enrofloxacine"],
  xeden: ["enrofloxacine"],
  marbocyl: ["marbofloxacine"],
  onsior: ["robenacoxib"],
  previcox: ["firocoxib"],
  trocoxil: ["mavacoxib"],
  dermipred: ["prednisolone"],
  prednidale: ["prednisolone"],
  megasolone: ["prednisolone"],
  atopica: ["ciclosporine"],
  cyclavance: ["ciclosporine"],
  sporimune: ["ciclosporine"],
  apoquel: ["oclacitinib"],
  cytopoint: ["lokivetmab"],
  vetmedin: ["pimobendane"],
  cardisure: ["pimobendane"],
  fortekor: ["benazepril"],
  nelio: ["benazepril"],
  semintra: ["telmisartan"],
  prilactone: ["spironolactone"],
  cardalis: ["benazepril", "spironolactone", "benazepril spironolactone"],
  thyronorm: ["thiamazole"],
  felimazole: ["thiamazole"],
  apelka: ["thiamazole"],
  vidalta: ["carbimazole"],
  bravecto: ["fluralaner"],
  nexgard: ["afoxolaner"],
  simparica: ["sarolaner"],
  credelio: ["lotilaner"],
  milbemax: ["milbemycine oxime", "praziquantel"],
  milbactor: ["milbemycine oxime", "praziquantel"],
  milpro: ["milbemycine oxime", "praziquantel"],
  drontal: ["pyrantel", "praziquantel"],
  panacur: ["fenbendazole"],
  librela: ["bedinvetmab"],
  solensia: ["frunevetmab"],
};

/**
 * Veterinary clinical acronyms and abbreviations.
 * Mandatory:
 * - IRC <-> insuffisance rénale chronique
 */
const ACRONYMS_RAW: Record<string, string[]> = {
  irc: ["insuffisance renale chronique", "maladie renale chronique", "mrc"],
  mrc: ["insuffisance renale chronique", "maladie renale chronique", "irc"],
  ira: ["insuffisance renale aigue"],
  icc: ["insuffisance cardiaque congestive"],
  mvd: ["maladie valvulaire degenerative", "maladie mitrale", "mmvd"],
  mmvd: ["maladie valvulaire degenerative", "maladie mitrale", "mvd"],
  cmd: ["cardiomyopathie dilatee"],
  cmh: ["cardiomyopathie hypertrophique", "hcm"],
  hcm: ["cardiomyopathie hypertrophique", "cmh"],
  pif: ["peritonite infectieuse feline"],
  fiv: ["virus de l immunodeficience feline", "sida du chat"],
  felv: ["virus leucemogene felin", "leucose feline"],
  dapp: ["dermatite par allergie aux piqures de puces", "allergie aux puces"],
  ains: ["anti inflammatoire non steroidien", "anti inflammatoires non steroidiens"],
  ais: ["anti inflammatoire steroidien", "corticoide", "corticoides"],
  atb: ["antibiotique", "antibiotiques", "antibiotherapie"],
  sba: ["syndrome brachycephale", "sbaf"],
  sbaf: ["syndrome brachycephale", "sba"],
  pupd: ["polyuro polydipsie", "polyurie polydipsie"],
  ce: ["corps etranger", "corps etranger digestif"],
  ced: ["corps etranger digestif", "corps etranger"],
  tgi: ["troubles gastro intestinaux", "tractus gastro intestinal"],
  cug: ["calcul urinaire", "calculs urinaires", "cystite"],
  flutd: ["syndrome du bas appareil urinaire felin", "sbau"],
  sbau: ["syndrome du bas appareil urinaire felin", "flutd"],
  ecg: ["electrocardiogramme"],
  echo: ["echographie"],
  rx: ["radiographie"],
  rad: ["radiographie"],
  nfs: ["numeration formule sanguine", "hemogramme"],
  bu: ["bandelette urinaire"],
  rpcu: ["rapport proteines sur creatinine urinaires"],
  sdma: ["dimethylarginine symetrique"],
  sid: ["une fois par jour", "1 fois par jour"],
  bid: ["deux fois par jour", "2 fois par jour"],
  tid: ["trois fois par jour", "3 fois par jour"],
  qid: ["quatre fois par jour", "4 fois par jour"],
  po: ["per os", "voie orale"],
  sc: ["sous cutane", "voie sous cutanee"],
  im: ["intramusculaire", "voie intramusculaire"],
  iv: ["intraveineux", "voie intraveineuse"],
  fc: ["frequence cardiaque"],
  fr: ["frequence respiratoire"],
  trc: ["temps de remplissage capillaire"],
};

/**
 * Clinical synonyms & core diagnostic reformulations.
 */
const CLINICAL_SYNONYMS_RAW: Record<string, string[]> = {
  vaccin: ["vaccination", "immunisation", "primo vaccination", "rappel de vaccin"],
  vaccination: ["vaccin", "immunisation", "primo vaccination", "rappel de vaccin"],
  bacterie: ["bacterien", "bacterienne", "germes", "microbes", "infection bacterienne"],
  bacterien: ["bacterie", "bacterienne", "germes", "microbes", "infection bacterienne"],
  bacterienne: ["bacterie", "bacterien", "germes", "microbes", "infection bacterienne"],
  microbe: ["bacterie", "germes", "microbes"],
  microbes: ["bacterie", "germes", "microbes"],
  virus: ["viral", "virale", "infection virale"],
  viral: ["virus", "virale", "infection virale"],
  virale: ["virus", "viral", "infection virale"],
  antibiotique: ["antibiotiques", "antibiotherapie", "anti infectieux"],
  antibiotiques: ["antibiotique", "antibiotherapie", "anti infectieux"],
  antibiotherapie: ["antibiotique", "antibiotiques"],
  vomissement: ["vomissements", "vomir", "regurgitation", "nausee"],
  vomissements: ["vomissement", "vomir", "regurgitation", "nausee"],
  vomir: ["vomissement", "vomissements", "nausee"],
  diarrhee: ["diarrhees", "selles molles", "selles liquides", "troubles digestifs"],
  diarrhees: ["diarrhee", "selles molles", "selles liquides"],
  abattement: ["lethargie", "prostration", "apathie", "fatigue", "mou"],
  lethargie: ["abattement", "prostration", "apathie", "fatigue"],
  anorexie: ["inappetence", "dysorexie", "perte d appetit", "ne mange plus"],
  inappetence: ["anorexie", "perte d appetit", "ne mange plus"],
  fievre: ["hyperthermie", "temperature elevee", "febrile"],
  hyperthermie: ["fievre", "temperature elevee", "febrile"],
  febrile: ["fievre", "hyperthermie"],
  prurit: ["demangeaisons", "se gratte", "grattage"],
  demangeaisons: ["prurit", "se gratte", "grattage"],
  boiterie: ["claudication", "appui fuyant", "boite"],
  toux: ["quinte de toux", "tousse"],
  dyspnee: ["detresse respiratoire", "respiration difficile", "polypnee", "essoufflement"],
  ictere: ["jaunisse", "muqueuses jaunes"],
  hematurie: ["sang dans les urines"],
  dysurie: ["difficulte a uriner", "strangurie"],
  alopecie: ["perte de poils", "depilation", "pelade"],
  erytheme: ["rougeur", "peau rouge"],
  analgesie: ["antidouleur", "analgesique", "douleur"],
};

// Build inverted mappings so DCI -> Brands and Expansions -> Acronyms work identically
const DCI_TO_BRANDS: Record<string, string[]> = {};
for (const [brand, dcis] of Object.entries(BRAND_TO_DCI_RAW)) {
  for (const dci of dcis) {
    const key = normalizeLexical(dci);
    if (!DCI_TO_BRANDS[key]) DCI_TO_BRANDS[key] = [];
    if (!DCI_TO_BRANDS[key].includes(brand)) DCI_TO_BRANDS[key].push(brand);
  }
}

const EXPANSION_TO_ACRONYMS: Record<string, string[]> = {};
for (const [acronym, expansions] of Object.entries(ACRONYMS_RAW)) {
  for (const exp of expansions) {
    const key = normalizeLexical(exp);
    if (!EXPANSION_TO_ACRONYMS[key]) EXPANSION_TO_ACRONYMS[key] = [];
    if (!EXPANSION_TO_ACRONYMS[key].includes(acronym)) EXPANSION_TO_ACRONYMS[key].push(acronym);
  }
}

export interface QueryExpansion {
  /** Individual tokens with stop-words removed */
  terms: string[];
  /** Stems of individual tokens */
  stems: string[];
  /** Equivalent phrases (DCI, brand, acronym, synonym expressions) */
  phrases: string[];
}

const STOP_WORDS = new Set([
  "le", "la", "les", "de", "du", "des", "un", "une", "et", "en", "au", "aux",
  "ce", "ces", "cet", "cette", "par", "pour", "sur", "dans", "est", "sont",
  "a", "qui", "que", "avec", "sans"
]);

/**
 * Expand a query into normalized tokens, stems, and equivalence phrases (Brand/DCI, Acronym, Synonyms).
 */
export function expandSearchQuery(query: string): QueryExpansion {
  const normalized = normalizeLexical(query);
  const words = normalized.split(/\s+/).filter(Boolean);
  const terms = words.filter((w) => !STOP_WORDS.has(w) && w.length >= 2);
  const stems = terms.map(stemFrenchWord);
  const phrases = new Set<string>();

  // Check whole query as a phrase or acronym/DCI key
  if (normalized.length >= 2) {
    if (ACRONYMS_RAW[normalized]) {
      for (const exp of ACRONYMS_RAW[normalized]) phrases.add(normalizeLexical(exp));
    }
    if (EXPANSION_TO_ACRONYMS[normalized]) {
      for (const acr of EXPANSION_TO_ACRONYMS[normalized]) phrases.add(acr);
    }
    if (BRAND_TO_DCI_RAW[normalized]) {
      for (const dci of BRAND_TO_DCI_RAW[normalized]) phrases.add(normalizeLexical(dci));
    }
    if (DCI_TO_BRANDS[normalized]) {
      for (const br of DCI_TO_BRANDS[normalized]) phrases.add(br);
    }
    if (CLINICAL_SYNONYMS_RAW[normalized]) {
      for (const syn of CLINICAL_SYNONYMS_RAW[normalized]) phrases.add(normalizeLexical(syn));
    }
  }

  // Check each individual term for acronyms, brand/DCI, and synonyms
  for (const term of terms) {
    if (ACRONYMS_RAW[term]) {
      for (const exp of ACRONYMS_RAW[term]) phrases.add(normalizeLexical(exp));
    }
    if (EXPANSION_TO_ACRONYMS[term]) {
      for (const acr of EXPANSION_TO_ACRONYMS[term]) phrases.add(acr);
    }
    if (BRAND_TO_DCI_RAW[term]) {
      for (const dci of BRAND_TO_DCI_RAW[term]) phrases.add(normalizeLexical(dci));
    }
    if (DCI_TO_BRANDS[term]) {
      for (const br of DCI_TO_BRANDS[term]) phrases.add(br);
    }
    if (CLINICAL_SYNONYMS_RAW[term]) {
      for (const syn of CLINICAL_SYNONYMS_RAW[term]) phrases.add(normalizeLexical(syn));
    }
  }

  return {
    terms: terms.length ? terms : words,
    stems,
    phrases: Array.from(phrases),
  };
}

function containsBoundary(text: string, phrase: string): boolean {
  if (!phrase) return false;
  const regex = new RegExp(`(?:^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`);
  return regex.test(text);
}

/**
 * Check whether a clinical document text matches the search query via:
 * 1. Exact phrase (with word boundaries) or exact acronym / brand equivalence phrase.
 * 2. Morphological stem matching (e.g. vaccination <-> vaccin, bactérie <-> bactérienne, antibiotique <-> antibiotiques).
 * 3. Veterinary synonym, DCI, or acronym equivalence per term.
 *
 * For multi-term queries (e.g. "bactérie résistance"), all significant query terms must be matched.
 */
/** Numeric constraints stay exact: semantic proximity must not confuse dosages. */
export function matchesNumericConstraints(query: string, text: string): boolean {
  const numbers = (value: string) => [...value.matchAll(/\d+(?:[.,]\d+)?/g)].map(match => String(Number(match[0].replace(",", "."))));
  const expected = numbers(query);
  const actual = new Set(numbers(text));
  const quantities = (value: string) => [...value.toLowerCase().matchAll(/(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug|ml|kg|g|ui)(?:\s*\/\s*(kg|ml|l|dl))?\b/g)].map(match => `${Number(match[1].replace(",", "."))}:${match[2]}:${match[3] ?? ""}`);
  const actualQuantities = new Set(quantities(text));
  return expected.every(value => actual.has(value)) && quantities(query).every(value => actualQuantities.has(value));
}

export function matchesSearchTerms(query: string, text: string): boolean {
  if (!matchesNumericConstraints(query, text)) return false;
  const normQuery = normalizeLexical(query);
  const normText = normalizeLexical(text);
  if (!normQuery || !normText) return false;

  const expansion = expandSearchQuery(query);
  const textWords = normText.split(/\s+/).filter(Boolean);
  const textWordSet = new Set(textWords);
  const textStemSet = new Set(textWords.map(stemFrenchWord));

  // If query is an exact phrase found as a whole unit in text
  if (containsBoundary(normText, normQuery)) return true;

  // If query itself was an acronym or full multi-word expression matching an equivalence phrase
  const isSingleConceptPhrase =
    ACRONYMS_RAW[normQuery] ||
    EXPANSION_TO_ACRONYMS[normQuery] ||
    BRAND_TO_DCI_RAW[normQuery] ||
    DCI_TO_BRANDS[normQuery];

  if (isSingleConceptPhrase) {
    for (const phrase of expansion.phrases) {
      if (phrase && containsBoundary(normText, phrase)) return true;
    }
  }

  if (!expansion.terms.length) return false;

  // Every significant query term must be represented in text (direct, stem, brand/DCI, acronym, or synonym)
  return expansion.terms.every((term, i) => {
    // If the term is shorter than 4 chars (e.g. "bact"), require exact word token match (not stem/prefix)
    if (term.length < 4) {
      return textWordSet.has(term);
    }

    // Direct token match
    if (textWordSet.has(term)) return true;

    // Morphological stem match
    const stem = expansion.stems[i];
    if (stem && textStemSet.has(stem)) return true;

    // Acronym / full-name expansions for this specific term
    if (ACRONYMS_RAW[term]?.some((exp) => containsBoundary(normText, normalizeLexical(exp)))) return true;
    if (EXPANSION_TO_ACRONYMS[term]?.some((acr) => textWordSet.has(acr))) return true;

    // Brand / DCI equivalence for this specific term
    if (BRAND_TO_DCI_RAW[term]?.some((dci) => containsBoundary(normText, normalizeLexical(dci)))) return true;
    if (DCI_TO_BRANDS[term]?.some((br) => textWordSet.has(br))) return true;

    // Clinical synonyms for this specific term
    if (CLINICAL_SYNONYMS_RAW[term]?.some((syn) => {
      const normSyn = normalizeLexical(syn);
      if (normSyn.includes(" ")) {
        return containsBoundary(normText, normSyn);
      }
      return textWordSet.has(normSyn) || textStemSet.has(stemFrenchWord(normSyn)) || containsBoundary(normText, normSyn);
    })) return true;


    return false;
  });
}


/** Literal terms form an independent retrieval channel; synonyms remain calibrated. */
export function matchesExactSearchTerms(query: string, text: string): boolean {
  if (!matchesNumericConstraints(query, text)) return false;
  const terms = normalizeLexical(query).split(/\s+/).filter(term => term && !STOP_WORDS.has(term));
  const words = new Set(normalizeLexical(text).split(/\s+/));
  return terms.length > 0 && terms.every(term => words.has(term));
}
