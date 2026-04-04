/**
 * VetKnowledgeService - Service de requête de la base de connaissances vétérinaires
 * 
 * Ce service permet de rechercher des informations dans la base de connaissances
 * vétérinaires locale (médicaments, maladies, espèces, urgences).
 */

// Import des données JSON (Vite gère l'import JSON)
import medicationsData from '../data/vet-knowledge/medications.json';
import medicationsExtendedData from '../data/vet-knowledge/medications-extended.json';
import diseasesData from '../data/vet-knowledge/diseases.json';
import speciesData from '../data/vet-knowledge/species.json';
import emergenciesData from '../data/vet-knowledge/emergencies.json';
import referenceData from '../data/vet-knowledge/reference.json';

// Types
export interface Medication {
    id: string;
    nom: string;
    nomCommercial?: string[];
    classe: string;
    formes: string[];
    indications: string[];
    contreIndications: string[];
    posologies: Record<string, {
        dose: string;
        frequence: string;
        voie?: string;
        duree?: string;
        attention?: string;
    }>;
    effetsSecondaires: string[];
    interactions?: string[];
    tempsAttente?: Record<string, string>;
    conservation?: string;
}

export interface Disease {
    id: string;
    nom: string;
    especes: string[];
    systeme: string;
    etiologie: string;
    symptomes: string[] | Record<string, string[]>;
    diagnostic: Record<string, unknown>;
    traitement: Record<string, unknown>;
    pronostic: string;
    prevention?: string;
    urgence: boolean;
    zoonotique?: boolean;
}

export interface Species {
    id: string;
    nom: string;
    nomScientifique: string;
    parametresVitaux: Record<string, unknown>;
    reproduction: Record<string, unknown>;
    alimentation?: Record<string, unknown>;
    vaccinationRecommandee?: Record<string, unknown>;
    alimentsToxiques?: string[];
    particularites?: string[];
    esperanceVie: string;
}

export interface Emergency {
    id: string;
    nom: string;
    urgence: string;
    signes?: string[];
    protocole: Record<string, unknown>;
}

export interface SearchResult {
    type: 'medication' | 'disease' | 'species' | 'emergency';
    item: Medication | Disease | Species | Emergency;
    relevance: number;
    matchedTerms: string[];
}

// Normaliser une chaîne pour la recherche (lowercase, sans accents)
function normalizeString(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

// Escape special regex characters to use dynamic strings safely in RegExp
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Calculer la pertinence d'un texte par rapport à une requête
function calculateRelevance(text: string, query: string): { score: number; matchedTerms: string[] } {
    const normalizedText = normalizeString(text);
    const queryTerms = normalizeString(query).split(/\s+/).filter(t => t.length > 2);

    let score = 0;
    const matchedTerms: string[] = [];

    for (const term of queryTerms) {
        if (normalizedText.includes(term)) {
            score += 1;
            matchedTerms.push(term);

            // Bonus si le terme est au début ou est un mot complet
            if (normalizedText.startsWith(term)) score += 0.5;
            if (new RegExp(`\\b${escapeRegExp(term)}\\b`).test(normalizedText)) score += 0.3;
        }
    }

    // Bonus si tous les termes sont trouvés
    if (matchedTerms.length === queryTerms.length && queryTerms.length > 1) {
        score *= 1.5;
    }

    return { score, matchedTerms };
}

// Convertir un objet en texte searchable
function objectToSearchableText(obj: unknown): string {
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number') return String(obj);
    if (Array.isArray(obj)) return obj.map(objectToSearchableText).join(' ');
    if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).map(objectToSearchableText).join(' ');
    }
    return '';
}

class VetKnowledgeService {
    private medications: Medication[];
    private diseases: Disease[];
    private species: Species[];
    private emergencies: Emergency[];
    private referenceData: typeof referenceData;

    constructor() {
        // Merge base medications with extended medications
        const baseMeds = (medicationsData as { medications: Medication[] }).medications || [];
        const extendedMeds = (medicationsExtendedData as unknown as { additionalMedications: Medication[] }).additionalMedications || [];
        this.medications = [...baseMeds, ...extendedMeds];

        this.diseases = (diseasesData as unknown as { diseases: Disease[] }).diseases || [];
        this.species = (speciesData as { species: Species[] }).species || [];
        this.emergencies = (emergenciesData as { emergencies: Emergency[] }).emergencies || [];
        this.referenceData = referenceData;

        console.log(`[VetKnowledge] Loaded: ${this.medications.length} medications, ${this.diseases.length} diseases, ${this.species.length} species, ${this.emergencies.length} emergencies`);
    }

