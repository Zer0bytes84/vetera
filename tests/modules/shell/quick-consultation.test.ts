import { expect, it, vi } from "vitest";
import { prepareQuickConsultation } from "@/modules/shell/model/quick-consultation";
import type { Appointment, Patient } from "@/types/db";
const patient={id:"patient-1",ownerId:"owner-1",name:"Mocha"} as Patient;
const now=new Date("2026-10-14T13:00:00Z");
it("crée la session du patient à l’heure courante via le workflow clinique existant",async()=>{
 const create=vi.fn(async draft=>({...draft,id:"consultation-1"} as Appointment));
 const result=await prepareQuickConsultation({patient,userId:"vet-1",appointments:[],create,now});
 expect(create).toHaveBeenCalledExactlyOnceWith({patientId:"patient-1",ownerId:"owner-1",vetId:"vet-1",title:"Mocha · Consultation",type:"Consultation",status:"scheduled",startTime:now.toISOString(),endTime:"2026-10-14T13:30:00.000Z"});
 expect(result.id).toBe("consultation-1");
});
it("rouvre la consultation en cours du patient sans créer de doublon",async()=>{
 const current={id:"current",patientId:patient.id,status:"in_progress"} as Appointment;
 const create=vi.fn();
 expect(await prepareQuickConsultation({patient,userId:"vet-1",appointments:[current],create,now})).toBe(current);
 expect(create).not.toHaveBeenCalled();
});
it("n’ouvre pas la session d’un autre patient et conserve l’auteur de la nouvelle consultation",async()=>{
 const create=vi.fn(async draft=>({...draft,id:"new"} as Appointment));
 await prepareQuickConsultation({patient,userId:"vet-1",appointments:[{patientId:"other",status:"in_progress"} as Appointment],create,now});
 expect(create).toHaveBeenCalledOnce();
 expect(create.mock.calls[0][0]).toMatchObject({patientId:patient.id,vetId:"vet-1"});
});
it("refuse une session absente, un propriétaire absent et un échec de sauvegarde",async()=>{
 const create=vi.fn(async()=>null);
 await expect(prepareQuickConsultation({patient,appointments:[],create})).rejects.toThrow("Reconnectez-vous");
 await expect(prepareQuickConsultation({patient:{...patient,ownerId:""},userId:"vet",appointments:[],create})).rejects.toThrow("propriétaire");
 expect(create).not.toHaveBeenCalled();
 await expect(prepareQuickConsultation({patient,userId:"vet",appointments:[],create})).rejects.toThrow("n’a pas pu être créée");
});
