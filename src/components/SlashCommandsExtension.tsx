import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import tippy, { type Instance } from "tippy.js";
import { documentNoteTemplateOrder, documentNoteTemplates } from "./document-note-templates";
import { insertDocumentTable } from "./document-table-presets";
import SlashCommandMenu from "./SlashCommandMenu";

export interface SlashCommandItem {
  command: (editor: any) => void;
  description: string;
  group?: string;
  icon: React.ReactNode;
  keywords?: string[];
  title: string;
}

const SlashCommands = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({ editor, range, props }: any) => {
          editor.chain().focus().deleteRange(range).run();
          props.command(editor);
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export const getSlashCommandItems = (
  onAiAction: (action: string) => void
): SlashCommandItem[] => [
  {
    title: "Tableau vierge",
    description: "Un tableau de 3 colonnes et 3 lignes",
    icon: "▦",
    keywords: ["tableau", "grille", "colonnes", "lignes"],
    group: "table",
    command: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: "Suivi des constantes",
    description: "Poids, température et observations",
    icon: "♡",
    keywords: ["tableau", "constantes", "poids", "température", "suivi"],
    group: "table",
    command: (editor) => insertDocumentTable(editor, "vitals"),
  },
  {
    title: "Tableau de traitements",
    description: "Produit, dose, voie et fréquence",
    icon: "✚",
    keywords: ["tableau", "traitement", "dose", "médicament"],
    group: "table",
    command: (editor) => insertDocumentTable(editor, "treatments"),
  },
  ...documentNoteTemplateOrder.map((kind): SlashCommandItem => ({
    title: documentNoteTemplates[kind].title,
    description: documentNoteTemplates[kind].description,
    icon: kind === "phone" ? "✉" : "▤",
    keywords: ["modèle", "note", "vétérinaire", kind],
    group: "template",
    command: (editor) => editor.chain().focus().insertContent(documentNoteTemplates[kind].content).run(),
  })),
  {
    title: "Titre 1",
    description: "Grand titre de section",
    icon: "📌",
    keywords: ["h1", "heading", "titre"],
    group: "format",
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Titre 2",
    description: "Sous-titre",
    icon: "📎",
    keywords: ["h2", "heading", "titre"],
    group: "format",
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Titre 3",
    description: "Petit titre",
    icon: "📍",
    keywords: ["h3", "heading", "titre"],
    group: "format",
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Gras",
    description: "Mettre en gras",
    icon: "𝐁",
    keywords: ["bold", "gras", "strong"],
    group: "format",
    command: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    title: "Italique",
    description: "Mettre en italique",
    icon: "𝐼",
    keywords: ["italic", "italique"],
    group: "format",
    command: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    title: "Liste à puces",
    description: "Créer une liste à puces",
    icon: "•",
    keywords: ["bullet", "list", "puces"],
    group: "format",
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Liste numérotée",
    description: "Créer une liste numérotée",
    icon: "1.",
    keywords: ["numbered", "list", "numérotée"],
    group: "format",
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Citation",
    description: "Ajouter une citation",
    icon: "❝",
    keywords: ["quote", "citation", "blockquote"],
    group: "format",
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Séparateur",
    description: "Ligne horizontale",
    icon: "—",
    keywords: ["divider", "hr", "ligne"],
    group: "format",
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: "Liste à cocher",
    description: "Suivre les étapes d’un soin ou d’un dossier",
    icon: "☑",
    keywords: ["tache", "tâche", "checklist", "soins", "à faire"],
    group: "format",
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: "Corriger",
    description: "Corriger l'orthographe et la grammaire",
    icon: "🔧",
    keywords: ["ai", "ia", "corriger", "orthographe"],
    group: "ai",
    command: () => onAiAction("Corrige l'orthographe et la grammaire"),
  },
  {
    title: "Reformuler",
    description: "Reformuler de manière professionnelle",
    icon: "✏️",
    keywords: ["ai", "ia", "reformuler", "professionnel"],
    group: "ai",
    command: () => onAiAction("Reformule de manière professionnelle"),
  },
  {
    title: "Résumer",
    description: "Résumer en points clés",
    icon: "📋",
    keywords: ["ai", "ia", "résumer", "summary"],
    group: "ai",
    command: () => onAiAction("Résume en points clés"),
  },
  {
    title: "Proposer un brouillon",
    description: "Créer une proposition à relire avant insertion",
    icon: "✍️",
    keywords: ["ai", "ia", "rédiger", "écrire", "write", "generate"],
    group: "ai",
    command: () => onAiAction("__WRITE_MODE__"),
  },
];

export const createSlashCommandsSuggestion = (
  onAiAction: (action: string) => void
) => ({
  items: ({ query }: { query: string }) => {
    const items = getSlashCommandItems(onAiAction);
    const search = query.trim().toLocaleLowerCase("fr");
    if (!search) {
      const frequent = new Set(["Note de consultation", "Suivi clinique", "Consignes de sortie", "Tableau vierge", "Liste à cocher"]);
      return items.filter((item) => frequent.has(item.title));
    }
    return items
      .filter((item) => {
        return (
          item.title.toLocaleLowerCase("fr").includes(search) ||
          item.description.toLocaleLowerCase("fr").includes(search) ||
          item.keywords?.some((k) => k.includes(search))
        );
      })
      .slice(0, 20);
  },

  render: () => {
    let component: ReactRenderer | null = null;
    let popup: Instance[] | null = null;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(SlashCommandMenu, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy("body", {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },

      onUpdate(props: any) {
        component?.updateProps(props);
        if (!props.clientRect) {
          return;
        }
        popup?.[0]?.setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === "Escape") {
          popup?.[0]?.hide();
          return true;
        }
        return (component?.ref as any)?.onKeyDown?.(props);
      },

      onExit() {
        popup?.[0]?.destroy();
        component?.destroy();
      },
    };
  },
});

export default SlashCommands;
