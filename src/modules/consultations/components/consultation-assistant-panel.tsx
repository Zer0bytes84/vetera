import LayoutRightIcon from "@hugeicons/core-free-icons/LayoutRightIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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
      aria-hidden="true"
      className="size-4"
      icon={LayoutRightIcon}
      strokeWidth={1.5}
    />
  );
}

/** The panel answers a click: it arrives in 300 ms on the drawer curve and leaves faster, in 200 ms. */
const EXIT_MS = 200;

interface Props {
  children: ReactNode;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** The exit has played and the panel is gone: the caller can let go of its content. */
  onExited?: () => void;
  open: boolean;
  /** Pixels kept free above the panel: the desktop window's title-bar strip, which swallows clicks. */
  topInset?: number;
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
  onExited,
  topInset = 0,
}: Props) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const reopenRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (collapsed) {
      reopenRef.current?.focus();
    }
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
    // Unmounts when the exit has played (see onTransitionEnd); the timer only covers the cases where
    // no transition runs: reduced motion, or a panel closed while collapsed and already off screen.
    const timer = setTimeout(() => {
      setRendered(false);
      onExited?.();
    }, EXIT_MS + 150);
    return () => clearTimeout(timer);
  }, [open, onCollapsedChange, onExited]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!rendered || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <aside
        aria-hidden={collapsed || !visible}
        aria-label="Assistant de consultation"
        className={cn(
          "fixed right-0 bottom-0 z-50 flex w-full flex-col",
          "sm:max-w-[var(--assistant-width)]",
          // A grey band anchored to the window's right edge, like the app's bands: no line, no shadow, its corner
          // concentric with the panels it holds (16 + the 6 px frame).
          "rounded-tl-[calc(var(--radius-panel)+var(--card-frame))] bg-[var(--card-band)]",
          "transition-transform motion-reduce:transition-none",
          visible && !collapsed
            ? "translate-x-0 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            : "translate-x-full duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
        )}
        data-no-drag
        data-slot="assistant-panel"
        data-state={collapsed ? "collapsed" : visible ? "open" : "closed"}
        id={panelId}
        inert={collapsed || !visible}
        onTransitionEnd={(event) => {
          if (
            !open &&
            event.target === event.currentTarget &&
            event.propertyName === "transform"
          ) {
            setRendered(false);
            onExited?.();
          }
        }}
        ref={panelRef}
        role="complementary"
        style={{ top: topInset }}
      >
        {/* `clip`, not `hidden`: a hidden box can still be scrolled by code, and a scrolled panel loses its header. */}
        <div className="assistant-panel-body relative flex min-h-0 flex-1 flex-col">
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
                aria-controls={panelId}
                aria-expanded={false}
                aria-label="Déplier le panneau assistant"
                className="fixed right-6 bottom-6 z-50 h-auto gap-2.5 rounded-full border border-black/10 bg-background/95 px-3 py-2 shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-background active:scale-95 dark:border-white/15 dark:shadow-2xl"
                onClick={expand}
                ref={reopenRef}
                variant="outline"
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
