import { useEffect, useState } from "react";
import type { View } from "@/types";
import { usePublishedCrumb } from "../page-crumb";

/**
 * The current page, « Page : section », small and grey, after the sidebar toggle. In a record the first segment
 * is a button back to the list (« Patients : Rex »). On the dashboard it gives way to the greeting.
 */
export function HeaderBreadcrumb({
  fallbackTitle,
  greetingName,
  onNavigate,
}: {
  fallbackTitle: string;
  /** On the dashboard only: the first name for « Bonjour Zouhir 👋 », in place of the breadcrumb. */
  greetingName?: string;
  onNavigate: (view: View) => void;
}) {
  const crumb = usePublishedCrumb();
  if (greetingName) return <HeaderGreeting name={greetingName} />;
  const title = crumb?.title ?? fallbackTitle;
  const note = crumb?.note;
  const parent = crumb?.parent;
  return (
    <nav aria-label="Fil d'Ariane" className="shell-crumb">
      {parent ? (
        <button className="shell-crumb-link" onClick={() => onNavigate(parent)} type="button">
          {title}
        </button>
      ) : (
        <span aria-current={note ? undefined : "page"} className="shell-crumb-page">{title}</span>
      )}
      {note ? (
        <>
          <span aria-hidden="true" className="shell-crumb-sep">{"\u00a0:\u00a0"}</span>
          <span aria-current="page" className="shell-crumb-page">{note}</span>
        </>
      ) : null}
    </nav>
  );
}

/** The dashboard's short greetings: the first name goes in the blue span, the hand stays. */
const GREETINGS = [
  (name: string) => <>Bonjour <span className="shell-greeting-name">{name}</span></>,
  (name: string) => <>Ravi de te retrouver, <span className="shell-greeting-name">{name}</span></>,
  (name: string) => <>Bon retour, <span className="shell-greeting-name">{name}</span></>,
  (name: string) => <>Salut <span className="shell-greeting-name">{name}</span></>,
];

/** The one shown the last time the dashboard was reached, so two arrivals in a row never read the same. */
let lastGreeting = -1;

/** Mounted only on the dashboard: each arrival picks a different greeting from the previous one. */
function HeaderGreeting({ name }: { name: string }) {
  const [index] = useState(() => {
    let next = Math.floor(Math.random() * GREETINGS.length);
    if (next === lastGreeting) next = (next + 1 + Math.floor(Math.random() * (GREETINGS.length - 1))) % GREETINGS.length;
    return next;
  });
  useEffect(() => {
    lastGreeting = index;
  }, [index]);
  return (
    <p className="shell-greeting">
      {GREETINGS[index](name)}{" "}
      <span aria-hidden="true" className="dashboard-greeting-wave">👋</span>
    </p>
  );
}
