import { type ReactNode, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "@/lib/icons";
import { handleRecordTabKeys } from "./medical-record-summary";

function revealTab(rail: HTMLDivElement, tab: HTMLElement) {
  if (rail.scrollWidth <= rail.clientWidth) {
    return;
  }
  const railBounds = rail.getBoundingClientRect();
  const tabBounds = tab.getBoundingClientRect();
  const inset =
    Number.parseFloat(getComputedStyle(rail).scrollPaddingInlineStart) || 0;
  if (tabBounds.left < railBounds.left + inset) {
    rail.scrollLeft += tabBounds.left - railBounds.left - inset;
  } else if (tabBounds.right > railBounds.right - inset) {
    rail.scrollLeft += tabBounds.right - railBounds.right + inset;
  }
}

export function MedicalRecordTabs({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    const updateEdges = () => {
      const start = rail.scrollLeft > 1;
      const end = rail.scrollWidth - rail.clientWidth - rail.scrollLeft > 1;
      setEdges((current) =>
        current.start === start && current.end === end
          ? current
          : { start, end }
      );
    };
    const revealSelected = () => {
      const selected = rail.querySelector<HTMLButtonElement>(
        '[role="tab"][aria-selected="true"]'
      );
      if (selected) {
        revealTab(rail, selected);
      }
      updateEdges();
    };

    const frame = window.requestAnimationFrame(revealSelected);
    const resizeObserver = new ResizeObserver(revealSelected);
    resizeObserver.observe(rail);
    for (const tab of rail.querySelectorAll('[role="tab"]')) {
      resizeObserver.observe(tab);
    }
    // Les raccourcis des widgets peuvent changer la section sans lui donner le focus.
    const selectionObserver = new MutationObserver(revealSelected);
    selectionObserver.observe(rail, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-selected"],
    });
    rail.addEventListener("scroll", updateEdges, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      selectionObserver.disconnect();
      rail.removeEventListener("scroll", updateEdges);
    };
  }, []);

  const scrollTabs = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }
    rail.scrollBy({
      left: direction * Math.max(160, rail.clientWidth * 0.65),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  return (
    <div
      className="medical-tabs-frame"
      data-overflow-end={edges.end || undefined}
      data-overflow-start={edges.start || undefined}
    >
      <div
        aria-label={label}
        aria-orientation="vertical"
        className="medical-tabs"
        data-tabs-style="nav"
        onFocusCapture={(event) => {
          const tab = (event.target as HTMLElement).closest('[role="tab"]');
          if (tab instanceof HTMLElement && railRef.current) {
            revealTab(railRef.current, tab);
          }
        }}
        onKeyDown={handleRecordTabKeys}
        ref={railRef}
        role="tablist"
      >
        {children}
      </div>
      <button
        aria-label="Afficher les onglets précédents"
        className="medical-tabs-scroll medical-tabs-scroll-start"
        disabled={!edges.start}
        onClick={() => scrollTabs(-1)}
        title="Onglets précédents"
        type="button"
      >
        <ChevronLeft aria-hidden="true" size={16} />
      </button>
      <button
        aria-label="Afficher les onglets suivants"
        className="medical-tabs-scroll medical-tabs-scroll-end"
        disabled={!edges.end}
        onClick={() => scrollTabs(1)}
        title="Onglets suivants"
        type="button"
      >
        <ChevronRight aria-hidden="true" size={16} />
      </button>
    </div>
  );
}
