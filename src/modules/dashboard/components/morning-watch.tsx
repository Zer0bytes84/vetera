import {
  BellAlertIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ExclamationCircleIcon,
  HeartIcon,
  ReceiptPercentIcon,
} from "@heroicons/react/20/solid";
import { useMemo } from "react";
import { StatGrid, type Stat, type StatTone } from "@/components/ui/stat-grid";
import { formatNumber } from "@/utils/display-format";
import type { MorningId, MorningItem, MorningStatus } from "../model/morning-watch";

const ICONS: Record<MorningId, Stat["icon"]> = {
  care: HeartIcon,
  appointments: CalendarDaysIcon,
  reminders: BellAlertIcon,
  invoices: ReceiptPercentIcon,
  stays: BuildingOffice2Icon,
};

const STATUSES: { value: MorningStatus; label: string }[] = [
  { value: "late", label: "En retard" },
  { value: "open", label: "Tout l’ouvert" },
];

/**
 * « À traiter » : la première bande du tableau de bord. Les mêmes cartes que « Chiffres clés » (un seul style), un compte
 * par sorte d'anomalie, chacune ouvre la page où l'action se fait. Le filtre de statut change les comptes : ce qui est en
 * retard, ou tout ce qui est encore ouvert. Rose quand il y a du retard, ambre quand il y a de l'ouvert, vert à zéro.
 */
export function MorningWatch({
  items,
  status,
  onStatus,
  onOpen,
  now,
}: {
  items: MorningItem[];
  status: MorningStatus;
  onStatus: (status: MorningStatus) => void;
  onOpen: (item: MorningItem) => void;
  now: Date;
}) {
  const stats = useMemo<Stat[]>(
    () =>
      items.map((item) => {
        const tone: StatTone | undefined =
          item.count === null ? undefined : item.count === 0 ? "green" : status === "late" ? "rose" : "amber";
        return {
          id: item.id,
          label: item.label,
          value: item.count === null ? "—" : formatNumber(item.count),
          hint: item.line,
          icon: ICONS[item.id],
          tone,
          emphasize: Boolean(item.count),
          ariaLabel: `${item.label} : ${item.count === null ? "non lu" : formatNumber(item.count)}. ${item.ariaLabel}`,
        };
      }),
    [items, status],
  );
  const total = items.reduce((sum, item) => sum + (item.count ?? 0), 0);
  const day = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div aria-atomic="true" aria-live="polite">
      <StatGrid
        badges={false}
        className="max-w-none morningWatch"
        data={stats}
        goals={false}
        icon={ExclamationCircleIcon}
        layout="row"
        lead={
          <div aria-label="Statut des anomalies" className="filter-segments" data-tabs-style="segmented" role="group">
            {STATUSES.map((option) => (
              <button
                aria-pressed={status === option.value}
                className="filter"
                data-active={status === option.value}
                key={option.value}
                onClick={() => onStatus(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        }
        onSelect={(stat) => {
          const item = items.find((entry) => entry.id === stat.id);
          if (item) onOpen(item);
        }}
        sparklines={false}
        subtitle={`${day[0].toLocaleUpperCase("fr-FR")}${day.slice(1)} · état à ${time} · ${status === "late" ? (total ? `${formatNumber(total)} en retard` : "aucun retard") : `${formatNumber(total)} ouvert${total > 1 ? "s" : ""}`}`}
        title="À traiter"
      />
    </div>
  );
}
