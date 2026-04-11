import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  SparklesIcon,
  ArrowRight01Icon,
  Delete01Icon,
  ArrowDown01Icon,
  Settings01Icon,
  Download01Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  AI_MODELS,
  DEFAULT_MODEL_ID,
  getModelById,
  getModelPreferences,
  saveModelPreferences,
  type AIModel,
} from "@/lib/ai-models"
import {
  generateText,
  getCurrentProgress,
  getActiveModelId,
  hasModelInCache,
  initializeWebLLM,
  isWebLLMLoading,
  isWebLLMReady,
  resetWebLLM,
  subscribeToProgress,
} from "@/services/webLLMService"
import { cn } from "@/lib/utils"

type AIMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export function AIAgentPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [modelLoading, setModelLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState("")
  const [activeModelId, setActiveModelId] = useState<string | null>(null)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [cachedModels, setCachedModels] = useState<Record<string, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const prefs = getModelPreferences()
    setActiveModelId(prefs.defaultModelId)
    setModelReady(isWebLLMReady())
    setModelLoading(isWebLLMLoading())
    if (isWebLLMLoading()) {
      const p = getCurrentProgress()
      setProgress(p.progress)
      setProgressText(p.text)
    }

    const unsub = subscribeToProgress((report) => {
      setProgress(report.progress)
      setProgressText(report.text)
      if (report.progress === 1 && report.text === "Termine") {
        setModelReady(true)
        setModelLoading(false)
        setActiveModelId(getActiveModelId())
      }
    })

    // Check cached models
    AI_MODELS.forEach(async (model) => {
      const cached = await hasModelInCache(model.id)
      setCachedModels((prev) => ({ ...prev, [model.id]: cached }))
    })

    return unsub
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const activeModel = getModelById(activeModelId || DEFAULT_MODEL_ID)

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isGenerating) return

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsGenerating(true)

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.content,
      }))

      const response = await generateText(text, "", {
        history,
        temperature: 0.4,
        maxTokens: 800,
        systemPrompt: activeModel?.systemPrompt,
      })

      const assistantMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (error) {
      const errorMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Désolé, je n'ai pas pu traiter votre demande. Vérifiez que le modèle IA est chargé.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSwitchModel = async (modelId: string) => {
    if (modelId === activeModelId && modelReady) {
      setShowModelPicker(false)
      return
    }

    setShowModelPicker(false)
    setActiveModelId(modelId)
    setModelReady(false)
    setModelLoading(true)
    setProgress(0)
    setProgressText("Chargement du modèle...")

    const prefs = getModelPreferences()
    saveModelPreferences({ ...prefs, defaultModelId: modelId })

    try {
      await initializeWebLLM(modelId, (report) => {
        setProgress(report.progress)
        setProgressText(report.text)
      })
      setModelReady(true)
      setModelLoading(false)
    } catch {
      setModelLoading(false)
      setProgressText("Erreur de chargement")
    }
  }

  const handleClear = () => {
    setMessages([])
  }

  const quickPrompts = [
    "Résume les consultations d'aujourd'hui",
    "Quels sont les stocks critiques ?",
    "Conseil pour une vaccination canine",
    "Comment préparer un dossier patient ?",
  ]

  if (!isOpen) return null

  if (showModelPicker) {
    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setShowModelPicker(false)}
            >
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                strokeWidth={2}
                className="size-3.5"
              />
            </Button>
            <p className="text-sm font-semibold text-foreground">
              Choisir un modèle
            </p>
          </div>
        </div>

        {/* Model list */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {AI_MODELS.map((model) => {
            const isCached = cachedModels[model.id]
            const isActive = model.id === activeModelId
            const isThisLoading = modelLoading && model.id === activeModelId

            return (
              <button
                key={model.id}
                onClick={() => handleSwitchModel(model.id)}
                disabled={isThisLoading}
                className={cn(
                  "w-full rounded-xl border p-4 text-left transition-all",
                  isActive && modelReady
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <HugeiconsIcon
                      icon={model.icon}
                      strokeWidth={2}
                      className="size-4 text-muted-foreground"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {model.name}
                      </p>
                      {model.recommended && (
                        <Badge variant="secondary" className="text-[9px]">
                          Recommandé
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {model.description}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>
                        {model.downloadSizeMB >= 1024
                          ? `${(model.downloadSizeMB / 1024).toFixed(1)} Go`
                          : `${model.downloadSizeMB} Mo`}{" "}
                        · {Math.round((model.vramMB / 1024) * 10) / 10} Go VRAM
                      </span>
                      {isCached && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <HugeiconsIcon
                            icon={CheckmarkCircle02Icon}
                            strokeWidth={2}
                            className="size-3"
                          />
                          En cache
                        </span>
                      )}
                      {isActive && modelReady && (
                        <span className="flex items-center gap-1 text-primary">
                          <HugeiconsIcon
                            icon={CheckmarkCircle02Icon}
                            strokeWidth={2}
                            className="size-3"
                          />
                          Actif
                        </span>
                      )}
                      {isThisLoading && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Spinner className="size-3" />
                          Chargement...
                        </span>
                      )}
                    </div>
                  </div>
                  {!isCached && !isActive && (
                    <HugeiconsIcon
                      icon={Download01Icon}
                      strokeWidth={2}
                      className="mt-1 size-4 shrink-0 text-muted-foreground"
                    />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <HugeiconsIcon
              icon={SparklesIcon}
              strokeWidth={2}
              className="size-4 text-white"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Assistant IA
            </p>
            <p className="text-[10px] text-muted-foreground">
              {activeModel?.shortName || "Chargement..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleClear}
              className="text-muted-foreground"
            >
              <HugeiconsIcon
                icon={Delete01Icon}
                strokeWidth={2}
                className="size-3.5"
              />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setShowModelPicker(true)}
            className="text-muted-foreground"
          >
            <HugeiconsIcon
              icon={Settings01Icon}
              strokeWidth={2}
              className="size-3.5"
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            className="text-muted-foreground"
          >
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              strokeWidth={2}
              className="size-3.5"
            />
          </Button>
        </div>
      </div>

      {/* Model status bar */}
      {!modelReady && !modelLoading && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px]"
            onClick={() => handleSwitchModel(activeModelId || DEFAULT_MODEL_ID)}
          >
            <HugeiconsIcon
              icon={Download01Icon}
              strokeWidth={2}
              className="mr-1 size-3"
            />
            Charger {activeModel?.shortName}
          </Button>
          <span className="text-[10px] text-muted-foreground">
            {activeModel?.downloadSizeMB
              ? activeModel.downloadSizeMB >= 1024
                ? `${(activeModel.downloadSizeMB / 1024).toFixed(1)} Go`
                : `${activeModel.downloadSizeMB} Mo`
              : ""}{" "}
            · 100% local
          </span>
        </div>
      )}

      {modelLoading && (
        <div className="flex items-center gap-2 border-b border-border bg-blue-500/5 px-4 py-2">
          <Spinner className="size-3 text-blue-500" />
          <div className="flex-1">
            <p className="text-[10px] text-blue-600 dark:text-blue-400">
              {progressText}
            </p>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900/30">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {modelReady && (
        <div className="flex items-center gap-1.5 border-b border-border bg-emerald-500/5 px-4 py-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
            {activeModel?.shortName} · Prêt
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10">
              <HugeiconsIcon
                icon={SparklesIcon}
                strokeWidth={2}
                className="size-6 text-violet-500"
              />
            </div>
            <p className="text-sm font-medium text-foreground">
              Comment puis-je vous aider ?
            </p>
            <p className="mt-1 max-w-[200px] text-xs text-muted-foreground">
              Posez une question ou choisissez une suggestion
            </p>
            <div className="mt-4 w-full space-y-1.5">
              {quickPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInput(prompt)
                    inputRef.current?.focus()
                  }}
                  className="h-auto w-full justify-start py-2 text-left text-xs text-muted-foreground hover:text-foreground"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
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
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question..."
            className="max-h-[120px] min-h-[36px] resize-none rounded-xl text-xs"
            rows={1}
            disabled={!modelReady || isGenerating}
          />
          <Button
            size="icon"
            className="size-9 shrink-0 rounded-xl"
            onClick={handleSend}
            disabled={!modelReady || !input.trim() || isGenerating}
          >
            {isGenerating ? (
              <Spinner className="size-4" />
            ) : (
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                className="size-4"
              />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-[9px] text-muted-foreground/60">
          L'IA peut faire des erreurs. Vérifiez les informations importantes.
        </p>
      </div>
    </div>
  )
}
