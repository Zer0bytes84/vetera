import { expect,it } from "vitest";
import { vitalAlerts } from "../../../src/modules/hospitalizations/stays/vital-alerts";
const empty={temperature_c:null,heart_rate:null,general_state:null,appetite:null};
it("ne traite pas les valeurs absentes comme des anomalies", () => {expect(vitalAlerts("Chat",empty)).toEqual([]);});
it("compare avec l’espèce et laisse les espèces inconnues sans seuil inventé", () => {
 expect(vitalAlerts("Chat",{...empty,temperature_c:38.5,heart_rate:130})).toEqual([]);
 expect(vitalAlerts("Chien",{...empty,heart_rate:130})).toHaveLength(1);
 expect(vitalAlerts("Autre",{...empty,heart_rate:130})).toEqual([]);
});
it("les repères personnalisés prennent priorité", () => {expect(vitalAlerts("Chien",{...empty,heart_rate:130},{temperature:[37,40],heartRate:[60,150]})).toEqual([]);});
