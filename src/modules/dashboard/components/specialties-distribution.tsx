"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface CareSpecialty {
  label: string;
  value: number; // Volume value (can be count or cash value)
  color: string;
}

export interface AppointmentTypeDemand {
  name: string;
  demand: number;
}

interface SpecialtiesDistributionProps {
  categories: CareSpecialty[];
  appointmentTypes: AppointmentTypeDemand[];
}

const progressGradients = [
  "from-violet-500 to-fuchsia-400 shadow-[0_0_8px_rgba(167,139,250,0.3)]",
  "from-amber-500 to-orange-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]",
  "from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
  "from-sky-400 to-indigo-500 shadow-[0_0_8px_rgba(56,189,248,0.3)]",
];

const categoryColors = [
  "border-violet-500/20 bg-violet-500/5 text-violet-700 dark:text-violet-300",
  "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
  "border-sky-500/20 bg-sky-500/5 text-sky-700 dark:text-sky-300",
];

export function SpecialtiesDistribution({
  categories,
  appointmentTypes,
}: SpecialtiesDistributionProps) {
  // Calculate maximum values for relative widths
  const maxCategoryValue = Math.max(...categories.map((c) => c.value), 1);
  const totalCategories = categories.reduce((sum, c) => sum + c.value, 0);

  const maxTypeDemand = Math.max(...appointmentTypes.map((t) => t.demand), 1);
  const totalDemand = appointmentTypes.reduce((sum, t) => sum + t.demand, 0);

  return (
    <Card className="dashboard-luxe-card group relative overflow-hidden p-6 shadow-none transition-[transform,shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-md hover:shadow-zinc-950/5 dark:hover:shadow-black/20">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute right-0 bottom-0 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/5" />
      </div>

      <div className="relative z-10 flex flex-col h-full w-full">

      {/* Skewed Grid Pattern Layer in the background */}
      <div className="pointer-events-none absolute inset-0 z-[-1] opacity-[0.015] transition-all duration-500 group-hover:opacity-[0.04] dark:opacity-[0.01] dark:group-hover:opacity-[0.025]">
        <svg className="h-full w-full skew-y-[-18deg]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="distribution-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#distribution-grid)" />
        </svg>
      </div>

      <div>
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-400 dark:from-violet-400 dark:to-fuchsia-300">
          Répartition des Actes
        </span>
        <h3 className="text-xl font-bold tracking-tight text-foreground mt-1">
          Distribution des Soins
        </h3>
      </div>

      <div className="mt-6 space-y-6">
        {/* Categories Progress Bars */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Activités Financières par Catégorie
          </h4>
          <div className="space-y-3">
            {categories.slice(0, 4).map((cat, idx) => {
              const ratio = cat.value / maxCategoryValue;
              const percentage = totalCategories > 0 ? (cat.value / totalCategories) * 100 : 0;
              const gradient = progressGradients[idx % progressGradients.length];

              return (
                <div key={cat.label} className="group/item space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{cat.label}</span>
                    <span className="text-muted-foreground font-semibold tabular-nums">
                      {new Intl.NumberFormat("fr-FR").format(cat.value)} DA ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-950/5 dark:bg-white/5">
                    <div
                      className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out", gradient)}
                      style={{
                        width: `${ratio * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Appointment Types List */}
        <div className="border-t border-zinc-950/10 pt-4 dark:border-white/10 space-y-3.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Demande par Acte Médical
          </h4>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {appointmentTypes.slice(0, 4).map((type, idx) => {
              const percentage = totalDemand > 0 ? (type.demand / totalDemand) * 100 : 0;
              const colorConfig = categoryColors[idx % categoryColors.length];

              return (
                <div
                  key={type.name}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-2.5 transition-all duration-300 hover:scale-[1.01] hover:shadow-xs",
                    colorConfig
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-xs leading-none">{type.name}</p>
                    <p className="text-[9px] opacity-75 mt-1 leading-none font-semibold">Volume de soins</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold tabular-nums leading-none">{type.demand}</p>
                    <p className="text-[9px] opacity-75 mt-1 leading-none font-semibold tabular-nums">{percentage.toFixed(0)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </Card>
  );
}
