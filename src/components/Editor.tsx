import React, { useState, useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { HugeiconsIcon } from "@hugeicons/react"
import { Undo02Icon, Redo02Icon } from "@hugeicons/core-free-icons"
import { assistWithNote } from "../services/geminiService"
import {
  initializeWebLLM,
  isWebLLMReady,
  isWebLLMLoading,
  ProgressReport,
  subscribeToProgress,
  getCurrentProgress,
} from "../services/webLLMService"
import SlashCommands, {
  createSlashCommandsSuggestion,
} from "./SlashCommandsExtension"
import SelectionBubbleMenu from "./SelectionBubbleMenu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

interface EditorProps {
  content: string
  onUpdate: (content: string) => void
  readOnly?: boolean
}

const Editor: React.FC<EditorProps> = ({
  content,
  onUpdate,
  readOnly = false,
}) => {
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [writeModalOpen, setWriteModalOpen] = useState(false)
  const [writeTopicInput, setWriteTopicInput] = useState("")

  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelProgress, setModelProgress] = useState<ProgressReport>({
    progress: 0,
    text: "Initializing...",
  })

  const handleAiAction = async (instruction: string) => {
    if (!editor) return

    if (instruction === "__WRITE_MODE__") {
      setWriteModalOpen(true)
      return
    }

    await executeAiAction(instruction)
  }

  const executeAiAction = async (instruction: string) => {
    if (!editor) return
    setIsAiLoading(true)

    try {
      const selection = editor.state.selection
      const selectedText = editor.state.doc.textBetween(
        selection.from,
        selection.to,
        " "
      )
      const context = selectedText || instruction

      const result = await assistWithNote(context, instruction)

      if (selectedText) {
        editor.chain().focus().deleteSelection().insertContent(result).run()
      } else {
        editor.commands.setContent(result)
      }
    } catch (e: any) {
      console.error("[AI Generation Error]", e)

      let errorMessage = "Erreur IA."
      if (e.message?.includes("not initialized")) {
        errorMessage =
          "Le modèle IA est en cours de chargement. Veuillez attendre quelques secondes."
      } else if (e.message?.includes("WebGPU")) {
        errorMessage =
          "WebGPU n'est pas disponible. Vérifiez que votre navigateur le supporte."
      } else {
        errorMessage = `Erreur IA: ${e.message || "Vérifiez votre connexion."}`
      }

      alert(errorMessage)
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleWriteSubmit = () => {
    if (!writeTopicInput.trim()) return
    const instruction = `Rédige un texte professionnel et bien structuré sur le sujet suivant: ${writeTopicInput}. Utilise des titres (##), des listes à puces si nécessaire, et un ton professionnel.`
    setWriteModalOpen(false)
    setWriteTopicInput("")
    executeAiAction(instruction)
  }

  useEffect(() => {
    if (isWebLLMReady()) {
      setIsModelLoading(false)
    } else if (isWebLLMLoading()) {
      setIsModelLoading(true)
      setModelProgress(getCurrentProgress())
    }

    const unsubscribe = subscribeToProgress((report) => {
      setModelProgress(report)
      if (report.progress === 1 && report.text === "Completed") {
        setIsModelLoading(false)
      }
    })

    const init = async () => {
      if (!isWebLLMReady() && !isWebLLMLoading()) {
        setIsModelLoading(true)
        try {
          await initializeWebLLM((report) => {
            setModelProgress(report)
          })
        } catch (error) {
          console.error("[Editor] WebLLM initialization failed:", error)
        } finally {
          setIsModelLoading(false)
        }
      }
    }
    init()

    return unsubscribe
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Tapez "/" pour les commandes...',
      }),
      SlashCommands.configure({
        suggestion: createSlashCommandsSuggestion(handleAiAction),
      }),
    ],
    content: content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content, editor])

  if (!editor) {
    return (
      <div className="h-64 space-y-3 rounded-xl border border-border/60 p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-2/3 rounded-md" />
        <Skeleton className="h-4 w-4/5 rounded-md" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-muted/25 px-4 py-2">
        <div className="flex items-center gap-2">
          {isModelLoading ? (
            <div className="flex items-center gap-2 rounded-md bg-blue-500/10 px-2 py-1 text-xs">
              <Spinner className="size-3 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-600 dark:text-blue-400">
                IA {(modelProgress.progress * 100).toFixed(0)}%
              </span>
            </div>
          ) : isWebLLMReady() ? (
            <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-2 py-1 text-xs">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                IA Locale
              </span>
            </div>
          ) : null}

          {isAiLoading && (
            <div className="flex items-center gap-2 rounded-md bg-violet-500/10 px-2 py-1 text-xs">
              <Spinner className="size-3 text-violet-600" />
              <span className="font-medium text-violet-600">Génération...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Annuler (Ctrl+Z)"
          >
            <HugeiconsIcon
              icon={Undo02Icon}
              strokeWidth={2}
              className="size-4"
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Rétablir (Ctrl+Y)"
          >
            <HugeiconsIcon
              icon={Redo02Icon}
              strokeWidth={2}
              className="size-4"
            />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <SelectionBubbleMenu editor={editor} onAiAction={handleAiAction} />
        <EditorContent
          editor={editor}
          className="tiptap-editor prose prose-neutral dark:prose-invert min-h-full max-w-none p-6 focus:outline-none"
        />
      </div>

      <div className="border-t border-border bg-muted/25 px-4 py-2 text-xs text-muted-foreground">
        Tapez{" "}
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
          /
        </kbd>{" "}
        pour les commandes • Sélectionnez du texte pour le formater
      </div>

      <Dialog open={writeModalOpen} onOpenChange={setWriteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Que voulez-vous écrire ?</DialogTitle>
            <DialogDescription>
              Décrivez le sujet et l'IA rédigera le contenu pour vous.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="text"
            value={writeTopicInput}
            onChange={(e) => setWriteTopicInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleWriteSubmit()}
            placeholder="Ex: note médicale sur la vaccination"
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setWriteModalOpen(false)
                setWriteTopicInput("")
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleWriteSubmit}
              disabled={!writeTopicInput.trim()}
            >
              <Spinner className="size-4" data-icon="inline-start" />
              Générer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Editor
