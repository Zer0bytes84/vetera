/**
 * Seuils cliniques vétérinaires — version 1 (hardcodés)
 *
 * Toutes les valeurs sont issues de recommandations de référence (AAHA, ECVIM,
 * Plumb's Veterinary Drug Handbook, Veterinary Internal Medicine) mais
 * **dépendent fortement du contexte clinique** (espèce, race, âge, comorbidités,
 * chirurgie subie, traitement en cours). Ce module ne fait **pas** de
 * médecine vétérinaire automatisée : il sert à mettre en évidence des
 * signaux qui méritent l'attention d'un praticien humain.
 *
 * ## Évolution v2
 * Les seuils deviendront configurables par clinique via une table
 * `app_settings` (clé/valeur JSON) et resteront overridables par patient
 * (cas chroniques, soins palliatifs, post-opératoire atypique, etc.).
 *
 * ## Sources de référence
 * - Chien : FC 60-140 bpm (adulte), TRC < 2s, T° 38.3-39.2°C
 * - Chat : FC 120-220 bpm (adulte), TRC < 2s, T° 38.1-39.2°C
 * - Douleur (échelle CMPS-SF / Glasgow Feline) : 0-4 = faible, 5-8 = modérée, 9+ = sévère
 * - Fréquence respiratoire : 10-30 /min (chien), 20-40 /min (chat) au repos
 * - SpO2 : > 95% en air ambiant
 *
 * @see https://wsava.org/committees/global-nutrition-committee/ (TRC)
 * @see https://www.aha.org/ (FC repos)
 * @see https://www.vasg.org/ (douleur)
 */

export type Species = "Chien" | "Chat" | "Lapin" | "Furet" | "Oiseau" | "Reptile" | "Autre";

export type AlertSeverity = "info" | "warn" | "critical";

export interface VitalReading {
  species: Species | null;
  recordedAt: Date;
  temperatureC: number | null;
  heartRateBpm: number | null;
  respiratoryRate: number | null;
  spo2Percent: number | null;
  weightKg: number | null;
  painScore: number | null; // 0-10
}

export interface ClinicalAlert {
  severity: AlertSeverity;
  metric: string;
  value: number | null;
  threshold: string;
  message: string;
}

interface SpeciesRange {
  min: number;
  max: number;
}

const TEMP_RANGE: Record<Species, SpeciesRange> = {
  Chien: { min: 38.3, max: 39.2 },
  Chat: { min: 38.1, max: 39.2 },
  Lapin: { min: 38.5, max: 40.0 },
  Furet: { min: 37.8, max: 39.4 },
  Oiseau: { min: 40.0, max: 42.0 },
  Reptile: { min: 22.0, max: 35.0 },
  Autre: { min: 36.0, max: 40.0 },
};

const HR_RANGE: Record<Species, SpeciesRange> = {
  Chien: { min: 60, max: 140 },
  Chat: { min: 120, max: 220 },
  Lapin: { min: 130, max: 325 },
  Furet: { min: 200, max: 400 },
  Oiseau: { min: 200, max: 600 },
  Reptile: { min: 20, max: 80 },
  Autre: { min: 60, max: 200 },
};

const RR_RANGE: Record<Species, SpeciesRange> = {
  Chien: { min: 10, max: 30 },
  Chat: { min: 20, max: 40 },
  Lapin: { min: 30, max: 60 },
  Furet: { min: 30, max: 40 },
  Oiseau: { min: 20, max: 50 },
  Reptile: { min: 5, max: 30 },
  Autre: { min: 10, max: 40 },
};

const SPO2_MIN = 95; // % — en air ambiant
const PAIN_WARN = 4; // modéré
const PAIN_CRITICAL = 7; // sévère
const FEVER_STRONG = 39.5; // °C — fièvre franche
const HYPOTHERMIA = 36.5; // °C — hypothermie significative

/**
 * Évalue une série de constantes vitales et retourne les alertes à afficher.
 * Les valeurs hors plage déclenchent `warn` ; les valeurs critiques (fièvre
 * franche, hypothermie, SpO2 < 92, douleur sévère) déclenchent `critical`.
 */
