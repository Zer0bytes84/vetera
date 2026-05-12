import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Delete01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_MODEL_ID,
  getModelById,
  getModelPreferences,
} from "@/lib/ai-models";
import { cn } from "@/lib/utils";
import {
  generateText,
  getCurrentProgress,
  initializeWebLLM,
  isWebLLMLoading,
  isWebLLMReady,
  subscribeToProgress,
} from "@/services/webLLMService";

type AIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export function AIAgentPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelIdRef = useRef<string>(DEFAULT_MODEL_ID);

  useEffect(() => {
    const prefs = getModelPreferences();
    modelIdRef.current = prefs.defaultModelId;
    setModelReady(isWebLLMReady());
    setModelLoading(isWebLLMLoading());
    if (isWebLLMLoading()) {
      const p = getCurrentProgress();
      setProgress(p.progress);
    }

    const unsub = subscribeToProgress((report) => {
      setProgress(report.progress);
      if (report.progress === 1) {
        setModelReady(true);
        setModelLoading(false);
      }
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeModel = getModelById(modelIdRef.current);

  const handleLoadModel = async () => {
    setModelLoading(true);
    setProgress(0);

    try {
      await initializeWebLLM(modelIdRef.current, (report) => {
        setProgress(report.progress);
      });
      setModelReady(true);
      setModelLoading(false);
    } catch {
      setModelLoading(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isGenerating) {
      return;
    }

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsGenerating(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.content,
      }));

      const response = await generateText(text, "", {
        history,
        temperature: 0.4,
        maxTokens: 800,
        systemPrompt: activeModel?.systemPrompt,
      });

      const assistantMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Désolé, une erreur est survenue. Réessayez.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  const quickPrompts = [
    "Résume les consultations d'aujourd'hui",
    "Quels sont les stocks critiques ?",
    "Conseil pour une vaccination canine",
    "Comment préparer un dossier patient ?",
  ];

  if (!isOpen) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-border border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <HugeiconsIcon
              className="size-4 text-white"
              icon={SparklesIcon}
              strokeWidth={2}
            />
          </div>
          <p className="font-semibold text-foreground text-sm">Assistant</p>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              className="text-muted-foreground"
              onClick={handleClear}
              size="icon-xs"
              variant="ghost"
            >
              <HugeiconsIcon data-icon icon={Delete01Icon} strokeWidth={2} />
            </Button>
          )}
          <Button
            className="text-muted-foreground"
            onClick={onClose}
            size="icon-xs"
            variant="ghost"
          >
            <HugeiconsIcon data-icon icon={ArrowDown01Icon} strokeWidth={2} />
          </Button>
        </div>
      </div>

      {/* Status bar */}
      {!(modelReady || modelLoading) && (
        <div className="flex items-center gap-2 border-border border-b bg-muted/30 px-4 py-2">
          <Button
            className="h-6 text-[10px]"
            onClick={handleLoadModel}
            size="sm"
            variant="outline"
          >
            Charger l'assistant
          </Button>
          <span className="text-[10px] text-muted-foreground">100% local</span>
        </div>
      )}

      {modelLoading && (
        <div className="border-border border-b px-4 py-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {modelReady && (
        <div className="flex items-center gap-1.5 border-border border-b px-4 py-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
            Prêt
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10">
              <HugeiconsIcon
                className="size-6 text-violet-500"
                icon={SparklesIcon}
                strokeWidth={2}
              />
            </div>
            <p className="font-medium text-foreground text-sm">
              Comment puis-je vous aider ?
            </p>
            <p className="mt-1 max-w-[200px] text-muted-foreground text-xs">
              Posez une question ou choisissez une suggestion
            </p>
            <div className="mt-4 flex w-full flex-col gap-1.5">
              {quickPrompts.map((prompt) => (
                <Button
                  className="h-auto w-full justify-start py-2 text-left text-muted-foreground text-xs hover:text-foreground"
                  key={prompt}
                  onClick={() => {
                    setInput(prompt);
                    inputRef.current?.focus();
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <div
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
                key={msg.id}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {msg.content.split("\n").map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < msg.content.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Spinner className="size-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      Réflexion...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-border border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            className="max-h-[120px] min-h-[36px] resize-none rounded-xl text-xs"
            disabled={!modelReady || isGenerating}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question..."
            ref={inputRef}
            rows={1}
            value={input}
          />
          <Button
            className="size-9 shrink-0 rounded-xl"
            disabled={!(modelReady && input.trim()) || isGenerating}
            onClick={handleSend}
            size="icon"
          >
            {isGenerating ? (
              <Spinner className="size-4" />
            ) : (
              <HugeiconsIcon
                data-icon
                icon={ArrowRight01Icon}
                strokeWidth={2}
              />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-[9px] text-muted-foreground/60">
          L'IA peut faire des erreurs. Vérifiez les informations importantes.
        </p>
      </div>
    </div>
  );
}
