import type { Editor } from "@tiptap/core";

export type DocumentTablePreset = "vitals" | "treatments";

const presets: Record<DocumentTablePreset, { title: string; columns: string[] }> = {
  vitals: {
    title: "Suivi des constantes",
    columns: ["Date", "Poids (kg)", "Température (°C)", "Observations"],
  },
  treatments: {
    title: "Traitements et administrations",
    columns: ["Produit / dose", "Voie", "Fréquence", "Durée"],
  },
};

export function insertDocumentTable(editor: Editor, preset: DocumentTablePreset) {
  const { title, columns } = presets[preset];
  const row = (values: string[], header: boolean) => ({
    type: "tableRow",
    content: values.map((value) => ({
      type: header ? "tableHeader" : "tableCell",
      content: [{ type: "paragraph", content: value ? [{ type: "text", text: value }] : [] }],
    })),
  });

  editor.chain().focus().insertContent([
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: title }] },
    {
      type: "table",
      content: [row(columns, true), row(columns.map(() => ""), false), row(columns.map(() => ""), false)],
    },
    { type: "paragraph" },
  ]).run();
}
