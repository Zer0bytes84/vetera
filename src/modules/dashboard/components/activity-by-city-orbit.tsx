"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CityActivity {
  city: string;
  count: number;
}

interface ActivityByCityOrbitProps {
  cities: CityActivity[];
  title?: string;
}

const cityEmojis: Record<string, string> = {
  Alger: "🌊",
  Oran: "🌅",
  Constantine: "🏛️",
  Annaba: "🌿",
  Blida: "🌸",
  Sétif: "⛰️",
  "Tizi Ouzou": "🌲",
  Béjaïa: "🏖️",
};

function getCityEmoji(city: string): string {
  for (const [key, emoji] of Object.entries(cityEmojis)) {
    if (city.toLowerCase().includes(key.toLowerCase())) {
      return emoji;
    }
  }
  return "📍";
}

export function ActivityByCityOrbit({
  cities,
  title = "Activité par ville",
}: ActivityByCityOrbitProps) {
  const topCount = Math.max(...cities.map((c) => c.count), 1);
  const total = cities.reduce((sum, c) => sum + c.count, 0);

  return (
    <Card className="dashboard-luxe-card overflow-hidden rounded-[26px] bg-card shadow-none">
      <CardHeader className="border-border/50 border-b px-6 py-5">
        <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
          Géographie
        </CardDescription>
        <CardTitle className="font-semibold text-[22px] tracking-[-0.045em]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-6">
        {cities.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-2xl">🗺️</span>
            <p className="font-medium text-foreground text-sm">Aucune donnée</p>
            <p className="text-muted-foreground text-xs">
              Pas d'activité géolocalisée
            </p>
          </div>
        ) : (
          cities.map((city, index) => {
            const pct = city.count / topCount;
            const sharePct = Math.round((city.count / total) * 100);
            const rank = index + 1;
            return (
              <div className="group" key={city.city}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="w-4 shrink-0 text-right font-mono font-semibold text-muted-foreground/50 text-xs">
                      {rank}
                    </span>
                    <span className="shrink-0 text-base leading-none">
                      {getCityEmoji(city.city)}
                    </span>
                    <span className="truncate font-medium text-foreground text-sm">
                      {city.city}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                      {city.count} consultation{city.count > 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono font-semibold text-[11px] text-muted-foreground tabular-nums">
                    {sharePct}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary/70 p-[2px]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500/70 to-cyan-400 transition-all duration-700 ease-out group-hover:from-violet-500 group-hover:to-cyan-300"
                    style={{
                      width: `${Math.max(pct * 100, rank === 1 ? 100 : 6)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
