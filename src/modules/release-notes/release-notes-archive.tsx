import { Sparkles } from "lucide-react";
import { SettingsSection, SettingsStack } from "@/components/settings-section";
import { getAppVersion } from "@/services/backupService";
import { formatReleaseDate, ReleaseHighlights } from "./release-highlights";
import { publishedReleaseNotes } from "./release-notes";

/** Paramètres > Nouveautés : les notes des versions sorties, la plus récente en premier. Les brouillons n'y figurent pas. */
export function ReleaseNotesArchive() {
  const notes = publishedReleaseNotes();
  const current = getAppVersion();
  return (
    <SettingsStack>
      {notes.map((note) => {
        const date = formatReleaseDate(note.date);
        return (
          <SettingsSection
            aside={note.version === current ? <span className="text-[0.8125rem] text-muted-foreground">Version installée</span> : undefined}
            icon={Sparkles}
            key={note.version}
            panelClassName="p-6"
            subtitle={date ?? "Ce qui a changé"}
            title={`Version ${note.version}`}
          >
            <ReleaseHighlights note={note} />
          </SettingsSection>
        );
      })}
    </SettingsStack>
  );
}
