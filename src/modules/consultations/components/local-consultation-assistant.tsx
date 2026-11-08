import { analyzeTreatmentDictation } from "../local-ai/treatment-routing";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  FileText,
  Microphone,
  Search,
  Settings2,
  X,
  XCircle,
} from "@/lib/icons";
import { ArrowRight as ArrowRightIcon, FileText as FileTextIcon, Mic, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button as ActionButton, IconButton } from "@/components/ui/action-button";
import { AgentComposer } from "@/components/ui/agent-composer";
import { AgentQuestion } from "@/components/ui/agent-question";
import { AgentStatus } from "@/components/ui/agent-status";
import { ChatThread, type ThreadMessage } from "@/components/ui/chat-thread";
import { UserMessage } from "@/components/ui/user-message";
import { ConfirmationCard } from "@/components/ui/confirmation-card";
import { ContextWindowMeter } from "@/components/ui/context-window-meter";
import { Segmented } from "@/components/ui/segmented-control";
import { StreamingMessage } from "@/components/ui/streaming-message";
import { ToolApprovalQueue, type ApprovalDecision, type ApprovalRequest } from "@/components/ui/tool-approval-queue";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
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
import { getPatientStatusMeta } from "@/config/status-meta";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/Avatar";
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

const WELCOME_WORDS =
  "Dictez ou écrivez vos observations, rubrique par rubrique, puis relisez la note. Rien n’est enregistré sans votre validation.".split(" ");

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
  // When each rubric's question reached the conversation, for the times of the thread.
  const [stepAt, setStepAt] = useState<string[]>(() => [new Date().toISOString()]);
  const [noteAt] = useState(() => new Date().toISOString());
  const { currentUser } = useAuth();
  // The welcome, and only the welcome, is written out word by word when the panel opens (the words fade in as they come, as
  // in StreamingMessage). The questions, the answers and the note always appear whole. With reduced motion it is shown whole.
  const [welcomeWords, setWelcomeWords] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? WELCOME_WORDS.length
      : 1,
  );
  useEffect(() => {
    if (welcomeWords >= WELCOME_WORDS.length) return;
    const timer = setTimeout(() => setWelcomeWords((count) => count + 1), 70);
    return () => clearTimeout(timer);
  }, [welcomeWords]);
  const changeSection = (next: number) => {
    setStepAt((previous) => {
      const grown = [...previous];
      while (grown.length <= next) grown.push(new Date().toISOString());
      return grown;
    });
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

  // The vet's decision on each rubric the assistant reworded: nothing is saved while one is still to be examined.
  const [decisions, setDecisions] = useState<Partial<Record<keyof LocalSoapNote, ApprovalDecision>>>({});
  // When the microphone started listening, for the timer of the status card.
  const [listeningSince, setListeningSince] = useState(() => Date.now());

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dictationScrollRef = useRef<HTMLDivElement>(null);

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
  const proposalRequests: ApprovalRequest[] = useMemo(() => {
    if (!reviewSource || !assistantProposal) return [];
    return SOAP_SECTIONS.filter(({ key }) => !sameWords(reviewSource[key], assistantProposal[key])).map(
      ({ key, title }) => ({
        id: key,
        title,
        status: decisions[key] ?? "pending",
        before: reviewSource[key],
        after: assistantProposal[key],
      }),
    );
  }, [assistantProposal, decisions, reviewSource]);
  const pendingProposals = proposalRequests.filter((request) => request.status === "pending").length;
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
    if (ai.phase === "listening") setListeningSince(Date.now() - ai.seconds * 1000);
    // Only the moment it starts: the timer then counts on its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ai.phase]);

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
      setDecisions({});
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
    // Nothing the assistant proposed is written before the vet has examined it.
    if (pendingProposals > 0) {
      setMessage(
        `${pendingProposals} reformulation${pendingProposals > 1 ? "s" : ""} de l’assistant ${pendingProposals > 1 ? "sont" : "est"} à examiner avant d’enregistrer la note.`
      );
      return;
    }
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

  // Accepting keeps the assistant's wording; refusing puts the vet's own words back, laid out like the rest of the note.
  const decideProposals = (requests: ApprovalRequest[], decision: ApprovalDecision) => {
    if (!reviewSource || !assistantProposal) return;
    setDecisions((previous) => ({
      ...previous,
      ...Object.fromEntries(requests.map((request) => [request.id, decision])),
    }));
    if (decision === "denied") {
      const own = layoutSoapNote(reviewSource);
      setNote((previous) => ({
        ...(previous ?? activeSoapDraft),
        ...Object.fromEntries(requests.map((request) => [request.id, own[request.id as keyof LocalSoapNote]])),
      }));
    }
  };
  const undoProposal = (request: ApprovalRequest) => {
    setDecisions((previous) => {
      const next = { ...previous };
      delete next[request.id as keyof LocalSoapNote];
      return next;
    });
    if (request.status === "denied" && assistantProposal) {
      const proposed = layoutSoapNote(assistantProposal);
      setNote((previous) => ({
        ...(previous ?? activeSoapDraft),
        [request.id]: proposed[request.id as keyof LocalSoapNote],
      }));
    }
  };
  // The note's own warnings (treatments kept word for word, avoidance alerts) travel with the card that confirms it.
  const noteWarnings = notice ? notice.split(/\n{2,}/).filter(Boolean) : [];

  // The guided dictation reads like a conversation: the current question and
  // its field sit at the bottom, so the list opens there and follows each
  // rubric (and the models card opening or closing above it). A dictation
  // state appearing above the field (listening, permission, error) must not
  // push Stop and the language below the edge: follow it too.
  useLayoutEffect(() => {
    const list = dictationScrollRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [activeTab, sectionIndex, setupOpen, ai.phase, visibleError]);

  const threadMessages: ThreadMessage[] = [
    {
      id: "welcome",
      role: "assistant",
      at: stepAt[0],
      content: (
        <StreamingMessage
          className="max-w-none"
          data={{
            status: welcomeWords < WELCOME_WORDS.length ? "streaming" : "done",
            content: WELCOME_WORDS.slice(0, welcomeWords).join(" "),
          }}
          bubble
          showActions={false}
          showHeader={false}
        />
      ),
    },
    ...sectionPrompts.slice(0, sectionIndex + 1).flatMap((step, index): ThreadMessage[] => {
      const answered = index < sectionIndex;
      const reply = responses[index].trim();
      const edit = answered ? (
        <ActionButton
          disabled={ai.busy || importing}
          onClick={() => changeSection(index)}
          variant="quiet"
        >
          Modifier « {step.title} »
        </ActionButton>
      ) : null;
      return [
        {
          id: `prompt-${step.letter}`,
          role: "assistant",
          at: stepAt[index] ?? stepAt[0],
          content: (
            <div className="flex flex-col items-start gap-1">
              <StreamingMessage
                className="assistant-section-prompt max-w-none"
                data={{ status: "done", content: `**${step.letter} · ${step.title}**\n\n${step.question}` }}
                bubble
                showActions={false}
                showHeader={false}
              />
              {answered && !reply ? edit : null}
            </div>
          ),
        },
        ...(answered && reply
          ? [
              {
                id: `answer-${step.letter}`,
                role: "user" as const,
                plain: true,
                at: stepAt[index + 1] ?? stepAt[index] ?? stepAt[0],
                content: (
                  <div className="flex flex-col items-end gap-1">
                    <UserMessage data={{ id: `answer-${step.letter}`, content: responses[index] }} />
                    {edit}
                  </div>
                ),
              },
            ]
          : []),
      ];
    }),
  ];

  const assistantMood: MascotMood = saved
    ? "happy"
    : (ai.busy || saving)
      ? "thinking"
      : "idle";

  // The assistant in the conversation is the mascot, with the mood the header shows; the vet is the vet's own avatar.
  const renderThreadAvatar = (message: ThreadMessage) =>
    message.role === "assistant" ? (
      <Mascot mood={assistantMood} overflow size={28} />
    ) : (
      <UserAvatar
        className="size-7 shrink-0"
        name={currentUser?.displayName || "Vous"}
        size="sm"
        src={currentUser?.avatarUrl ?? undefined}
      />
    );

  return (
    <section
      aria-label="Assistant de consultation"
      className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden text-foreground"
    >
      {/* 1. Header Pinned */}
      <div className="assistant-panel-header flex shrink-0 items-center justify-between gap-3 px-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.125rem] font-semibold leading-6 tracking-tight text-foreground">
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
          {patient?.name ? (
            <p className="flex min-w-0 items-center gap-1.5 t-12 text-muted-foreground">
              <PatientSpeciesGlyph species={patient.species} />
              <span className="truncate font-medium text-foreground">{patient.name}</span>
              <span className="shrink-0">· {patient.species}</span>
              <span className="shrink-0">· {getPatientStatusMeta(patient.status).label}</span>
            </p>
          ) : null}
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

      {/* The content: a white card under the grey band of the header. */}
      <div className="mx-3 mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-[var(--card-inset)] p-3">
      {/* 2. Tabs: few, and the validation tab appears once there is a note to read. */}
      <div className="shrink-0">
        <Segmented<AssistantTab>
          className="flex w-full [&>button]:flex-1"
          label="Sections de l’assistant"
          onValueChange={setActiveTab}
          options={[
            {
              value: "dictation",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Microphone className="size-3.5" />
                  Dictée libre
                </span>
              ),
            },
            ...(hasNoteContent || activeTab === "soap"
              ? [
                  {
                    value: "soap" as const,
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="size-3.5" />
                        Validation SOAP
                        {pendingProposals > 0 ? <span className="size-1.5 rounded-full bg-brand" /> : null}
                      </span>
                    ),
                  },
                ]
              : []),
            {
              value: "search",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Search className="size-3.5" />
                  Cas similaires
                </span>
              ),
            },
          ]}
          value={activeTab}
        />
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
                <span className="font-medium text-foreground">Assistant IA</span>
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
            {/* The conversation: the assistant's questions, the vet's answers. The mascot speaks once, in the header. */}
            <ChatThread
              messages={threadMessages}
              renderAvatar={renderThreadAvatar}
              showNames={false}
              userName="Vous"
            />

            {/* Listening: the status card, with the real microphone level. */}
            {ai.phase === "listening" && (
              <AgentStatus
                className="max-w-none"
                data={{
                  label: "Écoute en cours",
                  detail: "Parlez naturellement, puis relisez votre transcription.",
                  startedAt: listeningSince,
                }}
                meter={<DictationLevelMeter read={ai.readLevel} />}
                onStop={() => void stopDictation()}
              />
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
                className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 t-12 text-destructive"
              >
                <XCircle className="size-4 shrink-0" />
                <span>{visibleError}</span>
              </div>
            )}

            {/* Refused: the way out is a question with its options, answered by one click. */}
            {refused && (
              <AgentQuestion
                agent="assistant"
                data={{
                  question:
                    "Relancer l’assistant sur la même dictée donnerait la même réponse. Que souhaitez-vous faire ?",
                  options: [
                    {
                      id: "review",
                      label: "Relire ma dictée comme note",
                      description: "Votre dictée devient la note, mot pour mot, à relire et valider vous-même.",
                      icon: FileTextIcon,
                    },
                    ...sectionPrompts.map((step, index) => ({
                      id: `edit-${index}`,
                      label: `Corriger « ${step.title} »`,
                    })),
                  ],
                }}
                onSubmit={(answer) => {
                  const choice = answer.optionIds[0];
                  if (choice === "review") reviewDictation();
                  else if (choice?.startsWith("edit-")) {
                    ai.clearError();
                    changeSection(Number(choice.slice(5)));
                  }
                }}
              />
            )}

            {/* Dictation workspace */}
            <div className="assistant-dictation-workspace flex min-h-fit flex-1 flex-col gap-2">
              {/* Progress of the four rubrics, and the patients mentioned */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-3 t-12 font-medium text-foreground">
                  <span aria-hidden="true" className="flex gap-1">
                    {sectionPrompts.map((step, index) => (
                      <span
                        key={step.letter}
                        className={cn("h-1 w-6 rounded-full", index <= sectionIndex ? "bg-brand" : "bg-foreground/[0.12]")}
                      />
                    ))}
                  </span>
                  Rubrique {sectionIndex + 1} sur 4 · {sectionPrompts[sectionIndex].title}
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
                        {mention.patient ? ` (${mention.patient.name})` : " (Introuvable)"}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <AgentComposer
                className="flex-1"
                fill
                disabled={(ai.busy && ai.phase !== "listening") || importing}
                label="Vos observations"
                maxLength={MAX_TRANSCRIPT_LENGTH}
                menu={
                  suggestions.length > 0 && !ai.busy
                    ? {
                        label: "Suggestions de patients",
                        items: suggestions.map((entry) => ({
                          key: entry.id,
                          label: entry.name,
                          detail: patientLabel(entry),
                        })),
                        active: suggestionIndex,
                        onActiveChange: setSuggestionIndex,
                        onPick: (item) => {
                          const entry = suggestions.find((candidate) => candidate.id === item.key);
                          if (entry) choosePatient(entry);
                        },
                        onDismiss: () => setCaret(0),
                      }
                    : undefined
                }
                meter={
                  <ContextWindowMeter
                    data={{
                      limit: MAX_TRANSCRIPT_LENGTH,
                      segments: [{ id: "dictation", label: "Dictée", tokens: transcript.length }],
                    }}
                    variant="inline"
                  />
                }
                onCaretChange={setCaret}
                onSubmit={() => {
                  if (refused && sectionIndex === 3) reviewDictation();
                  else void generate();
                }}
                onValueChange={(value, nextCaret) => {
                  setTranscript(value);
                  setCaret(nextCaret);
                  setSuggestionIndex(0);
                }}
                placeholder={`Vos observations · ${sectionPrompts[sectionIndex].title}…`}
                textareaRef={textareaRef}
                toolbar={
                  <>
                    <ActionButton
                      disabled={
                        (ai.busy && ai.phase !== "listening") ||
                        importing ||
                        (!ai.native && checkingModels) ||
                        !dictationReady
                      }
                      icon={ai.phase === "listening" ? Square : Mic}
                      onClick={() => {
                        if (ai.phase === "listening") {
                          void stopDictation();
                        } else {
                          void ai.start(models, dictationLanguage);
                        }
                      }}
                      variant={ai.phase === "listening" ? "danger" : "primary"}
                    >
                      {ai.phase === "listening"
                        ? `Stop · ${Math.floor(ai.seconds / 60)}:${String(ai.seconds % 60).padStart(2, "0")}`
                        : transcript
                          ? "Compléter"
                          : "Dicter"}
                    </ActionButton>
                    <Segmented<DictationLanguage>
                      label="Langue de la dictée"
                      onValueChange={(next) => {
                        setDictationLanguage(next);
                        saveDictationLanguage(next);
                      }}
                      options={[
                        { value: "fr", label: "Français", disabled: ai.busy || importing || saving },
                        { value: "auto", label: "Auto", disabled: ai.busy || importing || saving },
                      ]}
                      value={dictationLanguage}
                    />
                    {transcript.trim() && !ai.busy && (
                      <IconButton icon={Trash2} label="Effacer la dictée" onClick={() => setTranscript("")} />
                    )}
                  </>
                }
                value={transcript}
              />
            </div>
          </div>

          {/* The one action: continue to the next rubric, or read the note. */}
          <div className="flex shrink-0 justify-center pt-3">
            <ActionButton
              disabled={
                ai.busy ||
                importing ||
                (sectionIndex === 3 && !fullTranscript.trim() && !hasExistingNote) ||
                !!mentionError
              }
              onClick={() => (refused && sectionIndex === 3 ? reviewDictation() : void generate())}
              size="sm"
              title="Structurer la consultation en note SOAP (⌘+Entrée)"
              variant="primary"
            >
              {sectionIndex < 3 ? `Continuer vers ${sectionPrompts[sectionIndex + 1].title}` : refused ? "Relire ma dictée comme note" : "Relire la note SOAP"}
              <ArrowRightIcon className="size-3.5" />
            </ActionButton>
          </div>
        </div>
      )}

      {/* 5. Tab 2: the note to read, what the assistant proposed, and the card that confirms it */}
      {activeTab === "soap" && (
        <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
            {models.generatorReady && !assistantProposal && fullTranscript.trim() && refusedFor !== fullTranscript && (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-border/80 bg-card px-3 py-3">
                <span className="t-12 text-muted-foreground">
                  Améliorer la formulation avec l’assistant ?
                </span>
                <ActionButton disabled={ai.busy} onClick={() => void generate()}>
                  Structurer avec l’IA
                </ActionButton>
              </div>
            )}

            {/* The assistant's turn: what it prepared, and what it reworded for the vet to accept or refuse. */}
            <ChatThread
              messages={[
                {
                  id: "note",
                  role: "assistant",
                  at: noteAt,
                  content: (
                    <div className="flex flex-col gap-3">
                      <StreamingMessage
                        className="max-w-none"
                        data={{
                          status: "done",
                          content:
                            proposalRequests.length > 0
                              ? `J’ai reformulé ${proposalRequests.length === 1 ? "une rubrique" : `${proposalRequests.length} rubriques`}. Pour chacune, gardez ma formulation ou votre dictée, puis validez la note : rien n’est enregistré avant.`
                              : "Voici votre note. Relisez chaque rubrique, puis validez : rien n’est enregistré avant votre accord.",
                        }}
                        bubble
                        showActions={false}
                        showHeader={false}
                      />
                      {proposalRequests.length > 0 && (
                        <ToolApprovalQueue
                          data={proposalRequests}
                          heading="Reformulations proposées"
                          onDecide={decideProposals}
                          onUndo={undoProposal}
                        />
                      )}
                    </div>
                  ),
                },
              ]}
              renderAvatar={renderThreadAvatar}
              showNames={false}
              userName="Vous"
            />

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
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`soap-field-${key}`}
                      className="t-13 font-semibold text-foreground"
                    >
                      {SOAP_FULL_HEADINGS[key]}
                    </label>
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
                </div>
              );
            })}
          </div>

          {/* The confirmation: nothing is written before « Valider ». */}
          <div className="shrink-0 pt-3">
            <ConfirmationCard
              blocked={
                pendingProposals > 0
                  ? `${pendingProposals} reformulation${pendingProposals > 1 ? "s" : ""} à examiner avant d’enregistrer.`
                  : (mentionError ?? (dataUnavailable ? "Lecture du dossier en cours…" : undefined))
              }
              compact
              confirmLabel="Valider et enregistrer la note"
              data={{
                title: "Enregistrer la note",
                subtitle: patient ? `Dossier de ${patient.name}` : "Base locale du cabinet",
                items: SOAP_SECTIONS.map(({ key, title }) => {
                  const length = (activeSoapDraft[key] ?? "").trim().length;
                  return {
                    id: key,
                    label: title,
                    filled: length > 0,
                  };
                }),
                warnings: noteWarnings,
              }}
              editLabel="Revoir la dictée"
              onConfirm={() => void save()}
              onEdit={editTranscript}
              status={saving ? "confirming" : "review"}
            />
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

      </div>

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
