import { analyzeTreatmentDictation } from "../local-ai/treatment-routing";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  Check,
  CheckCircle,
  CircleNotch,
  FileText,
  Microphone,
  Search,
  Settings2,
  Sparkle,
  Stop,
  Trash,
  X,
  XCircle,
} from "@/lib/icons";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Message, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  readDictationLanguage,
  saveDictationLanguage,
  type DictationLanguage,
} from "../local-ai/whisper-language";
import { useSQLite } from "@/hooks/useSQLite";
import type { Appointment, ConsultationSoap, Owner, Patient } from "@/types/db";
import { useLocalConsultationAi } from "../hooks/use-local-consultation-ai";
import { nativeDictationEnabled } from "../local-ai/native-dictation";
import {
  EMPTY_MODEL_STATUS,
  getLocalModels,
  importLocalModel,
  type LocalModelStatus,
} from "../local-ai/models";
import {
  MAX_TRANSCRIPT_LENGTH,
  buildPatientContext,
} from "../local-ai/patient-context";
import {
  assertMentionsForPatient,
  autocompleteMention,
  insertPatientMention,
  normalizePatientName,
  resolvePatientMentions,
} from "../local-ai/patient-mentions";
import {
  SOAP_SECTIONS,
  localSoapSchema,
  type LocalSoapNote,
} from "../local-ai/soap-schema";
import { PatientDocumentSearch } from "./patient-document-search";
import { AssistantActivity } from "./assistant-activity";
import { DictationLevelMeter, MicrophonePermissionWait, MicrophoneWarmup } from "./dictation-states";
import {
  assembleGuidedNote,
  guidedDictationTranscript,
} from "../local-ai/guided-soap";
import { EMPTY_SOAP } from "../local-ai/soap-schema";
import {
  SOAP_FULL_HEADINGS,
  layoutSoapNote,
  soapNoteText,
} from "../local-ai/soap-layout";
import { Mascot, type MascotMood } from "@/components/mascot";
import { speciesIcon } from "@/lib/species-icon";
import {
  AssistantSlideoutIcon,
  useAssistantPanelControls,
} from "./consultation-assistant-panel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SearchSection } from "../local-ai/embedding-index";

type AssistantTab = "dictation" | "soap" | "search";

interface Props {
  appointmentId?: string;
  patientId?: string;
  existingNote?: LocalSoapNote;
  onClose: () => void;
  /** origin "dictee": the note is the dictation itself, reviewed and validated by the vet. */
  onValidate?: (
    note: LocalSoapNote,
    transcript: string,
    origin: SoapNoteOrigin
  ) => Promise<void>;
}

export type SoapNoteOrigin = "assistant" | "dictee";

// Same text once line breaks and spacing are set aside: nothing was reworded.
const sameWords = (a: string, b: string) =>
  a.replace(/\s+/gu, " ").trim() === b.replace(/\s+/gu, " ").trim();

/** The patient's species, as the small fine-line icon of the patient list. */
function PatientSpeciesGlyph({ species }: { species?: string }) {
  const { icon: Icon } = speciesIcon(species);
  return <Icon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />;
}

