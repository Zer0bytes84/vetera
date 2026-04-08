import React, { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
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
  const { currentUser } = useAuth()
  const userName = currentUser?.displayName?.split(" ")[0] || "Docteur"

  const headerCopy = useMemo(() => {
    switch (section) {
      case "dashboard": {
        const today = new Intl.DateTimeFormat("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date())
        return { eyebrow: today, text: `Bonjour ${userName}`, emoji: "👋", compact: false }
      }
      case "agenda":
        return {
          eyebrow: "Agenda",
          text: `Organisation au top, ${userName}.`,
          emoji: "🗓️",
          compact: false,
        }
      case "clinique":
        return {
          eyebrow: "Clinique",
          text: `Le flux clinique reste parfaitement cadré.`,
          emoji: "🩺",
          compact: false,
        }
      case "patients":
        return {
          eyebrow: "Patients",
          text: `Les dossiers sont prêts pour la consultation.`,
          emoji: "🐾",
          compact: false,
        }
      case "stock":
        return {
          eyebrow: "Produits",
          text: `Les mouvements et les seuils restent sous contrôle.`,
          emoji: "📦",
          compact: false,
        }
      case "finances":
        return {
          eyebrow: "Finances",
          text: `La trésorerie reste sous contrôle.`,
          emoji: "💳",
          compact: false,
        }
      case "equipe":
        return {
          eyebrow: "Equipe",
          text: `L'équipe avance avec une charge bien répartie.`,
          emoji: "👥",
          compact: false,
        }
      case "notes":
        return {
          eyebrow: "Notes",
          text: `Centralisez les informations importantes.`,
          emoji: "📝",
          compact: false,
        }
      case "taches":
        return {
          eyebrow: "Taches",
          text: `Gardez le cap sur les priorités.`,
          emoji: "⏰",
          compact: false,
        }
      case "parametres":
        return {
          eyebrow: "Configuration",
          text: `Ajustez l'application à votre pratique.`,
          emoji: "🎛️",
          compact: false,
        }
      default:
        return { eyebrow: "Vue", text: `Bonjour ${userName}.`, emoji: "✨", compact: false }
    }
  }, [section, userName])

  const heading = title || headerCopy.text

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
        {subtitle && (
          <p className="max-w-[60ch] text-sm leading-6 text-[var(--text-muted)]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

export default MotivationalHeader
