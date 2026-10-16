import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

import { HugeiconsIcon } from "@hugeicons/react";
import LayoutRightIcon from "@hugeicons/core-free-icons/LayoutRightIcon";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AssistantBrandAvatar } from "./assistant-brand-avatar";

const PanelControlsContext = createContext<{
  collapse: () => void;
  panelId: string;
} | null>(null);
export function useAssistantPanelControls() {
  return useContext(PanelControlsContext);
}
export function AssistantSlideoutIcon() {
  return (
    <HugeiconsIcon
      icon={LayoutRightIcon}
      strokeWidth={1.5}
      aria-hidden="true"
      className="size-4"
    />
  );
}

interface Props {
  open: boolean;
  children: ReactNode;
  onCollapsedChange?: (collapsed: boolean) => void;
}

/**
 * Panneau latéral droit de l'assistant de consultation.
 *
 * Il s'ouvre au clic sur le bouton « Assistant », comme les vrais assistants
 * IA : une fenêtre ancrée à droite, non modale, qui laisse le dossier
 * clinique visible. Le contenu (dictée, note SOAP, relecture, validation)
 * est fourni par l'enfant ; ce composant ne gère que le positionnement,
 * l'animation d'entrée/sortie et le portail.
 */
export function ConsultationAssistantPanel({
  open,
  children,
  onCollapsedChange,
}: Props) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const reopenRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (collapsed) reopenRef.current?.focus();
  }, [collapsed]);
  const expand = () => {
    setCollapsed(false);
    onCollapsedChange?.(false);
    requestAnimationFrame(() =>
      panelRef.current
        ?.querySelector<HTMLButtonElement>("[data-assistant-panel-toggle]")
        ?.focus()
    );
  };

  /* eslint-disable react-hooks/set-state-in-effect -- Montage et animation différés intentionnels : le panneau doit rester monté pendant la transition de sortie. */
  useEffect(() => {
    if (open) {
      setRendered(true);
      setCollapsed(false);
      onCollapsedChange?.(false);
      const frame = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      );
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    onCollapsedChange?.(false);
    const timer = setTimeout(() => setRendered(false), 300);
    return () => clearTimeout(timer);
  }, [open, onCollapsedChange]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!rendered || typeof document === "undefined") return null;

  return createPortal(
    <>
      <aside
        id={panelId}
        ref={panelRef}
        inert={collapsed || !visible}
        aria-hidden={collapsed || !visible}
        role="complementary"
        aria-label="Assistant de consultation"
        data-state={collapsed ? "collapsed" : visible ? "open" : "closed"}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full flex-col",
          "sm:max-w-[460px] lg:max-w-[520px]",
          "border-l border-border bg-background",
          "shadow-[-16px_0_48px_-12px_rgba(0,0,0,0.18)]",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "motion-reduce:transition-none",
          visible && !collapsed ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-5">
          <PanelControlsContext.Provider
            value={{
              collapse: () => {
                setCollapsed(true);
                onCollapsedChange?.(true);
              },
              panelId,
            }}
          >
            {children}
          </PanelControlsContext.Provider>
        </div>
      </aside>
      {collapsed && visible && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                ref={reopenRef}
                variant="outline"
                className="fixed bottom-6 right-6 z-50 h-auto gap-2.5 rounded-full border border-black/10 bg-background/95 px-3 py-2 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-background active:scale-95 dark:border-white/15 dark:shadow-2xl"
                aria-label="Déplier le panneau assistant"
                aria-controls={panelId}
                aria-expanded={false}
                onClick={expand}
              />
            }
          >
            <AssistantBrandAvatar size={34} />
            <AssistantSlideoutIcon />
          </TooltipTrigger>
          <TooltipContent side="left">Déplier l’assistant</TooltipContent>
        </Tooltip>
      )}
    </>,
    document.body
  );
}
