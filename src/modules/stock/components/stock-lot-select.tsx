import { useId, useMemo } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useStockInventory } from "../hooks/use-stock-inventory";
import { stockDay, stockTimestamp } from "@/domain/stock-date";
import { stockBalance, stockQuantityLabel } from "@/domain/stock";

export function StockLotSelect({productId, unit, value, onChange, disabled, locationId, label = "Lot à dispenser"}: {productId: string; unit: string; value: string; onChange: (value: string) => void; disabled?: boolean; locationId?: string; label?: string}) {
  const inventory = useStockInventory(); const inputId = useId(); const today = stockDay();
  const options = useMemo(() => {
    const groups = new Map<string, {quantity: number; name: string; expiry: string | null; receivedAt: string}>();
    for (const row of inventory.balances.filter(row => {
      try {return row.productId === productId && row.quantity > 0 && row.locationActive && (!locationId || row.locationId === locationId) && (!row.expiryDate || row.expiryDate >= today) && stockDay(new Date(stockTimestamp(row.receivedAt))) <= today;}
      catch {return false;}
    })) {
      const key = row.lotId ?? "unassigned"; const group = groups.get(key) ?? {quantity: 0, name: row.lotNumber || "Sans lot", expiry: row.expiryDate, receivedAt: row.receivedAt};
      group.quantity = stockBalance(group.quantity + row.quantity); if (row.receivedAt < group.receivedAt) group.receivedAt = row.receivedAt; groups.set(key, group);
    }
    return [{value: "fifo", label: "FIFO automatique"}, ...[...groups].sort((a, b) => a[1].receivedAt.localeCompare(b[1].receivedAt)).map(([key, group]) => ({value: key,
      label: `${group.name} · ${stockQuantityLabel(group.quantity, unit)}${group.expiry ? ` · ${new Date(group.expiry + "T12:00:00").toLocaleDateString("fr-FR")}` : ""}`}))];
  }, [inventory.balances, productId, unit, today, locationId]);
  if (!inventory.supported) return null;
  return <div className="space-y-1.5"><label htmlFor={inputId} className="text-sm">{label}</label><SearchableSelect id={inputId} label={label} disabled={disabled || !inventory.ready || !productId} controlClassName="h-11 rounded-xl [&_input]:text-foreground" options={options} value={value} onValueChange={onChange}/><p className="text-xs text-muted-foreground">{value === "fifo" ? "Les réceptions utilisables les plus anciennes sont utilisées en premier." : "Seul le lot choisi sera utilisé. Les autres stocks restent disponibles."}</p></div>;
}