export default function LocalConsultationAssistant({
  appointmentId,
  patientId,
  existingNote = EMPTY_SOAP,
  onClose,
  onValidate,
}: Props) {
  const panelControls = useAssistantPanelControls();
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>(patientId);

  useEffect(() => {
    setSelectedPatientId(patientId);
  }, [patientId]);

  const effectivePatientId = selectedPatientId ?? patientId ?? "";
  const patients = useSQLite<Patient>("patients");
  const owners = useSQLite<Owner>("owners");
  const appointments = useSQLite<Appointment>("appointments");
  const soaps = useSQLite<ConsultationSoap>("consultation_soaps");
  // One microphone for the four rubrics; listening once its level has settled.
  const ai = useLocalConsultationAi({ holdMicrophone: true });

  const [activeTab, setActiveTab] = useState<AssistantTab>("dictation");
  const [dictationLanguage, setDictationLanguage] = useState(
    readDictationLanguage
  );
  const [models, setModels] = useState<LocalModelStatus>(EMPTY_MODEL_STATUS);
  const [checkingModels, setCheckingModels] = useState(true);
  // Desktop: the companion's status decides, not the installed WASM model,
  // and the Dicter button does not wait for the models check: a dictation
  // start re-verifies the companion itself and reports why if unavailable.
  const dictationReady = ai.native ? ai.nativeReady !== false : models.whisperReady;
  const [importing, setImporting] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  const [transcript, setTranscript] = useState("");
  const [sectionIndex, setSectionIndex] = useState(0);
  const [sectionResponses, setSectionResponses] = useState<string[]>(["", "", "", ""]);
  const sectionPrompts = [
    { letter: "S", title: "Motif et antécédents", question: "Quel est le motif de consultation ? Quels antécédents ou observations du propriétaire souhaitez-vous noter ?" },
    { letter: "O", title: "Examen clinique", question: "Qu’observez-vous à l’examen clinique ? Dictez les constantes, mesures et résultats disponibles." },
    { letter: "A", title: "Évaluation", question: "Quelle est votre évaluation ? Précisez le diagnostic ou les hypothèses envisagées." },
    { letter: "P", title: "Plan de soins", question: "Quel est le plan de soins ? Précisez les traitements, examens et consignes de suivi. Aucune posologie ne sera calculée." },
  ];
  const responses = sectionResponses.map((value, index) => index === sectionIndex ? transcript : value);
  // The rubric the vet answered is the section: it is passed as such, never re-guessed.
  const guidedAnswers: LocalSoapNote = {
    subjective: responses[0],
    objective: responses[1],
    assessment: responses[2],
    plan: responses[3],
  };
  const fullTranscript = guidedDictationTranscript(guidedAnswers);
  const changeSection = (next: number) => {
    setSectionResponses(responses);
    setTranscript(responses[next]);
    setSectionIndex(next);
    setCaret(0);
  };

  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [caret, setCaret] = useState(0);

  const [note, setNote] = useState<LocalSoapNote | null>(null);
  const [reviewSource, setReviewSource] = useState<LocalSoapNote | null>(null);
  const [assistantProposal, setAssistantProposal] =
    useState<LocalSoapNote | null>(null);
  // Who wrote the note under review: the accepted assistant draft, or the dictation itself.
  const [noteOrigin, setNoteOrigin] = useState<SoapNoteOrigin>("dictee");
  // Dictation the assistant's draft was refused for: generating again would give the same answer.
  const [refusedFor, setRefusedFor] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dictationScrollRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const patient = patients.data.find((entry) => entry.id === effectivePatientId);
  const resolvedExistingNote = existingNote ?? EMPTY_SOAP;
  const hasExistingNote = SOAP_SECTIONS.some(({ key }) =>
    Boolean(resolvedExistingNote[key]?.trim())
  );

  // The dictation as a note, rubric by rubric, word for word (existing note kept
  // for the rubrics left empty).
  const dictationNote = (): LocalSoapNote => {
    const existing = hasExistingNote ? resolvedExistingNote : EMPTY_SOAP;
    try {
      return assembleGuidedNote(existing, guidedAnswers);
    } catch {
      return existing;
    }
  };
  const activeSoapDraft: LocalSoapNote = useMemo(() => {
    if (note) return note;
    if (!fullTranscript.trim()) return hasExistingNote ? resolvedExistingNote : EMPTY_SOAP;
    return dictationNote();
    // dictationNote reads the same rubric answers as fullTranscript.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, fullTranscript, hasExistingNote, resolvedExistingNote]);
  const refused =
    refusedFor !== null && refusedFor === fullTranscript && !!ai.error && !ai.busy;
  // Way out of a refusal: the dictation becomes the note, laid out, for the vet to
  // reread and validate. It is traced as the vet's own note, not as a generated one.
  const reviewDictation = () => {
    ai.clearError();
    setMessage(null);
    setReviewSource(null);
    setAssistantProposal(null);
    setNoteOrigin("dictee");
    setNote(layoutSoapNote(dictationNote()));
    setNotice(
      "Note reprise mot pour mot de votre dictée, sans reformulation par l’assistant. Relisez chaque rubrique : en la validant, vous l’enregistrez comme votre note relue."
    );
    setActiveTab("soap");
  };

  const dataUnavailable =
    patients.loading ||
    appointments.loading ||
    soaps.loading ||
    !!(patients.error || appointments.error || soaps.error);

  const mentions = useMemo(
    () => resolvePatientMentions(fullTranscript, patients.data, choices),
    [choices, patients.data, fullTranscript]
  );

  const mentionError = useMemo(() => {
    try {
      if (effectivePatientId) {
        assertMentionsForPatient(
          fullTranscript,
          patients.data,
          effectivePatientId,
          choices
        );
      }
      return null;
    } catch (error) {
      return (error as Error).message;
    }
  }, [choices, effectivePatientId, patients.data, fullTranscript]);

  const range = autocompleteMention(transcript, caret);
  const suggestions = range
    ? patients.data
        .filter((entry) =>
          normalizePatientName(entry.name).startsWith(
            normalizePatientName(range.query)
          )
        )
        .slice(0, 7)
    : [];

  const patientLabel = (entry: Patient) => {
    const owner = owners.data.find((value) => value.id === entry.ownerId);
    return `${entry.species} · ${owner ? `${owner.firstName} ${owner.lastName}` : entry.id.slice(0, 8)}${entry.id === patientId ? " · Fiche ouverte" : ""}`;
  };

  useEffect(() => {
    let alive = true;
    getLocalModels()
      .then((status) => {
        if (!alive) return;
        setModels(status);
        setCheckingModels(false);
        if (!nativeDictationEnabled() && !status.whisperReady) setSetupOpen(true);
      })
      .catch(() => {
        if (alive) {
          setCheckingModels(false);
          setMessage(
            "Impossible de lire les modèles locaux. Réessayez après avoir relancé Baitari."
          );
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const choosePatient = (entry: Patient) => {
    if (!range) return;
    const inserted = insertPatientMention(transcript, range, entry.name);
    setTranscript(inserted.value);
    setCaret(inserted.caret);
    setChoices((previous) => ({
      ...previous,
      [normalizePatientName(entry.name)]: entry.id,
    }));
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(inserted.caret, inserted.caret);
    });
  };

  const importModel = async (kind: "whisper" | "generator") => {
    setMessage(null);
    setImporting(true);
    try {
      const status = await importLocalModel(kind);
      if (status) {
        setModels(status);
        toast.success("Installation locale terminée.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "L’importation du modèle a échoué."
      );
    } finally {
      setImporting(false);
    }
  };

  const stopDictation = async () => {
    await ai.stop();
  };

  useEffect(() => {
    if (ai.transcription) {
      setTranscript((previous) =>
        previous ? `${previous}\n${ai.transcription}` : ai.transcription!
      );
      setCaret(0);
    }
  }, [ai.transcription]);

  const generate = async () => {
    if (dataUnavailable || mentionError) return;
    if (sectionIndex < 3) { changeSection(sectionIndex + 1); return; }
    if (!fullTranscript.trim() && !hasExistingNote) {
      setMessage("Veuillez dicter ou saisir des observations avant de structurer la note.");
      return;
    }
    setMessage(null);
    setNotice(null);
    try {
      if (effectivePatientId && patient) {
        assertMentionsForPatient(
          fullTranscript,
          patients.data,
          patient.id,
          choices
        );
      }
      let context: ReturnType<typeof buildPatientContext>;
      try {
        if (patient && appointmentId) {
          context = buildPatientContext(
            patient,
            appointments.data,
            soaps.data,
            appointmentId
          );
        } else {
          context = {
            patient: {
              id: patient?.id ?? "none",
              nom: patient?.name ?? "Patient",
              espece: patient?.species ?? "Autre",
              race: patient?.breed ?? null,
              sexe: patient?.sex === "F" ? "F" : "M",
              naissance: patient?.dateOfBirth ?? null,
              statut: patient?.status ?? "sante",
              allergies: patient?.allergies ?? "",
              affectionsChroniques: patient?.chronicConditions ?? "",
              notes: patient?.generalNotes ?? "",
              poids: patient?.weightHistory?.slice(0, 600) ?? null,
            },
            consultation: {
              motif: "Consultation",
              date: new Date().toISOString(),
            },
            dernieresConsultations: [],
          };
        }
      } catch {
        context = {
          patient: {
            id: patient?.id ?? "none",
            nom: patient?.name ?? "Patient",
            espece: patient?.species ?? "Autre",
            race: patient?.breed ?? null,
            sexe: patient?.sex === "F" ? "F" : "M",
            naissance: patient?.dateOfBirth ?? null,
            statut: patient?.status ?? "sante",
            allergies: patient?.allergies ?? "",
            affectionsChroniques: patient?.chronicConditions ?? "",
            notes: patient?.generalNotes ?? "",
            poids: patient?.weightHistory?.slice(0, 600) ?? null,
          },
          consultation: {
            motif: "Consultation",
            date: new Date().toISOString(),
          },
          dernieresConsultations: [],
        };
      }

      const statements = analyzeTreatmentDictation(fullTranscript);
      const notices: string[] = [];
      if (statements.some((part) => part.kind === "treatment"))
        notices.push(
          "Les traitements sont conservés mot pour mot dans le Plan. Relisez-les avant de valider."
        );
      if (statements.some((part) => part.kind === "avoidance"))
        notices.push(
          "Alerte d’éviction : une consigne de ne pas administrer a été conservée dans le Plan. Elle ne constitue pas une prescription."
        );
      if (
        statements.some(
          (part) => part.kind === "history" || part.kind === "hypothesis"
        )
      )
        notices.push(
          "Les antécédents restent en Anamnèse (S), les hypothèses en Évaluation (A)."
        );
      if (statements.some((part) => part.setting === "acte-clinique"))
        notices.push("Acte en clinique repéré.");
      if (statements.some((part) => part.setting === "ordonnance-maison"))
        notices.push(
          "Administration à domicile repérée : ordonnance à relire."
        );
      const medications = [
        ...new Map(
          statements
            .flatMap((part) => part.medications)
            .map((drug) => [drug.brand.toLowerCase(), drug])
        ).values(),
      ];
      if (medications.length)
        notices.push(
          "Repères marque–DCI : " +
            medications
              .map((drug) => `${drug.brand} : ${drug.dci}`)
              .join(" ; ") +
            ". La dictée n’est pas modifiée."
        );
      if (notices.length) setNotice(notices.join("\n\n"));

      const source = dictationNote();
      let proposal = source;
      let origin: SoapNoteOrigin = "dictee";
      if (models.generatorReady) {
        setRefusedFor(null);
        const generated = await ai.generate(
          models,
          fullTranscript,
          context,
          guidedAnswers
        );
        if (!generated) {
          // Shown only if it failed (a cancellation leaves no error).
          setRefusedFor(fullTranscript);
          return;
        }
        origin = "assistant";
        try {
          proposal = hasExistingNote
            ? assembleGuidedNote(resolvedExistingNote, generated)
            : generated;
        } catch {
          proposal = generated;
        }
      } else {
        setNotice((previous) =>
          [
            previous,
            "L’assistant de rédaction n’est pas disponible. Vos observations ont été organisées pour relecture.",
          ]
            .filter(Boolean)
            .join("\n\n")
        );
      }
      setReviewSource(source);
      setAssistantProposal(proposal);
      setNoteOrigin(origin);
      // The note's skeleton is laid by code once the content is accepted: one
      // bullet per observation, numbered plan. Words and order are unchanged.
      setNote(layoutSoapNote(proposal));
      setActiveTab("soap");
    } catch (error) {
      setMessage(
        error instanceof Error && error.name !== "ZodError"
          ? error.message
          : "La note ne peut pas être préparée : vérifiez qu’elle contient une observation et que chaque rubrique, avec la note existante, ne dépasse pas 6 000 caractères."
      );
    }
  };

  const save = async () => {
    const candidate = note ?? activeSoapDraft;
    if (!candidate || saving || saved) return;
    setMessage(null);
    const parsed = localSoapSchema.safeParse(candidate);
    if (!parsed.success) {
      setMessage(
        "Vérifiez la note : une section dépasse 6 000 caractères ou la note est vide."
      );
      return;
    }
    try {
      if (effectivePatientId) {
        assertMentionsForPatient(
          fullTranscript,
          patients.data,
          effectivePatientId,
          choices
        );
      }
      if (effectivePatientId && !patient && !dataUnavailable)
        throw new Error(
          "La fiche patient n’est pas disponible. Réessayez après sa relecture."
        );
      if (patient && appointmentId) {
        buildPatientContext(
          patient,
          appointments.data,
          soaps.data,
          appointmentId
        );
      }
      setSaving(true);
      if (onValidate) {
        await onValidate(parsed.data, fullTranscript, noteOrigin);
        toast.success("Note relue et enregistrée dans la base locale.");
      } else {
        const formatted = soapNoteText(parsed.data);
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(formatted);
          toast.success("Note validée et copiée dans le presse-papier.");
        } else {
          toast.success("Note SOAP validée.");
        }
      }
      setSaved(true);
      ai.cancel();
      onClose();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "La note n’a pas été enregistrée. Votre brouillon reste disponible."
      );
    } finally {
      setSaving(false);
    }
  };

  const requestClose = () => {
    if (saving || importing) return;
    if (!saved && (ai.busy || fullTranscript.trim() || note)) {
      setDiscardOpen(true);
      return;
    }
    ai.cancel();
    onClose();
  };

  const visibleError = message ?? ai.error;

  const editTranscript = () => {
    setDiscardOpen(false);
    setActiveTab("dictation");
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleInsertExcerpt = (excerpt: string, targetSection?: SearchSection) => {
    const secKey: keyof LocalSoapNote =
      targetSection && targetSection in EMPTY_SOAP
        ? (targetSection as keyof LocalSoapNote)
        : "subjective";

    setNote((previous) => {
      const base = previous ?? activeSoapDraft;
      return {
        ...base,
        [secKey]: base[secKey] ? `${base[secKey]}\n\n${excerpt}` : excerpt,
      };
    });

    setTranscript((previous) => (previous ? `${previous}\n\n${excerpt}` : excerpt));
    toast.success("Extrait inséré dans vos notes.");
  };

  const hasNoteContent = Object.values(activeSoapDraft).some((val) => val.trim().length > 0);

  // The guided dictation reads like a conversation: the current question and
  // its field sit at the bottom, so the list opens there and follows each
  // rubric (and the models card opening or closing above it). A dictation
  // state appearing above the field (listening, permission, error) must not
  // push Stop and the language below the edge: follow it too.
  useLayoutEffect(() => {
    const list = dictationScrollRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [activeTab, sectionIndex, setupOpen, ai.phase, visibleError]);

  const assistantMood: MascotMood = saved
    ? "happy"
    : (ai.busy || saving)
      ? "thinking"
      : "idle";

  return (
    <section
      aria-label="Assistant de consultation"
      className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden text-foreground"
    >
      {/* 1. Header Pinned */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Mascot
            interactive
            size={48}
            mood={assistantMood}
            className="shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="t-14 font-semibold tracking-tight text-foreground">
                Assistant Baitari
              </h3>
              {!patientId && patients.data.length > 0 && (
                <Select
                  value={effectivePatientId || "none"}
                  onValueChange={(val) => setSelectedPatientId(val === "none" || !val ? undefined : val)}
                >
                  <SelectTrigger className="h-6 max-w-[140px] rounded-lg border-border/70 px-2 t-12">
                    <SelectValue placeholder="Patient…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tous / Général</SelectItem>
                    {patients.data.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className="flex min-w-0 items-center gap-1 t-12 text-muted-foreground">
              {patient?.name ? (
                <>
                  <PatientSpeciesGlyph species={patient.species} />
                  <span className="truncate">{patient.name} · Traitement local</span>
                </>
              ) : (
                <span className="truncate">Traitement local</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {panelControls && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    data-assistant-panel-toggle
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Replier le panneau assistant"
                    aria-controls={panelControls.panelId}
                    aria-expanded={true}
                    onClick={panelControls.collapse}
                    className="size-8 text-muted-foreground hover:text-foreground"
                  />
                }
              >
                <AssistantSlideoutIcon />
              </TooltipTrigger>
              <TooltipContent>Replier l’assistant</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Configuration des modèles locaux"
                  aria-expanded={setupOpen}
                  disabled={ai.busy || importing || saving || saved}
                  onClick={() => setSetupOpen((val) => !val)}
                  className={cn(
                    "size-8 text-muted-foreground hover:text-foreground",
                    setupOpen && "bg-muted text-foreground"
                  )}
                />
              }
            >
              <Settings2 className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Modèles locaux</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Fermer l’assistant"
                  disabled={saving || importing}
                  onClick={requestClose}
                  className="size-8 text-muted-foreground hover:text-foreground"
                />
              }
            >
              <X className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Fermer</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 2. Segmented Navigation Bar */}
      <div className="mt-3 flex shrink-0 items-center justify-between gap-1 rounded-xl bg-muted/70 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("dictation")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 t-12 font-medium transition",
            activeTab === "dictation"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Microphone className="size-3.5" />
          <span>Dictée libre</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("soap")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 t-12 font-medium transition",
            activeTab === "soap"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className="size-3.5" />
          <span>Validation SOAP</span>
          {hasNoteContent ? (
            <span className="size-1.5 rounded-full bg-primary" />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("search")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 t-12 font-medium transition",
            activeTab === "search"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Search className="size-3.5" />
          <span>Cas similaires</span>
        </button>
      </div>

      {/* 3. Settings Overlay / Popover */}
      {setupOpen && (
        <div className="mt-3 shrink-0 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h4 className="t-13 font-semibold text-foreground">
              Modèles IA sur cet ordinateur
            </h4>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setSetupOpen(false)}
              className="size-6 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </Button>
          </div>
          <p className="t-12 leading-relaxed text-muted-foreground">
            Vos dictées et notes restent exclusivement sur votre appareil. Aucun flux n’est envoyé sur internet.
          </p>

          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2 t-12">
              <div>
                <span className="font-medium text-foreground">Dictée vocale</span>
                <p className="t-12 text-muted-foreground">
                  {models.whisperReady ? "Modèle actif et disponible" : "Fichiers à initialiser"}
                </p>
              </div>
              <Button
                size="xs"
                variant={models.whisperReady ? "secondary" : "outline"}
                disabled={ai.busy || importing || saving}
                onClick={() => void importModel("whisper")}
                className="gap-1 t-12"
              >
                {models.whisperReady ? <Check className="size-3 text-emerald-500" /> : null}
                {models.whisperReady ? "Prêt" : "Installer"}
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2 t-12">
              <div>
                <span className="font-medium text-foreground">Assistant de rédaction</span>
                <p className="t-12 text-muted-foreground">
                  {models.generatorReady ? "Modèle actif et disponible" : "Fichiers à initialiser"}
                </p>
              </div>
              <Button
                size="xs"
                variant={models.generatorReady ? "secondary" : "outline"}
                disabled={ai.busy || importing || saving}
                onClick={() => void importModel("generator")}
                className="gap-1 t-12"
              >
                {models.generatorReady ? <Check className="size-3 text-emerald-500" /> : null}
                {models.generatorReady ? "Prêt" : "Installer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Tab 1: Dictée Libre Flow */}
      {activeTab === "dictation" && (
        <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div ref={dictationScrollRef} className="assistant-dictation-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
            {/* Assistant Welcome Card: the mascot speaks once, in the header. */}
            <div className="assistant-welcome-card flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-3.5 shadow-xs">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="t-13 font-semibold text-foreground">
                    Dictée de consultation
                  </span>
                  <span className="t-12 text-muted-foreground">
                    Confidentiel & Local
                  </span>
                </div>
                <div className="mt-1 t-13 leading-relaxed text-muted-foreground">
                  Nous allons parcourir quatre rubriques. Dictez ou écrivez vos observations, puis relisez la note. Rien n’est enregistré sans votre validation.
                </div>
              </div>
            </div>

            {sectionPrompts.slice(0, sectionIndex + 1).map((step, index) => (
              <div key={step.letter} className="flex flex-col gap-2">
                <Message align="start"><MessageContent>
                  <Bubble className="assistant-section-prompt max-w-[92%]"><BubbleContent className="bg-blue-600 text-white">
                    <p className="mb-1 text-xs text-blue-100">{step.letter} · {step.title}</p>
                    <p className="text-sm leading-relaxed">{step.question}</p>
                  </BubbleContent></Bubble>
                </MessageContent></Message>
                {index < sectionIndex && responses[index].trim() && (
                  <Message align="end"><MessageContent><Bubble variant="muted"><BubbleContent className="whitespace-pre-wrap">{responses[index]}</BubbleContent></Bubble></MessageContent></Message>
                )}
                {index < sectionIndex && (
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={ai.busy || importing}
                    onClick={() => changeSection(index)}
                    className="self-end t-12"
                  >
                    Modifier « {step.title} »
                  </Button>
                )}
              </div>
            ))}

            {/* Whisper Live Listening Banner */}
            {ai.phase === "listening" && (
              <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 t-13 text-destructive shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <DictationLevelMeter read={ai.readLevel} />
                  <span className="font-medium">
                    Écoute en cours · {Math.floor(ai.seconds / 60)}:
                    {String(ai.seconds % 60).padStart(2, "0")}
                  </span>
                  <span className="hidden t-13 text-destructive/80 sm:inline">
                    Parlez naturellement, puis relisez votre transcription.
                  </span>
                </div>
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={() => void stopDictation()}
                  className="h-7 gap-1 px-2.5 t-12 font-medium"
                >
                  <Stop className="size-3 text-white" />
                  Arrêter
                </Button>
              </div>
            )}

            {/* Waiting for the microphone permission: always a way out. */}
            {ai.phase === "microphone" && <MicrophonePermissionWait onCancel={ai.cancel} />}

            {/* New capture: the first seconds arrive attenuated, so speech waits for « Écoute en cours ». */}
            {ai.phase === "warming" && <MicrophoneWarmup onCancel={ai.cancel} />}

            {/* AI Activity progress */}
            {ai.busy && ai.phase !== "listening" && ai.phase !== "microphone" && ai.phase !== "warming" && (
              <AssistantActivity
                phase={ai.phase}
                progress={ai.progress}
                hasTranscript={!!fullTranscript}
                patientVerified={Boolean(patient)}
                hasNote={!!note}
                failed={!!visibleError}
              />
            )}

            {/* Error banner */}
            {visibleError && (
              <div
                role="alert"
                className="flex flex-col gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 t-12 text-destructive"
              >
                <div className="flex items-center gap-2">
                  <XCircle className="size-4 shrink-0" />
                  <span>{visibleError}</span>
                </div>
                {refused && (
                  <div className="flex flex-col gap-2 border-t border-destructive/20 pt-2.5 text-foreground">
                    <p className="t-12 text-muted-foreground">
                      Relancer l’assistant sur la même dictée donnerait la même réponse. Vous pouvez reprendre votre dictée telle quelle comme note à relire et valider vous-même, ou corriger une rubrique.
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button size="xs" onClick={reviewDictation} className="t-12">
                        Relire ma dictée comme note
                      </Button>
                      {sectionPrompts.map((step, index) => (
                        <Button
                          key={step.letter}
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            ai.clearError();
                            changeSection(index);
                          }}
                          className="t-12"
                        >
                          Modifier « {step.title} »
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dictation Workspace Container */}
            <div className="assistant-dictation-workspace flex min-h-fit flex-1 flex-col gap-2 rounded-2xl border border-border/80 bg-card p-3 shadow-xs">
              {/* Mentions tags & patient autocomplete */}
              <div className="flex items-center justify-between gap-2 px-0.5">
                <span className="t-12 font-medium text-foreground">
                  Section {sectionIndex + 1}/4 · {sectionPrompts[sectionIndex].title}
                </span>
                {mentions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {mentions.map((mention) => (
                      <span
                        key={mention.key}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 t-12",
                          mention.patient
                            ? "bg-primary/10 font-medium text-primary"
                            : "bg-destructive/10 font-medium text-destructive"
                        )}
                      >
                        @{mention.name}
                        {mention.patient
                          ? ` (${mention.patient.name})`
                          : " (Introuvable)"}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggestions dropdown for @mentions */}
              {suggestions.length > 0 && !ai.busy && (
                <div
                  role="listbox"
                  aria-label="Suggestions de patients"
                  id={id + "-suggestions"}
                  className="max-h-36 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-md"
                >
                  {suggestions.map((entry, idx) => (
                    <button
                      key={entry.id}
                      type="button"
                      role="option"
                      aria-selected={suggestionIndex === idx}
                      className={cn(
                        "flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-1.5 text-left t-12",
                        suggestionIndex === idx
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choosePatient(entry)}
                    >
                      <span className="font-medium text-foreground">
                        {entry.name}
                      </span>
                      <span className="t-12 text-muted-foreground">
                        {patientLabel(entry)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Free Textarea */}
              <Textarea
                ref={textareaRef}
                id={id + "-transcript"}
                value={transcript}
                maxLength={MAX_TRANSCRIPT_LENGTH}
                disabled={ai.busy && ai.phase !== "listening" || importing}
                placeholder={`Vos observations · ${sectionPrompts[sectionIndex].title}…`}
                className="assistant-dictation-field min-h-[120px] flex-1 resize-none rounded-[10px] border-border bg-background px-3 py-2.5 t-13 leading-relaxed shadow-none focus-visible:border-muted-foreground focus-visible:ring-0"
                onChange={(e) => {
                  setTranscript(e.target.value);
                  setCaret(e.target.selectionStart);
                  setSuggestionIndex(0);
                }}
                onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
                onKeyDown={(e) => {
                  if (suggestions.length) {
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      setSuggestionIndex(
                        (prev) =>
                          (prev + (e.key === "ArrowDown" ? 1 : -1) + suggestions.length) %
                          suggestions.length
                      );
                      return;
                    }
                    if (e.key === "Enter" || e.key === "Tab") {
                      e.preventDefault();
                      choosePatient(suggestions[suggestionIndex] ?? suggestions[0]);
                      return;
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setCaret(0);
                      return;
                    }
                  }
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    if (refused && sectionIndex === 3) reviewDictation();
                    else void generate();
                  }
                }}
              />

              {/* Toolbar beneath textarea */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={ai.phase === "listening" ? "destructive" : "default"}
                    className="h-8 gap-1.5 px-3 t-12"
                    disabled={
                      ai.busy && ai.phase !== "listening" ||
                      importing ||
                      (!ai.native && checkingModels) ||
                      !dictationReady
                    }
                    onClick={() => {
                      if (ai.phase === "listening") {
                        void stopDictation();
                      } else {
                        void ai.start(models, dictationLanguage);
                      }
                    }}
                  >
                    {ai.phase === "listening" ? (
                      <>
                        <Stop className="size-3.5 animate-pulse" />
                        <span>
                          Stop · {Math.floor(ai.seconds / 60)}:
                          {String(ai.seconds % 60).padStart(2, "0")}
                        </span>
                      </>
                    ) : (
                      <>
                        <Microphone className="size-3.5" />
                        <span>{transcript ? "Compléter" : "Dicter"}</span>
                      </>
                    )}
                  </Button>

                  <Select
                    value={dictationLanguage}
                    disabled={ai.busy || importing || saving}
                    onValueChange={(val) => {
                      const next: DictationLanguage =
                        val === "auto" ? "auto" : "fr";
                      setDictationLanguage(next);
                      saveDictationLanguage(next);
                    }}
                  >
                    <SelectTrigger className="h-8 t-12">
                      <SelectValue>
                        {dictationLanguage === "fr" ? "Français" : "Auto"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="auto">Automatique</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  {transcript.trim() && !ai.busy && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setTranscript("")}
                      title="Effacer la dictée"
                      className="size-8 text-muted-foreground hover:text-foreground"
                    >
                      <Trash className="size-3.5" />
                    </Button>
                  )}
                </div>

                <div className="t-12 text-muted-foreground tabular-nums">
                  {transcript.length} car. ·{" "}
                  {transcript.trim()
                    ? transcript.trim().split(/\s+/).length
                    : 0}{" "}
                  mots
                </div>
              </div>
            </div>
          </div>

          <div className="assistant-section-nav flex items-center justify-between py-2">
            {sectionIndex > 0 ? (
              <Button variant="outline" size="sm" disabled={ai.busy || importing} onClick={() => changeSection(sectionIndex - 1)} className="gap-1 t-12">
                <ArrowRight className="size-3.5 rotate-180" />
                Revenir à « {sectionPrompts[sectionIndex - 1].title} »
              </Button>
            ) : <span />}
            {sectionIndex < 3 && <Button variant="ghost" size="sm" disabled={ai.busy || importing} onClick={() => changeSection(sectionIndex + 1)}>Passer cette rubrique</Button>}
          </div>
          {/* Dictation Bottom Action Bar */}
          <div className="shrink-0 border-t border-border/80 pt-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 t-13 text-muted-foreground">
                {hasExistingNote && (
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 t-12 font-medium text-foreground/80">
                    Note existante
                  </span>
                )}
                {patient && (
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="shrink-0">Patient :</span>
                    <PatientSpeciesGlyph species={patient.species} />
                    <strong className="truncate text-foreground">{patient.name}</strong>
                  </span>
                )}
              </div>

              <Button
                variant="default"
                size="default"
                disabled={
                  ai.busy ||
                  importing ||
                  (sectionIndex === 3 && !fullTranscript.trim() && !hasExistingNote) ||
                  !!mentionError
                }
                onClick={() => (refused && sectionIndex === 3 ? reviewDictation() : void generate())}
                title="Structurer la consultation en note SOAP (⌘+Entrée)"
                className="h-9 gap-1.5 px-4 t-13 font-semibold tracking-[-0.01em] shadow-sm hover:shadow active:scale-[0.98] transition"
              >
                <Sparkle className="size-3.5 stroke-[2.2]" />
                <span>{sectionIndex < 3 ? `Continuer vers ${sectionPrompts[sectionIndex + 1].title}` : refused ? "Relire ma dictée comme note" : "Relire la note SOAP"}</span>
                <ArrowRight className="size-3.5 stroke-[2.2]" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Dedicated SOAP Validation View */}
      {activeTab === "soap" && (
        <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
            {/* Overview Banner */}
            <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="t-14 font-semibold text-foreground">
                    Relecture & Validation SOAP
                  </h4>
                  <p className="mt-0.5 t-12 text-muted-foreground">
                    {hasExistingNote ? "Note existante intégrée. " : ""}
                    Relisez les 4 rubriques ci-dessous et validez la note en un clic unique.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 gap-1 t-12 font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
                >
                  <CheckCircle className="size-3" />
                  Validation unique
                </Badge>
              </div>

              {models.generatorReady && !assistantProposal && fullTranscript.trim() && refusedFor !== fullTranscript && (
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                  <span className="t-12 text-muted-foreground">
                    Améliorer la formulation avec l’assistant ?
                  </span>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={ai.busy}
                    onClick={() => void generate()}
                    className="gap-1.5 t-12"
                  >
                    <Sparkle className="size-3" />
                    Structurer avec l’IA
                  </Button>
                </div>
              )}
            </div>

            {notice && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 t-12 leading-relaxed text-foreground">
                <div className="flex items-start gap-2">
                  <Sparkle className="mt-0.5 size-3.5 text-primary" />
                  <p className="whitespace-pre-line">{notice}</p>
                </div>
              </div>
            )}

            {visibleError && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 t-12 text-destructive"
              >
                {visibleError}
              </div>
            )}

            {/* 4 SOAP Section Cards */}
            {SOAP_SECTIONS.map(({ key }) => {
              const currentValue = activeSoapDraft[key] ?? "";

              return (
                <div
                  key={key}
                  className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card p-3.5 shadow-xs transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`soap-field-${key}`}
                      className="t-13 font-semibold text-foreground"
                    >
                      {SOAP_FULL_HEADINGS[key]}
                    </label>
                    <span className="t-12 text-muted-foreground tabular-nums">
                      {currentValue.length} / 6 000
                    </span>
                  </div>

                  <Textarea
                    id={`soap-field-${key}`}
                    rows={3}
                    maxLength={6000}
                    value={currentValue}
                    disabled={saving || saved}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void save();
                      }
                    }}
                    onChange={(event) => {
                      const updatedValue = event.target.value;
                      setNote((previous) => ({
                        ...(previous ?? activeSoapDraft),
                        [key]: updatedValue,
                      }));
                    }}
                    placeholder="Aucune observation saisie pour cette rubrique."
                    className="min-h-20 resize-y bg-background t-13 leading-relaxed"
                  />

                  {/* Comparative diff if assistant generated proposal */}
                  {reviewSource && assistantProposal && (
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 t-12 leading-relaxed">
                      {sameWords(reviewSource[key], assistantProposal[key]) ? (
                        <p className="text-muted-foreground">
                          Aucune modification proposée par l’assistant.
                        </p>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            Proposition formulée par l’assistant :
                          </p>
                          <p className="text-muted-foreground">
                            Dictée : {reviewSource[key] || "Vide"}
                          </p>
                          <p className="text-foreground">
                            Formulation :{" "}
                            <span className="rounded bg-muted px-1 font-medium">
                              {assistantProposal[key]}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky Bottom Actions */}
          <div className="shrink-0 border-t border-border/80 pt-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={editTranscript}
                disabled={saving}
                className="h-9 t-12"
              >
                Revoir la dictée
              </Button>

              <Button
                variant="default"
                size="sm"
                disabled={saving || !!mentionError || dataUnavailable}
                onClick={() => void save()}
                className="h-9 flex-1 gap-1.5 t-12 font-medium"
              >
                {saving ? (
                  <CircleNotch className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="size-3.5" />
                )}
                <span>
                  {saving ? "Enregistrement…" : "Valider et enregistrer la note (⌘+Entrée)"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Tab 3: Dedicated Similar Cases Semantic Search */}
      {activeTab === "search" && (
        <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
          <PatientDocumentSearch
            key={patientId}
            patientId={patientId}
            onInsertExcerpt={handleInsertExcerpt}
          />
        </div>
      )}

      {/* Discard Dialog */}
      {discardOpen && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-4 z-50 rounded-xl border border-border bg-card p-4 shadow-xl"
        >
          <p className="t-13 font-medium text-foreground">
            Abandonner cette session d’assistant ?
          </p>
          <p className="mt-1 t-12 text-muted-foreground">
            Vos modifications non validées seront perdues.
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDiscardOpen(false)}
              className="t-12"
            >
              Poursuivre
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                ai.cancel();
                onClose();
              }}
              className="t-12"
            >
              Abandonner
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
