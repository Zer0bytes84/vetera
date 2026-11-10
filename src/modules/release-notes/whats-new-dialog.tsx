import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Panel } from "@/components/ui/surface";
import { getAppVersion } from "@/services/backupService";
import { ReleaseHighlights } from "./release-highlights";
import type { ReleaseNote } from "./release-notes";
import { markVersionSeen, readLastSeenVersion, releaseNoteToShow } from "./release-seen";
import "./whats-new.css";

/** Laisse l'écran d'accueil de l'application se poser avant d'ouvrir la fenêtre. */
const SHOW_DELAY_MS = 900;

/**
 * « Quoi de neuf » : après une mise à jour, au premier lancement de la nouvelle version, une seule fois. La version est
 * retenue dès l'ouverture : même si l'application est fermée sans cliquer, la fenêtre ne revient pas. Une installation
 * neuve ne la voit pas (le marqueur est posé par l'assistant de configuration). Jamais bloquante : ni voile ni piège de
 * focus, l'application reste utilisable derrière ; Échap, un clic ailleurs ou « Compris » la ferment.
 */
export function WhatsNewGate() {
  const [note, setNote] = useState<ReleaseNote | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const version = getAppVersion();
    const lastSeen = readLastSeenVersion();
    if (lastSeen === version) return;
    const toShow = releaseNoteToShow(version, lastSeen);
    const timer = window.setTimeout(() => {
      // Sans note pour cette version, on rattrape le marqueur sans rien montrer ; si le stockage refuse, on ne montre rien.
      if (!markVersionSeen(version) || !toShow) return;
      setNote(toShow);
      setOpen(true);
    }, SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!note) return null;
  return (
    <Dialog modal={false} onOpenChange={setOpen} open={open}>
      <DialogContent className="whats-new-dialog" overlayClassName="hidden">
        <div className="whats-new-head flex items-center gap-3">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-foreground/[0.06] text-muted-foreground">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-[1rem] font-medium leading-6">Quoi de neuf dans la version {note.version}</DialogTitle>
            <DialogDescription className="text-[0.8125rem] leading-5">Ce qui change pour vous au cabinet.</DialogDescription>
          </div>
        </div>
        <Panel className="whats-new-panel">
          <ReleaseHighlights note={note} />
        </Panel>
        <div className="whats-new-foot">
          <DialogClose render={<Button className="rounded-full px-5" type="button" />}>Compris</DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
