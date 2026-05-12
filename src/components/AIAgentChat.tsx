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

Je suis votre assistant spécialisé pour le cabinet vétérinaire. Je peux vous aider avec les fiches patients, les comptes-rendus de consultation, les protocoles vaccinaux, ou la rédaction de messages pour vos clients.

Comment puis-je vous assister aujourd'hui ?`,
  timestamp: new Date(),
};

export function AIAgentChat({
  isOpen,
  onClose,
  currentView,
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

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );
  const messages = activeConversation?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, activeConversationId]);

  const simulateResponse = useCallback(
    async (userMessage: string): Promise<string> => {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const lowerMsg = userMessage.toLowerCase();

      if (lowerMsg.includes("fiche") || lowerMsg.includes("patient")) {
        return `# Fiche Patient - Structure Proposée

## Anamnèse
**Motif de consultation** : [À compléter]

**Antécédents** :
- Médicaux/chirurgicaux :
- Traitements en cours :
- Mode de vie :

## Examen Clinique
| Paramètre | Valeur | Norme |
|-----------|--------|-------|
| Température | ___°C | 38-39°C |
| FC | ___ bpm | 70-120 |
| FR | ___ rpm | 10-30 |
| BCS | /9 | 4-5 |

## Diagnostic & Traitement
**Hypothèse principale** :

**Prescription** :
1. 
2. 
3. 

**Suivi** : Revoir dans ___`;
      }

      if (
        lowerMsg.includes("compte-rendu") ||
        lowerMsg.includes("consultation")
      ) {
        return `# Compte-Rendu de Consultation

**Patient** : [Nom] — [Espèce] — [Âge]
**Date** : ${new Date().toLocaleDateString("fr-FR")}
**Propriétaire** : [Nom]

## Motif
[Description]

## Examen
[Constatations cliniques]

## Conduite
[Diagnostic et traitement prescrit]

---
*Dr [Votre nom]*`;
      }

      if (lowerMsg.includes("protocole") || lowerMsg.includes("vaccin")) {
        return `# Protocole Vaccinal WSAVA 2022

## Core Vaccines (obligatoires)

**CVRP** (Carré/Parvo/Hépatite/Parainfluenza)
- Rappel : annuel ou triennal
- Voie : SC

**Leptospirose**
- Rappel : **annuel obligatoire**
- Attention : immunité courte

## Non-Core (selon risque)
- **Rage** — voyage, chasse
- **Bordetella** — pension, multi-chiens
- **Leishmaniose** — zones endémiques

## Points Vigilance
- Déparasitage préalable
- Attente 48h avant chirurgie
- Surveillance 15-30 min post-vaccin`;
      }

      if (lowerMsg.includes("sms") || lowerMsg.includes("rappel")) {
        return `SMS de rappel vaccinal :

> Bonjour, c'est la Clinique Vétérinaire. Le vaccin de [Nom] est dû cette semaine. Pour maintenir sa protection, merci de prendre rendez-vous au 01 23 45 67 89. À bientôt !

SMS confirmation RDV :

> Bonjour [Prénom], je confirme votre RDV demain [date] à [heure] pour [Nom]. En cas d'empêchement, merci de nous appeler au 01 23 45 67 89. À demain !`;
      }

      return `Je comprends votre demande. Pour vous assister au mieux, pourriez-vous préciser :

• S'agit-il d'une **rédaction documentaire** ?
• D'une **question médicale** (protocole, posologie) ?
• D'une **communication client** ?
• Ou d'une **aide au diagnostic** ?`;
    },
    []
  );

  const handleSend = async () => {
    if (!input.trim() || isLoading) {
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
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
                  ? input.slice(0, 25) + (input.length > 25 ? "..." : "")
                  : conv.title,
            }
          : conv
      )
    );

    setInput("");
    setIsLoading(true);

    try {
      const response = await simulateResponse(userMsg.content);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
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
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Une erreur est survenue. Veuillez réessayer.",
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
      <DialogContent className="!max-w-[85vw] flex h-[85vh] w-[85vw] flex-col gap-0 overflow-hidden rounded-2xl border border-border/50 p-0 shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Assistant Vétérinaire</DialogTitle>
        </DialogHeader>

        {/* Header Épuré */}
        <div className="flex h-16 shrink-0 items-center justify-between bg-gradient-to-r from-background to-muted/30 px-6">
          <div className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
              <HugeiconsIcon
                className="size-5 text-violet-600"
                icon={StethoscopeIcon}
              />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-sm">
                Assistant Vétérinaire
              </h2>
              <p className="text-muted-foreground text-xs">
                Spécialisé pour le cabinet
              </p>
            </div>
          </div>
          <Button
            className="size-9 rounded-full hover:bg-muted"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <HugeiconsIcon
              className="size-4 text-muted-foreground"
              icon={Cancel01Icon}
            />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
          {/* Sidebar */}
          <div className="flex w-60 flex-col border-border/50 border-r bg-muted/20">
            {/* New conversation */}
            <div className="p-4">
              <Button
                className="h-11 w-full justify-start gap-2 rounded-xl border border-border/60 bg-background shadow-sm transition-all hover:border-border hover:bg-muted"
                onClick={createNewConversation}
                variant="ghost"
              >
                <div className="flex size-6 items-center justify-center rounded-md bg-violet-500/10">
                  <HugeiconsIcon
                    className="size-3.5 text-violet-600"
                    icon={Add01Icon}
                  />
                </div>
                <span className="font-medium text-sm">
                  Nouvelle conversation
                </span>
              </Button>
            </div>

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    className={cn(
                      "group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                      activeConversationId === conv.id
                        ? "bg-violet-500/10 text-violet-700 shadow-sm"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <HugeiconsIcon
                        className={cn(
                          "size-4 shrink-0",
                          activeConversationId === conv.id
                            ? "text-violet-500"
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
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl px-8 py-8">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-8 pt-12">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400/30 to-fuchsia-400/30 blur-2xl" />
                      <div className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25">
                        <HugeiconsIcon
                          className="size-10 text-white"
                          icon={StethoscopeIcon}
                        />
                      </div>
                    </div>
                    <div className="space-y-2 text-center">
                      <h2 className="font-semibold text-2xl tracking-tight">
                        Assistant Vétérinaire
                      </h2>
                      <p className="max-w-sm text-muted-foreground text-sm">
                        Je suis spécialisé pour vous aider dans les tâches
                        quotidiennes du cabinet.
                      </p>
                    </div>
                    <div className="grid w-full max-w-lg grid-cols-2 gap-3">
                      {QUICK_ACTIONS.map((action) => (
                        <button
                          className="group flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-background/80 p-4 text-left transition-all duration-200 hover:border-violet-300 hover:bg-violet-50/30 hover:shadow-md"
                          key={action.id}
                          onClick={() => handleQuickAction(action)}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 transition-all group-hover:from-violet-500/20 group-hover:to-fuchsia-500/20">
                              <HugeiconsIcon
                                className="size-4 text-violet-600"
                                icon={action.icon}
                              />
                            </div>
                            <span className="font-medium text-sm">
                              {action.label}
                            </span>
                          </div>
                          <span className="pl-9.5 text-muted-foreground text-xs">
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
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md shadow-violet-500/20">
                            <HugeiconsIcon
                              className="size-4 text-white"
                              icon={StethoscopeIcon}
                            />
                          </div>
                        )}
                        {message.role === "user" && (
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted">
                            <HugeiconsIcon
                              className="size-4 text-muted-foreground"
                              icon={EditIcon}
                            />
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
                              "inline-block max-w-[90%] text-left text-[15px] leading-relaxed",
                              message.role === "user"
                                ? "rounded-2xl rounded-tr-sm bg-muted px-5 py-3 text-foreground"
                                : "px-1 py-1 text-foreground"
                            )}
                          >
                            {message.content.split("\n").map((line, i) => {
                              const isHeading = line.startsWith("# ");
                              const isSubHeading = line.startsWith("## ");
                              const isTableRow = line.startsWith("|");
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
                                    className="my-3 rounded-r-lg border-violet-300 border-l-2 bg-violet-50/50 py-2 pl-4"
                                    key={i}
                                  >
                                    <p className="text-muted-foreground text-sm italic">
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
                                      "relative pl-4 before:absolute before:left-0 before:text-violet-500 before:content-['•']",
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
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md shadow-violet-500/20">
                          <HugeiconsIcon
                            className="size-4 text-white"
                            icon={StethoscopeIcon}
                          />
                        </div>
                        <div className="flex items-center gap-1 py-3">
                          <span
                            className="size-1.5 animate-bounce rounded-full bg-violet-400"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="size-1.5 animate-bounce rounded-full bg-violet-400"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="size-1.5 animate-bounce rounded-full bg-violet-400"
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
            <div className="border-border/50 border-t bg-gradient-to-t from-muted/30 to-background px-8 py-5">
              <div className="mx-auto max-w-3xl space-y-3">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      className="flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/60 px-3 py-1.5 font-medium text-muted-foreground text-xs transition-all duration-200 hover:border-violet-200 hover:bg-violet-100/50 hover:text-violet-700"
                      key={action.id}
                      onClick={() => handleQuickAction(action)}
                    >
                      <HugeiconsIcon className="size-3" icon={action.icon} />
                      {action.label}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="relative">
                  <Textarea
                    className="max-h-[200px] min-h-[60px] resize-none rounded-xl border-border/60 bg-background pr-14 text-[15px] shadow-sm transition-shadow placeholder:text-muted-foreground/50 focus:shadow-md"
                    disabled={isLoading}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Posez votre question..."
                    ref={textareaRef}
                    value={input}
                  />
                  <Button
                    className="absolute right-2 bottom-2 size-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md shadow-violet-500/25 transition-all hover:from-violet-600 hover:to-fuchsia-600 disabled:shadow-none"
                    disabled={!input.trim() || isLoading}
                    onClick={handleSend}
                    size="icon"
                  >
                    {isLoading ? (
                      <Spinner className="size-4 text-white" />
                    ) : (
                      <HugeiconsIcon
                        className="size-4 text-white"
                        icon={TelegramIcon}
                      />
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
      </DialogContent>
    </Dialog>
  );
}
