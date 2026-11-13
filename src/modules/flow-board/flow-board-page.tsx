import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { KeyHint } from "@/design-system/primitives";
import { PageHeader } from "@/design-system/patterns/page-header";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { KanbanIcon, MedicalFileIcon, UserAdd01Icon } from "@/lib/hugeicons";
import { AlertTriangle, ArrowRight, Rows3, LayoutGrid, Search, Stethoscope, Syringe } from "@/lib/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ConsultationWorkspace } from "@/modules/consultation-workspace/consultation-workspace";
import { useConsultationSession } from "@/modules/consultation-workspace/use-consultation-session";
import { useFluxRequests } from "./open-in-flux";
import { openPatientPeek } from "@/modules/patients/pages/patient-peek";
import { getSpeciesGlyph } from "@/lib/species-icons";
import { cn } from "@/lib/utils";
import { VISIT_FLOW_STAGES, VISIT_FLOW_STAGE_LABELS } from "@/modules/visit-flow/domain";
import type { View } from "@/types";
import {
  BOARD_LANES,
  durationLabel,
  minutesSince,
  PLANNED,
  PRIMARY_ACTION,
  WAIT_WARNING_MINUTES,
  type BoardLane,
  type FlowAlert,
  type FlowCard,
} from "./model";
import { ARROW_DIRECTIONS, nearestInDirection } from "./spatial-nav";
import { useFlowBoard } from "./use-flow-board";
import { WalkInDialog } from "./walk-in-dialog";
import { QuietDayPanel } from "./quiet-day-panel";
import { prepareAppointment } from "@/modules/shell/model/clinical-actions";
import "./flow-board.css";

const PREFS_KEY = "baitari.flow-board.v1";

const EMPTY_LABEL: Record<Exclude<BoardLane, typeof PLANNED>, string> = {
  waiting: "Personne en attente",
  consultation: "Aucune consultation en cours",
  care: "Aucun soin en cours",
  billing: "Rien à facturer",
  done: "Aucune visite terminée",
};

function readPrefs(): { compact: boolean; vetId: string } {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<{ compact: boolean; vetId: string }>) : {};
    return { compact: Boolean(parsed.compact), vetId: typeof parsed.vetId === "string" ? parsed.vetId : "" };
  } catch {
    return { compact: false, vetId: "" };
  }
}

function writePrefs(prefs: { compact: boolean; vetId: string }) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // A private window keeps the choice for this visit only.
  }
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const ALERT_ICON: Record<FlowAlert["kind"], typeof AlertTriangle> = {
  allergy: AlertTriangle,
  bite: AlertTriangle,
  vaccine: Syringe,
};

function Alerts({ alerts }: { alerts: FlowAlert[] }) {
  if (alerts.length === 0) return null;
  const shown = alerts.slice(0, 2);
  const rest = alerts.slice(2);
  return (
    <ul className="flow-card-alerts" aria-label="Alertes">
      {shown.map((alert) => {
        const Icon = ALERT_ICON[alert.kind];
        return (
          <li key={alert.kind} className="flow-alert" data-kind={alert.kind} title={alert.detail}>
            <Icon aria-hidden className="size-3" />
            <span>{alert.label}</span>
            <span className="sr-only"> : {alert.detail}</span>
          </li>
        );
      })}
      {rest.length > 0 && (
        <li className="flow-alert" data-kind="more" title={rest.map((a) => `${a.label} : ${a.detail}`).join("\n")}>
          +{rest.length}
          <span className="sr-only"> : {rest.map((a) => `${a.label}, ${a.detail}`).join(" ; ")}</span>
        </li>
      )}
    </ul>
  );
}

const openedDay = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

