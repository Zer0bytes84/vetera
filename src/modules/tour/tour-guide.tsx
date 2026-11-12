"use client";

import { Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Panel, Shell } from "@/components/ui/surface";
import { useAppointmentsRepository, useConsultationSoapsRepository, usePatientsRepository } from "@/data/repositories";
import { billingService } from "@/services/billingService";
import { isTauriRuntime } from "@/services/browser-store";
import type { Invoice } from "@/types/db";
import { evaluateStep, type TourSnapshot } from "./tour-progress";
import { TOUR_STEPS } from "./tour-steps";
import { advanceTour, quitTour, type TourState } from "./tour-state";
import { tourStore, useTourFinished, useTourState } from "./tour-store";
import { clickedMenuEntry, inDeeperScreen, locateTourTarget, restartedGesture, sidebarOpened } from "./tour-target";
import "./tour.css";

/**
 * Le tour guidé, monté une fois dans la coque de l'application. Hors tour il ne rend rien et ne lit aucune donnée :
 * les lectures (patients, rendez-vous, notes, factures) n'existent que le temps du tour.
 */
export function TourGuide() {
  const state = useTourState();
  const finished = useTourFinished();
  // Une clé par étape : chaque étape repart d'un composant neuf (le geste d'ouverture n'est pas encore fait).
  if (state.status === "running") return <TourRunner key={state.step} state={state} />;
  if (finished) return <TourFinishedCard />;
  return null;
}

/** Le tour relit les factures émises lui-même, en lecture seule : les écritures de facturation ne préviennent personne. */
const INVOICE_POLL_MS = 2500;
/** Combien de temps la cible doit rester dégagée, après un formulaire, pour que le repère revienne. */
const CLEAR_AFTER_MS = 900;

function useTourInvoices(enabled: boolean): { invoices: Invoice[]; known: boolean } {
  const [state, setState] = useState<{ invoices: Invoice[]; known: boolean }>({ invoices: [], known: false });
  useEffect(() => {
    if (!enabled || !isTauriRuntime()) return;
    let active = true;
    const read = () => {
      billingService
        .listInvoices({ documentStatus: "issued" })
        .then((rows) => active && setState({ invoices: rows, known: true }))
        .catch(() => active && setState((previous) => (previous.known ? { invoices: previous.invoices, known: false } : previous)));
    };
    read();
    const interval = window.setInterval(read, INVOICE_POLL_MS);
    window.addEventListener("focus", read);
    window.addEventListener("hashchange", read);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", read);
      window.removeEventListener("hashchange", read);
    };
  }, [enabled]);
  return state;
}

type Box = { x: number; y: number; width: number; height: number; radius: string };

/**
 * Où dessiner le repère. Il suit l'élément visé (la fenêtre bouge, le menu s'ouvre) et s'efface tant qu'un formulaire le
 * recouvre ; quand ce formulaire se ferme sans avoir terminé l'étape, `onUncovered` rend la main au geste d'ouverture.
 */
function useTargetBox(step: number, hidden: boolean, onUncovered: () => void): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  const uncovered = useRef(onUncovered);
  useEffect(() => {
    uncovered.current = onUncovered;
  });
  useEffect(() => {
    let frame = 0;
    let wasCovered = false;
    let clearSince: number | null = null;
    const measure = () => {
      frame = 0;
      const { element, covered } = locateTourTarget(TOUR_STEPS[step]);
      if (covered) {
        wasCovered = true;
        clearSince = null;
      } else if (wasCovered) {
        // Le voile d'une fenêtre s'anime : la cible paraît dégagée un instant. Il faut qu'elle le reste pour rendre la main.
        if (clearSince === null) clearSince = Date.now();
        if (Date.now() - clearSince >= CLEAR_AFTER_MS) {
          wasCovered = false;
          clearSince = null;
          uncovered.current();
        }
      }
      if (!element || hidden) return setBox((previous) => (previous ? null : previous));
      const rect = element.getBoundingClientRect();
      const next = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, radius: getComputedStyle(element).borderRadius };
      setBox((previous) => (previous && previous.x === next.x && previous.y === next.y && previous.width === next.width && previous.height === next.height && previous.radius === next.radius ? previous : next));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class", "data-state", "aria-expanded", "data-open"], childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    const interval = window.setInterval(schedule, 600);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.clearInterval(interval);
    };
  }, [step, hidden]);
  return hidden ? null : box;
}

