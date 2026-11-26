import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useState } from "react";
import { DragDropVerticalIcon } from "@/lib/hugeicons";
import { cn } from "@/lib/utils";
import type { DashboardLayoutBlock } from "./dashboard-layout-manager";

/**
 * The drag-and-drop part of the dashboard layout. Loaded on demand (see
 * dashboard-layout-manager.tsx) so @dnd-kit stays out of the startup bundle.
 */

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
          "rounded-[26px] pt-8 outline outline-dashed outline-primary/20 transition-[outline-color,background-color] duration-200 hover:bg-primary/[0.025] hover:outline-primary/40",
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
          <span className="t-12 pl-1 font-medium text-muted-foreground">
            {index + 1}. {block.label}
          </span>
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            aria-keyshortcuts="ArrowUp ArrowDown"
            aria-label={`Déplacer ${block.label}`}
            className="t-12 flex h-6 cursor-grab touch-none items-center gap-1.5 rounded-full border border-border/70 bg-background/95 px-2.5 font-medium text-muted-foreground shadow-sm backdrop-blur-md transition-[color,background-color,border-color,box-shadow] hover:border-primary/30 hover:bg-primary/10 hover:text-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:cursor-grabbing"
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
              strokeWidth={1.5}
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
    <div className="w-[min(420px,calc(100vw-32px))] rounded-2xl border border-primary/25 bg-background/95 p-3 shadow-2xl shadow-primary/15 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <HugeiconsIcon
            className="size-4"
            icon={DragDropVerticalIcon}
            strokeWidth={1.5}
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

export default function DashboardSortableList({
  blocks,
  blocksById,
  firstBlockIds,
  isEditing,
  onMoveByKeyboard,
  onReorder,
  order,
}: {
  blocks: DashboardLayoutBlock[];
  blocksById: Map<string, DashboardLayoutBlock>;
  firstBlockIds: string[];
  isEditing: boolean;
  onMoveByKeyboard: (id: string, direction: -1 | 1) => void;
  onReorder: (draggedId: string, overId: string) => void;
  order: string[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragCancel = useCallback(() => {
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

      onReorder(draggedId, overId);
    },
    [onReorder]
  );

  const activeBlock = activeId ? blocksById.get(activeId) : undefined;

  return (
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
        <div className={cn("flex flex-col", isEditing ? "gap-7" : "gap-6")}>
          {blocks.map((block, index) => (
            <SortableDashboardBlock
              block={block}
              index={index}
              isEditing={isEditing && !firstBlockIds.includes(block.id)}
              key={block.id}
              onMoveByKeyboard={onMoveByKeyboard}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeBlock ? <DragPreview block={activeBlock} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
