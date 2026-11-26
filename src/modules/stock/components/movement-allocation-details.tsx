import { useState } from "react";
import { Button } from "@/components/ui/button";
import { stockQuantityLabel } from "@/domain/stock";
import { guard } from "@/lib/guard";
import { isTauriRuntime } from "@/services/browser-store";
import { inventoryService } from "../services/inventory-service";

export function MovementAllocationDetails({
  movementId,
  unit,
}: {
  movementId: string;
  unit: string;
}) {
  const [rows, setRows] = useState<Awaited<
    ReturnType<typeof inventoryService.allocations>
  > | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (!isTauriRuntime()) {
    return null;
  }
  return (
    <div className="mt-1">
      <Button
        aria-expanded={open}
        className="h-auto p-0 text-xs dark:text-blue-300 dark:hover:text-blue-200"
        disabled={busy}
        onClick={async () => {
          if (rows) {
            setOpen((value) => !value);
            return;
          }
          setBusy(true);
          setError(false);
          await guard(
            async () => {
              setRows(await inventoryService.allocations(movementId));
              setOpen(true);
            },
            {
              recover: () => {
                setError(true);
              },
              cleanup: () => {
                setBusy(false);
              },
            }
          );
        }}
        type="button"
        variant="link"
      >
        {busy
          ? "Chargement…"
          : open
            ? "Masquer les lots"
            : "Lots et emplacements"}
      </Button>
      {error && (
        <p className="mt-1 text-destructive text-xs" role="alert">
          Le détail n’a pas pu être chargé. Réessayez.
        </p>
      )}
      {open && (
        <ul className="mt-2 space-y-1 text-muted-foreground text-xs">
          {rows?.length ? (
            rows.map((row) => (
              <li className="whitespace-normal" key={row.id}>
                <span className="tabular-nums">
                  {row.quantity_delta > 0 ? "+" : ""}
                  {stockQuantityLabel(row.quantity_delta, unit)}
                </span>{" "}
                ·{" "}
                {row.lot_number_snapshot
                  ? `Lot ${row.lot_number_snapshot}`
                  : "Sans lot"}{" "}
                · {row.location_name_snapshot}
                {row.expiry_date_snapshot
                  ? ` · Péremption ${new Date(`${row.expiry_date_snapshot}T12:00:00`).toLocaleDateString("fr-FR")}`
                  : ""}
              </li>
            ))
          ) : (
            <li>
              Le détail des lots n’est pas disponible pour ce mouvement ancien.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
