"use client";

import {
  CheckmarkCircle02Icon,
  DashboardSquareEditIcon,
  ResetPasswordIcon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getSetting, setSetting } from "@/services/appSettingsService";
import {
  migrateClassicDashboardOrder,
  normalizeDashboardOrder as normalizeOrder,
} from "../model/dashboard-layout";

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
  storageKeyPrefix?: string;
  /** Operational priorities precede any previously saved widget order. */
  firstBlockIds?: string[];
  migrateFromPrefix?: string;
}

type SaveStatus = "idle" | "saving" | "saved";

const STORAGE_KEY_PREFIX = "dashboard_layout_v1";

// The drag-and-drop library (@dnd-kit) is only needed to rearrange the blocks.
// It is loaded the first time the user opens « Disposition du tableau », so the
// first screen does not download it. Until then the blocks render as a plain list.
const DashboardSortableList = lazy(() => import("./dashboard-sortable-list"));

function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function StaticDashboardList({ blocks }: { blocks: DashboardLayoutBlock[] }) {
  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block) => (
        <div className="relative min-w-0" key={block.id}>
          {block.content}
        </div>
      ))}
    </div>
  );
}

export function DashboardLayoutManager({
  blocks,
  isEditing,
  onEditingChange,
  storageKeyPrefix = STORAGE_KEY_PREFIX,
  firstBlockIds = [],
  migrateFromPrefix,
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
  const storageKey = `${storageKeyPrefix}:${currentUser?.id ?? "local"}`;
  const [order, setOrder] = useState<string[]>(availableIds);
  // Once opened, the arrangement mode stays mounted, so the blocks are not
  // remounted each time the user switches it on or off.
  const [isSortableLoaded, setIsSortableLoaded] = useState(isEditing);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveVersionRef = useRef(0);

  if (isEditing && !isSortableLoaded) {
    setIsSortableLoaded(true);
  }

  useEffect(() => {
    let isCurrent = true;

    getSetting(storageKey)
      .then(async (value) => {
        if (value || !migrateFromPrefix) return value;
        const previous = await getSetting(
          `${migrateFromPrefix}:${currentUser?.id ?? "local"}`
        );
        if (!previous) return null;
        try {
          const oldOrder: unknown = JSON.parse(previous);
          if (!Array.isArray(oldOrder)) return null;
          const migrated = migrateClassicDashboardOrder(oldOrder, availableIds);
          const serialized = JSON.stringify(migrated);
          await setSetting(storageKey, serialized);
          return serialized;
        } catch {
          return null;
        }
      })
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
  }, [availableIds, storageKey, migrateFromPrefix, currentUser?.id]);

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

  const handleReorder = useCallback(
    (draggedId: string, overId: string) => {
      const oldIndex = order.indexOf(draggedId);
      const newIndex = order.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0) {
        return;
      }

      const nextOrder = moveItem(order, oldIndex, newIndex);
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

      const nextOrder = moveItem(order, currentIndex, targetIndex);
      setOrder(nextOrder);
      persistOrder(nextOrder);
    },
    [order, persistOrder]
  );

  const orderedIds = [
    ...firstBlockIds.filter((id) => availableIds.includes(id)),
    ...normalizeOrder(order, availableIds).filter(
      (id) => !firstBlockIds.includes(id)
    ),
  ];
  const orderedBlocks = orderedIds
    .map((id) => blocksById.get(id))
    .filter((block): block is DashboardLayoutBlock => Boolean(block));

  return (
    <>
      {isEditing ? (
        <div className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-primary/15 bg-primary/[0.045] p-2 pl-3">
          <div className="mr-auto flex min-w-0 items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <HugeiconsIcon
                className="size-3.5"
                icon={DashboardSquareEditIcon}
                strokeWidth={1.5}
              />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-xs">Disposition du tableau</p>
              <p className="hidden t-12 text-muted-foreground sm:block">
                Saisissez une poignée puis déplacez le bloc.
              </p>
            </div>
            <span
              aria-live="polite"
              className="hidden font-medium t-12 text-muted-foreground lg:inline"
            >
              {saveStatus === "saving" ? "Enregistrement…" : null}
              {saveStatus === "saved" ? "Enregistré" : null}
            </span>
          </div>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Button
              className="bg-background/80 hover:bg-muted hover:text-foreground"
              onClick={handleReset}
              size="sm"
              type="button"
              variant="outline"
            >
              <HugeiconsIcon icon={ResetPasswordIcon} strokeWidth={1.5} />
              Réinitialiser
            </Button>
            <Button
              onClick={() => onEditingChange(false)}
              size="sm"
              type="button"
            >
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={1.5} />
              Terminer
            </Button>
          </div>
        </div>
      ) : null}

      {isSortableLoaded ? (
        <Suspense fallback={<StaticDashboardList blocks={orderedBlocks} />}>
          <DashboardSortableList
            blocks={orderedBlocks}
            blocksById={blocksById}
            firstBlockIds={firstBlockIds}
            isEditing={isEditing}
            onMoveByKeyboard={handleKeyboardMove}
            onReorder={handleReorder}
            order={order}
          />
        </Suspense>
      ) : (
        <StaticDashboardList blocks={orderedBlocks} />
      )}
    </>
  );
}
