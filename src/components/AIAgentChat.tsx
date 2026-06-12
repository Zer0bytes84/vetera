import {
  Add01Icon,
  Cancel01Icon,
  Chatting01Icon,
  ClipboardIcon,
  Delete01Icon,
  EditIcon,
  File01Icon,
  MedicineBottle01Icon,
  MoreVerticalIcon,
  StethoscopeIcon,
  TelegramIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { View } from "@/types";

// Repositories & Local LLM Imports
import { 
  usePatientsRepository, 
  useRemindersRepository,
  useAppointmentsRepository,
  useProductsRepository,
  useNotesRepository,
  useWeightEntriesRepository
} from "@/data/repositories";
import {
  isWebLLMReady,
  isWebLLMLoading,
  initializeWebLLM,
  generateText,
  subscribeToProgress,
} from "@/services/webLLMService";
import { AI_MODELS } from "@/lib/ai-models";
import { Paperclip, Eye, Sun, Contrast, RotateCw, Bot, Sparkles } from "lucide-react";

interface Message {
  content: string;
  id: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface Conversation {
  createdAt: Date;
  id: string;
  messages: Message[];
  title: string;
  updatedAt: Date;
}

interface AIAgentChatProps {
  currentView: View;
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_ACTIONS = [
  {
    id: "fiche",
    label: "Fiche patient",
    icon: File01Icon,
    description: "Structure complète d'anamnèse",
  },
  {
    id: "compte-rendu",
    label: "Compte-rendu",
    icon: ClipboardIcon,
    description: "Documentation consultation",
  },
  {
    id: "protocole",
    label: "Protocole",
    icon: MedicineBottle01Icon,
    description: "Vaccins & antiparasitaires",
  },
  {
    id: "sms",
    label: "SMS client",
    icon: Chatting01Icon,
    description: "Rappels & confirmations",
  },
];

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: `Bonjour Docteur.
  
Je suis votre assistant clinique local spécialisé pour le cabinet. Je suis connecté à vos dossiers de patients SQLite en toute sécurité.

Vous pouvez charger un cliché radiologique ou une photo clinique pour l'analyser avec Phi-3.5 Vision, ou me demander d'interagir avec vos dossiers locaux (recherche, rappels).

Comment puis-je vous assister aujourd'hui ?`,
  timestamp: new Date(),
};

export function AIAgentChat({
  isOpen,
  onClose,
  currentView: _currentView,
}: AIAgentChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "default",
      title: "Nouvelle conversation",
      messages: [WELCOME_MESSAGE],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const [activeConversationId, setActiveConversationId] = useState("default");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Local LLM & Vision State
  const [modelProgress, setModelProgress] = useState<{ progress: number; text: string } | null>(null);
  const [isLlmReady, setIsLlmReady] = useState(false);
  const [isLlmLoading, setIsLlmLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState("Phi-3.5-vision-instruct-q4f16_1-MLC");

  // Image attachment & Visualizer State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [contrast, setContrast] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [isInverted, setIsInverted] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Repositories hooks
  const patientsRepository = usePatientsRepository();
  const remindersRepository = useRemindersRepository();
  const appointmentsRepository = useAppointmentsRepository();
  const productsRepository = useProductsRepository();
  const notesRepository = useNotesRepository();
  const weightRepository = useWeightEntriesRepository();

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );
  const messages = activeConversation?.messages || [];

  // Track model progress & availability
  useEffect(() => {
    setIsLlmReady(isWebLLMReady());
    setIsLlmLoading(isWebLLMLoading());

    const unsubscribe = subscribeToProgress((report) => {
      setModelProgress(report);
      setIsLlmReady(isWebLLMReady());
      setIsLlmLoading(isWebLLMLoading());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, activeConversationId]);

  const handleLoadModel = async (modelId: string) => {
    try {
      setSelectedModelId(modelId);
      setIsLlmLoading(true);
      await initializeWebLLM(modelId);
      setIsLlmReady(true);
    } catch (err) {
      console.error("[WebLLM] Error initializing model:", err);
    } finally {
      setIsLlmLoading(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      // Switch automatically to vision model when attaching files
      if (selectedModelId !== "Phi-3.5-vision-instruct-q4f16_1-MLC") {
        setSelectedModelId("Phi-3.5-vision-instruct-q4f16_1-MLC");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Agentic Tool Execution
  const executeTool = async (name: string, argsStr: string): Promise<string> => {
    const args: Record<string, string> = {};
    const regex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
    let match;
    while ((match = regex.exec(argsStr)) !== null) {
      const key = match[1];
      const val = match[2] || match[3] || match[4];
      args[key] = val;
    }

    if (name === "search_patients") {
      const query = args.query || argsStr.replace(/["']/g, "").trim();
      if (!query) return "Erreur: Recherche vide.";

      const found = patientsRepository.data.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.breed?.toLowerCase().includes(query.toLowerCase())
      );

      if (found.length === 0) return `Aucun patient trouvé pour "${query}".`;

      return `Trouvé ${found.length} patient(s) :\n` + found.map((p) => {
        const owner = patientsRepository.owners.find((o) => o.id === p.ownerId);
        return `- ID: ${p.id}, Nom: ${p.name}, Espèce: ${p.species}, Race: ${p.breed || "N/A"}, Propriétaire: ${owner ? `${owner.firstName} ${owner.lastName}` : "Inconnu"}`;
      }).join("\n");
    }

    if (name === "create_reminder") {
      const patientId = args.patient_id || args.patientId;
      const text = args.text || args.message;
      const date = args.date || args.scheduled_for;

      if (!patientId || !text || !date) {
        return "Erreur: Paramètres requis manquants (patient_id, text, date).";
      }

      const patient = patientsRepository.data.find((p) => String(p.id) === String(patientId));
      if (!patient) return `Erreur: Patient ID ${patientId} introuvable.`;

      await remindersRepository.add({
        appointmentId: "",
        channel: "in_app",
        message: `${patient.name} : ${text}`,
        minutesBefore: 0,
        scheduledFor: new Date(date).toISOString(),
        status: "pending",
      } as any);

      return `Succès : Rappel créé pour ${patient.name} le ${date} : "${text}"`;
    }

    if (name === "get_appointments") {
      const dateStr = args.date || argsStr.replace(/["']/g, "").trim();
      const targetDate = dateStr ? new Date(dateStr) : new Date();
      if (isNaN(targetDate.getTime())) return "Erreur: Format de date invalide.";
      
      const targetDateString = targetDate.toISOString().split("T")[0];
      const todayAppts = appointmentsRepository.data.filter(a => a.startTime.startsWith(targetDateString));
      
      if (todayAppts.length === 0) return `Aucun rendez-vous trouvé pour la date ${targetDateString}.`;
      
      return `Trouvé ${todayAppts.length} rendez-vous pour ${targetDateString}:\n` + todayAppts.map(a => {
        const patient = patientsRepository.data.find(p => p.id === a.patientId);
        return `- ${a.startTime.split("T")[1].slice(0,5)} : ${a.title} (Patient: ${patient?.name || "Inconnu"}, Statut: ${a.status})`;
      }).join("\n");
    }

    if (name === "search_stock") {
      const query = args.query || argsStr.replace(/["']/g, "").trim();
      if (!query) return "Erreur: Recherche vide.";
      
      const found = productsRepository.data.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
      if (found.length === 0) return `Aucun produit trouvé pour "${query}".`;
      
      return `Stock pour "${query}":\n` + found.map(p => `- ${p.name}: ${p.quantity} unités restantes`).join("\n");
    }

    if (name === "get_patient_history") {
      const patientId = args.patient_id || args.patientId || argsStr.replace(/["']/g, "").trim();
      if (!patientId) return "Erreur: ID du patient manquant.";
      
      const patient = patientsRepository.data.find(p => String(p.id) === String(patientId));
      if (!patient) return `Erreur: Patient introuvable.`;
      
      const latestWeight = weightRepository.latestFor(patient.id);
      
      return `Historique de ${patient.name} (${patient.species}):
Poids le plus récent: ${latestWeight ? `${latestWeight.weight} kg (${latestWeight.measuredAt.split("T")[0]})` : "Aucun"}
Allergies: ${patient.allergies || "Aucune connue"}
Notes générales: ${patient.generalNotes || "Aucune"}`;
    }

    if (name === "add_note") {
      const title = args.title || "Note IA";
      const content = args.content || args.text;
      if (!content) return "Erreur: Contenu de la note manquant.";
      
      // Notes require a user ID. In a real app we'd get the current user, here we use a dummy or first user.
      await notesRepository.add({
        userId: "system",
        title: title,
        content: content,
        isFavorite: false,
      } as any);
      
      return `Succès: Note "${title}" enregistrée.`;
    }

    return `Erreur : Outil "${name}" inconnu.`;
  };

  const SYSTEM_PROMPT_WITH_TOOLS = `Tu es l'assistant clinique vétérinaire expert. Tu as accès à la base de données locale du cabinet.
  
Pour t'aider, tu peux appeler des outils locaux en écrivant exactement sous ce format : \`[TOOL: nom_outil(parametre="valeur")]\`.
L'application exécutera l'outil et te renverra le résultat sous la forme \`[TOOL_RESULT: ...]\`. Tu pourras ensuite formuler ta réponse finale.

Outils disponibles :
1. \`search_patients(query="nom ou race")\` : Cherche des patients dans le cabinet.
2. \`create_reminder(patient_id="ID", text="Vaccin/Suivi", date="YYYY-MM-DD")\` : Crée un rappel clinique.
3. \`get_appointments(date="YYYY-MM-DD")\` : Récupère les rendez-vous pour une date donnée.
4. \`search_stock(query="nom du produit")\` : Vérifie la disponibilité d'un produit en stock.
5. \`get_patient_history(patient_id="ID")\` : Récupère le résumé clinique et la dernière pesée d'un patient.
6. \`add_note(title="Titre", content="Contenu")\` : Ajoute un pense-bête ou une note générale pour le vétérinaire.

Règles :
- Sois factuel, médical, structuré (Évaluation, Hypothèses, Actions).
- Si tu utilises un outil, attends de voir [TOOL_RESULT: ...] avant de conclure.
- Réponds en français.`;

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) {
      return;
    }

    if (!isLlmReady) {
      const loadMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Veuillez d'abord initialiser le modèle local IA en cliquant sur le bouton de chargement dans le panneau latéral gauche.",
        timestamp: new Date(),
      };
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversationId
            ? { ...conv, messages: [...conv.messages, loadMsg] }
            : conv
        )
      );
      return;
    }

    const userInputText = input;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: selectedImage ? `[Cliché Joint] ${userInputText}` : userInputText,
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

    try {
      const historyTurns = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.role,
          text: m.content,
        }));

      let currentPrompt = userInputText;
      let finalAnswer = "";
      let attempts = 0;
      const history = [...historyTurns];

      while (attempts < 3) {
        const response = await generateText(currentPrompt, "", {
          history,
          imageUri: imagePayload || undefined,
          systemPrompt: SYSTEM_PROMPT_WITH_TOOLS,
          temperature: 0.2,
        });

        const toolMatch = response.match(/\[TOOL:\s*(\w+)\s*\(([^)]*)\)\s*\]/);
        if (toolMatch) {
          const [_, toolName, argsStr] = toolMatch;

          // Inform user of tool call
          const toolCallMsg: Message = {
            id: `tool-${Date.now()}-${attempts}`,
            role: "assistant",
            content: `🔧 *Appel de l'outil local : ${toolName}(${argsStr})*...`,
            timestamp: new Date(),
          };
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === activeConversationId
                ? { ...conv, messages: [...conv.messages, toolCallMsg] }
                : conv
            )
          );

          const toolResult = await executeTool(toolName, argsStr);

          history.push({ role: "assistant", text: response });
          history.push({ role: "user", text: `[TOOL_RESULT: ${toolResult}]` });
          currentPrompt = `Rédige la réponse finale ou poursuis par rapport au résultat de l'outil : ${toolResult}`;
          attempts++;
        } else {
          finalAnswer = response;
          break;
        }
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: finalAnswer || "Je n'ai pas pu générer de réponse.",
        timestamp: new Date(),
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
      console.error("[LocalAI] Chat generation failed:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Désolé, une erreur de calcul est survenue avec le modèle IA local (possible surcharge VRAM WebGPU). Veuillez réessayer.",
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
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: (typeof QUICK_ACTIONS)[0]) => {
    const promptMap: Record<string, string> = {
      fiche: "Rédige une fiche patient complète pour",
      "compte-rendu": "Rédige un compte-rendu de consultation pour",
      protocole: "Quel est le protocole vaccinal recommandé pour",
      sms: "Rédige un SMS de rappel pour",
    };
    setInput(promptMap[action.id] || action.label);
    textareaRef.current?.focus();
  };

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: "Nouvelle conversation",
      messages: [WELCOME_MESSAGE],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      if (remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
      } else {
        createNewConversation();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <DialogContent
        className="!max-w-[85vw] flex h-[85vh] w-[85vw] flex-col gap-0 overflow-hidden rounded-3xl border border-zinc-200/50 p-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:border-white/10 dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Assistant Vétérinaire</DialogTitle>
        </DialogHeader>

        {/* Premium Header */}
        <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-white/40 px-6 backdrop-blur-xl dark:bg-zinc-950/40">
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-orange-500/5 opacity-50" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm">
              <div className="absolute inset-0 rounded-xl bg-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
              <Bot className="relative z-10 size-5 text-white" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">
                Assistant IA
              </h2>
              <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                100% Local · Base Sécurisée
              </p>
            </div>
          </div>
          <Button
            className="relative z-10 size-9 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <HugeiconsIcon
              className="size-4 text-foreground"
              icon={Cancel01Icon}
            />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden bg-background">
          {/* Sidebar */}
          <div className="flex w-64 flex-col border-r border-border/40 bg-zinc-50/50 dark:bg-zinc-900/30">
            {/* Local LLM Status */}
            <div className="border-b border-border/40 p-5 space-y-3">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Moteur IA Local (Vision)
              </label>

              {isLlmReady ? (
                <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-50/50 px-3 py-2 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex size-2 rounded-full bg-blue-500"></span>
                  </span>
                  Modèle en ligne
                </div>
              ) : isLlmLoading ? (
                <div className="space-y-2 rounded-lg border border-border/40 bg-white p-3 shadow-sm dark:bg-zinc-950">
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                    <span>Initialisation...</span>
                    <span>{Math.round((modelProgress?.progress ?? 0) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${(modelProgress?.progress ?? 0) * 100}%` }}
                    />
                  </div>
                  <p className="truncate font-mono text-[9px] text-muted-foreground/80">
                    {modelProgress?.text || "Chargement..."}
                  </p>
                </div>
              ) : (
                <Button
                  className="h-9 w-full rounded-lg bg-black text-xs font-medium text-white shadow-md transition-transform hover:scale-[1.02] hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  onClick={() => handleLoadModel(selectedModelId)}
                >
                  Activer l'assistant
                </Button>
              )}
            </div>

            {/* New conversation */}
            <div className="p-4">
              <Button
                className="h-10 w-full justify-start gap-2.5 rounded-xl border border-border/60 bg-white px-3 shadow-sm transition-all hover:border-border hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                onClick={createNewConversation}
                variant="ghost"
              >
                <div className="flex size-5 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800">
                  <HugeiconsIcon
                    className="size-3.5 text-foreground"
                    icon={Add01Icon}
                  />
                </div>
                <span className="text-sm font-medium">Nouvelle discussion</span>
              </Button>
            </div>

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    className={cn(
                      "group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-200",
                      activeConversationId === conv.id
                        ? "bg-zinc-200/50 text-foreground shadow-sm dark:bg-zinc-800/50"
                        : "text-muted-foreground hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800/30"
                    )}
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <HugeiconsIcon
                        className={cn(
                          "size-4 shrink-0",
                          activeConversationId === conv.id
                            ? "text-foreground"
                            : "text-muted-foreground/60"
                        )}
                        icon={Chatting01Icon}
                      />
                      <span className="truncate font-medium">{conv.title}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            className="size-7 rounded-lg opacity-0 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                            size="icon"
                            variant="ghost"
                          >
                            <HugeiconsIcon
                              className="size-3"
                              icon={MoreVerticalIcon}
                            />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem
                          className="rounded-lg text-destructive text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.id);
                          }}
                        >
                          <HugeiconsIcon
                            className="mr-2 size-4"
                            icon={Delete01Icon}
                          />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-border/50 border-t px-4 py-3">
              <p className="font-medium text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                Raccourci : Ctrl/Cmd + J
              </p>
            </div>
          </div>

          {/* Chat Area */}
          <div className="relative flex min-w-0 flex-1 flex-col">
            {/* Ambient Mesh Background (Very subtle) */}
            <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/20 via-background to-orange-50/20 opacity-60 dark:from-blue-900/10 dark:to-orange-900/10" />
            
            {/* Messages */}
            <div className="relative z-10 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl px-8 py-8">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-10 pt-12">
                    <div className="relative">
                      {/* Vibrant animated glow behind icon */}
                      <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-blue-400 via-purple-400 to-orange-400 blur-3xl opacity-30 dark:opacity-20" />
                      
                      {/* Premium Icon Container */}
                      <div className="relative flex size-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-white to-zinc-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)] dark:from-zinc-800 dark:to-zinc-900 dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)]">
                        <Bot className="size-10 text-zinc-800 dark:text-zinc-200" />
                      </div>
                    </div>
                    <div className="space-y-3 text-center">
                      <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground">
                        Bonjour Docteur
                      </h2>
                      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                        Je suis votre assistant IA clinique. Je peux analyser vos radiographies, interroger vos dossiers patients et vous aider dans votre quotidien.
                      </p>
                    </div>
                    <div className="grid w-full max-w-xl grid-cols-2 gap-4">
                      {QUICK_ACTIONS.map((action) => (
                        <button
                          className="group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border border-zinc-200/60 bg-white/50 p-5 text-left shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-zinc-900/50 dark:hover:border-white/20 dark:hover:bg-zinc-900"
                          key={action.id}
                          onClick={() => handleQuickAction(action)}
                        >
                          <div className="absolute -right-4 -top-4 size-24 rounded-full bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition-colors group-hover:bg-black group-hover:text-white dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-white dark:group-hover:text-black">
                              <HugeiconsIcon
                                className="size-4"
                                icon={action.icon}
                              />
                            </div>
                            <span className="font-medium text-sm text-foreground">
                              {action.label}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {action.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {messages.map((message, idx) => (
                      <div
                        className={cn(
                          "fade-in slide-in-from-bottom-2 flex animate-in gap-4 duration-500",
                          message.role === "user"
                            ? "flex-row-reverse"
                            : "flex-row"
                        )}
                        key={message.id}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        {message.role === "assistant" && (
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm">
                            <Sparkles className="size-4 text-white" />
                          </div>
                        )}
                        {message.role === "user" && (
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background shadow-sm">
                            <span className="text-xs font-medium text-muted-foreground">MOI</span>
                          </div>
                        )}
                        <div
                          className={cn(
                            "min-w-0 flex-1",
                            message.role === "user" && "text-right"
                          )}
                        >
                          <div
                            className={cn(
                              "inline-block max-w-[90%] text-left text-[15px] leading-relaxed shadow-sm",
                              message.role === "user"
                                ? "rounded-3xl rounded-tr-sm bg-black px-5 py-3 text-white dark:bg-white dark:text-black"
                                : "rounded-3xl rounded-tl-sm border border-zinc-200/60 bg-white/80 px-5 py-4 text-foreground backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/80"
                            )}
                          >
                            {message.content.split("\n").map((line, i) => {
                              const isHeading = line.startsWith("# ");
                              const isSubHeading = line.startsWith("## ");
                              const isListItem =
                                line.startsWith("•") || line.startsWith("-");
                              const isQuote = line.startsWith(">");
                              const cleanLine = line
                                .replace(/^#+ /, "")
                                .replace(/^> /, "")
                                .replace(/\*\*/g, "")
                                .replace(/^- /, "")
                                .replace(/^• /, "");

                              if (!cleanLine.trim()) {
                                return <div className="h-3" key={i} />;
                              }

                              if (isHeading) {
                                return (
                                  <h3
                                    className="mt-4 mb-3 font-semibold text-foreground text-lg first:mt-0"
                                    key={i}
                                  >
                                    {cleanLine}
                                  </h3>
                                );
                              }

                              if (isSubHeading) {
                                return (
                                  <h4
                                    className="mt-4 mb-2 font-semibold text-muted-foreground text-sm uppercase tracking-wider"
                                    key={i}
                                  >
                                    {cleanLine}
                                  </h4>
                                );
                              }

                              if (isQuote) {
                                return (
                                  <div
                                    className="my-3 rounded-r-lg border-l-2 border-blue-400 bg-blue-50/50 py-2 pl-4 dark:border-blue-500 dark:bg-blue-900/20"
                                    key={i}
                                  >
                                    <p className="text-sm italic text-muted-foreground">
                                      {cleanLine}
                                    </p>
                                  </div>
                                );
                              }

                              return (
                                <p
                                  className={cn(
                                    "py-1",
                                    isListItem &&
                                      "relative pl-4 before:absolute before:left-0 before:text-emerald-500 before:content-['•']",
                                    line.includes("**") && "font-semibold"
                                  )}
                                  key={i}
                                >
                                  {cleanLine}
                                </p>
                              );
                            })}
                          </div>
                          <p className="mt-1.5 font-medium text-[11px] text-muted-foreground/50">
                            {message.timestamp.toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {isLoading && (
                      <div className="fade-in flex animate-in gap-4 duration-300">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/20 shadow-md">
                          <HugeiconsIcon
                            className="size-4 text-white"
                            icon={StethoscopeIcon}
                          />
                        </div>
                        <div className="flex items-center gap-1 py-3">
                          <span
                            className="size-1.5 animate-bounce rounded-full bg-emerald-400"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="size-1.5 animate-bounce rounded-full bg-emerald-400"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="size-1.5 animate-bounce rounded-full bg-emerald-400"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="relative z-10 border-t border-border/40 bg-white/80 p-4 backdrop-blur-xl dark:bg-zinc-950/80">
              <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-2xl border border-zinc-200/80 bg-white p-2 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-shadow focus-within:border-zinc-300 focus-within:shadow-md dark:border-white/10 dark:bg-zinc-900 dark:focus-within:border-white/20">
                <Button
                  className="size-10 shrink-0 rounded-xl text-muted-foreground hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
                  onClick={handleImageClick}
                  size="icon"
                  type="button"
                  variant="ghost"
                  title="Joindre une image (Vision)"
                >
                  <Paperclip className="size-5" />
                </Button>

                <div className="relative flex-1">
                  {selectedImage && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-1.5 dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="relative h-10 w-10 shrink-0 rounded overflow-hidden">
                        <img src={selectedImage} alt="Preview" className="h-full w-full object-cover" />
                      </div>
                      <span className="text-xs text-muted-foreground">Cliché chargé</span>
                      <button onClick={handleRemoveImage} className="ml-auto p-1 hover:bg-zinc-200 rounded">✕</button>
                    </div>
                  )}
                  {/* Hidden Image input */}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />

                  <Textarea
                    className="max-h-[120px] min-h-[40px] w-full resize-none border-0 bg-transparent px-0 py-2.5 text-[15px] placeholder:text-muted-foreground/50 focus-visible:ring-0"
                    placeholder="Posez votre question clinique..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    ref={textareaRef}
                  />

                  <Button
                    className="size-10 shrink-0 rounded-xl bg-black text-white shadow-sm transition-transform hover:scale-105 hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                    disabled={(!input.trim() && !selectedImage) || isLoading}
                    onClick={handleSend}
                    size="icon"
                  >
                    {isLoading ? (
                      <Spinner className="size-4 text-white dark:text-black" />
                    ) : (
                      <HugeiconsIcon className="size-5" icon={TelegramIcon} />
                    )}
                  </Button>
                </div>
                <p className="text-center text-[10px] text-muted-foreground/40">
                  Entrée pour envoyer · Shift+Entrée pour nouvelle ligne
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Radiography DICOM Style Visualizer Dialog */}
        <Dialog open={showVisualizer} onOpenChange={setShowVisualizer}>
          <DialogContent className="max-w-3xl rounded-2xl border border-border/50 bg-zinc-950 text-white shadow-2xl p-6">
            <DialogHeader className="flex flex-row items-center justify-between border-b border-white/10 pb-4">
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Visualiseur Radiologique & Clinique
                </DialogTitle>
                <p className="text-xs text-zinc-400">
                  Ajustez les contrastes et les niveaux pour faciliter l'analyse
                </p>
              </div>
              <Button
                className="size-9 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={() => setShowVisualizer(false)}
                size="icon"
                variant="ghost"
              >
                <HugeiconsIcon className="size-4" icon={Cancel01Icon} />
              </Button>
            </DialogHeader>

            <div className="mt-6 flex flex-col md:flex-row gap-6">
              {/* Image Preview Screen */}
              <div className="flex-1 flex items-center justify-center rounded-xl bg-black border border-white/10 p-4 min-h-[300px] overflow-hidden">
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt="Radiographie"
                    className="max-h-[400px] w-auto object-contain rounded transition-all"
                    style={{
                      filter: `contrast(${contrast}%) brightness(${brightness}%) ${isInverted ? "invert(1)" : ""}`,
                    }}
                  />
                ) : (
                  <p className="text-zinc-500 text-sm">Aucun cliché chargé</p>
                )}
              </div>

              {/* Controls Column */}
              <div className="w-full md:w-64 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Brightness */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-zinc-300">
                      <span className="flex items-center gap-1"><Sun className="size-3" /> Luminosité</span>
                      <span>{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full accent-blue-500 bg-zinc-800 rounded-lg h-1.5"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-zinc-300">
                      <span className="flex items-center gap-1"><Contrast className="size-3" /> Contraste</span>
                      <span>{contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="300"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-full accent-blue-500 bg-zinc-800 rounded-lg h-1.5"
                    />
                  </div>

                  {/* Invert */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                      <RotateCw className="size-3" /> Inverser les couleurs
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsInverted(!isInverted)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        isInverted ? "bg-blue-500" : "bg-zinc-800"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          isInverted ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Reset button */}
                <Button
                  className="w-full h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-white"
                  onClick={() => {
                    setBrightness(100);
                    setContrast(100);
                    setIsInverted(false);
                  }}
                >
                  Réinitialiser les réglages
                </Button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                className="rounded-xl bg-white hover:bg-zinc-200 px-5 text-sm font-semibold text-black"
                onClick={() => setShowVisualizer(false)}
              >
                Appliquer et Fermer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
