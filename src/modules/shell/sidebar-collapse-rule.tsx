import { useEffect, useRef } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { useLayout } from "@/contexts/layout-provider";

/**
 * Makes the « Réduire la barre latérale » setting act (Paramètres, Apparence). The way the sidebar folds only shows
 * once it is folded, so a choice made with the sidebar open changed nothing on screen and read as a dead control:
 * - choosing « Icônes » or « Masquée » folds the sidebar at once, to show the choice;
 * - choosing « Jamais » opens it, and keeps it open: ⌘ B or the header button no longer fold it (they folded its
 *   contents into the narrow version inside a full-width sidebar).
 * The choice saved at launch is applied without moving the sidebar.
 */
export function SidebarCollapseRule() {
  const { collapsible } = useLayout();
  const { isMobile, open, setOpen } = useSidebar();
  const previous = useRef(collapsible);

  useEffect(() => {
    if (isMobile || previous.current === collapsible) {
      return;
    }
    previous.current = collapsible;
    setOpen(collapsible === "none");
  }, [collapsible, isMobile, setOpen]);

  useEffect(() => {
    if (!isMobile && collapsible === "none" && !open) {
      setOpen(true);
    }
  }, [collapsible, isMobile, open, setOpen]);

  return null;
}
