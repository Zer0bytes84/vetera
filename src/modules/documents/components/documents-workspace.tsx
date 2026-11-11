import { useState } from "react";
import { FileText } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useSQLite } from "@/hooks/useSQLite";
import type { Patient, Appointment, Note } from "@/types/db";
import ConsultationDocumentsAssistant from "./consultation-documents-assistant";
import { DocumentComposer } from "./document-composer";
import { Button } from "@/components/ui/button";

export default function DocumentsWorkspace({
  initialPatientId = "",
  initialNoteId = "",
}: {
  initialPatientId?: string;
  /** The note the user came from: it is offered as the source to read. */
  initialNoteId?: string;
}) {
  const patients = useSQLite<Patient>("patients");
  const appointments = useSQLite<Appointment>("appointments");
  const notes = useSQLite<Note>("notes");
  const sourceNote = initialNoteId ? notes.data.find((entry) => entry.id === initialNoteId) : undefined;
  const [chosenPatientId, setPatientId] = useState(initialPatientId);
  // Until the user picks one, a note linked to a patient preselects that patient.
  const patientId = chosenPatientId || sourceNote?.patientId || "";
  const [appointmentId, setAppointmentId] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
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
        <SearchableSelect
          id="document-workspace-patient"
          label="Patient"
          options={patients.data.map((patient) => ({
            value: patient.id,
            label: `${patient.name} · ${patient.species}`,
            keywords: `${patient.name} ${patient.species} ${patient.breed ?? ""}`,
          }))}
          value={patientId}
          onValueChange={(value) => {
            setPatientId(value);
            setAppointmentId("");
          }}
          placeholder="Choisir un patient…"
        />
        <SearchableSelect
          id="document-workspace-consultation"
          label="Consultation · pour générer un document"
          options={visits.map((visit) => ({
            value: visit.id,
            label: `${new Date(visit.startTime).toLocaleDateString("fr-FR")} · ${visit.reason || visit.type}`,
            keywords: `${visit.reason ?? ""} ${visit.type}`,
          }))}
          value={appointmentId}
          onValueChange={setAppointmentId}
          placeholder="Choisir une consultation…"
          disabled={!patientId}
        />
      </div>
      {sourceNote && (
        <p className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <FileText aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Note source : <span className="font-medium text-foreground">{sourceNote.title || "Note sans titre"}</span>.{" "}
            {patientId
              ? "Son texte est chargé dans « Lire un document »."
              : "Choisissez un patient pour l'utiliser."}
          </span>
        </p>
      )}
      {(patients.error || appointments.error) && (
        <p role="alert" className="text-sm text-destructive">
          Les dossiers n’ont pas pu être chargés.
        </p>
      )}
      {appointmentId && patientId && (
        <Button onClick={() => setComposerOpen(true)}>Générer un document</Button>
      )}
      {composerOpen && <DocumentComposer open={composerOpen} patientId={patientId} consultationId={appointmentId} onClose={() => setComposerOpen(false)} />}
      {patientId && (
        <ConsultationDocumentsAssistant
          key={patientId}
          patientId={patientId}
          appointmentId={appointmentId}
          initialMode="read"
          initialNoteId={sourceNote?.id}
        />
      )}
    </div>
  );
}