function Timer({ card, leftOpen, now }: { card: FlowCard; leftOpen?: boolean; now: Date }) {
  if (leftOpen) {
    return (
      <span className="flow-timer is-late" title={`Visite ouverte le ${new Date(card.startTime).toLocaleDateString("fr-FR", { dateStyle: "long" })}, jamais clôturée`}>
        {openedDay(card.startTime)}
      </span>
    );
  }
  if (card.lane === PLANNED) {
    const late = minutesSince(card.startTime, now) ?? 0;
    const lateText = late > 0 ? `${durationLabel(late)} de retard` : null;
    return (
      <span className={cn("flow-timer", lateText && "is-late")} title={lateText ? `Prévu à ${clock(card.startTime)}, ${lateText}` : `Prévu à ${clock(card.startTime)}`}>
        {clock(card.startTime)}
        {lateText && <span className="sr-only">, {lateText}</span>}
      </span>
    );
  }
  const minutes = minutesSince(card.since, now);
  if (minutes === null) return <span className="flow-timer">prévu {clock(card.startTime)}</span>;
  const warn = card.lane === "waiting" && minutes >= WAIT_WARNING_MINUTES;
  return (
    <span
      className={cn("flow-timer", warn && "is-warning")}
      title={card.lane === "waiting" ? `En attente depuis ${clock(card.since!)}` : `Dans cette étape depuis ${clock(card.since!)}`}
    >
      {minutes < 1 ? "< 1 min" : durationLabel(minutes)}
    </span>
  );
}

interface CardProps {
  busy: boolean;
  card: FlowCard;
  compact: boolean;
  focused: boolean;
  /** A visit of another day still open, shown in Restées ouvertes. */
  leftOpen?: boolean;
  now: Date;
  onFocus: () => void;
  onOpen: (card: FlowCard) => void;
  onOpenRecord: (card: FlowCard) => void;
  onPrimary: (card: FlowCard) => void;
  registerRef: (node: HTMLElement | null) => void;
}

function CardBody({ busy, card, compact, leftOpen, now, onOpen, onOpenRecord, onPrimary }: Omit<CardProps, "focused" | "onFocus" | "registerRef">) {
  // A visit forgotten on another day needs closing, not one more step.
  const reopen = leftOpen && (card.lane === "consultation" || card.lane === "care");
  const action = reopen
    ? { label: "Ouvrir", title: "Ouvrir la consultation pour la clôturer" }
    : PRIMARY_ACTION[card.lane];
  // Today's consultation is worked on right here, in the shared workspace.
  const consult = !reopen && (card.lane === "consultation" || card.lane === "care");
  return (
    <>
      <div className="flow-card-head">
        <span className="flow-species" aria-hidden>
          <HugeiconsIcon icon={getSpeciesGlyph(card.species)} size={compact ? 16 : 20} strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flow-card-name" title={card.patientName}>
            {card.patientName}
          </p>
          {(card.urgent || (!compact && card.ownerName)) && (
            <p className="flow-card-sub">
              {card.urgent && <span className="flow-urgent">Urgence</span>}
              {!compact && card.ownerName && <span className="flow-card-meta truncate">{card.ownerName}</span>}
            </p>
          )}
        </div>
        <Timer card={card} leftOpen={leftOpen} now={now} />
      </div>
      {!compact && (
        <div className="flow-card-details">
          <p className="truncate" title={card.reason}>
            {card.reason}
          </p>
          {card.vetName && (
            <p className="flow-card-meta flex items-center gap-1.5 truncate">
              <Stethoscope aria-hidden className="size-3 shrink-0" />
              {card.vetName}
            </p>
          )}
        </div>
      )}
      {leftOpen && card.lane !== PLANNED && <p className="flow-card-stage">{VISIT_FLOW_STAGE_LABELS[card.lane]}</p>}
      <Alerts alerts={card.alerts} />
      <div className="flow-card-actions">
        {action && (
          <Button
            className="h-7 px-2.5 text-xs"
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              onPrimary(card);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            size="sm"
            tabIndex={-1}
            title={action.title}
            type="button"
            variant={card.lane === "waiting" ? "default" : "outline"}
          >
            {action.label}
            <ArrowRight aria-hidden className="size-3.5" />
          </Button>
        )}
        {consult && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  aria-label={`Ouvrir la consultation de ${card.patientName}`}
                  className="flow-record-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(card);
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  tabIndex={-1}
                  type="button"
                />
              }
            >
              <Stethoscope aria-hidden className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Ouvrir la consultation</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                aria-label={`Ouvrir le dossier de ${card.patientName}`}
                className="flow-record-button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenRecord(card);
                }}
                onPointerDown={(event) => event.stopPropagation()}
                tabIndex={-1}
                type="button"
              />
            }
          >
            <HugeiconsIcon aria-hidden icon={MedicalFileIcon} size={17} strokeWidth={1.6} />
          </TooltipTrigger>
          <TooltipContent>Ouvrir le dossier</TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}

