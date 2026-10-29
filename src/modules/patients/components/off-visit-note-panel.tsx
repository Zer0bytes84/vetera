import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle, CircleNotch } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { AssistantBrandAvatar } from "@/modules/consultations/components/assistant-brand-avatar";
import { ConsultationAssistantPanel } from "@/modules/consultations/components/consultation-assistant-panel";
import { SoapSectionEditor } from "@/modules/consultations/components/soap-section-editor";
import type { SoapNoteOrigin } from "@/modules/consultations/components/local-consultation-assistant";
import { EMPTY_SOAP, SOAP_SECTIONS, type LocalSoapNote } from "@/modules/consultations/local-ai/soap-schema";
import {
  OFF_VISIT_KINDS,
  readOffVisitNote,
  saveOffVisitNote,
  type OffVisitKind,
} from "@/modules/consultations/off-visit-note";
import type { Note } from "@/types/db";
import { recordDate } from "./medical-record-summary";

const LocalConsultationAssistant = lazy(
  () => import("@/modules/consultations/components/local-consultation-assistant")
);

const hasText = (note: LocalSoapNote) => Object.values(note).some((value) => value.trim());

/**
 * A note kept in the record without a visit (call, phone advice,
 * observation). Typed or dictated, it stays on screen until the vet validates
 * it: no autosave, no appointment. An existing one opens read-only.
 */
export function OffVisitNotePanel({
  note,
  onClose,
  onSaved,
  patientId,
  patientName,
}: {
  /** An existing note to read; absent for a new one. */
  note?: Note | null;
  onClose: () => void;
  onSaved: (note: Note) => void;
  patientId: string;
  patientName: string;
}) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [kind, setKind] = useState<OffVisitKind>("call");
  const [draft, setDraft] = useState<LocalSoapNote>(EMPTY_SOAP);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const existing = note ? readOffVisitNote(note) : null;

  const save = async (soap: LocalSoapNote, transcript: string, origin: SoapNoteOrigin | "saisie") => {
    if (!currentUser) throw new Error("Connectez-vous pour enregistrer une note.");
    setSaving(true);
    try {
      const saved = await saveOffVisitNote({ patientId, userId: currentUser.uid, kind, note: soap, transcript, origin, validated: true });
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  };

  if (note && existing) {
    return (
      <section aria-label={`${note.title} de ${patientName}`} className="off-visit-note space-y-4 border-b border-border pb-6" id="patient-off-visit-note">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Note hors visite · {patientName}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {OFF_VISIT_KINDS[existing.kind]} · validée le {recordDate(existing.reviewedAt, true)} · sans rendez-vous
            </p>
          </div>
          <Button onClick={onClose} size="sm" variant="ghost">Revenir au dossier</Button>
        </div>
        <dl className="grid gap-3 lg:grid-cols-2">
          {SOAP_SECTIONS.filter(({ key }) => existing.soap[key].trim()).map(({ key }) => (
            <div className="rounded-2xl border border-border bg-card p-4" key={key}>
              <dt className="text-sm font-semibold">{t(`consultations.soap.sections.${key}`)}</dt>
              <dd className="mt-2 whitespace-pre-line text-sm leading-6">{existing.soap[key]}</dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }

  return (
    <section aria-label={`Nouvelle note hors visite pour ${patientName}`} className="off-visit-note space-y-4 border-b border-border pb-6" id="patient-off-visit-note">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Note hors visite · {patientName}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            Pour un appel, un conseil ou une observation. Aucun rendez-vous n’est créé et la note
            n’apparaît pas dans le Flux. Rien n’est enregistré avant votre validation.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            aria-expanded={assistantOpen}
            aria-label="Dicter la note avec l’assistant"
            className="h-10 gap-1.5 px-4 text-xs"
            disabled={saving}
            onClick={() => setAssistantOpen((open) => !open)}
            size="sm"
            variant={assistantOpen ? "default" : "outline"}
          >
            <AssistantBrandAvatar size={24} /> Dicter
          </Button>
          <Button onClick={onClose} size="sm" variant="ghost">Annuler</Button>
        </div>
      </div>
      <div aria-label="Nature de la note" className="flex flex-wrap gap-2" role="radiogroup">
        {(Object.keys(OFF_VISIT_KINDS) as OffVisitKind[]).map((value) => (
          <button
            aria-checked={kind === value}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              kind === value ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
            )}
            key={value}
            onClick={() => setKind(value)}
            role="radio"
            type="button"
          >
            {OFF_VISIT_KINDS[value]}
          </button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {SOAP_SECTIONS.map(({ key }) => (
          <SoapSectionEditor
            disabled={saving}
            key={key}
            onChange={(value) => setDraft((current) => ({ ...current, [key]: value }))}
            placeholder={t(`consultations.soap.placeholders.${key}`)}
            sectionKey={key}
            title={t(`consultations.soap.sections.${key}`)}
            value={draft[key]}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{hasText(draft) ? "Relisez la note, puis validez-la pour l’enregistrer au dossier." : "Écrivez ou dictez au moins une section."}</span>
        <Button
          disabled={!hasText(draft) || saving}
          onClick={() =>
            void save(draft, "", "saisie")
              .then(() => toast.success("Note validée et enregistrée au dossier."))
              .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "La note n’a pas été enregistrée."))
          }
          size="sm"
        >
          <CheckCircle className="size-3.5" /> Valider et enregistrer
        </Button>
      </div>
      <ConsultationAssistantPanel open={assistantOpen}>
        <Suspense
          fallback={
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <CircleNotch className="size-4 animate-spin" /> Ouverture de l’assistant…
            </p>
          }
        >
          <LocalConsultationAssistant
            existingNote={draft}
            onClose={() => setAssistantOpen(false)}
            // The assistant's own validation step is the vet's approval.
            onValidate={(soap, transcript, origin) => save(soap, transcript, origin)}
            patientId={patientId}
          />
        </Suspense>
      </ConsultationAssistantPanel>
    </section>
  );
}
