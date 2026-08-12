import {
  Cancel01Icon,
  Chatting01Icon,
  ClipboardIcon,
  File01Icon,
  MedicineBottle01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Plus,
  Search,
  Sparkles,
  X,
  FileText,
  SlidersHorizontal,
  MessageSquare,
  Filter,
  Pill,
  FileCheck,
  Stethoscope,
  SendHorizontal,
  Cpu,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Logo from "@/components/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import {
  AI_MODELS,
  DEFAULT_MODEL_ID,
  getModelById,
  getModelPreferences,
  resolveModelId,
  saveModelPreferences,
} from "@/lib/ai-models";
import {
  useAppointmentsRepository,
  useConsultationSoapsRepository,
  useNotesRepository,
  useOwnersRepository,
  usePatientsRepository,
  useProductsRepository,
  useRemindersRepository,
  useVaccinationsRepository,
  useWeightEntriesRepository,
} from "@/data/repositories";
import { cn } from "@/lib/utils";
import {
  generateText,
  getActiveModelId,
  getCurrentProgress,
  hasModelInCache,
  initializeWebLLM,
  isWebLLMLoading,
  isWebLLMReady,
  subscribeToProgress,
} from "@/services/webLLMService";
import {
  extractToolCall,
  isMutatingTool,
} from "@/services/aiToolProtocol";
import {
  getAssistantErrorMessage,
  sanitizeAssistantOutput,
} from "@/services/aiOutput";
import {
  loadAIAgentState,
  saveAIAgentState,
  type PersistedAIConversation,
} from "@/services/aiConversationStore";
import type { View } from "@/types";

const VISION_MODEL_ID =
  AI_MODELS.find((model) => model.tier === "vision")?.id ?? DEFAULT_MODEL_ID;
const MAX_IMAGE_FILE_SIZE = 8 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;

function getUserInitials(displayName?: string) {
  const initials = (displayName || "Utilisateur")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "U";
}

function createAbortError() {
  const error = new Error("Génération interrompue");
  error.name = "AbortError";
  return error;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Lecture de l'image impossible"));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Format d'image non pris en charge"));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function prepareImageForLocalModel(file: File): Promise<string> {
  if (typeof createImageBitmap !== "function") {
    return readFileAsDataUrl(file);
  }

  const bitmap = await createImageBitmap(file);
  try {
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_IMAGE_EDGE / longestEdge);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      return readFileAsDataUrl(file);
    }

    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    bitmap.close();
  }
}

interface ActionCardOption {
  actionPrompt?: string;
  description?: string;
  label: string;
}

interface PendingWriteAction {
  args: Record<string, string>;
  name: string;
}

interface MessageItem {
  content: string;
  id: string;
  role: "user" | "assistant";
  timestamp: Date;
  isToolCall?: boolean;
  thoughtTimeSeconds?: number;
  toolSteps?: { title: string; type?: string; sources?: string[] }[];
  actionCard?: {
    type: "email" | "note" | "prescription" | "appointment" | "choice";
    title: string;
    subject?: string;
    body: string;
    options?: ActionCardOption[];
    status?: "draft" | "sent" | "saved";
  };
}

interface Conversation {
  createdAt: Date;
  id: string;
  messages: MessageItem[];
  title: string;
  updatedAt: Date;
}

interface AIAgentChatProps {
  currentView: View;
  onClose?: () => void;
  patientId?: string | null;
  userAvatarUrl?: string | null;
  userDisplayName?: string;
}

const QUICK_STUDIO_ACTIONS = [
  {
    id: "soap",
    label: "Rédiger Note SOAP",
    icon: ClipboardIcon,
    prompt: "Rédige la note de consultation SOAP complète pour le patient actif.",
    category: "Consultation",
  },
  {
    id: "resume",
    label: "Synthèse Clinique 1-Clic",
    icon: File01Icon,
    prompt: "Synthétise le dossier médical complet : antécédents, poids, vaccins et alertes.",
    category: "Dossier",
  },
  {
    id: "email",
    label: "Brouillon E-mail Propriétaire",
    icon: Chatting01Icon,
    prompt: "Rédige un e-mail clair et professionnel à l'attention du propriétaire du patient.",
    category: "Communication",
  },
  {
    id: "reminder",
    label: "Rappel Suivi & Vaccin",
    icon: MedicineBottle01Icon,
    prompt: "Prépare un rappel clinique pour le prochain rendez-vous / vaccin du patient.",
    category: "Agenda",
  },
];

const TOOL_LABELS: Record<string, string> = {
  search_patients: "Recherche dossiers patients",
  create_reminder: "Création rappel clinique",
  get_appointments: "Lecture agenda clinique",
  search_stock: "Vérification stock médicaments",
  search_notes: "Recherche notes cliniques",
  get_patient_history: "Lecture historique médical",
  get_patient_record: "Lecture dossier patient consolidé",
  get_owner_contact: "Recherche contact propriétaire",
  save_patient_note: "Enregistrement note clinique",
  add_note: "Ajout pense-bête clinique",
};

const ACTION_CARD_KEYWORDS = [
  "soap",
  "résumé",
  "synthèse",
  "rappel",
  "vaccin",
  "email",
  "e-mail",
  "note",
  "planifier",
  "dossier",
  "historique",
];

