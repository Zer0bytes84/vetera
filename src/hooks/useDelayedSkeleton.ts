import { useEffect, useRef, useState } from "react";
/** Reserve layout immediately, reveal after 150ms, keep a revealed skeleton 300ms. */
export function useDelayedSkeleton(loading: boolean, delay = 150, minimum = 300) {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef<number | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (loading && !visible) {
      timer = setTimeout(() => { shownAt.current = performance.now(); setVisible(true); }, delay);
    } else if (!loading && visible) {
      const remaining = Math.max(0, minimum - (performance.now() - (shownAt.current ?? performance.now())));
      timer = setTimeout(() => { shownAt.current = null; setVisible(false); }, remaining);
    }
    return () => clearTimeout(timer);
  }, [loading, visible, delay, minimum]);
  return visible;
}

