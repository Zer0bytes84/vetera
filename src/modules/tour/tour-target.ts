import type { TourStepCopy } from "./tour-steps";

function visible(element: Element | null | undefined): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
}

/**
 * L'élément est-il réellement à la vue et cliquable ? Une fenêtre qui le recouvre (un formulaire modal, son voile) le
 * cache : le repère s'efface alors, l'utilisateur est dans le geste. Un panneau non bloquant qui ne le recouvre pas n'y change rien.
 */
function reachable(element: HTMLElement, doc: Document): boolean {
  const box = element.getBoundingClientRect();
  const top = doc.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
  return !!top && element.contains(top);
}

export interface TourTarget {
  /** L'élément à entourer, s'il est à l'écran. */
  element: HTMLElement | null;
  /** Il est à l'écran mais une fenêtre le recouvre : l'utilisateur est dans le geste (un formulaire est ouvert). */
  covered: boolean;
}

/**
 * L'élément à entourer pour l'étape. Le menu « + » : tant qu'il est fermé on montre le bouton, dès qu'il est ouvert on
 * montre l'entrée qui convient. L'Agenda : l'entrée de la barre latérale. Rien n'est cherché hors de ces deux endroits :
 * si l'élément manque (fenêtre étroite, barre repliée), la carte seule guide, sans repère.
 */
export function locateTourTarget(step: TourStepCopy, doc: Document = document): TourTarget {
  let element: HTMLElement | null = null;
  if ("sidebarLabel" in step.target) {
    const label = step.target.sidebarLabel;
    const button = Array.from(doc.querySelectorAll('[data-slot="sidebar-menu-button"]')).find(
      (candidate) => candidate.getAttribute("aria-label")?.startsWith(label),
    );
    element = visible(button) ? button : null;
  } else {
    const { menuLabel } = step.target;
    const menu = doc.querySelector(".quick-actions-menu");
    if (visible(menu)) {
      const item = Array.from(menu.querySelectorAll(".quick-actions-menu-item")).find((candidate) => candidate.textContent?.trim() === menuLabel);
      element = visible(item) ? item : null;
    } else {
      const trigger = doc.querySelector('button[aria-label="Actions rapides"]');
      element = visible(trigger) ? trigger : null;
    }
  }
  if (!element) return { element: null, covered: false };
  return reachable(element, doc) ? { element, covered: false } : { element: null, covered: true };
}

/** Un clic sur le bouton « + » : l'utilisateur reprend le geste depuis le début. */
export function restartedGesture(event: Event): boolean {
  return event.target instanceof Element && !!event.target.closest('button[aria-label="Actions rapides"]');
}

const route = (hash: string) => hash.replace(/^#\/?/, "");

/** Étape de la barre latérale : l'utilisateur est-il arrivé à l'écran visé, ou plus avant dans le geste ? */
export function sidebarOpened(step: TourStepCopy, hash: string): boolean {
  if (!("sidebarLabel" in step.target)) return false;
  const current = route(hash);
  return current.startsWith(step.target.sidebarLabel.toLowerCase()) || (step.deeper?.hashes.some((deeper) => current.startsWith(deeper)) ?? false);
}

/** L'utilisateur est-il arrivé à l'écran « plus avant » de l'étape (la consultation ouverte) ? */
export function inDeeperScreen(step: TourStepCopy, hash: string): boolean {
  const current = route(hash);
  return step.deeper?.hashes.some((deeper) => current.startsWith(deeper)) ?? false;
}

/** Étape du menu « + » : l'utilisateur vient de cliquer l'entrée du menu qui correspond. */
export function clickedMenuEntry(step: TourStepCopy, event: Event): boolean {
  if (!("menuLabel" in step.target)) return false;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  return target.closest(".quick-actions-menu-item")?.textContent?.trim() === step.target.menuLabel;
}
