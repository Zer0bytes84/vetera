import Placeholder from "@tiptap/extension-placeholder";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Columns3, ListTodo, PenLine, Plus, Rows3, Table2, Trash2, WandSparkles } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
} from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { assistWithNote } from "@/services/geminiService";
import {
  isWebLLMLoading,
  isWebLLMReady,
  subscribeToProgress,
} from "@/services/webLLMService";
import SelectionBubbleMenu from "./SelectionBubbleMenu";
import { documentNoteTemplateOrder, documentNoteTemplates } from "./document-note-templates";
import { insertDocumentTable } from "./document-table-presets";
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
  const [suggestion, setSuggestion] = useState<{
    html: string;
    text: string;
    instruction: string;
    originalHtml: string;
    from: number;
    to: number;
    selected: boolean;
  } | null>(null);
  const [aiError, setAiError] = useState("");
  const [isInTable, setIsInTable] = useState(false);

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
    const selection = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(selection.from, selection.to, " ");
    const documentText = editor.getText().trim();
    const isDraft = instruction.toLowerCase().startsWith("rédige un texte");
    if (!isDraft && !selectedText && !documentText) {
      setAiError("Écrivez ou sélectionnez un passage avant d'utiliser cette commande.");
      return;
    }
    setAiError("");
    setIsAiLoading(true);
    const originalHtml = editor.getHTML();

    try {
      const context = selectedText || (isDraft ? "" : documentText);

      const result = await assistWithNote(context, instruction);
      const previewHtml = result.replace(/<\/(p|h[1-6]|li|div|blockquote)>/gi, "</$1>\n");
      const preview = new DOMParser().parseFromString(previewHtml, "text/html").body.textContent?.trim() || "";
      if (!preview) throw new Error("La proposition est vide. Réessayez.");
      setSuggestion({
        html: result,
        text: preview,
        instruction,
        originalHtml,
        from: selection.from,
        to: selection.to,
        selected: Boolean(selectedText),
      });
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

      setAiError(errorMessage);
    } finally {
      setIsAiLoading(false);
    }
  };

  const applySuggestion = (mode: "insert" | "replace") => {
    if (!editor || !suggestion || editor.getHTML() !== suggestion.originalHtml) {
      setAiError("Le document a changé depuis la proposition. Relancez la commande pour éviter de remplacer une version récente.");
      setSuggestion(null);
      return;
    }
    const chain = editor.chain().focus();
    if (mode === "replace" && suggestion.selected) {
      chain.insertContentAt({ from: suggestion.from, to: suggestion.to }, suggestion.html).run();
    } else {
      chain.insertContentAt(suggestion.to, suggestion.html).run();
    }
    setSuggestion(null);
    setAiError("");
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
      setAiReady(report.status === "ready");
      setAiInitializing(report.status === "loading");
    });

    return unsubscribe;
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true, a11y: { checkboxLabel: (_node, checked) => checked ? "Marquer comme à faire" : "Marquer comme terminé" } }),
      TableKit.configure({ table: { resizable: true } }),
      Placeholder.configure({
        placeholder: 'Écrivez librement ou tapez "/" pour les commandes…',
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

  useEffect(() => {
    if (!editor) return;
    const updateTableSelection = () => setIsInTable(editor.isActive("table"));
    editor.on("selectionUpdate", updateTableSelection);
    editor.on("transaction", updateTableSelection);
    updateTableSelection();
    return () => {
      editor.off("selectionUpdate", updateTableSelection);
      editor.off("transaction", updateTableSelection);
    };
  }, [editor]);

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
      {!readOnly && (
        <div className="sticky top-0 z-10 mb-5 flex items-center justify-between gap-2 border-foreground/15 border-b bg-white/95 py-2 backdrop-blur-sm dark:bg-[#1b241e]/95">
          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg border-foreground/20 font-medium" />}>
                <Plus className="size-4" /> Ajouter
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Modèle de note</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-64">
                    {documentNoteTemplateOrder.map((kind) => (
                      <DropdownMenuItem key={kind} onClick={() => editor.chain().focus().insertContent(documentNoteTemplates[kind].content).run()}>
                        {documentNoteTemplates[kind].title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                  <Table2 className="mr-2 size-4" />Tableau vierge
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertDocumentTable(editor, "vitals")}>
                  <Table2 className="mr-2 size-4" />Suivi des constantes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertDocumentTable(editor, "treatments")}>
                  <Table2 className="mr-2 size-4" />Tableau de traitements
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleTaskList().run()}>
                  <ListTodo className="mr-2 size-4" />Liste à cocher
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
            <DropdownMenuTrigger render={<Button aria-label="Aide à la rédaction" size="icon-sm" title="Aide à la rédaction" variant="ghost" />}>
              <WandSparkles className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuItem onClick={() => handleAiAction("Corrige l'orthographe et la grammaire")}>Corriger le texte</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAiAction("Reformule de manière professionnelle")}>Clarifier et reformuler</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAiAction("Résume en points clés")}>Résumer en points clés</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAiAction("__WRITE_MODE__")}>Proposer un brouillon…</DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isInTable ? (
            <div aria-label="Modifier le tableau" className="flex flex-wrap items-center gap-1 rounded-lg bg-[#f3f7f1] p-1 dark:bg-white/5">
              <Button className="h-7 gap-1.5 px-2 text-xs" onClick={() => editor.chain().focus().addRowAfter().run()} size="sm" title="Ajouter une ligne sous la cellule" variant="ghost"><Rows3 className="size-3.5" />Ligne <Plus className="size-3" /></Button>
              <Button className="h-7 gap-1.5 px-2 text-xs" onClick={() => editor.chain().focus().addColumnAfter().run()} size="sm" title="Ajouter une colonne à droite" variant="ghost"><Columns3 className="size-3.5" />Colonne <Plus className="size-3" /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button aria-label="Autres actions sur le tableau" className="size-7" size="icon-sm" variant="ghost" />}><Table2 className="size-3.5" /></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeaderRow().run()}>Basculer l’en-tête</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()}>Supprimer cette ligne</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()}>Supprimer cette colonne</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => editor.chain().focus().deleteTable().run()}><Trash2 className="mr-2 size-4" />Supprimer le tableau</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <span className="hidden text-[12px] leading-snug text-foreground/65 xl:inline">Tapez <kbd className="rounded border border-foreground/15 px-1 font-mono">/</kbd> pour rechercher une commande.</span>
          )}
        </div>
      )}
      <SelectionBubbleMenu editor={editor} onAiAction={handleAiAction} />
      <EditorContent
        className="tiptap-editor prose prose-neutral dark:prose-invert max-w-none focus:outline-none"
        editor={editor}
      />

      {isAiLoading && (
        <div role="status" className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
          <Spinner className="size-4" /> Préparation d’une proposition…
        </div>
      )}
      {aiError && <p role="alert" className="mt-4 text-destructive text-sm">{aiError}</p>}

      <Dialog open={Boolean(suggestion)} onOpenChange={(open) => { if (!open) setSuggestion(null); }}>
        <FormDialogContent size="md">
          <FormDialogHeader
            compact
            title="Proposition de rédaction"
            description="Relisez le texte avant de décider de l’ajouter à votre document."
            icon={<WandSparkles strokeWidth={1.8} />}
          />
          <FormDialogBody>
            <p className="mb-2 text-muted-foreground text-xs">{suggestion?.instruction}</p>
            <div className="max-h-[45vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border/70 bg-muted/30 p-5 text-foreground text-sm leading-relaxed">
              {suggestion?.text}
            </div>
            <p className="mt-3 text-muted-foreground text-xs">Vérifiez les faits cliniques et les données du patient avant utilisation.</p>
          </FormDialogBody>
          <FormDialogFooter>
            <Button variant="outline" onClick={() => setSuggestion(null)}>Ignorer</Button>
            <Button variant={suggestion?.selected ? "outline" : "default"} onClick={() => applySuggestion("insert")}>
              {suggestion?.selected ? "Insérer après" : "Insérer au curseur"}
            </Button>
            {suggestion?.selected && <Button onClick={() => applySuggestion("replace")}>Remplacer la sélection</Button>}
          </FormDialogFooter>
        </FormDialogContent>
      </Dialog>

      <Dialog onOpenChange={setWriteModalOpen} open={writeModalOpen}>
        <FormDialogContent size="sm">
          <FormDialogHeader
            compact
            title="Que voulez-vous écrire ?"
            description="Décrivez le document souhaité. Vous pourrez relire la proposition avant de l’insérer."
            icon={<PenLine strokeWidth={1.8} />}
          />
          <FormDialogBody>
            <Input
              autoFocus
              onChange={(e) => setWriteTopicInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleWriteSubmit()}
              placeholder="Ex: note médicale sur la vaccination"
              type="text"
              value={writeTopicInput}
            />
          </FormDialogBody>
          <FormDialogFooter>
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
              <PenLine className="size-4" />
              Préparer la proposition
            </Button>
          </FormDialogFooter>
        </FormDialogContent>
      </Dialog>
    </div>
  );
};

export default Editor;
