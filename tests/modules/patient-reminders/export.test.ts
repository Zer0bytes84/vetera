import { expect,it } from "vitest";
import {callsCsv,callsPrintHtml} from "../../../src/modules/patient-reminders/export";
it("exporte les coordonnées sans formules CSV ni rupture des cellules",()=>{
 const csv=callsCsv([{patient:'=SUM(1;2)',owner:'Nom "test"',phone:'+213550100107',type:'Vaccination',dueDate:'2026-10-12'}]);
 expect(csv.startsWith('\uFEFF')).toBe(true);
 expect(csv).toContain("'=SUM(1;2)");expect(csv).toContain('Nom ""test""');expect(csv).toContain("'+213550100107");
});
it("échappe les données patient dans la page d’impression locale",()=>{
 const html=callsPrintHtml([{patient:'<script>alert(1)</script>',owner:'A & B',phone:'01 23',type:'Vaccination',dueDate:'2026-10-12'}]);
 expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).toContain('A &amp; B');
});
