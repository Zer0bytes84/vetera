import {
  createContext,
  useContext,
  useLayoutEffect,
  type ReactNode,
} from "react";
import { usePageCrumb } from "@/modules/shell/page-crumb";

/**
 * A host (the clinical workspace) can hand a navigation bar to the header of
 * whatever page it shows: the bar then sits right under the common header.
 * `claim` tells the host the header took it, so it does not draw it twice.
 */
export const PageSubnavContext = createContext<{
  node: ReactNode;
  claim: (claimed: boolean) => void;
} | null>(null);

/**
 * What a page says about itself, « Titre : note ». It draws nothing of its own: since 9 November 2026 the line lives in the
 * app's top bar, as a breadcrumb, and the page's main action sits in the grey band of its section. The page keeps calling this
 * where its title row used to be; it publishes the title and the note to the bar and shows the host's navigation bar, if any.
 * `icon` and `kicker` are accepted for callers that still pass them, and are not drawn.
 */
export function PageHeader({
  title,
  subtitle,
}: {
  /** @deprecated Not drawn. */
  icon?: ReactNode;
  title: string;
  /** The note after the title: a few words, « liste du cabinet ». */
  subtitle?: string;
  /** @deprecated Not drawn. */
  kicker?: ReactNode;
}) {
  const subnav = useContext(PageSubnavContext);
  const claim = subnav?.claim;
  useLayoutEffect(() => {
    claim?.(true);
    return () => claim?.(false);
  }, [claim]);
  usePageCrumb(title, subtitle);
  return <>{subnav?.node}</>;
}
