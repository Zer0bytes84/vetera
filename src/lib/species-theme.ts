export type SpeciesType =
  | "dog"
  | "cat"
  | "rabbit"
  | "bird"
  | "turtle"
  | "fish"
  | "horse"
  | "other";

export interface SpeciesTheme {
  id: SpeciesType;
  label: string;
  accentHex: string;
  avatarBg: string;
  avatarBorder: string;
  avatarGlow: string;
  avatarIconColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardHighlight: string;
}

export function getSpeciesTheme(species?: string): SpeciesTheme {
  const normalized = (species || "").toLocaleLowerCase("fr-FR").trim();

  if (normalized.includes("chien") || normalized.includes("canin")) {
    return {
      id: "dog",
      label: "Chien",
      accentHex: "#d97706",
      avatarBg: "bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-amber-600/10 dark:from-amber-500/25 dark:via-orange-500/20 dark:to-amber-600/15",
      avatarBorder: "border-amber-500/30 dark:border-amber-500/40",
      avatarGlow: "shadow-[0_4px_20px_-2px_rgba(217,119,6,0.25)]",
      avatarIconColor: "text-amber-700 dark:text-amber-300",
      badgeBg: "bg-amber-50 dark:bg-amber-950/50",
      badgeText: "text-amber-800 dark:text-amber-300",
      badgeBorder: "border-amber-200 dark:border-amber-800/50",
      cardHighlight: "from-amber-500/10 via-amber-500/5 to-transparent",
    };
  }

  if (normalized.includes("chat") || normalized.includes("felin") || normalized.includes("félin")) {
    return {
      id: "cat",
      label: "Chat",
      accentHex: "#059669",
      avatarBg: "bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-emerald-600/10 dark:from-emerald-500/25 dark:via-teal-500/20 dark:to-emerald-600/15",
      avatarBorder: "border-emerald-500/30 dark:border-emerald-500/40",
      avatarGlow: "shadow-[0_4px_20px_-2px_rgba(5,150,105,0.25)]",
      avatarIconColor: "text-emerald-700 dark:text-emerald-300",
      badgeBg: "bg-emerald-50 dark:bg-emerald-950/50",
      badgeText: "text-emerald-800 dark:text-emerald-300",
      badgeBorder: "border-emerald-200 dark:border-emerald-800/50",
      cardHighlight: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    };
  }

  if (
    normalized.includes("lapin") ||
    normalized.includes("rongeur") ||
    normalized.includes("hamster") ||
    normalized.includes("furet") ||
    normalized.includes("cochon d'inde") ||
    normalized.includes("cobaye")
  ) {
    return {
      id: "rabbit",
      label: "Lapin & Rongeur",
      accentHex: "#7c3aed",
      avatarBg: "bg-gradient-to-br from-violet-500/20 via-purple-500/15 to-violet-600/10 dark:from-violet-500/25 dark:via-purple-500/20 dark:to-violet-600/15",
      avatarBorder: "border-violet-500/30 dark:border-violet-500/40",
      avatarGlow: "shadow-[0_4px_20px_-2px_rgba(124,58,237,0.25)]",
      avatarIconColor: "text-violet-700 dark:text-violet-300",
      badgeBg: "bg-violet-50 dark:bg-violet-950/50",
      badgeText: "text-violet-800 dark:text-violet-300",
      badgeBorder: "border-violet-200 dark:border-violet-800/50",
      cardHighlight: "from-violet-500/10 via-violet-500/5 to-transparent",
    };
  }

  if (normalized.includes("oiseau") || normalized.includes("perroquet") || normalized.includes("canari")) {
    return {
      id: "bird",
      label: "Oiseau",
      accentHex: "#0284c7",
      avatarBg: "bg-gradient-to-br from-sky-500/20 via-cyan-500/15 to-sky-600/10 dark:from-sky-500/25 dark:via-cyan-500/20 dark:to-sky-600/15",
      avatarBorder: "border-sky-500/30 dark:border-sky-500/40",
      avatarGlow: "shadow-[0_4px_20px_-2px_rgba(2,132,199,0.25)]",
      avatarIconColor: "text-sky-700 dark:text-sky-300",
      badgeBg: "bg-sky-50 dark:bg-sky-950/50",
      badgeText: "text-sky-800 dark:text-sky-300",
      badgeBorder: "border-sky-200 dark:border-sky-800/50",
      cardHighlight: "from-sky-500/10 via-sky-500/5 to-transparent",
    };
  }

  if (
    normalized.includes("tortue") ||
    normalized.includes("reptile") ||
    normalized.includes("serpent") ||
    normalized.includes("lezard") ||
    normalized.includes("lézard")
  ) {
    return {
      id: "turtle",
      label: "Reptile",
      accentHex: "#65a30d",
      avatarBg: "bg-gradient-to-br from-lime-500/20 via-emerald-500/15 to-lime-600/10 dark:from-lime-500/25 dark:via-emerald-500/20 dark:to-lime-600/15",
      avatarBorder: "border-lime-500/30 dark:border-lime-500/40",
      avatarGlow: "shadow-[0_4px_20px_-2px_rgba(101,163,13,0.25)]",
      avatarIconColor: "text-lime-700 dark:text-lime-300",
      badgeBg: "bg-lime-50 dark:bg-lime-950/50",
      badgeText: "text-lime-800 dark:text-lime-300",
      badgeBorder: "border-lime-200 dark:border-lime-800/50",
      cardHighlight: "from-lime-500/10 via-lime-500/5 to-transparent",
    };
  }

  if (normalized.includes("poisson") || normalized.includes("aquatique")) {
    return {
      id: "fish",
      label: "Poisson",
      accentHex: "#2563eb",
      avatarBg: "bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-blue-600/10 dark:from-blue-500/25 dark:via-indigo-500/20 dark:to-blue-600/15",
      avatarBorder: "border-blue-500/30 dark:border-blue-500/40",
      avatarGlow: "shadow-[0_4px_20px_-2px_rgba(37,99,235,0.25)]",
      avatarIconColor: "text-blue-700 dark:text-blue-300",
      badgeBg: "bg-blue-50 dark:bg-blue-950/50",
      badgeText: "text-blue-800 dark:text-blue-300",
      badgeBorder: "border-blue-200 dark:border-blue-800/50",
      cardHighlight: "from-blue-500/10 via-blue-500/5 to-transparent",
    };
  }

  if (normalized.includes("cheval") || normalized.includes("equin") || normalized.includes("équin")) {
    return {
      id: "horse",
      label: "Cheval",
      accentHex: "#ea580c",
      avatarBg: "bg-gradient-to-br from-orange-500/20 via-amber-500/15 to-orange-600/10 dark:from-orange-500/25 dark:via-amber-500/20 dark:to-orange-600/15",
      avatarBorder: "border-orange-500/30 dark:border-orange-500/40",
      avatarGlow: "shadow-[0_4px_20px_-2px_rgba(234,88,12,0.25)]",
      avatarIconColor: "text-orange-700 dark:text-orange-300",
      badgeBg: "bg-orange-50 dark:bg-orange-950/50",
      badgeText: "text-orange-800 dark:text-orange-300",
      badgeBorder: "border-orange-200 dark:border-orange-800/50",
      cardHighlight: "from-orange-500/10 via-orange-500/5 to-transparent",
    };
  }

  // Default / Autre animal
  return {
    id: "other",
    label: species || "Patient",
    accentHex: "#6366f1",
    avatarBg: "bg-gradient-to-br from-indigo-500/20 via-violet-500/15 to-indigo-600/10 dark:from-indigo-500/25 dark:via-violet-500/20 dark:to-indigo-600/15",
    avatarBorder: "border-indigo-500/30 dark:border-indigo-500/40",
    avatarGlow: "shadow-[0_4px_20px_-2px_rgba(99,102,241,0.25)]",
    avatarIconColor: "text-indigo-700 dark:text-indigo-300",
    badgeBg: "bg-indigo-50 dark:bg-indigo-950/50",
    badgeText: "text-indigo-800 dark:text-indigo-300",
    badgeBorder: "border-indigo-200 dark:border-indigo-800/50",
    cardHighlight: "from-indigo-500/10 via-indigo-500/5 to-transparent",
  };
}
