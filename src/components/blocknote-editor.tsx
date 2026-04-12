"use client";

import React, { useEffect, useMemo } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { useTheme } from "@/components/theme-provider";
import { useTranslation } from "react-i18next";
import { Dictionary } from "@blocknote/core";
import {
  fr as coreFr,
  en as coreEn,
  ar as coreAr,
  es as coreEs,
  pt as corePt,
  de as coreDe,
} from "@blocknote/core/locales";

interface BlockNoteEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  editable?: boolean;
}

export function BlockNoteShadcnEditor({
  initialContent,
  onChange,
  editable = true,
}: BlockNoteEditorProps) {
  const { theme } = useTheme();
  const { i18n } = useTranslation();

  const parsedContent = useMemo(() => {
    if (!initialContent) return undefined;
    try {
      return JSON.parse(initialContent);
    } catch {
      return [{ type: "paragraph" as const, content: initialContent }];
    }
  }, [initialContent]);

  const dictionary = useMemo(() => {
    const lang = i18n.language.toLowerCase();
    const dicts: Record<string, Dictionary> = {
      fr: coreFr, en: coreEn, ar: coreAr,
      es: coreEs, pt: corePt, de: coreDe,
    };
    const key = Object.keys(dicts).find((k) => lang.startsWith(k)) || "fr";
    return dicts[key];
  }, [i18n.language]);

  const editor = useCreateBlockNote({
    initialContent: parsedContent,
    dictionary,
  });

  useEffect(() => {
    if (!editor || !onChange) return;
    const unsub = editor.onChange(() => {
      onChange(JSON.stringify(editor.document));
    });
    return () => unsub();
  }, [editor, onChange]);

  if (!editor) return null;

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme={theme === "dark" ? "dark" : "light"}
    />
  );
}

export default BlockNoteShadcnEditor;
