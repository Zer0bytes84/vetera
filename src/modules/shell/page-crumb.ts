import { useLayoutEffect, useSyncExternalStore } from "react";
import type { View } from "@/types";

/**
 * The breadcrumb of the current page, « Page : section », shown in the app's top bar.
 * A page does not draw a title row of its own: it publishes what the bar says, here, and the bar
 * (which sits outside the page) reads it. `parent` is the view the first segment goes back to
 * (« Patients » in a patient's record); without it the first segment is plain text.
 */
export type PageCrumb = {
  title: string;
  note?: string;
  parent?: View;
};

let current: PageCrumb | null = null;
const listeners = new Set<() => void>();

function same(a: PageCrumb | null, b: PageCrumb | null) {
  return a?.title === b?.title && a?.note === b?.note && a?.parent === b?.parent;
}

function publish(next: PageCrumb | null) {
  if (same(current, next)) return;
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** What the page published, or null when none has (the bar then falls back to the view's own title). */
export function usePublishedCrumb(): PageCrumb | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

/** Called by a page: publishes its crumb while it is on screen, and withdraws it when it leaves. */
export function usePageCrumb(title: string, note?: string, parent?: View) {
  useLayoutEffect(() => {
    const mine: PageCrumb = { title, note, parent };
    publish(mine);
    return () => {
      // Only withdraw our own: the next page may already have published.
      if (current && same(current, mine)) publish(null);
    };
  }, [title, note, parent]);
}
