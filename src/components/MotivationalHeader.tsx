import {
  Calendar01Icon,
  CheckListIcon,
  DashboardSquareEditIcon,
  File01Icon,
  Hospital01Icon,
  PackageIcon,
  Settings02Icon,
  StethoscopeIcon,
  UserGroupIcon,
  Wallet01Icon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Stethoscope } from "lucide-react";
import { useIsPremium } from "@/modules/dashboard/v2/use-is-premium";
import React from "react";
import "./dashboard-greeting.css";
import { ShortcutTooltip } from "@/design-system/patterns/shortcut-tooltip";
import { prepareAppointment } from "@/modules/shell/model/clinical-actions";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { PageDate } from "@/components/PageDate";

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
  const isPremium = useIsPremium();
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

  const renderTitle = (titleText: string) => {
    const cleanTitle = titleText.replace(/\s*👋\s*$/, "");
    return (
      <div className="space-y-1">
        <PageDate />
        <h1 className="flex flex-wrap items-center gap-2.5 font-display font-semibold text-2xl text-foreground tracking-tight leading-tight">
          <span>{isDashboard && cleanTitle.includes(userName) ? <>{cleanTitle.slice(0, cleanTitle.indexOf(userName))}<span className="dashboard-greeting-name">{userName}</span>{cleanTitle.slice(cleanTitle.indexOf(userName) + userName.length)}</> : cleanTitle}</span>
          {isDashboard && <span className="dashboard-greeting-wave" aria-hidden="true">👋</span>}

        </h1>
      </div>
    );
  };

  if (isPremium && !isDashboard) {
    const iconBySection: Record<string, any> = {
      patients: StethoscopeIcon,
      agenda: Calendar01Icon,
      clinique: Hospital01Icon,
      stock: PackageIcon,
      finances: Wallet01Icon,
      equipe: UserGroupIcon,
      notes: File01Icon,
      taches: CheckListIcon,
      parametres: Settings02Icon,
    };
    const defaultMeta: Record<string, { title: string; note: string }> = {
      patients: {
        title: "Patients",
        note: "Dossiers médicaux, fiches cliniques et suivi des propriétaires.",
      },
      agenda: {
        title: "Agenda",
        note: "Planning des consultations, chirurgies et rendez-vous du cabinet.",
      },
      clinique: {
        title: "Espace Clinique",
        note: "Actes médicaux, prescriptions, examens et hospitalisations.",
      },
      stock: {
        title: "Pharmacie & Stock",
        note: "Gestion des médicaments, consommables et seuils d'alerte.",
      },
      finances: {
        title: "Finances & Facturation",
        note: "Encaissements, factures, devis et suivi des règlements.",
      },
      equipe: {
        title: "Équipe & Praticiens",
        note: "Gestion des vétérinaires, ASV et plannings du cabinet.",
      },
      notes: {
        title: "Documents & Notes",
        note: "Comptes-rendus, ordonnances types et modèles de documents.",
      },
      taches: {
        title: "Rappels & Tâches",
        note: "Vaccinations à échéance et actions de suivi clinique.",
      },
      parametres: {
        title: "Paramètres",
        note: "Configuration générale, préférences et personnalisation.",
      },
    };

    const sectionMeta = defaultMeta[section] ?? {
      title: heading,
      note: resolvedSubtitle || "",
    };
    const pageTitle = title || sectionMeta.title;
    const pageNote = subtitle || sectionMeta.note;
    const IconGlyph = iconBySection[section] ?? StethoscopeIcon;

    return (
      <div className="premium-page-head motivational-header-root">
        <div className="premium-page-head-main">
          <div className="premium-page-icon">
            <HugeiconsIcon icon={IconGlyph} size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="premium-page-title">{pageTitle}</h1>
            {pageNote && <p className="premium-page-note">{pageNote}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-[1_1_320px] space-y-1">
          {renderTitle(heading)}
          {resolvedSubtitle && (
            <p className="max-w-[70ch] text-muted-foreground text-sm leading-relaxed">
              {resolvedSubtitle}
            </p>
          )}
        </div>
        {onNavigate && (
          <div className="flex max-w-full flex-wrap items-center gap-2">
            {dashboardViewControl}
            {onCustomize ? (
              <Button
                aria-label="Personnaliser le tableau de bord"
                aria-pressed={isCustomizing}
                size="icon-sm"
                className="size-[30px] rounded-full bg-background/65 p-0"
                disabled={isCustomizing}
                onClick={onCustomize}
                title="Personnaliser le tableau de bord"
                variant="outline"
              >
                <HugeiconsIcon
                  className="size-[18px]"
                  icon={DashboardSquareEditIcon}
                  strokeWidth={1.5}
                />
              </Button>
            ) : null}
            <ShortcutTooltip label="Nouvelle consultation" shortcut="N">
              <Button
                data-primary-action="true"
                aria-keyshortcuts="N"
                className={isPremium ? "dashboard-primary-action h-9 w-auto min-w-0 flex-none rounded-lg px-3.5 text-[13px] font-medium" : "h-10 w-auto min-w-0 flex-none rounded-full px-5 text-sm"}
                onClick={() => {
                  prepareAppointment();
                  onNavigate("agenda");
                  setTimeout(
                    () =>
                      window.dispatchEvent(
                        new CustomEvent("vetera:new-appointment")
                      ),
                    150
                  );
                }}
              >
                {isPremium ? (
                  <Stethoscope
                    className="mr-1.5 size-4"
                    strokeWidth={1}
                    aria-hidden="true"
                  />
                ) : (
                  <HugeiconsIcon
                    data-icon="inline-start"
                    icon={StethoscopeIcon}
                    strokeWidth={1.5}
                  />
                )}
                Nouvelle consultation
              </Button>
            </ShortcutTooltip>
          </div>
        )}
      </div>
    </div>
  );
};

export default MotivationalHeader;
