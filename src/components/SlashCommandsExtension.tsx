import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance } from 'tippy.js';
import SlashCommandMenu from './SlashCommandMenu';

export interface SlashCommandItem {
    title: string;
    description: string;
    icon: React.ReactNode;
    command: (editor: any) => void;
    keywords?: string[];
    group?: string;
}

const SlashCommands = Extension.create({
    name: 'slashCommands',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }: any) => {
                    props.command(editor);
                    editor.chain().focus().deleteRange(range).run();
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

export const getSlashCommandItems = (onAiAction: (action: string) => void): SlashCommandItem[] => [
    {
        title: 'Titre 1',
        description: 'Grand titre de section',
        icon: '📌',
        keywords: ['h1', 'heading', 'titre'],
        group: 'format',
        command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
        title: 'Titre 2',
        description: 'Sous-titre',
        icon: '📎',
        keywords: ['h2', 'heading', 'titre'],
        group: 'format',
        command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
        title: 'Titre 3',
        description: 'Petit titre',
        icon: '📍',
        keywords: ['h3', 'heading', 'titre'],
        group: 'format',
        command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
        title: 'Gras',
        description: 'Mettre en gras',
        icon: '𝐁',
        keywords: ['bold', 'gras', 'strong'],
        group: 'format',
        command: (editor) => editor.chain().focus().toggleBold().run(),
    },
    {
        title: 'Italique',
        description: 'Mettre en italique',
        icon: '𝐼',
        keywords: ['italic', 'italique'],
        group: 'format',
        command: (editor) => editor.chain().focus().toggleItalic().run(),
    },
    {
        title: 'Liste à puces',
        description: 'Créer une liste à puces',
        icon: '•',
        keywords: ['bullet', 'list', 'puces'],
        group: 'format',
        command: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
        title: 'Liste numérotée',
        description: 'Créer une liste numérotée',
        icon: '1.',
        keywords: ['numbered', 'list', 'numérotée'],
        group: 'format',
        command: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
        title: 'Citation',
        description: 'Ajouter une citation',
        icon: '❝',
        keywords: ['quote', 'citation', 'blockquote'],
        group: 'format',
        command: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
        title: 'Séparateur',
        description: 'Ligne horizontale',
        icon: '—',
        keywords: ['divider', 'hr', 'ligne'],
        group: 'format',
        command: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
    {
        title: 'Corriger',
        description: "Corriger l'orthographe et la grammaire",
        icon: '🔧',
        keywords: ['ai', 'ia', 'corriger', 'orthographe'],
        group: 'ai',
        command: () => onAiAction("Corrige l'orthographe et la grammaire"),
    },
    {
        title: 'Reformuler',
        description: 'Reformuler de manière professionnelle',
        icon: '✏️',
        keywords: ['ai', 'ia', 'reformuler', 'professionnel'],
        group: 'ai',
        command: () => onAiAction("Reformule de manière professionnelle"),
    },
    {
        title: 'Résumer',
        description: 'Résumer en points clés',
        icon: '📋',
        keywords: ['ai', 'ia', 'résumer', 'summary'],
        group: 'ai',
        command: () => onAiAction("Résume en points clés"),
    },
    {
        title: 'Rédiger avec l\'IA',
        description: 'L\'assistant rédige du contenu pour vous',
        icon: '✍️',
        keywords: ['ai', 'ia', 'rédiger', 'écrire', 'write', 'generate'],
        group: 'ai',
        command: () => onAiAction("__WRITE_MODE__"),
    },
];

export const createSlashCommandsSuggestion = (onAiAction: (action: string) => void) => ({
    items: ({ query }: { query: string }) => {
        const items = getSlashCommandItems(onAiAction);
        return items.filter(item => {
            const search = query.toLowerCase();
            return (
                item.title.toLowerCase().includes(search) ||
                item.description.toLowerCase().includes(search) ||
                item.keywords?.some(k => k.includes(search))
            );
        }).slice(0, 10);
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

                if (!props.clientRect) return;

                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                });
            },

            onUpdate(props: any) {
                component?.updateProps(props);
                if (!props.clientRect) return;
                popup?.[0]?.setProps({
                    getReferenceClientRect: props.clientRect,
                });
            },

            onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
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
