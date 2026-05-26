import {
  CalendarPlus,
  FilePlus,
  MessageSquarePlus,
  type LucideIcon,
  Plus,
  Stethoscope,
  Syringe,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface QuickAction {
  icon: LucideIcon;
  label: string;
  description: string;
  shortcut?: string;
  color?: "blue" | "emerald" | "slate";
  onClick?: () => void;
}

const colorMap: Record<string, { bg: string; hover: string; icon: string }> = {
  blue: {
    bg: "bg-primary/8",
    hover: "hover:bg-primary/14",
    icon: "text-primary",
  },
  emerald: {
    bg: "bg-emerald-500/8 dark:bg-emerald-400/8",
    hover: "hover:bg-emerald-500/14 dark:hover:bg-emerald-400/14",
    icon: "text-emerald-600 dark:text-emerald-300",
  },
  slate: {
    bg: "bg-slate-500/8 dark:bg-slate-400/8",
    hover: "hover:bg-slate-500/14 dark:hover:bg-slate-400/14",
    icon: "text-slate-600 dark:text-slate-300",
  },
};

const defaultActions: QuickAction[] = [
  {
    icon: CalendarPlus,
    label: "Nouveau RDV",
    description: "Planifier une consultation",
    shortcut: "⌘R",
    color: "blue",
  },
  {
    icon: Users,
    label: "Nouveau patient",
    description: "Ajouter un dossier médical",
    shortcut: "⌘N",
    color: "slate",
  },
  {
    icon: Stethoscope,
    label: "Consultation",
    description: "Démarrer une consultation",
    color: "emerald",
  },
  {
    icon: Syringe,
    label: "Vaccination",
    description: "Programmer un vaccin",
    color: "slate",
  },
  {
    icon: MessageSquarePlus,
    label: "Message",
    description: "Contacter un propriétaire",
    color: "slate",
  },
  {
    icon: FilePlus,
    label: "Ordonnance",
    description: "Rédiger une prescription",
    color: "slate",
  },
];

export function QuickActionsWidget({
  actions = defaultActions,
  title = "Actions rapides",
}: {
  actions?: QuickAction[];
  title?: string;
}) {
  return (
    <Card className="dashboard-luxe-card @container">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <CardDescription>Tâches courantes</CardDescription>
          </div>
          <Badge className="shrink-0" variant="vibrant">
            <Plus className="size-3" />
            {actions.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            const c = colorMap[action.color ?? "slate"];
            return (
              <button
                className={`flex items-center gap-2.5 rounded-lg p-2.5 text-left transition-all ${c.bg} ${c.hover} active:translate-y-px`}
                key={action.label}
                onClick={action.onClick}
                type="button"
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-md ${c.icon} bg-background/80 dark:bg-white/6`}
                >
                  <Icon className="size-[16px]" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {action.label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
