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
import { KanbanIcon, MedicalFileIcon } from "@/lib/hugeicons";
import { AlertTriangle, ArrowRight, Rows3, LayoutGrid, Stethoscope, Syringe } from "@/lib/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

function Timer({ card, now }: { card: FlowCard; now: Date }) {
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
  now: Date;
  onFocus: () => void;
  onOpen: (card: FlowCard) => void;
  onOpenRecord: (card: FlowCard) => void;
  onPrimary: (card: FlowCard) => void;
  registerRef: (node: HTMLElement | null) => void;
}

function CardBody({ busy, card, compact, now, onOpenRecord, onPrimary }: Omit<CardProps, "focused" | "onFocus" | "onOpen" | "registerRef">) {
  const action = PRIMARY_ACTION[card.lane];
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
        <Timer card={card} now={now} />
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
  const { card, compact, focused, onFocus, registerRef } = props;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.appointmentId, data: { card } });
  const label = [
    card.patientName,
    card.urgent ? "urgence" : "",
    card.lane === PLANNED ? `prévu à ${clock(card.startTime)}` : VISIT_FLOW_STAGE_LABELS[card.lane],
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

export function FlowBoardPage({
  onNavigate,
  onNavigateToPatient,
}: {
  onNavigate?: (view: View) => void;
  onNavigateToPatient?: (patientId: string) => void;
}) {
  const [prefs, setPrefs] = useState(readPrefs);
  const { board, busyId, error, loading, move, now, vets } = useFlowBoard(prefs.vetId);
  const [focus, setFocus] = useState<{ lane: BoardLane; id: string } | null>(null);
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

  const lanesWithCards = useMemo(() => BOARD_LANES.filter((lane) => board.lanes[lane].length > 0), [board]);
  const total = VISIT_FLOW_STAGES.reduce((sum, stage) => sum + board.lanes[stage].length, 0) + board.lanes[PLANNED].length;

  // Keep the focus on a card that still exists; fall back to the first one.
  const current = useMemo(() => {
    if (focus) {
      const lane = BOARD_LANES.find((l) => board.lanes[l].some((c) => c.appointmentId === focus.id));
      if (lane) return { lane, id: focus.id };
    }
    const first = lanesWithCards[0];
    return first ? { lane: first, id: board.lanes[first][0].appointmentId } : null;
  }, [board, focus, lanesWithCards]);

  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    if (pendingFocus.current && current?.id === pendingFocus.current) {
      refs.current.get(current.id)?.focus();
      pendingFocus.current = null;
    }
  });

  const focusCard = (lane: BoardLane, id: string) => {
    setFocus({ lane, id });
    pendingFocus.current = id;
    refs.current.get(id)?.focus();
  };

  const open = useCallback(
    (card: FlowCard) => {
      if (card.lane === "consultation" || card.lane === "care") {
        window.sessionStorage.setItem("vetera:pending-consultation-start", card.appointmentId);
        onNavigate?.("clinique");
      } else {
        onNavigateToPatient?.(card.patientId);
      }
    },
    [onNavigate, onNavigateToPatient]
  );

  const openRecord = useCallback((card: FlowCard) => onNavigateToPatient?.(card.patientId), [onNavigateToPatient]);

  const primary = useCallback(
    (card: FlowCard) => {
      const action = PRIMARY_ACTION[card.lane];
      if (action) void move(card, action.to);
      else open(card);
    },
    [move, open]
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!current || !(event.target instanceof HTMLElement) || !event.target.matches(".flow-card")) return;
    const cards = board.lanes[current.lane];
    const index = Math.max(0, cards.findIndex((c) => c.appointmentId === current.id));
    const card = cards[index];
    const key = event.key;
    if ((key === "ArrowRight" || key === "ArrowLeft") && event.shiftKey) {
      event.preventDefault();
      const all = BOARD_LANES.indexOf(current.lane);
      const target = BOARD_LANES[all + (key === "ArrowRight" ? 1 : -1)];
      if (target) {
        pendingFocus.current = card.appointmentId;
        void move(card, target);
      }
      return;
    }
    const direction = ARROW_DIRECTIONS[key];
    if (direction) {
      event.preventDefault();
      const here = refs.current.get(card.appointmentId)?.getBoundingClientRect();
      if (!here) return;
      const candidates = BOARD_LANES.flatMap((lane) =>
        board.lanes[lane].flatMap((other) => {
          const box = other.appointmentId === card.appointmentId ? null : refs.current.get(other.appointmentId)?.getBoundingClientRect();
          return box ? [{ box, id: other.appointmentId, lane }] : [];
        })
      );
      const next = nearestInDirection(here, candidates, direction);
      if (next) focusCard(next.lane, next.id);
    } else if (key === "Home" || key === "End") {
      event.preventDefault();
      focusCard(current.lane, cards[key === "Home" ? 0 : cards.length - 1].appointmentId);
    } else if (key === "Enter" || key === " ") {
      event.preventDefault();
      pendingFocus.current = card.appointmentId;
      primary(card);
    } else if (key.toLowerCase() === "o") {
      event.preventDefault();
      open(card);
    }
  };

  // An arrow pressed anywhere on the page selects the board, no Tab needed.
  const currentId = current?.id ?? null;
  useEffect(() => {
    const onWindowKey = (event: globalThis.KeyboardEvent) => {
      if (!currentId || !ARROW_DIRECTIONS[event.key] || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest(".flow-card, input, textarea, select, [contenteditable='true'], [role='dialog'], [role='menu'], [role='listbox']")) return;
      event.preventDefault();
      refs.current.get(currentId)?.focus();
    };
    window.addEventListener("keydown", onWindowKey);
    return () => window.removeEventListener("keydown", onWindowKey);
  }, [currentId]);

  const onDragStart = (event: DragStartEvent) => setDragging((event.active.data.current as { card: FlowCard }).card);
  const onDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    const card = (event.active.data.current as { card: FlowCard } | undefined)?.card;
    const to = event.over?.id as BoardLane | undefined;
    if (card && to) void move(card, to);
  };

  const longestWait = board.lanes.waiting.reduce((max, card) => Math.max(max, minutesSince(card.since, now) ?? 0), 0);
  const inRoom = board.lanes.waiting.length;
  const inCare = board.lanes.consultation.length + board.lanes.care.length;
  const todayLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const renderCards = (lane: BoardLane) =>
    board.lanes[lane].map((card) => (
      <DraggableCard
        busy={busyId === card.appointmentId}
        card={card}
        compact={prefs.compact}
        focused={current?.id === card.appointmentId}
        key={card.appointmentId}
        now={now}
        onFocus={() => setFocus({ lane, id: card.appointmentId })}
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
    <div className="flow-board-page dashboard-stage w-full min-w-0 px-4 pt-8 pb-8 lg:px-6">
      <PageHeader
        icon={<HugeiconsIcon icon={KanbanIcon} size={20} strokeWidth={1.5} />}
        subtitle={
          loading
            ? "Chargement des visites du jour…"
            : total === 0
              ? "Aucune visite aujourd'hui pour l'instant."
              : `${total} visite${total > 1 ? "s" : ""} aujourd'hui · qui est où, en un coup d'œil`
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
          <PlannedStrip cards={board.lanes[PLANNED]}>{renderCards(PLANNED)}</PlannedStrip>
          <div className="flow-lanes">
            {VISIT_FLOW_STAGES.map((stage) => (
              <Lane
                cards={board.lanes[stage]}
                key={stage}
                lane={stage}
              >
                {renderCards(stage)}
              </Lane>
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {dragging && (
            <div className={cn("flow-card is-overlay", prefs.compact && "is-compact")}>
              <CardBody busy card={dragging} compact={prefs.compact} now={now} onOpenRecord={() => undefined} onPrimary={() => undefined} />
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
        </p>
        {board.openElsewhere > 0 && (
          <button className="flow-elsewhere" onClick={() => onNavigate?.("clinique")} type="button">
            {board.openElsewhere} visite{board.openElsewhere > 1 ? "s" : ""} d'autres jours encore ouverte
            {board.openElsewhere > 1 ? "s" : ""}, à retrouver dans Clinique
          </button>
        )}
      </footer>
    </div>
  );
}

export default FlowBoardPage;