function TourRunner({ state }: { state: TourState }) {
  const patients = usePatientsRepository();
  const appointments = useAppointmentsRepository();
  const soaps = useConsultationSoapsRepository();
  const financials = useTourInvoices(TOUR_STEPS[state.step].id === "invoice");
  const step = TOUR_STEPS[state.step];
  const [clicked, setClicked] = useState(false);
  const [hash, setHash] = useState(() => window.location.hash);
  // Le menu « + » : le clic sur l'entrée ouvre le geste. La barre latérale : l'écran où l'on se trouve le dit.
  const opened = "sidebarLabel" in step.target ? sidebarOpened(step, hash) : clicked;

  const loading = patients.loading || appointments.loading || soaps.loading;
  const snapshot = useMemo<TourSnapshot>(
    () => ({
      patients: patients.data,
      appointments: appointments.data,
      soaps: soaps.data,
      invoices: financials.invoices,
      invoicesKnown: isTauriRuntime() && financials.known,
    }),
    [patients.data, appointments.data, soaps.data, financials.invoices, financials.known],
  );

  // L'étape en cours est-elle réellement faite ? On lit les données ; l'étape suivante ne s'ouvre pas autrement.
  useEffect(() => {
    if (loading) return;
    const outcome = evaluateStep(state, snapshot);
    if (!outcome.done) return;
    tourStore.update((current) => advanceTour(current, outcome));
    if (tourStore.get().status === "done") tourStore.markFinished(true);
  }, [loading, snapshot, state]);

  // Le menu « + » : un clic sur l'entrée ouvre le geste, un nouveau clic sur « + » le reprend du début. L'Agenda : le chemin d'écran.
  useEffect(() => {
    const onClick = (event: Event) => {
      if (clickedMenuEntry(step, event)) setClicked(true);
      else if (restartedGesture(event)) setClicked(false);
    };
    const onHash = () => setHash(window.location.hash);
    document.addEventListener("click", onClick, true);
    window.addEventListener("hashchange", onHash);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("hashchange", onHash);
    };
  }, [step]);

  // Le geste est-il à moitié fait ? Se lit dans les données (une facture émise, pas encore payée), pas dans les clics.
  const partial = !loading && !!step.partial && !!evaluateStep(state, snapshot).partial;
  const box = useTargetBox(state.step, opened || partial, () => setClicked(false));
  const patientName = patients.data.find((patient) => patient.id === state.patientId)?.name ?? null;

  const skip = () => {
    tourStore.update((current) => advanceTour(current));
    if (tourStore.get().status === "done") tourStore.markFinished(true);
  };

  // Dans <body>, comme les menus et les fenêtres : la coque est un contexte d'empilement, le menu « + » passerait par-dessus le repère.
  return createPortal(
    <>
      {box ? (
        <div
          aria-hidden="true"
          className="tour-ring"
          style={{ top: box.y, left: box.x, width: box.width, height: box.height, borderRadius: box.radius }}
        />
      ) : null}
      <section aria-label="Tour guidé" className="tour-card" data-tour-ui data-tour-step={step.id} role="region">
        <Shell>
          <Panel className="tour-card-panel">
            <p className="tour-card-count">
              Étape {state.step + 1} sur {TOUR_STEPS.length}
            </p>
            <div aria-hidden="true" className="tour-card-bar">
              {TOUR_STEPS.map((item, index) => (
                <span data-done={index < state.step || undefined} data-current={index === state.step || undefined} key={item.id} />
              ))}
            </div>
            <h2 className="tour-card-title">{step.title}</h2>
            <p aria-live="polite" className="tour-card-text">
              {partial && step.partial
                ? step.partial(patientName)
                : inDeeperScreen(step, hash) && step.deeper
                  ? step.deeper.text(patientName)
                  : opened
                    ? step.then(patientName)
                    : step.open(patientName)}
            </p>
            <div className="tour-card-actions">
              <Button className="rounded-full" onClick={skip} size="sm" type="button" variant="outline">
                Passer
              </Button>
              <Button className="rounded-full" onClick={() => tourStore.update(quitTour)} size="sm" type="button" variant="ghost">
                Quitter le tour
              </Button>
            </div>
          </Panel>
        </Shell>
      </section>
    </>,
    document.body,
  );
}

function TourFinishedCard() {
  return createPortal(
    <section aria-label="Tour guidé" className="tour-card" data-tour-ui data-tour-step="done" role="region">
      <Shell>
        <Panel className="tour-card-panel">
          <p className="tour-card-count tour-card-count-done">
            <Check aria-hidden="true" className="size-3.5" /> Tour terminé
          </p>
          <h2 className="tour-card-title">Du dossier à la facture payée : c’est fait</h2>
          <p className="tour-card-text">Vous pouvez refaire ce tour à tout moment depuis Paramètres, rubrique Apparence.</p>
          <div className="tour-card-actions">
            <Button className="rounded-full" onClick={() => tourStore.markFinished(false)} size="sm" type="button">
              Terminer
            </Button>
          </div>
        </Panel>
      </Shell>
    </section>,
    document.body,
  );
}
