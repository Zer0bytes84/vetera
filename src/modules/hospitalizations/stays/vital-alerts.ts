import type { VitalSign } from "./store";
/** Adult resting reference ranges, not diagnostic or treatment rules. */
export const VITAL_REFERENCE_SOURCE = "https://www.msdvetmanual.com/reference-values-and-conversion-tables/reference-guides/resting-heart-rates";
export const TEMPERATURE_REFERENCE_SOURCE = "https://www.merckvetmanual.com/multimedia/table/normal-rectal-temperature-ranges";
export interface VitalReference { temperature: readonly [number,number]; heartRate: readonly [number,number]; }
export const SPECIES_VITAL_REFERENCES: Record<string,VitalReference>={
 chien:{temperature:[37.5,39.2],heartRate:[70,120]},
 chat:{temperature:[38.1,39.2],heartRate:[120,140]},
 lapin:{temperature:[38.6,40.1],heartRate:[180,350]},
};
export function vitalAlerts(species: string, vital: Pick<VitalSign,"temperature_c" | "heart_rate" | "general_state" | "appetite">, override?: VitalReference): string[] {
 const key=species.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr").trim();
 const reference=override || SPECIES_VITAL_REFERENCES[key]; const alerts: string[]=[];
 if (reference) {
  if (vital.temperature_c != null && (vital.temperature_c < reference.temperature[0] || vital.temperature_c > reference.temperature[1])) alerts.push("Température hors du repère de l’espèce");
  if (vital.heart_rate != null && (vital.heart_rate < reference.heartRate[0] || vital.heart_rate > reference.heartRate[1])) alerts.push("Fréquence cardiaque hors du repère au repos");
 }
 if (vital.general_state === "Non réactif") alerts.push("État général à vérifier");
 if (vital.appetite === "Absent") alerts.push("Absence d’appétit à suivre");
 return alerts;
}
