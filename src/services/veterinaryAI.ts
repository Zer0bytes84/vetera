/**
 * Service IA spécialisé pour le métier vétérinaire
 * Prompts professionnels et contextuels
 */

export interface VeterinaryContext {
  patientName?: string
  species?: "chien" | "chat" | "NAC"
  age?: string
  weight?: string
  currentView?: string
  appointmentType?: string
}

export const SYSTEM_PROMPT = `Tu es un assistant vétérinaire professionnel. Tu assistes un vétérinaire dans son cabinet.

TON RÔLE:
- Aider à la rédaction de documents médicaux (fiches, comptes-rendus)
- Fournir des informations sur les protocoles standards
- Rédiger des communications clients professionnelles
- Proposer des aides à la décision diagnostique (sans remplacer le vétérinaire)

RÈGLES STRICTES:
1. Tu ne diagnostiques PAS à la place du vétérinaire
2. Tu proposes des pistes différentielles avec précautions
3. Tu cites les sources/protocols standards quand pertinent
4. Ton langage est professionnel, précis, mais adaptable au public cible
5. Tu demandes des précisions si le contexte est insuffisant

DOMAINE D'EXPERTISE:
- Médecine canine et féline (primaire)
- NAC (lapin, rongeur, furet) - niveau généraliste
- Protocoles vaccinaux (Eurovet, WSAVA)
- Antiparasitaires (ESCCAP)
- Analgésie/anesthésie basique
- Communication clientèle

Tu réponds en français. Tu es factuel, tu évites le jargon inutile sauf si demandé.`

export const PROMPT_TEMPLATES = {
  fichePatient: (ctx: VeterinaryContext) => `Rédige une fiche patient professionnelle pour ${ctx.patientName || "le patient"}${ctx.species ? ` (${ctx.species})` : ""}.

Structure obligatoire:
## ANAMNÈSE
- Motif de consultation :
- Antécédents médicaux :
- Traitement en cours :
- Mode de vie (extérieur/intérieur, contacts, alimentation) :

## EXAMEN CLINIQUE
- Température :  
- Fréquence cardiaque :
- Fréquence respiratoire :
- État des muqueuses :
- État corporel (BCS) :
- Examen des systèmes :

## DIAGNOSTIC
- Hypothèses différentielles :
- Examens complémentaires suggérés :

## PLAN DE TRAITEMENT
1. 
2. 
3. 

## SUIVI
- Prochain rendez-vous :
- Signaux d'alerte pour le propriétaire :

Rédige de façon concise, prête à être complétée.`,

  compteRendu: (ctx: VeterinaryContext) => `Rédige un compte-rendu de consultation pour ${ctx.patientName || "le patient"}.

Format standard:
**Date:** [Date]
**Patient:** ${ctx.patientName || "[Nom]"}${ctx.species ? ` (${ctx.species})` : ""}${ctx.age ? `, ${ctx.age}` : ""}${ctx.weight ? `, ${ctx.weight}` : ""}

**Motifs:**
[À compléter par le vétérinaire]

**Anamnèse:**
-

**Examen clinique:**
- Température : 
- FC :  
- FR :
- Constatations :

**Diagnostic:**
-

**Traitement prescrit:**
1. [Médicament] - [Posologie] - [Durée]
2.

**Propriétaire informé de:**
-

**Suivi:**
-

Rédige un texte fluide et professionnel.`,

  protocoleVaccinChien: () => `Protocole vaccinal chien - Rappel annuel standard

**Vaccins core (recommandés pour tous):**
- **CVRP** (Carré, Parvovirose, Hépatite, Parainfluenza)
  - Injection sous-cutanée
  - Fréquence: annuelle ou triennale selon le fabricant
  
- **Leptospirose** (sérotypes interrogans)
  - Injection sous-cutanée ou intramusculaire
  - Fréquence: annuelle obligatoire (immunité courte)

**Vaccins non-core (selon risque):**
- **Rage** - si voyage, zone endémique, chasse
- **Bordetella** - si contact multi-chiens (pension, salon)
- **Leishmaniose** - si zone endémique sud

**Contre-indications:**
- Fièvre > 39.2°C
- Immunodépression
- Gestation
- Maladie aiguë en cours

**Précautions:**
- Déparasitage préalable recommandé
- Attente 48h avant/after chirurgie majeure
- Surveillance 15-30 min post-vaccin (risque choc anaphylactique)

Source: Protocols WSAVA 2022, ESCCAP guidelines`,

  protocoleVaccinChat: () => `Protocole vaccinal chat - Rappel annuel

**Vaccins core (tous les chats):**
- **Typhus/Coryza/Calicivirus** (TC)
  - Injection sous-cutanée
  - Fréquence: annuelle ou triennale selon fabricant
  
- **Leucose féline** (FeLV)
  - Primovaccination: 2 injections à 3-4 semaines d'intervalle
  - Rappel: annuel si risque (extérieur, contacts)

**Vaccin non-core:**
- **Rage** - si réglementation locale, voyage

**Points critiques chat:**
- Risque fibrosarcome site injection (rare mais grave)
- Injection plutôt en zone distale (queue, patte) pour permettre amputation si sarcome
- Contre-indication formelle en cas de suspicion FIV/FeLV non testé

**Tests préalables recommandés:**
- Test FeLV/FIV chez chat adulte non vacciné avant primovaccination FeLV`,

  smsRappelVaccin: (ctx: VeterinaryContext) => `Rédige un SMS de rappel de vaccin pour ${ctx.patientName || "[Nom animal]"}.

Contraintes:
- Maximum 160 caractères (1 SMS)
- Ton professionnel mais chaleureux
- Inclure numéro clinique pour RDV
- Mentionner urgence si dépassé

Modèle:
"Bonjour! Nous rappelons que le vaccin de ${ctx.patientName || "[Nom]"} arrive à échéance. Pour maintenir sa protection, merci de prendre RDV au 0X XX XX XX XX. Clinique Vétérinaire [Nom]"

(Compte les caractères et optimise)`,

  smsRappelConsultation: (ctx: VeterinaryContext) => `Rédige un SMS de confirmation de rendez-vous.

Infos: ${ctx.appointmentType || "Consultation"} le [date/heure]

Ton: professionnel, rappel poli
Longueur: max 160 caractères
Doit inclure: date/heure, type de RDV, numéro pour modifier

Exemple:
"Rappel RDV ${ctx.appointmentType || "consultation"} [Nom] demain à [heure]. En cas d'empêchement, merci de nous prévenir au 0X XX XX XX XX. À demain! Clinique Vét. [Nom]"`,

  explicationPathologie: (pathologie: string, ctx: VeterinaryContext) => `Explique la pathologie "${pathologie}" à un propriétaire inquiet pour ${ctx.patientName || "son animal"}.

Consignes:
- Évite le jargon médical (ou explique-le entre parenthèses)
- Sois rassurant mais honnête sur la gravité si nécessaire
- Explique les causes simples possibles
- Donne les signes à surveiller
- Mentionne le traitement généralement sans détail de posologie

Structure:
1. C'est quoi (en simple)
2. Pourquoi ça arrive (causes fréquentes)
3. Ce qu'on va faire (plan général)
4. Ce que vous pouvez faire à la maison
5. Quand appeler en urgence

Longueur: 4-5 phrases maximum. Ton rassurant.`,

  aideDiagnostique: (symptomes: string, ctx: VeterinaryContext) => `Analyse des symptômes: ${symptomes}

Contexte: ${ctx.patientName || "Patient"}${ctx.species ? ` (${ctx.species})` : ""}${ctx.age ? `, ${ctx.age}` : ""}

Fournis:
1. **Diagnostic différentiel** (3-5 pistes max, ordre probabilité)
2. **Examens complémentaires pertinents** à demander en priorité
3. **Éléments de l'anamnèse à creuser**
4. **Signaux d'alerte** nécessitant prise en charge urgente

ATTENTION: Précise bien que c'est une aide à la réflexion, pas un diagnostic. Le vétérinaire clinicien a le dernier mot.

Format bullet points concis.`,

  ordonnance: () => `Modèle d'ordonnance vétérinaire

ORDONNANCE
[Date]

Dr [Nom Vétérinaire]
Vétérinaire
N° Ordre: [Numéro]

Nom: [Patient]      Espèce: [Race/Âge]
Propriétaire: [Nom]

**Prescription:**
1. [Nom médicament] [Dosage] - [Posologie] - [Durée]
   (Quantité: )

2.

3.

Conseils:
-

Signature:

---
NB: Ordonnance valable 12 mois (3 mois pour les stupéfiants/anabolisants)`,

  certificatBonneSante: () => `Certificat de bonne santé pour voyage

CERTIFICAT VÉTÉRINAIRE DE BONNE SANTÉ

Je soussigné(e), Dr [Nom], vétérinaire, certifie avoir examiné ce jour:

Animal: [Nom]
Espèce: [Canis familiaris / Felis catus]
Race: 
Date de naissance: 
Identification: [Tatouage/Puce: numéro]
Sexe: 

**Constatations:**
- État général: bon
- Température: normale
- Absence de signes cliniques de maladie contagieuse
- Vaccinations à jour (rappel du certificat vaccinal)

Cet animal est, à ma connaissance, indemne de maladie contagieuse et paraît en bonne santé pour voyager.

Fait à [Ville], le [Date]

Signature et cachet:

NB: Validité 10 jours maximum. Requis pour transport aérien international.`,
}