const shouldOfferActionCard = (text: string) => {
  const normalized = text.toLocaleLowerCase("fr-FR");
  return ACTION_CARD_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

// Collapsible Reasoning Component (Ace Studio Reference Style)
function ThoughtAccordion({
  steps = [],
}: {
  steps?: { title: string; type?: string; sources?: string[] }[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (steps.length === 0) {
    return (
      <Marker
        role="status"
        className="mb-3 w-fit text-xs text-zinc-500 dark:text-zinc-400"
      >
        <MarkerIcon className="text-zinc-400 dark:text-zinc-500">
          <Spinner className="size-3.5" />
        </MarkerIcon>
        <MarkerContent className="shimmer">Réflexion en cours…</MarkerContent>
      </Marker>
    );
  }

  return (
    <div className="mb-3 space-y-1.5 font-sans text-xs text-zinc-500 dark:text-zinc-400">
      <Marker className="w-fit">
        <MarkerIcon className="text-zinc-400 dark:text-zinc-500">
          <Search className="size-3.5" />
        </MarkerIcon>
        <MarkerContent>
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="group flex items-center gap-1.5 font-medium transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            aria-expanded={isOpen}
          >
            <span>{`${steps.length} source${steps.length > 1 ? "s" : ""} consultée${steps.length > 1 ? "s" : ""}`}</span>
            <ChevronRight
              className={cn(
                "size-3 text-zinc-400 transition-transform duration-200",
                isOpen && "rotate-90"
              )}
            />
          </button>
        </MarkerContent>
      </Marker>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-1.5 pl-5 border-l border-zinc-200 dark:border-zinc-800"
          >
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 py-0.5"
              >
                <div className="flex items-center gap-2">
                  {step.type === "search" ? (
                    <Search className="size-3 text-zinc-500" />
                  ) : (
                    <FileText className="size-3 text-zinc-500" />
                  )}
                  <span>{step.title}</span>
                </div>
                {step.sources && step.sources.length > 0 && (
                  <div className="flex items-center gap-1">
                    {step.sources.map((src, sIdx) => (
                      <span
                        key={sIdx}
                        className="rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 text-[9px] font-semibold text-zinc-600 dark:text-zinc-300"
                      >
                        {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const INLINE_MARKUP_PATTERN = /(\*\*[^*]+\*\*|`[^`]+`)/g;

function renderAssistantInline(line: string, keyPrefix: string) {
  return line.split(INLINE_MARKUP_PATTERN).map((part, index) => {
    if (!part) return null;

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-strong-${index}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${keyPrefix}-code-${index}`}
          className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={`${keyPrefix}-text-${index}`}>{part}</span>;
  });
}

function AssistantMessageContent({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const cleanContent = sanitizeAssistantOutput(content);
  if (!cleanContent) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be unavailable in a restricted webview.
    }
  };

  const blocks = cleanContent
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="group/assistant-message relative max-w-[76ch]">
      <div className="space-y-3 text-sm leading-7 text-zinc-800 dark:text-zinc-200">
      {blocks.map((block, blockIndex) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const isOrderedList =
          lines.length > 0 && lines.every((line) => /^\d+[.)]\s+/.test(line));
        const isList =
          isOrderedList ||
          (lines.length > 0 && lines.every((line) => /^(?:[-*•]\s+)/.test(line)));
        const headingMatch =
          lines.length === 1 &&
          lines[0].match(/^(?:#{1,3}\s+|\*\*)(.*?)(?:\*\*)?:?$/);

        if (headingMatch) {
          return (
            <h4
              key={`assistant-heading-${blockIndex}`}
              className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
            >
              {renderAssistantInline(headingMatch[1].trim(), `heading-${blockIndex}`)}
            </h4>
          );
        }

        if (isList) {
          const ListTag = isOrderedList ? "ol" : "ul";
          return (
            <ListTag
              key={`assistant-list-${blockIndex}`}
              className={cn(
                "space-y-1.5 pl-5 marker:text-zinc-400 dark:marker:text-zinc-500",
                isOrderedList ? "list-decimal" : "list-disc"
              )}
            >
              {lines.map((line, lineIndex) => (
                <li key={`assistant-list-item-${blockIndex}-${lineIndex}`}>
                  {renderAssistantInline(
                    line.replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, ""),
                    `list-${blockIndex}-${lineIndex}`
                  )}
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={`assistant-paragraph-${blockIndex}`}>
            {lines.map((line, lineIndex) => (
              <span key={`assistant-line-${blockIndex}-${lineIndex}`}>
                {renderAssistantInline(line, `paragraph-${blockIndex}-${lineIndex}`)}
                {lineIndex < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
      </div>
      <div className="flex justify-end pt-1 opacity-0 transition-opacity group-hover/assistant-message:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex size-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label={copied ? "Réponse copiée" : "Copier la réponse"}
          title={copied ? "Réponse copiée" : "Copier la réponse"}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

// Ace Studio Interactive Choice / Action Card Widget ("What you should do?")
function ActionCardWidget({
  card,
  onSubmit,
}: {
  card: NonNullable<MessageItem["actionCard"]>;
  onSubmit?: (option: ActionCardOption) => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(0);
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const defaultOptions = [
    { label: "Rédiger la fiche SOAP complète", description: "Génère et sauvegarde la note médicale" },
    { label: "Générer le message pour le propriétaire", description: "E-mail clair de suivi ou rappel" },
    { label: "Planifier le prochain rappel vaccin", description: "Ajoute la tâche à l'agenda" },
    { label: "Instruction libre", description: "Taper directement votre demande" },
  ];

  const options = card.options && card.options.length > 0 ? card.options : defaultOptions;

  const handleSubmitAction = () => {
    if (selectedIdx !== null && options[selectedIdx]) {
      setSubmitted(true);
      onSubmit?.(options[selectedIdx]);
      setTimeout(() => setSubmitted(false), 2000);
    }
  };

  if (dismissed) return null;

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-4.5 shadow-sm space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          {card.title || "Que souhaitez-vous faire ?"}
        </h4>
        {card.subject && (
          <span className="text-[11px] font-medium text-zinc-400">
            {card.subject}
          </span>
        )}
      </div>

      {card.body && (
        <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          {card.body}
        </p>
      )}

      {/* Numbered Option Pills (Exact Ace Studio Style) */}
      <div className="space-y-2">
        {options.map((opt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setSelectedIdx(idx);
            }}
            className={cn(
              "w-full flex items-center justify-between rounded-xl border p-3 text-left transition-all text-xs cursor-pointer",
              selectedIdx === idx
                ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800/80 font-medium shadow-2xs"
                : "border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                {idx + 1}
              </span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {opt.label}
              </span>
            </div>
            {opt.description && (
              <span className="text-[11px] text-zinc-400 truncate max-w-[220px]">
                {opt.description}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Footer Navigation & Submit */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
        <span className="text-[11px] text-zinc-400 font-medium">
          ^ v to navigate
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Ignorer
          </button>
          <button
            type="button"
            onClick={handleSubmitAction}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold shadow-xs transition-all cursor-pointer",
              submitted
                ? "bg-emerald-500 text-white"
                : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
            )}
          >
            {submitted ? "✓ Exécuté" : "Exécuter"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AIAgentChat({
  currentView: _currentView,
  onClose,
  patientId: contextPatientId,
  userAvatarUrl,
  userDisplayName,
}: AIAgentChatProps) {
  const [persistedState] = useState(loadAIAgentState);
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const restored =
      persistedState?.conversations.map((conversation: PersistedAIConversation) => ({
        ...conversation,
        createdAt: new Date(conversation.createdAt),
        messages: conversation.messages.map((message) => ({
          ...message,
          content:
            message.role === "assistant"
              ? sanitizeAssistantOutput(message.content)
              : message.content,
          actionCard: message.actionCard as MessageItem["actionCard"],
          timestamp: new Date(message.timestamp),
        })),
        updatedAt: new Date(conversation.updatedAt),
      })) ?? [];

    return restored.length > 0
      ? restored
      : [
          {
            id: "default",
            title: "Nouvelle conversation",
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
  });
  const [activeConversationId, setActiveConversationId] = useState(
    persistedState?.activeConversationId ?? "default"
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isReasoningMode, setIsReasoningMode] = useState(
    persistedState?.isReasoningMode ?? true
  );
  const [selectedPatientId, setSelectedPatientId] = useState(
    contextPatientId ?? persistedState?.selectedPatientId ?? ""
  );
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [patientFilterTag, setPatientFilterTag] = useState<"all" | "dog" | "cat" | "urgent">("all");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Model loading state
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [modelLoadingText, setModelLoadingText] = useState(
    "Initialisation du mode local..."
  );
  const [selectedModelId, setSelectedModelId] = useState(() =>
    resolveModelId(persistedState?.selectedModelId || DEFAULT_MODEL_ID)
  );

  // Image attachment state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const sendInFlightRef = useRef(false);
  const generationAbortRef = useRef<AbortController | null>(null);
  const modelLoadRequestRef = useRef(0);
  const modelLoadErrorRef = useRef<string | null>(null);

  // Liquid Glass Header scroll animation
  const { scrollY: messagesScrollY } = useScroll({
    container: messagesViewportRef,
  });
  const headerBlur = useTransform(messagesScrollY, [0, 50], ["blur(0px)", "blur(16px)"]);

  // Repositories hooks
  const patientsRepository = usePatientsRepository();
  const remindersRepository = useRemindersRepository();
  const appointmentsRepository = useAppointmentsRepository();
  const ownersRepository = useOwnersRepository();
  const soapsRepository = useConsultationSoapsRepository();
  const productsRepository = useProductsRepository();
  const notesRepository = useNotesRepository();
  const vaccinationsRepository = useVaccinationsRepository();
  const weightRepository = useWeightEntriesRepository();

  useEffect(() => {
    if (contextPatientId) {
      setSelectedPatientId(contextPatientId);
    }
  }, [contextPatientId]);

  useEffect(() => {
    return () => {
      generationAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      saveAIAgentState({
        activeConversationId,
        conversations: conversations.map((conversation) => ({
          ...conversation,
          createdAt: conversation.createdAt.toISOString(),
          messages: conversation.messages.map((message) => ({
            ...message,
            timestamp: message.timestamp.toISOString(),
          })),
          updatedAt: conversation.updatedAt.toISOString(),
        })),
        isReasoningMode,
        selectedModelId,
        selectedPatientId,
      });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [
    activeConversationId,
    conversations,
    isReasoningMode,
    selectedModelId,
    selectedPatientId,
  ]);

  useEffect(() => {
    setSelectedModelId(getModelPreferences().defaultModelId || DEFAULT_MODEL_ID);
  }, []);

  // Keep the assistant responsive on open. The local model is loaded only
  // when the veterinarian sends a request or explicitly selects a model.
  useEffect(() => {
    const currentProgress = getCurrentProgress();
    setIsModelLoading(isWebLLMLoading());
    setDownloadProgress(currentProgress.progress);
    setModelLoadingText(currentProgress.text);

    const unsub = subscribeToProgress((report) => {
      setDownloadProgress(report.progress);
      setModelLoadingText(report.text);
      setIsModelLoading(isWebLLMLoading());
      if (report.progress === 1) {
        setIsModelLoading(false);
      }
    });

    return unsub;
  }, []);

  const patientOptions = useMemo(
    () =>
      patientsRepository.data
        .map((patient) => ({
          owner: ownersRepository.data.find(
            (owner) => owner.id === patient.ownerId
          ),
          patient,
        }))
        .sort((left, right) => left.patient.name.localeCompare(right.patient.name)),
    [ownersRepository.data, patientsRepository.data]
  );

  // Scalable Filtered Patients list for large patient databases
  const filteredPatients = useMemo(() => {
    return patientOptions.filter(({ owner, patient }) => {
      const query = patientSearchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        patient.name.toLowerCase().includes(query) ||
        patient.species.toLowerCase().includes(query) ||
        patient.breed?.toLowerCase().includes(query) ||
        (owner && `${owner.firstName} ${owner.lastName}`.toLowerCase().includes(query));

      if (!matchesQuery) return false;

      if (patientFilterTag === "dog") return patient.species.toLowerCase().includes("chien") || patient.species.toLowerCase().includes("dog");
      if (patientFilterTag === "cat") return patient.species.toLowerCase().includes("chat") || patient.species.toLowerCase().includes("cat");
      if (patientFilterTag === "urgent") return patient.allergies || patient.chronicConditions;

      return true;
    });
  }, [patientOptions, patientSearchQuery, patientFilterTag]);

  const activePatient = useMemo(
    () =>
      patientOptions.find(({ patient }) => patient.id === selectedPatientId) ??
      null,
    [patientOptions, selectedPatientId]
  );
  const activeAppointments = useMemo(
    () =>
      activePatient
        ? appointmentsRepository.data
            .filter((appointment) => appointment.patientId === activePatient.patient.id)
            .sort(
              (left, right) =>
                new Date(right.startTime).getTime() -
                new Date(left.startTime).getTime()
            )
        : [],
    [activePatient, appointmentsRepository.data]
  );
  const activeSoaps = useMemo(
    () =>
      activePatient ? soapsRepository.forPatient(activePatient.patient.id) : [],
    [activePatient, soapsRepository]
  );
  const activeVaccinations = useMemo(
    () =>
      activePatient
        ? vaccinationsRepository.forPatient(activePatient.patient.id)
        : [],
    [activePatient, vaccinationsRepository]
  );
  const activePatientContext = useMemo(() => {
    if (!activePatient) {
      return "Aucun dossier patient sélectionné.";
    }

    const { owner, patient } = activePatient;
    const recentAppointments = activeAppointments
      .slice(0, 3)
      .map(
        (appointment) =>
          `${appointment.startTime.split("T")[0]} · ${appointment.title} · ${appointment.status} · appointment_id=${appointment.id}`
      )
      .join(" | ");
    const latestSoap = activeSoaps[0];
    const latestVaccination = activeVaccinations[0];
    const latestWeight = weightRepository.latestFor(patient.id);

    return [
      `Patient actif: ${patient.name} [patient_id=${patient.id}] (${patient.species}${patient.breed ? `, ${patient.breed}` : ""}, ${patient.sex === "M" ? "mâle" : "femelle"}, statut: ${patient.status}).`,
      `Propriétaire: ${owner ? `${owner.firstName} ${owner.lastName}` : "non renseigné"}${owner?.phone ? ` · ${owner.phone}` : ""}${owner?.email ? ` · ${owner.email}` : ""}.`,
      `Allergies: ${patient.allergies || "aucune connue"}. Conditions chroniques: ${patient.chronicConditions || "aucune renseignée"}.`,
      `Dernière pesée: ${latestWeight ? `${latestWeight.weightKg} kg le ${latestWeight.measuredAt.split("T")[0]}` : "non renseignée"}.`,
      `Rendez-vous récents: ${recentAppointments || "aucun"}.`,
      `Dernier SOAP: ${latestSoap ? `évaluation ${latestSoap.assessment || "non renseignée"}; plan ${latestSoap.plan || "non renseigné"}` : "aucun SOAP enregistré"}.`,
      `Dernier vaccin: ${latestVaccination ? `${latestVaccination.vaccineName} le ${latestVaccination.administeredAt.split("T")[0]}${latestVaccination.nextDueAt ? ` · prochain ${latestVaccination.nextDueAt}` : ""}` : "aucun vaccin enregistré"}.`,
    ].join("\n");
  }, [
    activeAppointments,
    activePatient,
    activeSoaps,
    activeVaccinations,
    weightRepository,
  ]);

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );
  const messages = useMemo(
    () => activeConversation?.messages || [],
    [activeConversation?.messages]
  );
  const selectedModel = getModelById(selectedModelId);
  const userInitials = getUserInitials(userDisplayName);

  const handleLoadModel = async (modelId: string): Promise<boolean> => {
    const requestId = ++modelLoadRequestRef.current;
    modelLoadErrorRef.current = null;

    if (isWebLLMReady() && getActiveModelId() === modelId) {
      setSelectedModelId(modelId);
      setIsModelLoading(false);
      setModelLoadingText("Mode local prêt");
      return true;
    }

    try {
      setIsModelLoading(true);
      setDownloadProgress(0);
      const cached = await hasModelInCache(modelId);
      if (requestId !== modelLoadRequestRef.current) {
        return getActiveModelId() === modelId;
      }
      setModelLoadingText(
        cached
          ? "Réactivation du mode local..."
          : "Téléchargement initial du mode local..."
      );
      await initializeWebLLM(modelId, (report) => {
        if (requestId !== modelLoadRequestRef.current) return;
        setDownloadProgress(report.progress);
        setModelLoadingText(report.text);
      });

      if (requestId !== modelLoadRequestRef.current) {
        return getActiveModelId() === modelId;
      }

      setSelectedModelId(modelId);
      saveModelPreferences({
        ...getModelPreferences(),
        defaultModelId: modelId,
      });
      setIsModelLoading(false);
      setModelLoadingText("Mode local prêt");
      return true;
    } catch (err) {
      console.error("[WebLLM] Error initializing model:", err);
      modelLoadErrorRef.current = getAssistantErrorMessage(err);
      if (requestId === modelLoadRequestRef.current) {
        setIsModelLoading(false);
        setModelLoadingText("Impossible de charger ce mode");
      }
      return false;
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);

    if (!file.type.startsWith("image/")) {
      setImageError("Sélectionnez un fichier image valide.");
      return;
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      setImageError("L'image doit faire moins de 8 Mo.");
      return;
    }

    try {
      const optimizedImage = await prepareImageForLocalModel(file);
      setSelectedImage(optimizedImage);
      if (selectedModelId !== VISION_MODEL_ID) {
        setSelectedModelId(VISION_MODEL_ID);
      }
    } catch (error) {
      console.error("[bAItari AI] Image preparation failed:", error);
      setImageError("Impossible de préparer cette image.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Agentic Tool Execution
  const executeTool = async (
    name: string,
    args: Record<string, string>,
    options: { allowWrite?: boolean } = {}
  ): Promise<string> => {
    if (isMutatingTool(name) && !options.allowWrite) {
      return JSON.stringify({
        status: "confirmation_required",
        tool: name,
        message:
          "Cette action modifie les données locales et requiert la confirmation explicite du vétérinaire.",
      });
    }

    const requestedPatientId =
      args.patient_id || args.patientId || selectedPatientId;
    const patient = patientsRepository.data.find(
      (entry) => String(entry.id) === String(requestedPatientId)
    );
    const owner = patient
      ? ownersRepository.data.find((entry) => entry.id === patient.ownerId)
      : undefined;
    const compactDate = (value?: string) =>
      value ? value.replace("T", " ").slice(0, 16) : "non renseigné";

    if (name === "search_patients") {
      const query = (args.query || args.search || "").toLocaleLowerCase("fr-FR").trim();
      const results = patientOptions
        .filter(({ patient: entry, owner: entryOwner }) => {
          if (!query) return true;
          const haystack = [
            entry.name,
            entry.species,
            entry.breed,
            entryOwner?.firstName,
            entryOwner?.lastName,
            entryOwner?.phone,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase("fr-FR");
          return haystack.includes(query);
        })
        .slice(0, 8)
        .map(({ patient: entry, owner: entryOwner }) => ({
          id: entry.id,
          patient: entry.name,
          species: entry.species,
          breed: entry.breed || null,
          owner: entryOwner
            ? `${entryOwner.firstName} ${entryOwner.lastName}`.trim()
            : null,
          status: entry.status,
        }));
      return JSON.stringify({ results, total: results.length });
    }

    if (name === "get_patient_record" || name === "get_patient_history") {
      if (!patient) {
        return "Erreur: sélectionne un patient ou fournis patient_id avant de consulter un dossier.";
      }

      const appointments = appointmentsRepository.data
        .filter((entry) => entry.patientId === patient.id)
        .sort(
          (left, right) =>
            new Date(right.startTime).getTime() -
            new Date(left.startTime).getTime()
        )
        .slice(0, 8)
        .map((entry) => ({
          id: entry.id,
          date: compactDate(entry.startTime),
          title: entry.title,
          type: entry.type,
          status: entry.status,
          notes: entry.notes || null,
        }));
      const soaps = soapsRepository.forPatient(patient.id).slice(0, 5).map((entry) => ({
        appointmentId: entry.appointmentId,
        assessment: entry.assessment || null,
        plan: entry.plan || null,
        updatedAt: compactDate(entry.updatedAt),
      }));
      const vaccinations = vaccinationsRepository.forPatient(patient.id).slice(0, 8).map((entry) => ({
        name: entry.vaccineName,
        administeredAt: entry.administeredAt,
        nextDueAt: entry.nextDueAt || null,
      }));
      const latestWeight = weightRepository.latestFor(patient.id);

      return JSON.stringify({
        patient: {
          id: patient.id,
          name: patient.name,
          species: patient.species,
          breed: patient.breed || null,
          sex: patient.sex,
          status: patient.status,
          allergies: patient.allergies || null,
          chronicConditions: patient.chronicConditions || null,
          generalNotes: patient.generalNotes || null,
        },
        owner: owner
          ? {
              name: `${owner.firstName} ${owner.lastName}`.trim(),
              phone: owner.phone,
              email: owner.email || null,
              address: owner.address || null,
            }
          : null,
        latestWeight: latestWeight
          ? { kg: latestWeight.weightKg, measuredAt: latestWeight.measuredAt }
          : null,
        appointments,
        soaps,
        vaccinations,
      });
    }

    if (name === "get_owner_contact") {
      if (!owner) {
        return "Erreur: propriétaire introuvable. Sélectionne un patient ou fournis patient_id.";
      }
      return JSON.stringify({
        patient: patient?.name || null,
        owner: {
          id: owner.id,
          name: `${owner.firstName} ${owner.lastName}`.trim(),
          phone: owner.phone,
          email: owner.email || null,
          address: owner.address || null,
          preferredContact: owner.preferredContact || null,
        },
      });
    }

    if (name === "get_appointments") {
      const date = args.date?.trim();
      const appointments = appointmentsRepository.data
        .filter((entry) => {
          if (requestedPatientId && entry.patientId !== requestedPatientId) {
            return false;
          }
          return !date || entry.startTime.startsWith(date);
        })
        .sort(
          (left, right) =>
            new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
        )
        .slice(0, 12)
        .map((entry) => ({
          id: entry.id,
          patientId: entry.patientId,
          date: compactDate(entry.startTime),
          end: compactDate(entry.endTime),
          title: entry.title,
          type: entry.type,
          status: entry.status,
          room: entry.room || null,
        }));
      return JSON.stringify({ appointments, total: appointments.length });
    }

    if (name === "search_stock") {
      const query = (args.query || args.search || "").toLocaleLowerCase("fr-FR").trim();
      const products = productsRepository.data
        .filter((product) => {
          if (!query) return true;
          return `${product.name} ${product.category} ${product.subCategory || ""}`
            .toLocaleLowerCase("fr-FR")
            .includes(query);
        })
        .slice(0, 12)
        .map((product) => ({
          id: product.id,
          name: product.name,
          category: product.category,
          quantity: product.quantity,
          minStock: product.minStock,
          unit: product.unit,
          expiryDate: product.expiryDate || null,
          stockStatus:
            product.quantity <= 0
              ? "épuisé"
              : product.quantity <= product.minStock
                ? "à réapprovisionner"
                : "disponible",
        }));
      return JSON.stringify({ products, total: products.length });
    }

    if (name === "search_notes") {
      const query = (args.query || args.search || "").toLocaleLowerCase("fr-FR").trim();
      const notes = notesRepository.data
        .filter((note) => {
          if (!query) return true;
          return `${note.title} ${note.content}`
            .toLocaleLowerCase("fr-FR")
            .includes(query);
        })
        .slice(0, 8)
        .map((note) => ({
          id: note.id,
          title: note.title,
          content: note.content.replace(/<[^>]*>/g, " ").slice(0, 500),
          updatedAt: note.updatedAt,
        }));
      return JSON.stringify({ notes, total: notes.length });
    }

    if (name === "create_reminder") {
      const appointmentId = args.appointment_id || args.appointmentId;
      const appointment = appointmentsRepository.data.find(
        (entry) => entry.id === appointmentId
      );
      if (!appointment) {
        return "Erreur: appointment_id est requis et doit correspondre à un rendez-vous existant.";
      }
      const requestedMinutes = Number(args.minutes_before || 1440);
      const minutesBefore = [15, 30, 60, 1440].includes(requestedMinutes)
        ? requestedMinutes
        : 1440;
      const scheduledFor = new Date(
        new Date(appointment.startTime).getTime() - minutesBefore * 60_000
      ).toISOString();
      const created = await remindersRepository.add({
        appointmentId: appointment.id,
        channel: args.channel === "email" || args.channel === "sms" ? args.channel : "in_app",
        message: args.message || `Suivi : ${appointment.title}`,
        minutesBefore,
        scheduledFor,
        status: "pending",
      } as Omit<import("@/types/db").Reminder, "id" | "createdAt" | "updatedAt">);
      return created
        ? `Succès: rappel créé pour ${compactDate(appointment.startTime)} (${minutesBefore} min avant).`
        : "Erreur: le rappel n'a pas pu être créé.";
    }

    if (name === "save_patient_note" || name === "add_note") {
      const content = args.content || args.text;
      if (!content) return "Erreur: Contenu de la note requis.";

      await notesRepository.add({
        userId: "system",
        title: patient ? `Note clinique · ${patient.name}` : `Note bAItari Copilot`,
        content: patient
          ? `<p><strong>Dossier patient :</strong> ${patient.name}</p><p>${content}</p>`
          : content,
        isFavorite: true,
      } as any);
      return `Succès: note enregistrée avec succès.`;
    }

    return `Erreur: outil inconnu "${name}".`;
  };

  const SYSTEM_PROMPT_WITH_TOOLS = `Tu es le Copilote Vétérinaire d'élite bAItari AI pour la clinique.
Tu utilises le modèle local pour rédiger des notes cliniques, des synthèses, des e-mails et proposer des choix structurés sous forme de carte d'action.

Contexte actif du cabinet :
${activePatientContext}

Outils locaux disponibles. Utilise exactement une seule commande par tour, avec cette syntaxe :
- [TOOL: search_patients(query="...")]
- [TOOL: get_patient_record(patient_id="...")]
- [TOOL: get_patient_history(patient_id="...")]
- [TOOL: get_owner_contact(patient_id="...")]
- [TOOL: get_appointments(patient_id="...", date="YYYY-MM-DD")]
- [TOOL: search_stock(query="...")]
- [TOOL: search_notes(query="...")]
- [TOOL: create_reminder(appointment_id="...", minutes_before="1440", message="...")]
- [TOOL: save_patient_note(patient_id="...", content="...")]
Règles des outils : ne fabrique jamais un identifiant ; utilise d'abord une recherche si nécessaire. Les outils de lecture peuvent être exécutés directement. Les outils create_reminder, save_patient_note et add_note sont des propositions d'écriture : ils ne doivent jamais être exécutés sans confirmation explicite du vétérinaire. Après un résultat TOOL_RESULT, rédige la réponse finale sans demander à l'utilisateur de répéter sa demande. N'affirme jamais qu'une écriture a réussi si le résultat ne confirme pas explicitement le succès.

Tu dois toujours renvoyer uniquement la réponse finale destinée au vétérinaire. N'affiche jamais de raisonnement interne, de chaîne de pensée, de balises <think>, <analysis>, <tool_call> ou <tool_result>, de noms d'outils, de JSON de protocole, ni de commentaires internes comme « Wait », « Let's think » ou « I need to ». Les commandes et les résultats d'outils restent invisibles pour l'utilisateur. Après un résultat d'outil, synthétise uniquement les faits utiles en français.

Format pour rédiger un widget de choix structuré :
Si la réponse suggère des choix d'orientation, réponds avec un objet JSON :
[ACTION_CARD: {"type": "choice", "title": "Que souhaitez-vous faire ?", "options": [{"label": "Action #1", "description": "Détails..."}, {"label": "Action #2", "description": "Détails..."}]}]

Sois synthétique, médical, clair et réponds en français avec les polices système Geist / Inter. Ne révèle jamais tes étapes internes, même si le mode d'analyse est activé.`;

  const effectiveSystemPrompt = [
    SYSTEM_PROMPT_WITH_TOOLS,
    "",
    "Directives du mode " +
      (selectedModel?.displayName || "local") +
      " :",
    selectedModel?.systemPrompt ||
      "Reste factuel, cite les données disponibles et signale les informations manquantes.",
  ].join("\n");

  const appendMessageToActiveConversation = (message: MessageItem) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              messages: [...conversation.messages, message],
              updatedAt: new Date(),
            }
          : conversation
      )
    );
  };

  const handleSendPrompt = async (promptText: string) => {
    if (
      !(promptText.trim() || selectedImage) ||
      isLoading ||
      sendInFlightRef.current
    ) {
      return;
    }

    // React state updates are asynchronous; this guard prevents a double
    // click or keyboard repeat from launching two GPU generations at once.
    sendInFlightRef.current = true;
    const abortController = new AbortController();
    generationAbortRef.current = abortController;
    const throwIfAborted = () => {
      if (abortController.signal.aborted) {
        throw createAbortError();
      }
    };

    const userInputText = promptText;
    const userMsg: MessageItem = {
      id: Date.now().toString(),
      role: "user",
      content: selectedImage ? `[Image Jointe] ${userInputText}` : userInputText,
      timestamp: new Date(),
    };

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === activeConversationId
          ? {
              ...conv,
              messages: [...conv.messages, userMsg],
              updatedAt: new Date(),
              title:
                conv.title === "Nouvelle conversation"
                  ? userInputText.slice(0, 25) + (userInputText.length > 25 ? "..." : "")
                  : conv.title,
            }
          : conv
      )
    );

    setInput("");
    const imagePayload = selectedImage;
    handleRemoveImage();
    setIsLoading(true);
    setStreamingResponse("");
    const startTime = Date.now();

    try {
      throwIfAborted();
      // The engine can stay ready while the user has selected another model
      // (notably after attaching an image). Keep the UI selection and the
      // WebGPU pipeline aligned before starting a generation.
      if (!isWebLLMReady() || getActiveModelId() !== selectedModelId) {
        const modelReady = await handleLoadModel(selectedModelId);
        if (!modelReady) {
          throw new Error(
            modelLoadErrorRef.current ??
              "Le modèle IA local n’a pas pu être initialisé."
          );
        }
      }
      throwIfAborted();

      const historyTurns = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.role,
          text:
            m.role === "assistant"
              ? sanitizeAssistantOutput(m.content)
              : m.content,
        }));

      let currentPrompt = isReasoningMode
        ? `Mode analyse approfondie bAItari Copilot : vérifie les données disponibles et structure une réponse claire. Ne révèle jamais tes étapes internes.\n\n${userInputText}`
        : userInputText;
      let finalAnswer = "";
      let attempts = 0;
      let pendingWriteAction: PendingWriteAction | null = null;
      const history = [...historyTurns];
      const toolStepsExecuted: { title: string; type?: string; sources?: string[] }[] = [];

      while (attempts < 3) {
        throwIfAborted();
        const response = await generateText(currentPrompt, "", {
          history,
          imageUri: imagePayload || undefined,
          systemPrompt: effectiveSystemPrompt,
          temperature: 0.2,
          maxTokens: 768,
          signal: abortController.signal,
          onToken: (text) => {
            const visibleText = sanitizeAssistantOutput(text);
            if (visibleText) {
              setStreamingResponse(visibleText);
            }
          },
        });

        const toolCall = extractToolCall(response);
        if (toolCall) {
          setStreamingResponse("");
          const toolName = toolCall.name;
          const label = TOOL_LABELS[toolName] || "Consultation base de données";
          toolStepsExecuted.push({
            title: label,
            type: isMutatingTool(toolName)
              ? "write"
              : toolName.includes("search")
                ? "search"
                : "file",
            sources: ["DB"],
          });

          throwIfAborted();
          if (isMutatingTool(toolName)) {
            pendingWriteAction = {
              name: toolName,
              args: toolCall.args,
            };
            finalAnswer =
              "J’ai préparé une écriture dans les données locales. Vérifiez les détails puis confirmez pour l’enregistrer.";
            break;
          }

          const toolResult = await executeTool(toolName, toolCall.args);
          throwIfAborted();
          history.push({ role: "assistant", text: response });
          history.push({ role: "user", text: `[TOOL_RESULT: ${toolResult}]` });
          currentPrompt = `Rédige la réponse finale d'après : ${toolResult}`;
          attempts++;
        } else {
          finalAnswer = response;
          break;
        }
      }

      if (!finalAnswer) {
        finalAnswer =
          "Je n’ai pas pu finaliser cette demande. Vérifiez le modèle local ou reformulez la question.";
      }

      const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));

      let parsedActionCard: MessageItem["actionCard"] | undefined;
      if (pendingWriteAction) {
        const actionDescription =
          pendingWriteAction.name === "create_reminder"
            ? "Créer le rappel proposé dans l’agenda local."
            : "Enregistrer la note proposée dans les données locales.";
        const serializedAction = encodeURIComponent(
          JSON.stringify(pendingWriteAction)
        );
        parsedActionCard = {
          type: "choice",
          title: "Confirmer l’écriture",
          body: actionDescription,
          options: [
            {
              label: "Confirmer l’enregistrement",
              description: "La modification sera écrite dans SQLite.",
              actionPrompt: "__CONFIRM_TOOL__" + serializedAction,
            },
            {
              label: "Annuler",
              description: "Aucune donnée ne sera modifiée.",
              actionPrompt: "__CANCEL_TOOL__",
            },
          ],
        };
      } else {
        const actionCardMatch = finalAnswer.match(/\[ACTION_CARD:\s*(\{[\s\S]*?\})\s*\]/);
        if (actionCardMatch) {
          try {
            parsedActionCard = JSON.parse(actionCardMatch[1]);
            finalAnswer = finalAnswer.replace(/\[ACTION_CARD:\s*\{[\s\S]*?\}\s*\]/, "").trim();
          } catch {}
        } else if (shouldOfferActionCard(userInputText)) {
          parsedActionCard = {
            type: "choice",
            title: "Que souhaitez-vous faire ?",
            body: "Choisissez une suite adaptée au dossier actif.",
            options: [
              { label: "Rédiger la fiche SOAP complète", description: "Préparer une note clinique" },
              { label: "Générer le message pour le propriétaire", description: "Préparer un e-mail de suivi" },
              { label: "Planifier le prochain rappel vaccin", description: "Préparer un rappel à confirmer" },
              { label: "Instruction libre", description: "Entrer une requête sur-mesure" },
            ],
          };
        }
      }

      finalAnswer = sanitizeAssistantOutput(finalAnswer);
      if (!finalAnswer) {
        finalAnswer =
          "Je n’ai pas pu produire une synthèse exploitable. Vérifiez les données du dossier ou reformulez la demande.";
      }

      const assistantMsg: MessageItem = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: finalAnswer,
        timestamp: new Date(),
        thoughtTimeSeconds: durationSec,
        toolSteps: toolStepsExecuted,
        actionCard: parsedActionCard,
      };

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversationId
            ? {
                ...conv,
                messages: [...conv.messages, assistantMsg],
                updatedAt: new Date(),
              }
            : conv
        )
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("[bAItari AI] Error:", error);
      const errorMsg: MessageItem = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          modelLoadErrorRef.current ?? getAssistantErrorMessage(error),
        timestamp: new Date(),
      };
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversationId
            ? {
                ...conv,
                messages: [...conv.messages, errorMsg],
                updatedAt: new Date(),
              }
            : conv
        )
      );
    } finally {
      if (generationAbortRef.current === abortController) {
        generationAbortRef.current = null;
      }
      sendInFlightRef.current = false;
      setIsLoading(false);
      setStreamingResponse("");
    }
  };

  const runConfirmedToolAction = async (actionPrompt: string) => {
    if (actionPrompt === "__CANCEL_TOOL__") {
      appendMessageToActiveConversation({
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Écriture annulée. Aucune donnée n’a été modifiée.",
        timestamp: new Date(),
      });
      return;
    }

    if (!actionPrompt.startsWith("__CONFIRM_TOOL__")) return;
    if (isLoading || sendInFlightRef.current) return;

    let pendingAction: PendingWriteAction;
    try {
      pendingAction = JSON.parse(
        decodeURIComponent(actionPrompt.slice("__CONFIRM_TOOL__".length))
      ) as PendingWriteAction;
    } catch {
      appendMessageToActiveConversation({
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "La confirmation est invalide. Aucune donnée n’a été modifiée.",
        timestamp: new Date(),
      });
      return;
    }

    if (!pendingAction?.name || !isMutatingTool(pendingAction.name)) {
      appendMessageToActiveConversation({
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Cette écriture n’est plus disponible. Aucune donnée n’a été modifiée.",
        timestamp: new Date(),
      });
      return;
    }

    sendInFlightRef.current = true;
    setIsLoading(true);
    try {
      const result = await executeTool(pendingAction.name, pendingAction.args, {
        allowWrite: true,
      });
      appendMessageToActiveConversation({
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result,
        timestamp: new Date(),
        toolSteps: [
          {
            title: TOOL_LABELS[pendingAction.name] || "Écriture locale",
            type: "write",
            sources: ["DB"],
          },
        ],
      });
    } catch (error) {
      console.error("[bAItari AI] Confirmed tool error:", error);
      appendMessageToActiveConversation({
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "L’écriture n’a pas pu être enregistrée. Vérifiez les données et réessayez.",
        timestamp: new Date(),
      });
    } finally {
      sendInFlightRef.current = false;
      setIsLoading(false);
    }
  };

  const cancelGeneration = () => {
    generationAbortRef.current?.abort();
  };

  const handleClose = () => {
    cancelGeneration();
    onClose?.();
  };

  const createNewConversation = () => {
    cancelGeneration();
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: "Nouvelle conversation",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt(input);
    }
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-white/60 dark:bg-zinc-950/60 backdrop-blur-2xl font-sans text-zinc-900 dark:text-zinc-100">

      {/* VETERINARY ACE STUDIO LEFT SIDEBAR WITH MEANINGFUL CLINICAL WORKFLOWS */}
      <aside className="w-72 shrink-0 border-r border-zinc-200/70 dark:border-zinc-800/70 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-4 flex flex-col justify-between overflow-y-auto hidden md:flex font-sans">
        <div className="space-y-4">

          {/* Official App Logo Header */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              className="flex items-center gap-2.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <Logo size="sm" />
              <span className="rounded-md bg-zinc-200/80 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                AI Studio
              </span>
            </button>
            <button
              type="button"
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              <SlidersHorizontal className="size-3.5" />
            </button>
          </div>

          {/* Quick actions Pill Button */}
          <button
            type="button"
            onClick={() => {
              setInput("Synthèse rapide du dossier...");
              textareaRef.current?.focus();
            }}
            className="w-full flex items-center justify-between rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <Search className="size-3.5 text-zinc-400" />
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Quick actions</span>
            </div>
            <kbd className="font-mono text-[10px] text-zinc-400">K</kbd>
          </button>

          {/* Meaningful Veterinary Clinical Workflows (REPLACED Generic Home, Analytics, Plan, Apps) */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Flux Cliniques
            </p>
            <nav className="space-y-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              <button
                type="button"
                onClick={() => handleSendPrompt("Générer la consultation SOAP pour le patient sélectionné.")}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 font-semibold cursor-pointer transition-colors"
              >
                <Stethoscope className="size-4 text-emerald-500" /> Consultations & SOAP
              </button>
              <button
                type="button"
                onClick={() => handleSendPrompt("Rédiger la synthèse consolidée du dossier médical.")}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                <FileCheck className="size-4 text-sky-500" /> Synthèse Dossiers
              </button>
              <button
                type="button"
                onClick={() => handleSendPrompt("Calculer la posologie et vérifier les interactions médicamenteuses.")}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                <Pill className="size-4 text-amber-500" /> Prescriptions & Doses
              </button>
              <button
                type="button"
                onClick={() => handleSendPrompt("Rédiger le courrier de suivi au propriétaire.")}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                <SendHorizontal className="size-4 text-purple-500" /> Courrier Propriétaire
              </button>
            </nav>
          </div>

          {/* Tools Section */}
          <div className="space-y-1 pt-1">
            <p className="px-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Outils Rapides
            </p>
            <div className="space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
              <button
                type="button"
                onClick={() => handleSendPrompt("Rédige une note SOAP complète.")}
                className="w-full flex items-center gap-2.5 px-3 py-1 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                <span className="size-2 rounded-full bg-amber-500" /> Note SOAP
              </button>
              <button
                type="button"
                onClick={() => handleSendPrompt("Brouillon d'email pour le propriétaire.")}
                className="w-full flex items-center gap-2.5 px-3 py-1 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                <span className="size-2 rounded-full bg-sky-500" /> Email Suivi
              </button>
              <button
                type="button"
                onClick={() => handleSendPrompt("Résumé médical du dossier patient.")}
                className="w-full flex items-center gap-2.5 px-3 py-1 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                <span className="size-2 rounded-full bg-purple-500" /> Brief Clinique
              </button>
              <button
                type="button"
                onClick={() => handleSendPrompt("Créer un rappel de vaccin à l'agenda.")}
                className="w-full flex items-center gap-2.5 px-3 py-1 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                <span className="size-2 rounded-full bg-emerald-500" /> Workflows
              </button>
            </div>
          </div>

          {/* Scalable Patient Search & Filter Section */}
          <div className="space-y-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
            <div className="flex items-center justify-between px-3">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Patients & Dossiers ({filteredPatients.length})
              </p>
              <Filter className="size-3 text-zinc-400" />
            </div>

            {/* Live Search Input */}
            <div className="px-1 space-y-1.5">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 size-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, race, propriétaire..."
                  value={patientSearchQuery}
                  onChange={(e) => setPatientSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 pl-8 pr-2.5 py-1 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 outline-none focus:border-zinc-400"
                />
                {patientSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPatientSearchQuery("")}
                    className="absolute right-2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {/* Filter Tags */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setPatientFilterTag("all")}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer",
                    patientFilterTag === "all"
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  Tous
                </button>
                <button
                  type="button"
                  onClick={() => setPatientFilterTag("dog")}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer",
                    patientFilterTag === "dog"
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  🐶 Chiens
                </button>
                <button
                  type="button"
                  onClick={() => setPatientFilterTag("cat")}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer",
                    patientFilterTag === "cat"
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  🐱 Chats
                </button>
                <button
                  type="button"
                  onClick={() => setPatientFilterTag("urgent")}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer",
                    patientFilterTag === "urgent"
                      ? "bg-amber-500 text-white"
                      : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  ⚠️ Alertes
                </button>
              </div>
            </div>

            {/* Scalable Patient Selection Box */}
            <div className="px-1 max-h-32 overflow-y-auto space-y-1 pr-1 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl bg-white/60 dark:bg-zinc-900/40 p-1">
              {filteredPatients.length === 0 ? (
                <p className="p-2 text-[10px] text-zinc-400 italic text-center">
                  Aucun patient trouvé
                </p>
              ) : (
                filteredPatients.map(({ patient }) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg px-2 py-1 text-left text-xs transition-colors cursor-pointer",
                      patient.id === selectedPatientId
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold"
                        : "hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    <span className="truncate">{patient.name}</span>
                    <span className="text-[10px] opacity-70 truncate max-w-[80px]">
                      {patient.species}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* PROMINENT MODEL SWITCHER IN SIDEBAR FOOTER (RESTORED MODEL SELECTION) */}
        <div className="pt-3 border-t border-zinc-200/70 dark:border-zinc-800/70 space-y-2 font-sans">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center justify-between rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 p-2.5 text-xs backdrop-blur-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer">
              <div className="flex items-center gap-2 overflow-hidden">
                <Cpu className="size-4 text-emerald-500 shrink-0" />
                <div className="text-left truncate">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {selectedModel?.displayName || "Mode local"}
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {selectedModel?.vramMB ? `${selectedModel.vramMB} MB VRAM` : "100% Local GPU"}
                  </p>
                </div>
              </div>
              <ChevronDown className="size-3.5 text-zinc-400 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 font-sans text-xs">
              <DropdownMenuLabel className="text-[10px] text-zinc-400 uppercase tracking-wider">
                Choisir un mode de travail
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {AI_MODELS.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  disabled={isModelLoading}
                  onClick={() => handleLoadModel(model.id)}
                  className="flex flex-col items-start gap-0.5 p-2 cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full font-semibold">
                    <span>{model.displayName}</span>
                    {model.recommended && (
                      <span className="rounded bg-emerald-100 dark:bg-emerald-950 px-1 py-0.2 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Recommandé
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    {model.modeLabel} · {model.description}
                  </p>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Model Loading Progress Bar if active */}
          {isModelLoading && (
            <div className="space-y-1 px-1">
              <div className="flex justify-between text-[10px] font-semibold text-zinc-500">
                <span className="truncate pr-3">{modelLoadingText}</span>
                <span>{Math.round(downloadProgress * 100)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.round(downloadProgress * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT ACE STUDIO MAIN CANVAS WITH LIQUID GLASS HEADER & TOP MODEL SWITCHER */}
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-white/40 dark:bg-zinc-950/40 backdrop-blur-2xl font-sans">

        {/* Liquid Glass Protocol Header with Direct Model Picker */}
        <motion.header
          className="relative z-20 flex h-[52px] shrink-0 items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 px-6 backdrop-blur-2xl backdrop-saturate-150"
          style={{ backdropFilter: headerBlur }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <MessageSquare className="size-3.5 text-zinc-400" />
              <span>Chat</span>
              <span className="text-zinc-300 dark:text-zinc-700">/</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">
                {activeConversation?.title || "Assistant Clinique"}
              </span>
            </div>

            {/* Header Model Switcher Badge */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/80 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 transition-colors cursor-pointer">
                <Cpu className="size-3 text-emerald-500" />
                <span>{selectedModel?.displayName || "Mode local"}</span>
                <ChevronDown className="size-3 text-zinc-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 font-sans text-xs">
                <DropdownMenuLabel className="text-[10px] text-zinc-400 uppercase tracking-wider">
                  Changer de mode
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {AI_MODELS.map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    disabled={isModelLoading}
                    onClick={() => handleLoadModel(model.id)}
                    className="flex flex-col items-start gap-0.5 p-2 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full font-semibold">
                      <span>{model.displayName}</span>
                      {model.recommended && (
                        <span className="rounded bg-emerald-100 dark:bg-emerald-950 px-1 py-0.2 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Recommandé
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      {model.modeLabel} · {model.description}
                    </p>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2 text-zinc-400">
            <button
              type="button"
              onClick={createNewConversation}
              className="p-1.5 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors rounded-lg cursor-pointer"
              title="Nouvelle discussion"
            >
              <Plus className="size-4" />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors rounded-lg ml-1 cursor-pointer"
                title="Fermer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </motion.header>

        {/* Chat & Canvas Content */}
        <MessageScrollerProvider
          autoScroll
          defaultScrollPosition="last-anchor"
          scrollEdgeThreshold={80}
          scrollPreviousItemPeek={64}
        >
          <MessageScroller className="flex-1">
            <MessageScrollerViewport ref={messagesViewportRef}>
              <MessageScrollerContent className="mx-auto w-full max-w-2xl px-6 pt-6 pb-8 font-sans">
                {messages.length === 0 ? (
                  <div className="flex min-h-[380px] flex-col items-center justify-center gap-6 text-center font-sans">
                    {/* Official App Logo inside Zero State */}
                    <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                      <Logo size="lg" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
                        Comment puis-je vous assister aujourd'hui ?
                      </h3>
                      <p className="max-w-xs text-xs text-zinc-400 font-sans">
                        Copilote clinique bAItari · mode {selectedModel?.displayName || "local"}.
                      </p>
                    </div>

                    {/* Quick Studio Actions */}
                    <div className="grid w-full max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-2 text-left pt-2 font-sans">
                      {QUICK_STUDIO_ACTIONS.map((action) => (
                        <button
                          key={action.id}
                          className="flex items-start gap-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl p-3.5 transition-all hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-900 shadow-2xs cursor-pointer"
                          onClick={() => {
                            handleSendPrompt(action.prompt);
                          }}
                          type="button"
                        >
                          <HugeiconsIcon className="size-4.5 shrink-0 text-zinc-700 dark:text-zinc-300 mt-0.5" icon={action.icon} />
                          <div>
                            <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                              {action.label}
                            </h4>
                            <p className="text-[10px] text-zinc-400 mt-0.5">
                              {action.category}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 font-sans">
                    {messages.map((message) => (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        scrollAnchor={message.role === "user"}
                      >
                        {message.role === "user" ? (
                          /* Exact User Bubble from Ace Studio Reference */
                          <div className="flex items-start justify-end gap-2 my-3">
                            <div className="rounded-2xl bg-[#EBEBEB] dark:bg-zinc-800 px-4 py-2.5 text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 max-w-[80%]">
                              {message.content}
                            </div>
                            <Avatar className="size-6 shrink-0 mt-1">
                              {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt="" />}
                              <AvatarFallback>{userInitials}</AvatarFallback>
                            </Avatar>
                          </div>
                        ) : (
                          /* Assistant Response Flow with Official Logo Badge */
                          <div className="space-y-3 my-4 font-sans">

                            {/* Compact clinical identity for assistant responses */}
                            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                              <div className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
                                <Stethoscope className="size-3.5" strokeWidth={1.8} />
                              </div>
                              <span>Copilote clinique</span>
                            </div>

                            {message.toolSteps && message.toolSteps.length > 0 && (
                              <ThoughtAccordion steps={message.toolSteps} />
                            )}

                            <AssistantMessageContent content={message.content} />

                            {/* Ace Studio Choice Card Widget ("What you should do?") */}
                            {message.actionCard && (
                              <ActionCardWidget
                                card={message.actionCard}
                                onSubmit={(option) => {
                                  if (option.actionPrompt) {
                                    void runConfirmedToolAction(option.actionPrompt);
                                    return;
                                  }
                                  void handleSendPrompt(
                                    "Exécuter l'action : " + option.label
                                  );
                                }}
                              />
                            )}
                          </div>
                        )}
                      </MessageScrollerItem>
                    ))}

                    {isLoading && (
                      <MessageScrollerItem messageId="thinking" scrollAnchor>
                        <div className="py-2 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            <div className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
                              <Stethoscope className="size-3.5" strokeWidth={1.8} />
                            </div>
                            <span>Copilote clinique</span>
                          </div>
                          {streamingResponse ? (
                            <AssistantMessageContent content={streamingResponse} />
                          ) : (
                            <div className="space-y-2">
                              <ThoughtAccordion steps={[]} />
                              {isModelLoading && (
                                <div className="max-w-sm space-y-1.5" role="status">
                                  <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                                    <span className="truncate">{modelLoadingText}</span>
                                    <span className="tabular-nums">
                                      {Math.round(downloadProgress * 100)}%
                                    </span>
                                  </div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                    <div
                                      className="h-full bg-emerald-500 transition-[width] duration-300"
                                      style={{
                                        width: `${Math.round(downloadProgress * 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </MessageScrollerItem>
                    )}
                  </div>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>

            <MessageScrollerButton
              aria-label="Revenir aux messages récents"
              className="bottom-5 start-1/2 size-8 -translate-x-1/2 rounded-full border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300 shadow-md backdrop-blur-md hover:bg-zinc-100"
              direction="end"
              size="icon"
            />
          </MessageScroller>
        </MessageScrollerProvider>

        {/* Keep the composer in the layout so it never covers a long response. */}
        <div className="shrink-0 px-6 pb-5 pt-2 font-sans">
          <div className="mx-auto w-full max-w-xl">
            <div className="mx-auto flex flex-col rounded-[24px] border border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 p-3 shadow-lg shadow-black/5 backdrop-blur-2xl transition-all focus-within:border-zinc-400 dark:focus-within:border-zinc-600">
            {selectedImage && (
              <div className="mx-2 mb-2 flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 backdrop-blur-md">
                <div className="relative size-10 shrink-0 overflow-hidden rounded-lg">
                  <img alt="Preview" className="size-full object-cover" src={selectedImage} />
                </div>
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Image jointe
                </span>
                <button
                  aria-label="Retirer"
                  className="ml-auto rounded-full p-1.5 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  onClick={handleRemoveImage}
                  type="button"
                >
                  <HugeiconsIcon className="size-4" icon={Cancel01Icon} />
                </button>
              </div>
            )}
            {imageError && (
              <p className="mx-2 mb-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                {imageError}
              </p>
            )}
            <input
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              ref={fileInputRef}
              type="file"
            />

            <Textarea
              className="min-h-[40px] max-h-[140px] w-full resize-none border-0 bg-transparent px-3 py-1 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:outline-none font-sans"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activePatient
                  ? `Ask about ${activePatient.patient.name}...`
                  : "Ask about your agent project..."
              }
              ref={textareaRef}
              rows={1}
              value={input}
            />

            <div className="flex items-center justify-between px-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleImageClick}
                  className="flex size-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  title="Joindre une image"
                >
                  <Plus className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsReasoningMode((v) => !v)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                    isReasoningMode
                      ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <Sparkles className="size-3 text-zinc-700 dark:text-zinc-300" />
                  <span>Reasoning</span>
                </button>
              </div>

              <button
                type="button"
                disabled={!isLoading && (!(input.trim() || selectedImage) || isModelLoading)}
                onClick={() => {
                  if (isLoading) {
                    cancelGeneration();
                    return;
                  }
                  void handleSendPrompt(input);
                }}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-white shadow-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none",
                  isLoading
                    ? "bg-rose-500 hover:bg-rose-600"
                    : "bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                )}
                aria-label={isLoading ? "Annuler la génération" : "Envoyer"}
                title={isLoading ? "Annuler la génération" : "Envoyer"}
              >
                {isLoading ? (
                  <X className="size-3.5" strokeWidth={2.5} />
                ) : (
                  <ArrowUp className="size-4 stroke-[2.5]" />
                )}
              </button>
            </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
