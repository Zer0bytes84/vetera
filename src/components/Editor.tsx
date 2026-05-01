import React, { useState, useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { HugeiconsIcon } from "@hugeicons/react"
import { Undo02Icon, Redo02Icon } from "@hugeicons/core-free-icons"
import { assistWithNote } from "@/services/geminiService"
import {
  initializeWebLLM,
  isWebLLMReady,
  isWebLLMLoading,
  type ProgressReport,
  subscribeToProgress,
  getCurrentProgress,
} from "@/services/webLLMService"
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
  const [aiReady, setAiReady] = useState(false)
  const [aiInitializing, setAiInitializing] = useState(false)

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
          "L'assistant est en cours de préparation. Veuillez attendre quelques secondes."
      } else if (e.message?.includes("WebGPU")) {
        errorMessage =
          "Fonctionnalité non supportée par votre navigateur."
      } else {
        errorMessage = `Erreur: ${e.message || "Vérifiez votre connexion."}`
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
      setAiReady(true)
      setAiInitializing(false)
    } else if (isWebLLMLoading()) {
      setAiInitializing(true)
    }

    const unsubscribe = subscribeToProgress((report) => {
      if (report.progress === 1) {
        setAiReady(true)
        setAiInitializing(false)
      }
    })

    const init = async () => {
      if (!isWebLLMReady() && !isWebLLMLoading()) {
        setAiInitializing(true)
        try {
          await initializeWebLLM()
          setAiReady(true)
        } catch (error) {
          console.error("[Editor] AI initialization failed:", error)
        } finally {
          setAiInitializing(false)
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
      {/* Minimal toolbar — undo/redo + discreet AI status */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-1.5 dark:border-border/30">
        <div className="flex items-center gap-1.5">
          {isAiLoading && (
            <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] text-primary dark:bg-primary/15">
              <Spinner className="size-2.5" />
              <span className="font-medium">Génération...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Annuler (Ctrl+Z)"
            className="size-7 rounded-md"
          >
            <HugeiconsIcon
              icon={Undo02Icon}
              strokeWidth={2}
              className="size-3.5"
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Rétablir (Ctrl+Y)"
            className="size-7 rounded-md"
          >
            <HugeiconsIcon
              icon={Redo02Icon}
              strokeWidth={2}
              className="size-3.5"
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

      {/* Subtle footer hint */}
      <div className="flex items-center justify-between border-t border-border/40 px-4 py-1.5 text-[11px] text-muted-foreground/50 dark:border-border/30">
        <span>
          Tapez{" "}
          <kbd className="rounded bg-muted/70 px-1 py-px font-mono text-[10px] text-muted-foreground dark:bg-muted/40">
            /
          </kbd>{" "}
          pour les commandes
        </span>
        {aiReady && (
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Assistant prêt
          </span>
        )}
        {aiInitializing && !aiReady && (
          <span className="flex items-center gap-1">
            <Spinner className="size-2" />
            Préparation...
          </span>
        )}
      </div>

      <Dialog open={writeModalOpen} onOpenChange={setWriteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Que voulez-vous écrire ?</DialogTitle>
            <DialogDescription>
              Décrivez le sujet et l'assistant rédigera le contenu pour vous.
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