    /**
     * Recherche globale dans toutes les catégories
     */
    search(query: string, maxResults: number = 5): SearchResult[] {
        if (!query || query.trim().length < 2) return [];

        const results: SearchResult[] = [];

        // Rechercher dans les médicaments
        for (const med of this.medications) {
            const searchText = [
                med.nom,
                med.nomCommercial?.join(' ') || '',
                med.classe,
                med.indications.join(' '),
                Object.keys(med.posologies).join(' ')
            ].join(' ');

            const { score, matchedTerms } = calculateRelevance(searchText, query);
            if (score > 0) {
                results.push({
                    type: 'medication',
                    item: med,
                    relevance: score,
                    matchedTerms
                });
            }
        }

        // Rechercher dans les maladies
        for (const disease of this.diseases) {
            const searchText = [
                disease.nom,
                disease.etiologie,
                disease.especes.join(' '),
                disease.systeme,
                objectToSearchableText(disease.symptomes),
                objectToSearchableText(disease.traitement)
            ].join(' ');

            const { score, matchedTerms } = calculateRelevance(searchText, query);
            if (score > 0) {
                results.push({
                    type: 'disease',
                    item: disease,
                    relevance: score,
                    matchedTerms
                });
            }
        }

        // Rechercher dans les espèces
        for (const sp of this.species) {
            const searchText = [
                sp.nom,
                sp.nomScientifique,
                objectToSearchableText(sp.parametresVitaux),
                sp.alimentsToxiques?.join(' ') || ''
            ].join(' ');

            const { score, matchedTerms } = calculateRelevance(searchText, query);
            if (score > 0) {
                results.push({
                    type: 'species',
                    item: sp,
                    relevance: score,
                    matchedTerms
                });
            }
        }

        // Rechercher dans les urgences
        for (const emg of this.emergencies) {
            const searchText = [
                emg.nom,
                emg.signes?.join(' ') || '',
                objectToSearchableText(emg.protocole)
            ].join(' ');

            const { score, matchedTerms } = calculateRelevance(searchText, query);
            if (score > 0) {
                results.push({
                    type: 'emergency',
                    item: emg,
                    relevance: score,
                    matchedTerms
                });
            }
        }

        // Trier par pertinence et limiter
        return results
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, maxResults);
    }

    /**
     * Rechercher un médicament par nom
     */
    getMedication(query: string): Medication | null {
        const normalizedQuery = normalizeString(query);

        return this.medications.find(med =>
            normalizeString(med.nom) === normalizedQuery ||
            normalizeString(med.id) === normalizedQuery ||
            med.nomCommercial?.some(nc => normalizeString(nc) === normalizedQuery)
        ) || null;
    }

    /**
     * Rechercher une maladie par nom
     */
    getDisease(query: string): Disease | null {
        const normalizedQuery = normalizeString(query);

        return this.diseases.find(d =>
            normalizeString(d.nom) === normalizedQuery ||
            normalizeString(d.id) === normalizedQuery
        ) || null;
    }

    /**
     * Obtenir les infos d'une espèce
     */
    getSpecies(query: string): Species | null {
        const normalizedQuery = normalizeString(query);

        return this.species.find(s =>
            normalizeString(s.nom).includes(normalizedQuery) ||
            normalizeString(s.id) === normalizedQuery
        ) || null;
    }

    /**
     * Obtenir un protocole d'urgence
     */
    getEmergency(query: string): Emergency | null {
        const normalizedQuery = normalizeString(query);

        return this.emergencies.find(e =>
            normalizeString(e.nom).includes(normalizedQuery) ||
            normalizeString(e.id) === normalizedQuery
        ) || null;
    }

    /**
     * Obtenir la posologie d'un médicament pour une espèce
     */
    getDosage(medicationName: string, species: string): string | null {
        const med = this.getMedication(medicationName);
        if (!med) return null;

        const normalizedSpecies = normalizeString(species);

        for (const [sp, dosage] of Object.entries(med.posologies)) {
            if (normalizeString(sp).includes(normalizedSpecies)) {
                let result = `**${med.nom}** pour ${sp}:\n`;
                result += `- Dose: ${dosage.dose}\n`;
                result += `- Fréquence: ${dosage.frequence}\n`;
                if (dosage.voie) result += `- Voie: ${dosage.voie}\n`;
                if (dosage.duree) result += `- Durée: ${dosage.duree}\n`;
                if (dosage.attention) result += `⚠️ ${dosage.attention}\n`;
                return result;
            }
        }

        return null;
    }

    /**
     * Formater un résultat de recherche en texte pour le LLM
     */
    formatResultForLLM(result: SearchResult): string {
        switch (result.type) {
            case 'medication': {
                const med = result.item as Medication;
                return `📊 **MÉDICAMENT: ${med.nom}**
- Classe: ${med.classe}
- Noms commerciaux: ${med.nomCommercial?.join(', ') || 'N/A'}
- Indications: ${med.indications.join(', ')}
- Contre-indications: ${med.contreIndications.join(', ')}
- Posologies: ${Object.entries(med.posologies).map(([sp, d]) => `${sp}: ${d.dose} ${d.frequence}`).join('; ')}
- Effets secondaires: ${med.effetsSecondaires.join(', ')}`;
            }

            case 'disease': {
                const disease = result.item as Disease;
                const symptoms = Array.isArray(disease.symptomes)
                    ? disease.symptomes.join(', ')
                    : objectToSearchableText(disease.symptomes);
                return `🦠 **MALADIE: ${disease.nom}**
- Espèces: ${disease.especes.join(', ')}
- Système: ${disease.systeme}
- Étiologie: ${disease.etiologie}
- Symptômes: ${symptoms}
- Pronostic: ${disease.pronostic}
${disease.urgence ? '🚨 URGENCE' : ''}`;
            }

            case 'species': {
                const sp = result.item as Species;
                const vitals = sp.parametresVitaux;
                return `🐾 **ESPÈCE: ${sp.nom}** (${sp.nomScientifique})
- Température: ${JSON.stringify((vitals as Record<string, unknown>).temperature)}
- Espérance de vie: ${sp.esperanceVie}
${sp.alimentsToxiques ? `- Aliments toxiques: ${sp.alimentsToxiques.join(', ')}` : ''}`;
            }

            case 'emergency': {
                const emg = result.item as Emergency;
                return `🚨 **URGENCE: ${emg.nom}** (${emg.urgence})
- Signes: ${emg.signes?.join(', ') || 'Voir protocole'}
- Protocole: Voir détails dans la base`;
            }

            default:
                return '';
        }
    }

    /**
     * Générer un contexte enrichi pour le LLM basé sur une requête
     */
    getContextForQuery(query: string): string {
        const results = this.search(query, 3);

        if (results.length === 0) {
            return '';
        }

        let context = '\n\n📚 **INFORMATIONS DE LA BASE DE CONNAISSANCES VÉTÉRINAIRES:**\n\n';

        for (const result of results) {
            context += this.formatResultForLLM(result) + '\n\n';
        }

        context += '---\nUtilise ces informations pour répondre de manière précise et professionnelle.\n';

        return context;
    }

    /**
     * Obtenir les valeurs de laboratoire de référence pour une espèce
     */
    getLabValues(species: string, category?: string): Record<string, unknown> | null {
        const normalizedSpecies = normalizeString(species);
        const labValues = this.referenceData.labValues;

        if (!labValues) return null;

        // Trouver la catégorie demandée ou retourner toutes les valeurs
        if (category) {
            const cat = labValues[category as keyof typeof labValues];
            if (cat && typeof cat === 'object') {
                return (cat as Record<string, unknown>)[normalizedSpecies] as Record<string, unknown> || null;
            }
        }

        // Retourner toutes les valeurs pour l'espèce
        const result: Record<string, unknown> = {};
        for (const [catName, catData] of Object.entries(labValues)) {
            if (typeof catData === 'object' && catData !== null) {
                const speciesData = (catData as Record<string, unknown>)[normalizedSpecies];
                if (speciesData) {
                    result[catName] = speciesData;
                }
            }
        }
        return Object.keys(result).length > 0 ? result : null;
    }

    /**
     * Obtenir une formule de calcul clinique
     */
    getFormula(category: string): Record<string, unknown> | null {
        const formulas = this.referenceData.formulas;
        if (!formulas) return null;

        const normalizedCat = normalizeString(category);

        for (const [key, value] of Object.entries(formulas)) {
            if (normalizeString(key).includes(normalizedCat)) {
                return value as Record<string, unknown>;
            }
        }
        return null;
    }

    /**
     * Obtenir le calendrier de vaccination pour une espèce
     */
    getVaccinationSchedule(species: string): Record<string, unknown> | null {
        const vaccinations = this.referenceData.vaccinations;
        if (!vaccinations) return null;

        const normalizedSpecies = normalizeString(species);

        for (const [sp, schedule] of Object.entries(vaccinations)) {
            if (normalizeString(sp).includes(normalizedSpecies)) {
                return schedule as Record<string, unknown>;
            }
        }
        return null;
    }

    /**
     * Obtenir le diagnostic différentiel pour un symptôme/syndrome
     */
    getDifferentialDiagnosis(symptom: string): string[] | Record<string, string[]> | null {
        const diffDx = this.referenceData.diagnosticDifferentiel;
        if (!diffDx) return null;

        const normalizedSymptom = normalizeString(symptom);

        for (const [key, value] of Object.entries(diffDx)) {
            if (normalizeString(key).includes(normalizedSymptom)) {
                return value as string[] | Record<string, string[]>;
            }
        }
        return null;
    }

    /**
     * Statistiques de la base de données
     */
    getStats(): { medications: number; diseases: number; species: number; emergencies: number; hasLabValues: boolean; hasFormulas: boolean } {
        return {
            medications: this.medications.length,
            diseases: this.diseases.length,
            species: this.species.length,
            emergencies: this.emergencies.length,
            hasLabValues: !!this.referenceData.labValues,
            hasFormulas: !!this.referenceData.formulas
        };
    }
}

// Export singleton
export const vetKnowledgeService = new VetKnowledgeService();
export default vetKnowledgeService;
