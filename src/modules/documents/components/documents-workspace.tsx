import { useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { useSQLite } from "@/hooks/useSQLite";
import type { Patient, Appointment } from "@/types/db";
import ConsultationDocumentsAssistant from "./consultation-documents-assistant";

export default function DocumentsWorkspace({
  initialPatientId = "",
}: {
  initialPatientId?: string;
}) {
  const patients = useSQLite<Patient>("patients");
  const appointments = useSQLite<Appointment>("appointments");
  const [patientId, setPatientId] = useState(initialPatientId);
  const [appointmentId, setAppointmentId] = useState("");
  const visits = appointments.data
    .filter(
      (entry) =>
        entry.patientId === patientId &&
        !["cancelled", "no_show"].includes(entry.status)
    )
    .sort((a, b) => b.startTime.localeCompare(a.startTime));
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="document-workspace-patient">Patient</FieldLabel>
          <NativeSelect
            id="document-workspace-patient"
            value={patientId}
            onChange={(event) => {
              setPatientId(event.target.value);
              setAppointmentId("");
            }}
          >
            <NativeSelectOption value="">
              Choisir un patient…
            </NativeSelectOption>
            {patients.data.map((patient) => (
              <NativeSelectOption key={patient.id} value={patient.id}>
                {patient.name} · {patient.species}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="document-workspace-consultation">
            Consultation
          </FieldLabel>
          <NativeSelect
            id="document-workspace-consultation"
            value={appointmentId}
            onChange={(event) => setAppointmentId(event.target.value)}
            disabled={!patientId}
          >
            <NativeSelectOption value="">
              Choisir une consultation…
            </NativeSelectOption>
            {visits.map((visit) => (
              <NativeSelectOption key={visit.id} value={visit.id}>
                {new Date(visit.startTime).toLocaleDateString("fr-FR")} ·{" "}
                {visit.reason || visit.type}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      {(patients.error || appointments.error) && (
        <p role="alert" className="text-sm text-destructive">
          Les dossiers n’ont pas pu être chargés.
        </p>
      )}
      {appointmentId && patientId && (
        <ConsultationDocumentsAssistant
          key={patientId + ":" + appointmentId}
          patientId={patientId}
          appointmentId={appointmentId}
        />
      )}
    </div>
  );
}