function DraggableCard(props: CardProps) {
  const { card, compact, focused, leftOpen, onFocus, registerRef } = props;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.appointmentId, data: { card } });
  const label = [
    card.patientName,
    card.urgent ? "urgence" : "",
    card.lane === PLANNED ? `prévu à ${clock(card.startTime)}` : VISIT_FLOW_STAGE_LABELS[card.lane],
    leftOpen ? `ouverte le ${openedDay(card.startTime)}` : "",
    card.ownerName,
    card.reason,
    card.vetName,
    card.alerts.map((alert) => alert.label).join(", "),
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <li>
      <article
        {...attributes}
        {...listeners}
        aria-label={label}
        aria-roledescription="carte de visite"
        className={cn("flow-card", compact && "is-compact", isDragging && "is-dragging", card.urgent && "is-urgent")}
        onClick={() => {
          if (!isDragging) openPatientPeek(card.patientId);
        }}
        onFocus={onFocus}
        ref={(node) => {
          setNodeRef(node);
          registerRef(node);
        }}
        tabIndex={focused ? 0 : -1}
      >
        <CardBody {...props} />
      </article>
    </li>
  );
}

function Lane({
  cards,
  children,
  lane,
  warning,
}: {
  cards: FlowCard[];
  children: ReactNode;
  lane: Exclude<BoardLane, typeof PLANNED>;
  warning?: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: lane });
  return (
    <section aria-label={`${VISIT_FLOW_STAGE_LABELS[lane]}, ${cards.length}`} className={cn("flow-lane", isOver && "is-over")} ref={setNodeRef}>
      <header className="flow-lane-head">
        <h2>{VISIT_FLOW_STAGE_LABELS[lane]}</h2>
        <span className="flow-count" aria-hidden>
          {cards.length}
        </span>
      </header>
      {warning && <p className="flow-lane-warning">{warning}</p>}
      {cards.length === 0 ? <p className="flow-lane-empty">{EMPTY_LABEL[lane]}</p> : <ul className="flow-lane-list">{children}</ul>}
    </section>
  );
}

function PlannedStrip({ cards, children }: { cards: FlowCard[]; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: PLANNED });
  if (cards.length === 0) return null;
  return (
    <section aria-label={`Prévus aujourd'hui, ${cards.length}`} className={cn("flow-planned", isOver && "is-over")} ref={setNodeRef}>
      <header className="flow-lane-head">
        <h2>Prévus aujourd'hui</h2>
        <span className="flow-count" aria-hidden>
          {cards.length}
        </span>
      </header>
      <ul className="flow-planned-list">{children}</ul>
    </section>
  );
}

function LeftOpen({ cards, children }: { cards: FlowCard[]; children: ReactNode }) {
  if (cards.length === 0) return null;
  return (
    <details className="flow-left-open" open>
      <summary className="flow-lane-head">
        <h2>Restées ouvertes</h2>
        <span className="flow-left-open-hint">Visites d'autres jours jamais clôturées</span>
        <span className="flow-count" aria-hidden>
          {cards.length}
        </span>
      </summary>
      <ul className="flow-planned-list">{children}</ul>
    </details>
  );
}

