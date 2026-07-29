"use client";

import {
  closestCenter,
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckmarkCircle02Icon,
  DashboardSquareEditIcon,
  DragDropVerticalIcon,
  ResetPasswordIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { getSetting, setSetting } from "@/services/appSettingsService";

export interface DashboardLayoutBlock {
  content: ReactNode;
  description: string;
  id: string;
  label: string;
}

interface DashboardLayoutManagerProps {
  blocks: DashboardLayoutBlock[];
  isEditing: boolean;
  onEditingChange: (isEditing: boolean) => void;
}

type SaveStatus = "idle" | "saving" | "saved";

const STORAGE_KEY_PREFIX = "dashboard_layout_v1";

function normalizeOrder(value: unknown, availableIds: string[]): string[] {
  if (!Array.isArray(value)) {
    return availableIds;
  }

  const available = new Set(availableIds);
  const knownIds = value.filter(
    (id): id is string => typeof id === "string" && available.has(id)
  );

  return [
    ...new Set(knownIds),
    ...availableIds.filter((id) => !knownIds.includes(id)),
  ];
}

function SortableDashboardBlock({
  block,
  index,
  isEditing,
  onMoveByKeyboard,
}: {
  block: DashboardLayoutBlock;
  index: number;
  isEditing: boolean;
  onMoveByKeyboard: (id: string, direction: -1 | 1) => void;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: block.id,
    disabled: !isEditing,
  });

  return (
    <div
      className={cn(
        "relative min-w-0",
        isEditing &&
          "rounded-[26px] pt-8 outline outline-dashed outline-sky-500/20 transition-[outline-color,background-color] duration-200 hover:bg-sky-500/[0.025] hover:outline-sky-500/40 dark:outline-sky-300/20 dark:hover:bg-sky-300/[0.035]",
        isDragging && "z-20 opacity-30"
      )}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {isEditing ? (
        <div className="absolute inset-x-2 top-1 flex h-6 items-center justify-between">
          <span className="pl-1 font-medium text-[11px] text-muted-foreground">
            {index + 1}. {block.label}
          </span>
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            aria-keyshortcuts="ArrowUp ArrowDown"
            aria-label={`Déplacer ${block.label}`}
            className="flex h-6 cursor-grab touch-none items-center gap-1.5 rounded-full border border-border/70 bg-background/95 px-2.5 font-medium text-[11px] text-muted-foreground shadow-sm backdrop-blur-md transition-[color,background-color,border-color,box-shadow] hover:border-sky-500/30 hover:bg-sky-50 hover:text-sky-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 active:cursor-grabbing dark:bg-zinc-900/90 dark:hover:bg-sky-950/60 dark:hover:text-sky-300"
            data-no-drag
            onKeyDown={(event) => {
              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                onMoveByKeyboard(block.id, event.key === "ArrowDown" ? 1 : -1);
              }
            }}
          >
            <HugeiconsIcon
              className="size-3.5"
              icon={DragDropVerticalIcon}
              strokeWidth={1.8}
            />
            Déplacer
          </button>
        </div>
      ) : null}
      {block.content}
    </div>
  );
}

