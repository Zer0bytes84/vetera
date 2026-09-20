import {
  DashboardSquareEditIcon,
  StethoscopeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface MotivationalHeaderProps {
  dashboardViewControl?: React.ReactNode;
  isCustomizing?: boolean;
  onCustomize?: () => void;
  onNavigate?: (view: string) => void;
  section:
    | "dashboard"
    | "agenda"
    | "clinique"
    | "patients"
    | "stock"
    | "finances"
    | "equipe"
    | "notes"
    | "taches"
    | "parametres";
  subtitle?: string;
  title?: string;
}

const MotivationalHeader: React.FC<MotivationalHeaderProps> = ({
  section,
  title,
  subtitle,
  isCustomizing = false,
  dashboardViewControl,
  onCustomize,
  onNavigate,
}) => {
  const { t, i18n } = useTranslation();
  const { currentUser } = useAuth();
  const userName = currentUser?.displayName?.split(" ")[0] || "Docteur";
  const currentLocale = i18n.language.startsWith("ar")
    ? "ar"
    : i18n.language.startsWith("en")
      ? "en-US"
      : i18n.language.startsWith("es")
        ? "es-ES"
        : "fr-FR";

  const headerCopy = React.useMemo(() => {
    const sectionCopy = {
      dashboard: {
        emoji: "👋",
      },
      agenda: {
        eyebrowKey: "motivation.agenda.eyebrow",
        titleKey: "motivation.agenda.title",
        subtitleKey: "motivation.agenda.subtitle",
        emoji: "🗓️",
      },
      clinique: {
        eyebrowKey: "motivation.clinique.eyebrow",
        titleKey: "motivation.clinique.title",
        subtitleKey: "motivation.clinique.subtitle",
        emoji: "🩺",
      },
      patients: {
        eyebrowKey: "motivation.patients.eyebrow",
        titleKey: "motivation.patients.title",
        subtitleKey: "motivation.patients.subtitle",
        emoji: "🐾",
      },
      stock: {
        eyebrowKey: "motivation.stock.eyebrow",
        titleKey: "motivation.stock.title",
        subtitleKey: "motivation.stock.subtitle",
        emoji: "📦",
      },
      finances: {
        eyebrowKey: "motivation.finances.eyebrow",
        titleKey: "motivation.finances.title",
        subtitleKey: "motivation.finances.subtitle",
        emoji: "💳",
      },
      equipe: {
        eyebrowKey: "motivation.equipe.eyebrow",
        titleKey: "motivation.equipe.title",
        subtitleKey: "motivation.equipe.subtitle",
        emoji: "👥",
      },
      notes: {
        eyebrowKey: "motivation.notes.eyebrow",
        titleKey: "motivation.notes.title",
        subtitleKey: "motivation.notes.subtitle",
        emoji: "📝",
      },
      taches: {
        eyebrowKey: "motivation.taches.eyebrow",
        titleKey: "motivation.taches.title",
        subtitleKey: "motivation.taches.subtitle",
        emoji: "⏰",
      },
      parametres: {
        eyebrowKey: "motivation.parametres.eyebrow",
        titleKey: "motivation.parametres.title",
        subtitleKey: "motivation.parametres.subtitle",
        emoji: "🎛️",
      },
    };

    if (section === "dashboard") {
      const today = new Intl.DateTimeFormat(currentLocale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date());
      return {
        eyebrow: today,
        text: `Bonjour ${userName}`,
        subtitle: "Voici ce qui se passe dans votre cabinet aujourd'hui",
        emoji: sectionCopy.dashboard.emoji,
        compact: false,
      };
    }

    const copy = sectionCopy[section];
    if (!copy) {
      return {
        eyebrow: t("motivation.default.eyebrow"),
        text: t("motivation.default.title", { name: userName }),
        subtitle: t("motivation.default.subtitle"),
        emoji: "✨",
        compact: false,
      };
    }

    return {
      eyebrow: t(copy.eyebrowKey),
      text: t(copy.titleKey, { name: userName }),
      subtitle: t(copy.subtitleKey),
      emoji: copy.emoji,
      compact: false,
    };
  }, [currentLocale, section, t, userName]);
  const isDashboard = section === "dashboard";
  const heading = title || (isDashboard ? headerCopy.text : headerCopy.eyebrow);
  const resolvedSubtitle = subtitle || headerCopy.subtitle;

  const renderTitle = (titleText: string, emoji: string) => {
    if (!isDashboard) {
      return (
        <h1 className="font-semibold text-2xl text-foreground tracking-[-0.025em] md:text-[28px]">
          {titleText}
        </h1>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 font-medium text-[11px] text-emerald-700 dark:text-emerald-400">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Cabinet actif
          </span>
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-muted-foreground text-xs capitalize">
            {headerCopy.eyebrow}
          </span>
        </div>
        <h1 className="flex flex-wrap items-center gap-2.5 font-semibold text-2xl text-foreground tracking-tight md:text-3xl">
          <span>{titleText}</span>
          <span aria-hidden="true" className="shrink-0 text-[1em]">
            {emoji}
          </span>
        </h1>
      </div>
    );
  };

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-[1_1_320px] space-y-1">
          {renderTitle(heading, headerCopy.emoji)}
          {resolvedSubtitle && (
            <p className="max-w-[70ch] text-muted-foreground text-sm leading-relaxed">
              {resolvedSubtitle}
            </p>
          )}
        </div>
        {onNavigate && (
          <div className="flex shrink-0 items-center gap-2">
            {dashboardViewControl}
            {onCustomize ? (
              <Button
                aria-label="Personnaliser le tableau de bord"
                aria-pressed={isCustomizing}
                className="size-10 rounded-full bg-background/65 p-0 shadow-sm backdrop-blur-md"
                disabled={isCustomizing}
                onClick={onCustomize}
                title="Personnaliser le tableau de bord"
                variant="outline"
              >
                <HugeiconsIcon
                  className="size-[18px]"
                  icon={DashboardSquareEditIcon}
                  strokeWidth={1.6}
                />
              </Button>
            ) : null}
            <Button
              className="h-10 min-w-0 flex-1 rounded-full px-5 sm:w-auto sm:flex-none"
              onClick={() => onNavigate("clinique")}
            >
              <HugeiconsIcon
                data-icon="inline-start"
                icon={StethoscopeIcon}
                strokeWidth={1.5}
              />
              Nouvelle consultation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MotivationalHeader;