export function FlowBoardPage({
  onNavigate,
  onNavigateToPatient,
}: {
  onNavigate?: (view: View) => void;
  onNavigateToPatient?: (patientId: string) => void;
}) {
  const [prefs, setPrefs] = useState(readPrefs);
  const [query, setQuery] = useState("");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const {
    appointmentById,
    appointments,
    board,
    busyId,
    error,
    loading,
    move,
    now,
    owners,
    patients,
    refresh,
    vets,
    walkIn,
  } = useFlowBoard(prefs.vetId, query);
  // The consultation opens here, the same workspace as in Clinique; billing
  // at close and from the À facturer card goes through it as well.
  const session = useConsultationSession();
  const { setActiveConsultation, setBillingAppointment } = session;
  const workspaceOpen = Boolean(session.activeConsultation && session.activeConsultationPatient);
  const [focus, setFocus] = useState<{ id: string } | null>(null);
  const [dragging, setDragging] = useState<FlowCard | null>(null);
  const refs = useRef(new Map<string, HTMLElement>());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const updatePrefs = (patch: Partial<typeof prefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      writePrefs(next);
      return next;
    });
  };

  // Cards in reading order, grouped as shown: planned, left open, then lanes.
  const groups = useMemo(
    () => [
      { key: PLANNED as string, cards: board.lanes[PLANNED] },
      { key: "left-open", cards: board.leftOpen },
      ...VISIT_FLOW_STAGES.map((stage) => ({ key: stage as string, cards: board.lanes[stage] })),
    ],
    [board]
  );
  const total = VISIT_FLOW_STAGES.reduce((sum, stage) => sum + board.lanes[stage].length, 0) + board.lanes[PLANNED].length;

  // Keep the focus on a card that still exists; fall back to the first one.
  const current = useMemo(() => {
    const all = groups.flatMap((group) => group.cards);
    const found = focus && all.find((card) => card.appointmentId === focus.id);
    return found ? { id: found.appointmentId } : all[0] ? { id: all[0].appointmentId } : null;
  }, [focus, groups]);

  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    if (pendingFocus.current && current?.id === pendingFocus.current) {
      refs.current.get(current.id)?.focus();
      pendingFocus.current = null;
    }
  });

  const focusCard = (id: string) => {
    setFocus({ id });
    pendingFocus.current = id;
    refs.current.get(id)?.focus();
  };

  // Agenda, dashboard and Nouvelle consultation send their visits here.
  useFluxRequests({ appointmentById, focus: focusCard, open: setActiveConsultation });

  const open = useCallback(
    (card: FlowCard) => {
      const appointment = appointmentById(card.appointmentId);
      if ((card.lane === "consultation" || card.lane === "care") && appointment?.status === "in_progress") {
        setActiveConsultation(appointment);
      } else {
        onNavigateToPatient?.(card.patientId);
      }
    },
    [appointmentById, onNavigateToPatient, setActiveConsultation]
  );

  const openRecord = useCallback((card: FlowCard) => onNavigateToPatient?.(card.patientId), [onNavigateToPatient]);

  const startBilling = useCallback(
    (card: FlowCard) => {
      const appointment = appointmentById(card.appointmentId);
      if (appointment) setBillingAppointment(appointment);
    },
    [appointmentById, setBillingAppointment]
  );

  const leftOpenIds = useMemo(() => new Set(board.leftOpen.map((card) => card.appointmentId)), [board.leftOpen]);

  const primary = useCallback(
    (card: FlowCard) => {
      if (leftOpenIds.has(card.appointmentId) && (card.lane === "consultation" || card.lane === "care")) {
        open(card);
        return;
      }
      if (card.lane === "billing") {
        startBilling(card);
        return;
      }
      const action = PRIMARY_ACTION[card.lane];
      if (action) void move(card, action.to);
      else open(card);
    },
    [leftOpenIds, move, open, startBilling]
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!current || !(event.target instanceof HTMLElement) || !event.target.matches(".flow-card")) return;
    const cards = groups.find((group) => group.cards.some((c) => c.appointmentId === current.id))?.cards ?? [];
    const card = cards.find((c) => c.appointmentId === current.id);
    if (!card) return;
    const key = event.key;
    if ((key === "ArrowRight" || key === "ArrowLeft") && event.shiftKey) {
      event.preventDefault();
      const all = BOARD_LANES.indexOf(card.lane);
      const target = BOARD_LANES[all + (key === "ArrowRight" ? 1 : -1)];
      if (target) {
        pendingFocus.current = card.appointmentId;
        if (target === "done" && card.lane === "billing") startBilling(card);
        else void move(card, target, open);
      }
      return;
    }
    const direction = ARROW_DIRECTIONS[key];
    if (direction) {
      event.preventDefault();
      const here = refs.current.get(card.appointmentId)?.getBoundingClientRect();
      if (!here) return;
      const candidates = groups.flatMap((group) =>
        group.cards.flatMap((other) => {
          const box = other.appointmentId === card.appointmentId ? null : refs.current.get(other.appointmentId)?.getBoundingClientRect();
          return box ? [{ box, id: other.appointmentId }] : [];
        })
      );
      const next = nearestInDirection(here, candidates, direction);
      if (next) focusCard(next.id);
    } else if (key === "Home" || key === "End") {
      event.preventDefault();
      focusCard(cards[key === "Home" ? 0 : cards.length - 1].appointmentId);
    } else if (key === "Enter" || key === " ") {
      event.preventDefault();
      pendingFocus.current = card.appointmentId;
      primary(card);
    } else if (key.toLowerCase() === "o") {
      event.preventDefault();
      open(card);
    } else if (key.toLowerCase() === "a") {
      event.preventDefault();
      openPatientPeek(card.patientId);
    }
  };

  // An arrow pressed anywhere on the page selects the board, no Tab needed.
  const currentId = current?.id ?? null;
  useEffect(() => {
    const onWindowKey = (event: globalThis.KeyboardEvent) => {
      if (workspaceOpen || !currentId || !ARROW_DIRECTIONS[event.key] || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest(".flow-card, input, textarea, select, [contenteditable='true'], [role='dialog'], [role='menu'], [role='listbox']")) return;
      event.preventDefault();
      refs.current.get(currentId)?.focus();
    };
    window.addEventListener("keydown", onWindowKey);
    return () => window.removeEventListener("keydown", onWindowKey);
  }, [currentId, workspaceOpen]);

  const onDragStart = (event: DragStartEvent) => setDragging((event.active.data.current as { card: FlowCard }).card);
  const onDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    const card = (event.active.data.current as { card: FlowCard } | undefined)?.card;
    const to = event.over?.id as BoardLane | undefined;
    if (card && to === "done" && card.lane === "billing") startBilling(card);
    else if (card && to) void move(card, to, open);
  };

  const longestWait = board.lanes.waiting.reduce((max, card) => Math.max(max, minutesSince(card.since, now) ?? 0), 0);
  const inRoom = board.lanes.waiting.length;
  const inCare = board.lanes.consultation.length + board.lanes.care.length;
  // A day with no visit at all, nothing left open and no search: the strip above the lanes says what is next instead.
  const quietDay = !loading && !error && !query && total === 0 && board.leftOpen.length === 0;
  const todayLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const renderCards = (cards: FlowCard[], leftOpen = false) =>
    cards.map((card) => (
      <DraggableCard
        leftOpen={leftOpen}
        busy={busyId === card.appointmentId}
        card={card}
        compact={prefs.compact || leftOpen}
        focused={current?.id === card.appointmentId}
        key={card.appointmentId}
        now={now}
        onFocus={() => setFocus({ id: card.appointmentId })}
        onOpen={open}
        onOpenRecord={openRecord}
        onPrimary={primary}
        registerRef={(node) => {
          if (node) refs.current.set(card.appointmentId, node);
          else refs.current.delete(card.appointmentId);
        }}
      />
    ));

  return (
    <div className="flow-board-page dashboard-stage w-full min-w-0 px-4 pb-8 lg:px-6">
      {!workspaceOpen && (
        <>
        <PageHeader
          icon={<HugeiconsIcon icon={KanbanIcon} size={20} strokeWidth={1.5} />}
          subtitle={
            loading
              ? "chargement des visites du jour"
              : total === 0
                ? "aucune visite aujourd'hui"
                : `${total} visite${total > 1 ? "s" : ""} aujourd'hui`
          }
          title="Flux"
        />

        <div className="flow-toolbar">
          <p className="flow-toolbar-summary">
            <strong>{todayLabel}</strong>
            <span>
              {inRoom} en salle d'attente{inCare ? ` · ${inCare} en consultation ou en soins` : ""}
            </span>
            {longestWait >= WAIT_WARNING_MINUTES && (
              <span className="is-warning">Attente la plus longue : {durationLabel(longestWait)}</span>
            )}
          </p>
          <div aria-label="Affichage du tableau" className="flow-toolbar-controls" role="toolbar">
            <label className="flow-search">
              <Search aria-hidden className="size-4" />
              <span className="sr-only">Rechercher sur le tableau</span>
              <input
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setQuery("");
                }}
                placeholder="Patient, propriétaire, motif…"
                type="search"
                value={query}
              />
            </label>
            <Button className="h-9" onClick={() => setWalkInOpen(true)} type="button" variant="outline">
              <HugeiconsIcon aria-hidden icon={UserAdd01Icon} size={16} strokeWidth={1.5} />
              Arrivée sans RDV
            </Button>
            <NativeSelect
              aria-label="Filtrer par vétérinaire"
              className="h-9 min-w-48"
              onChange={(event) => updatePrefs({ vetId: event.target.value })}
              value={prefs.vetId}
            >
              <NativeSelectOption value="">Tous les vétérinaires</NativeSelectOption>
              {vets.map((vet) => (
                <NativeSelectOption key={vet.id} value={vet.id}>
                  {vet.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          <div aria-label="Affichage des cartes" className="flow-density" role="group">
              <button aria-pressed={!prefs.compact} onClick={() => updatePrefs({ compact: false })} title="Cartes détaillées" type="button">
                <LayoutGrid aria-hidden className="size-4" />
                <span>Détaillée</span>
              </button>
              <button aria-pressed={prefs.compact} onClick={() => updatePrefs({ compact: true })} title="Cartes compactes" type="button">
                <Rows3 aria-hidden className="size-4" />
                <span>Compacte</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="flow-error" role="alert">
            {error}
          </p>
        )}

        <DndContext onDragCancel={() => setDragging(null)} onDragEnd={onDragEnd} onDragStart={onDragStart} sensors={sensors}>
          <div className="flow-board" onKeyDown={onKeyDown}>
            {quietDay && (
              <QuietDayPanel
                appointments={appointments}
                now={now}
                onAgenda={() => onNavigate?.("agenda")}
                onNewAppointment={() => {
                  // The same opening as the dashboard's « planifier »: the agenda reads the marker when it mounts.
                  prepareAppointment(undefined, new Date());
                  onNavigate?.("agenda");
                  window.setTimeout(() => window.dispatchEvent(new CustomEvent("vetera:new-appointment")), 150);
                }}
                onWalkIn={() => setWalkInOpen(true)}
                patients={patients}
                vetId={prefs.vetId}
                vets={vets}
              />
            )}
            <PlannedStrip cards={board.lanes[PLANNED]}>{renderCards(board.lanes[PLANNED])}</PlannedStrip>
            <LeftOpen cards={board.leftOpen}>{renderCards(board.leftOpen, true)}</LeftOpen>
            <div className="flow-lanes">
              {VISIT_FLOW_STAGES.map((stage) => (
                <Lane
                  cards={board.lanes[stage]}
                  key={stage}
                  lane={stage}
                >
                  {renderCards(board.lanes[stage])}
                </Lane>
              ))}
            </div>
          </div>
          <DragOverlay dropAnimation={null}>
            {dragging && (
              <div className={cn("flow-card is-overlay", prefs.compact && "is-compact")}>
                <CardBody busy card={dragging} compact={prefs.compact} now={now} onOpen={() => undefined} onOpenRecord={() => undefined} onPrimary={() => undefined} />
              </div>
            )}
          </DragOverlay>
        </DndContext>

        <footer className="flow-footer">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1">
              <KeyHint>↑</KeyHint>
              <KeyHint>↓</KeyHint>
              <KeyHint>←</KeyHint>
              <KeyHint>→</KeyHint> naviguer
            </span>
            <span className="flex items-center gap-1">
              <KeyHint>Entrée</KeyHint> action principale
            </span>
            <span className="flex items-center gap-1">
              <KeyHint>Maj</KeyHint>+<KeyHint>→</KeyHint> étape suivante
            </span>
            <span className="flex items-center gap-1">
              <KeyHint>O</KeyHint> ouvrir
            </span>
            <span className="flex items-center gap-1">
              <KeyHint>A</KeyHint> aperçu du patient
            </span>
          </p>
          {query && total + board.leftOpen.length === 0 && <p>Aucune visite ne correspond à « {query} ».</p>}
        </footer>

        <WalkInDialog
          onConfirm={async (patient) => {
            try {
              const id = await walkIn(patient);
              if (id) focusCard(id);
            } catch (reason) {
              toast.error(reason instanceof Error ? reason.message : "L'arrivée n'a pas pu être enregistrée.");
              throw reason;
            }
          }}
          onOpenChange={setWalkInOpen}
          open={walkInOpen}
          owners={owners}
          patients={patients}
        />
        </>
      )}

      <ConsultationWorkspace closeLabel="Retour au tableau" onBilled={refresh} session={session} />
    </div>
  );
}

export default FlowBoardPage;