function DragPreview({ block }: { block: DashboardLayoutBlock }) {
  return (
    <div className="w-[min(420px,calc(100vw-32px))] rounded-2xl border border-sky-500/25 bg-background/95 p-3 shadow-2xl shadow-sky-950/15 backdrop-blur-xl dark:bg-zinc-900/95">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
          <HugeiconsIcon
            className="size-4"
            icon={DragDropVerticalIcon}
            strokeWidth={1.8}
          />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-sm">{block.label}</p>
          <p className="truncate text-muted-foreground text-xs">
            {block.description}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DashboardLayoutManager({
  blocks,
  isEditing,
  onEditingChange,
}: DashboardLayoutManagerProps) {
  const { currentUser } = useAuth();
  const availableIdsKey = blocks.map((block) => block.id).join("|");
  const availableIds = useMemo(
    () => availableIdsKey.split("|").filter(Boolean),
    [availableIdsKey]
  );
  const blocksById = useMemo(
    () => new Map(blocks.map((block) => [block.id, block])),
    [blocks]
  );
  const storageKey = `${STORAGE_KEY_PREFIX}:${currentUser?.id ?? "local"}`;
  const [order, setOrder] = useState<string[]>(availableIds);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveVersionRef = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    let isCurrent = true;

    getSetting(storageKey)
      .then((savedValue) => {
        if (!isCurrent) {
          return;
        }

        if (!savedValue) {
          setOrder(availableIds);
          return;
        }

        try {
          setOrder(normalizeOrder(JSON.parse(savedValue), availableIds));
        } catch {
          setOrder(availableIds);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setOrder(availableIds);
        }
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [availableIds, storageKey]);

  useEffect(() => {
    if (isEditing) {
      setSaveStatus("idle");
    }
  }, [isEditing]);

  const persistOrder = useCallback(
    (nextOrder: string[]) => {
      const saveVersion = saveVersionRef.current + 1;
      saveVersionRef.current = saveVersion;
      setSaveStatus("saving");

      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(() => setSetting(storageKey, JSON.stringify(nextOrder)));

      saveQueueRef.current
        .then(() => {
          if (saveVersionRef.current === saveVersion) {
            setSaveStatus("saved");
          }
        })
        .catch(() => {
          if (saveVersionRef.current === saveVersion) {
            setSaveStatus("idle");
            toast.error("La disposition n’a pas pu être enregistrée.");
          }
        });
    },
    [storageKey]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    setActiveId(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const overId = event.over ? String(event.over.id) : null;
      const draggedId = String(event.active.id);

      if (!overId || draggedId === overId) {
        return;
      }

      const oldIndex = order.indexOf(draggedId);
      const newIndex = order.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0) {
        return;
      }

      const nextOrder = arrayMove(order, oldIndex, newIndex);
      setOrder(nextOrder);
      persistOrder(nextOrder);
    },
    [order, persistOrder]
  );

  const handleReset = useCallback(() => {
    setOrder(availableIds);
    persistOrder(availableIds);
  }, [availableIds, persistOrder]);

  const handleKeyboardMove = useCallback(
    (id: string, direction: -1 | 1) => {
      const currentIndex = order.indexOf(id);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= order.length) {
        return;
      }

      const nextOrder = arrayMove(order, currentIndex, targetIndex);
      setOrder(nextOrder);
      persistOrder(nextOrder);
    },
    [order, persistOrder]
  );

  const orderedBlocks = order
    .map((id) => blocksById.get(id))
    .filter((block): block is DashboardLayoutBlock => Boolean(block));
  const activeBlock = activeId ? blocksById.get(activeId) : undefined;

  return (
    <>
      {isEditing ? (
        <div className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-sky-500/15 bg-sky-500/[0.045] p-2 pl-3 dark:bg-sky-300/[0.04]">
          <div className="mr-auto flex min-w-0 items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-300">
              <HugeiconsIcon
                className="size-3.5"
                icon={DashboardSquareEditIcon}
                strokeWidth={1.8}
              />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-xs">Disposition du tableau</p>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                Saisissez une poignée puis déplacez le bloc.
              </p>
            </div>
            <span
              aria-live="polite"
              className="hidden font-medium text-[11px] text-muted-foreground lg:inline"
            >
              {saveStatus === "saving" ? "Enregistrement…" : null}
              {saveStatus === "saved" ? "Enregistré" : null}
            </span>
          </div>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Button
              className="bg-background/80 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              onClick={handleReset}
              size="sm"
              type="button"
              variant="outline"
            >
              <HugeiconsIcon icon={ResetPasswordIcon} strokeWidth={1.8} />
              Réinitialiser
            </Button>
            <Button
              onClick={() => onEditingChange(false)}
              size="sm"
              type="button"
            >
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={1.8} />
              Terminer
            </Button>
          </div>
        </div>
      ) : null}

      <DndContext
        accessibility={{
          announcements: {
            onDragCancel: ({ active }) =>
              `Déplacement de ${blocksById.get(String(active.id))?.label ?? "ce bloc"} annulé.`,
            onDragEnd: ({ active, over }) =>
              over
                ? `${blocksById.get(String(active.id))?.label ?? "Le bloc"} a été déplacé.`
                : "Le bloc n’a pas été déplacé.",
            onDragOver: ({ active, over }) =>
              over
                ? `${blocksById.get(String(active.id))?.label ?? "Le bloc"} est au-dessus de ${blocksById.get(String(over.id))?.label ?? "la zone cible"}.`
                : undefined,
            onDragStart: ({ active }) =>
              `${blocksById.get(String(active.id))?.label ?? "Bloc"} sélectionné. Utilisez les flèches verticales pour le déplacer.`,
          },
          screenReaderInstructions: {
            draggable:
              "Utilisez directement les flèches verticales sur la poignée pour déplacer ce bloc d’une position.",
          },
        }}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className={cn("flex flex-col", isEditing ? "gap-7" : "gap-4")}>
            {orderedBlocks.map((block, index) => (
              <SortableDashboardBlock
                block={block}
                index={index}
                isEditing={isEditing}
                key={block.id}
                onMoveByKeyboard={handleKeyboardMove}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeBlock ? <DragPreview block={activeBlock} /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
