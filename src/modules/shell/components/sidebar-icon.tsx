import type { SVGProps } from "react";
import type { View } from "@/types";
import { ToolbarIcon } from "./toolbar-icon";

const paths: Partial<Record<View, string>> = {
  dashboard: "M3 3h8v8H3V3Zm10 0h8v5h-8V3ZM3 13h8v8H3v-8Zm10-3h8v11h-8V10Z",
  agenda: "M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 0 1 2 0v1h1a3 3 0 0 1 3 3v2H2V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1ZM2 11h20v8a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-8Zm4 3v3h3v-3H6Zm5 0v3h3v-3h-3Zm5 0v3h3v-3h-3Z",
  clinique: "M6 2h12v5h3v15h-7v-5h-4v5H3V7h3V2Zm5 2v2H9v2h2v2h2V8h2V6h-2V4h-2ZM6 12v2h2v-2H6Zm10 0v2h2v-2h-2Z",
  taches: "M8 3h2a2 2 0 0 1 4 0h2v4H8V3ZM5 4h1v5h12V4h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 8v2h10v-2H7Zm0 5v2h7v-2H7Z",
  notes: "M5 2h9v6h6v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm11 0 4 4h-4V2ZM7 12v2h9v-2H7Zm0 5v2h7v-2H7Z",
  stock: "m12 2 9 4.5-9 4.5-9-4.5L12 2ZM2 8l9 4.5V22l-9-4.5V8Zm20 0v9.5L13 22v-9.5L22 8Z",
  finances: "M5 3h14v3H5a2 2 0 0 0 0 4h17v9a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm0 5h14v1H5V8Zm12 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  equipe: "M12 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM4.5 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm15 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM12 12a6 6 0 0 1 6 6v4H6v-4a6 6 0 0 1 6-6ZM4 13h1.5A8 8 0 0 0 4 18v3H1v-5a3 3 0 0 1 3-3Zm14.5 0H20a3 3 0 0 1 3 3v5h-3v-3a8 8 0 0 0-1.5-5Z",
};

export function SidebarIcon({ view, ...props }: Omit<SVGProps<SVGSVGElement>, "name"> & { view: View }) {
  if (view === "parametres") return <ToolbarIcon name="settings" {...props} />;
  if (view === "assistant") return <ToolbarIcon name="assistant" {...props} />;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      {view === "patients" || view === "patient_detail" ? (
        <>
          <path fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" d="M4 4v5a5 5 0 0 0 10 0V4M9 14v2a5 5 0 0 0 10 0v-3" />
          <rect x="2" y="2" width="4" height="5" rx="1.5" />
          <rect x="12" y="2" width="4" height="5" rx="1.5" />
          <circle cx="19" cy="11" r="3" />
        </>
      ) : (
        <path fillRule="evenodd" clipRule="evenodd" d={paths[view] ?? paths.dashboard} />
      )}
    </svg>
  );
}