export function evaluateVitals(reading: VitalReading): ClinicalAlert[] {
  const alerts: ClinicalAlert[] = [];
  const species: Species = reading.species ?? "Autre";
  const range = (key: "temp" | "hr" | "rr") => {
    switch (key) {
      case "temp":
        return TEMP_RANGE[species];
      case "hr":
        return HR_RANGE[species];
      case "rr":
        return RR_RANGE[species];
    }
  };

  if (reading.temperatureC !== null) {
    const r = range("temp");
    if (reading.temperatureC >= FEVER_STRONG) {
      alerts.push({
        severity: "critical",
        metric: "temperature",
        value: reading.temperatureC,
        threshold: `≥ ${FEVER_STRONG}°C`,
        message: `Fièvre franche (${reading.temperatureC.toFixed(1)}°C, normale ${r.min}-${r.max}°C)`,
      });
    } else if (reading.temperatureC < HYPOTHERMIA) {
      alerts.push({
        severity: "critical",
        metric: "temperature",
        value: reading.temperatureC,
        threshold: `< ${HYPOTHERMIA}°C`,
        message: `Hypothermie (${reading.temperatureC.toFixed(1)}°C)`,
      });
    } else if (reading.temperatureC > r.max) {
      alerts.push({
        severity: "warn",
        metric: "temperature",
        value: reading.temperatureC,
        threshold: `> ${r.max}°C`,
        message: `Fièvre modérée (${reading.temperatureC.toFixed(1)}°C, normale ≤ ${r.max}°C)`,
      });
    } else if (reading.temperatureC < r.min) {
      alerts.push({
        severity: "warn",
        metric: "temperature",
        value: reading.temperatureC,
        threshold: `< ${r.min}°C`,
        message: `Température basse (${reading.temperatureC.toFixed(1)}°C, normale ≥ ${r.min}°C)`,
      });
    }
  }

  if (reading.heartRateBpm !== null) {
    const r = range("hr");
    if (reading.heartRateBpm > r.max * 1.2) {
      alerts.push({
        severity: "critical",
        metric: "heartRate",
        value: reading.heartRateBpm,
        threshold: `> ${r.max} bpm (×1.2)`,
        message: `Tachycardie sévère (${reading.heartRateBpm} bpm, normale ${r.min}-${r.max})`,
      });
    } else if (reading.heartRateBpm < r.min * 0.6) {
      alerts.push({
        severity: "critical",
        metric: "heartRate",
        value: reading.heartRateBpm,
        threshold: `< ${r.min} bpm (×0.6)`,
        message: `Bradycardie sévère (${reading.heartRateBpm} bpm)`,
      });
    } else if (reading.heartRateBpm > r.max) {
      alerts.push({
        severity: "warn",
        metric: "heartRate",
        value: reading.heartRateBpm,
        threshold: `> ${r.max} bpm`,
        message: `Tachycardie (${reading.heartRateBpm} bpm, normale ${r.min}-${r.max})`,
      });
    } else if (reading.heartRateBpm < r.min) {
      alerts.push({
        severity: "warn",
        metric: "heartRate",
        value: reading.heartRateBpm,
        threshold: `< ${r.min} bpm`,
        message: `Bradycardie (${reading.heartRateBpm} bpm)`,
      });
    }
  }

  if (reading.respiratoryRate !== null) {
    const r = range("rr");
    if (reading.respiratoryRate > r.max * 1.5) {
      alerts.push({
        severity: "critical",
        metric: "respiratoryRate",
        value: reading.respiratoryRate,
        threshold: `> ${r.max} /min (×1.5)`,
        message: `Tachypnée sévère (${reading.respiratoryRate} /min)`,
      });
    } else if (reading.respiratoryRate > r.max) {
      alerts.push({
        severity: "warn",
        metric: "respiratoryRate",
        value: reading.respiratoryRate,
        threshold: `> ${r.max} /min`,
        message: `Tachypnée (${reading.respiratoryRate} /min, normale ${r.min}-${r.max})`,
      });
    } else if (reading.respiratoryRate < r.min) {
      alerts.push({
        severity: "warn",
        metric: "respiratoryRate",
        value: reading.respiratoryRate,
        threshold: `< ${r.min} /min`,
        message: `Bradypnée (${reading.respiratoryRate} /min)`,
      });
    }
  }

  if (reading.spo2Percent !== null) {
    if (reading.spo2Percent < 92) {
      alerts.push({
        severity: "critical",
        metric: "spo2",
        value: reading.spo2Percent,
        threshold: "< 92%",
        message: `Hypoxémie (SpO2 ${reading.spo2Percent}%)`,
      });
    } else if (reading.spo2Percent < SPO2_MIN) {
      alerts.push({
        severity: "warn",
        metric: "spo2",
        value: reading.spo2Percent,
        threshold: `< ${SPO2_MIN}%`,
        message: `SpO2 basse (${reading.spo2Percent}%)`,
      });
    }
  }

  if (reading.painScore !== null) {
    if (reading.painScore >= PAIN_CRITICAL) {
      alerts.push({
        severity: "critical",
        metric: "pain",
        value: reading.painScore,
        threshold: `≥ ${PAIN_CRITICAL}/10`,
        message: `Douleur sévère (${reading.painScore}/10)`,
      });
    } else if (reading.painScore >= PAIN_WARN) {
      alerts.push({
        severity: "warn",
        metric: "pain",
        value: reading.painScore,
        threshold: `≥ ${PAIN_WARN}/10`,
        message: `Douleur modérée (${reading.painScore}/10)`,
      });
    }
  }

  return alerts;
}

/**
 * Niveau d'alerte le plus élevé d'une lecture. Utile pour colorer
 * rapidement un badge ou un compteur (vert / ambre / rouge).
 */
export function highestSeverity(alerts: ClinicalAlert[]): AlertSeverity | null {
  if (alerts.some((a) => a.severity === "critical")) return "critical";
  if (alerts.some((a) => a.severity === "warn")) return "warn";
  if (alerts.length > 0) return "info";
  return null;
}

export const CLINICAL_THRESHOLDS = {
  TEMP_RANGE,
  HR_RANGE,
  RR_RANGE,
  SPO2_MIN,
  PAIN_WARN,
  PAIN_CRITICAL,
  FEVER_STRONG,
  HYPOTHERMIA,
} as const;