export function generatePrompt(
  template: keyof typeof PROMPT_TEMPLATES,
  context: VeterinaryContext,
  customData?: string
): string {
  const templateFn = PROMPT_TEMPLATES[template]
  
  if (typeof templateFn === "function") {
    if (customData) {
      return (templateFn as Function)(customData, context)
    }
    return (templateFn as Function)(context)
  }
  
  return templateFn as string
}

export function detectIntent(message: string): keyof typeof PROMPT_TEMPLATES | null {
  const lower = message.toLowerCase()
  
  if (lower.includes("fiche") || lower.includes("dossier médical")) return "fichePatient"
  if (lower.includes("compte-rendu") || lower.includes("cr") || lower.includes("rapport consultation")) return "compteRendu"
  if (lower.includes("vaccin chien") || lower.includes("protocole chien")) return "protocoleVaccinChien"
  if (lower.includes("vaccin chat") || lower.includes("protocole chat")) return "protocoleVaccinChat"
  if (lower.includes("sms") && lower.includes("vaccin")) return "smsRappelVaccin"
  if (lower.includes("sms") && lower.includes("rdv")) return "smsRappelConsultation"
  if (lower.includes("explique") || lower.includes("c'est quoi") || lower.includes("qu'est-ce")) return "explicationPathologie"
  if (lower.includes("symptôme") || lower.includes("diagnostic") || lower.includes("différentiel")) return "aideDiagnostique"
  if (lower.includes("ordonnance")) return "ordonnance"
  if (lower.includes("certificat") || lower.includes("bonne santé")) return "certificatBonneSante"
  
  return null
}
