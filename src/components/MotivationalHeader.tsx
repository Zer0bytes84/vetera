import React, { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useAuth } from "../contexts/AuthContext"

interface MotivationalHeaderProps {
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
    | "parametres"
  title: string
  subtitle: string
}

const MotivationalHeader: React.FC<MotivationalHeaderProps> = ({
  section,
  title,
  subtitle,
}) => {
  const { t, i18n } = useTranslation()
  const { currentUser } = useAuth()
  const userName = currentUser?.displayName?.split(" ")[0] || "Docteur"
  const currentLocale = i18n.language.startsWith("ar")
    ? "ar"
    : i18n.language.startsWith("en")
      ? "en-US"
      : i18n.language.startsWith("es")
        ? "es-ES"
        : i18n.language.startsWith("pt")
          ? "pt-PT"
          : i18n.language.startsWith("de")
            ? "de-DE"
            : "fr-FR"

  const headerCopy = useMemo(() => {
    const sectionCopy: Record<
      MotivationalHeaderProps["section"],
      {
        eyebrowKey: string
        titleKey: string
        subtitleKey: string
        emoji: string
      }
    > = {
      dashboard: {
        eyebrowKey: "motivation.dashboard.eyebrow",
        titleKey: "motivation.dashboard.title",
        subtitleKey: "motivation.dashboard.subtitle",
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
    }

    if (section === "dashboard") {
      const today = new Intl.DateTimeFormat(currentLocale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date())
      return {
        eyebrow: today,
        text: t(sectionCopy.dashboard.titleKey, { name: userName }),
        subtitle: t(sectionCopy.dashboard.subtitleKey),
        emoji: sectionCopy.dashboard.emoji,
        compact: false,
      }
    }

    const copy = sectionCopy[section]
    if (!copy) {
      return {
        eyebrow: t("motivation.default.eyebrow"),
        text: t("motivation.default.title", { name: userName }),
        subtitle: t("motivation.default.subtitle"),
        emoji: "✨",
        compact: false,
      }
    }

    return {
      eyebrow: t(copy.eyebrowKey),
      text: t(copy.titleKey, { name: userName }),
      subtitle: t(copy.subtitleKey),
      emoji: copy.emoji,
      compact: false,
    }
  }, [currentLocale, section, t, userName])
  const heading = headerCopy.text || title
  const resolvedSubtitle = subtitle || headerCopy.subtitle

  return (
    <div className="flex flex-col gap-1.5 lg:gap-2">
      {headerCopy.eyebrow && (
        <span className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground/80 uppercase">
          {headerCopy.eyebrow}
        </span>
      )}
      <div className="space-y-1">
        <h1 className="flex items-center gap-3 text-[2rem] font-medium tracking-[-0.06em] text-foreground lg:text-[2.4rem]">
          <span>{heading}</span>
          <span aria-hidden="true" className="shrink-0 text-[0.92em]">
            {headerCopy.emoji}
          </span>
        </h1>
        {resolvedSubtitle && (
          <p className="max-w-[60ch] text-sm leading-6 text-[var(--text-muted)]">
            {resolvedSubtitle}
          </p>
        )}
      </div>
    </div>
  )
}

export default MotivationalHeader
