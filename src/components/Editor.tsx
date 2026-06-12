import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { assistWithNote } from "@/services/geminiService";
import {
  initializeWebLLM,
  isWebLLMLoading,
  isWebLLMReady,
  subscribeToProgress,
} from "@/services/webLLMService";
import SelectionBubbleMenu from "./SelectionBubbleMenu";
import SlashCommands, {
  createSlashCommandsSuggestion,
} from "./SlashCommandsExtension";

interface EditorProps {
  content: string;
  onAiStatusChange?: (status: {
    loading: boolean;
    ready: boolean;
    initializing: boolean;
  }) => void;
  onEditorCreated?: (editor: any) => void;
  onUpdate: (content: string) => void;
  readOnly?: boolean;
}

const Editor: React.FC<EditorProps> = ({
  content,
  onUpdate,
  readOnly = false,
  onEditorCreated,
  onAiStatusChange,
}) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [writeTopicInput, setWriteTopicInput] = useState("");
  const [aiReady, setAiReady] = useState(false);
  const [aiInitializing, setAiInitializing] = useState(false);

  const handleAiAction = async (instruction: string) => {
    if (!editor) {
      return;
    }

    if (instruction === "__WRITE_MODE__") {
      setWriteModalOpen(true);
      return;
    }

    await executeAiAction(instruction);
  };

  const executeAiAction = async (instruction: string) => {
    if (!editor) {
      return;
    }
    setIsAiLoading(true);

    try {
      const selection = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(
        selection.from,
        selection.to,
        " "
      );
      const context = selectedText || instruction;

      const result = await assistWithNote(context, instruction);

      if (selectedText) {
        editor.chain().focus().deleteSelection().insertContent(result).run();
      } else {
        editor.commands.setContent(result);
      }
    } catch (e: any) {
      console.error("[AI Generation Error]", e);

      let errorMessage = "Erreur IA.";
      if (e.message?.includes("not initialized")) {
        errorMessage =
          "L'assistant est en cours de préparation. Veuillez attendre quelques secondes.";
      } else if (e.message?.includes("WebGPU")) {
        errorMessage = "Fonctionnalité non supportée par votre navigateur.";
      } else {
        errorMessage = `Erreur: ${e.message || "Vérifiez votre connexion."}`;
      }

      alert(errorMessage);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleWriteSubmit = () => {
    if (!writeTopicInput.trim()) {
      return;
    }
    const instruction = `Rédige un texte professionnel et bien structuré sur le sujet suivant: ${writeTopicInput}. Utilise des titres (##), des listes à puces si nécessaire, et un ton professionnel.`;
    setWriteModalOpen(false);
    setWriteTopicInput("");
    executeAiAction(instruction);
  };

  useEffect(() => {
    if (isWebLLMReady()) {
      setAiReady(true);
      setAiInitializing(false);
    } else if (isWebLLMLoading()) {
      setAiInitializing(true);
    }

    const unsubscribe = subscribeToProgress((report) => {
      if (report.progress === 1) {
        setAiReady(true);
        setAiInitializing(false);
      }
    });

    const init = async () => {
      if (!(isWebLLMReady() || isWebLLMLoading())) {
        setAiInitializing(true);
        try {
          await initializeWebLLM();
          setAiReady(true);
        } catch (error) {
          console.error("[Editor] AI initialization failed:", error);
        } finally {
          setAiInitializing(false);
        }
      }
    };
    init();

    return unsubscribe;
  }, []);

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
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
  });

  // Share the editor instance with the parent component
  useEffect(() => {
    if (editor) {
      onEditorCreated?.(editor);
    }
    return () => {
      onEditorCreated?.(null);
    };
  }, [editor, onEditorCreated]);

  // Share the AI status with the parent component
  useEffect(() => {
    onAiStatusChange?.({
      loading: isAiLoading,
      ready: aiReady,
      initializing: aiInitializing,
    });
  }, [isAiLoading, aiReady, aiInitializing, onAiStatusChange]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-6">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="w-full">
      <SelectionBubbleMenu editor={editor} onAiAction={handleAiAction} />
      <EditorContent
        className="tiptap-editor prose prose-neutral dark:prose-invert max-w-none focus:outline-none"
        editor={editor}
      />

      <Dialog onOpenChange={setWriteModalOpen} open={writeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Que voulez-vous écrire ?</DialogTitle>
            <DialogDescription>
              Décrivez le sujet et l'assistant rédigera le contenu pour vous.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            onChange={(e) => setWriteTopicInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleWriteSubmit()}
            placeholder="Ex: note médicale sur la vaccination"
            type="text"
            value={writeTopicInput}
          />
          <DialogFooter>
            <Button
              onClick={() => {
                setWriteModalOpen(false);
                setWriteTopicInput("");
              }}
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              disabled={!writeTopicInput.trim()}
              onClick={handleWriteSubmit}
            >
              <Spinner className="size-4" data-icon="inline-start" />
              Générer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Editor;
