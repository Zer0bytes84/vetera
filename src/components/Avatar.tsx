import { Bird, Cat, Dog, Fish, PawPrint, Rabbit, Turtle } from "lucide-react";
import type React from "react";
import { useState } from "react";

import {
  AvatarFallback,
  AvatarImage,
  Avatar as ShadAvatar,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type AvatarSize = "sm" | "md" | "lg" | "xl" | "2xl";

interface AvatarProps {
  className?: string;
  name: string;
  size?: AvatarSize;
  src?: string;
}

const ANIMAL_ICONS: Record<
  string,
  { icon: React.ElementType; bg: string; text: string }
> = {
  dog: {
    icon: Dog,
    bg: "bg-orange-100 dark:bg-orange-500/20",
    text: "text-orange-600 dark:text-orange-400",
  },
  cat: {
    icon: Cat,
    bg: "bg-blue-100 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
  },
  bird: {
    icon: Bird,
    bg: "bg-sky-100 dark:bg-sky-500/20",
    text: "text-sky-600 dark:text-sky-400",
  },
  fish: {
    icon: Fish,
    bg: "bg-cyan-100 dark:bg-cyan-500/20",
    text: "text-cyan-600 dark:text-cyan-400",
  },
  rabbit: {
    icon: Rabbit,
    bg: "bg-pink-100 dark:bg-pink-500/20",
    text: "text-pink-600 dark:text-pink-400",
  },
  turtle: {
    icon: Turtle,
    bg: "bg-green-100 dark:bg-green-500/20",
    text: "text-green-600 dark:text-green-400",
  },
  paw: {
    icon: PawPrint,
    bg: "bg-purple-100 dark:bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
  },
};

const SIZE_MAP: Record<AvatarSize, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
  xl: "size-20",
  "2xl": "size-32",
};

const EMOJI_SIZE_MAP: Record<AvatarSize, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-4xl",
  "2xl": "text-6xl",
};

export const PROFILE_AVATAR_EMOJIS = [
  "🩺",
  "🐾",
  "🐶",
  "🐱",
  "🦊",
  "🐰",
  "🦉",
  "🐢",
  "🌿",
  "✨",
] as const;

const PIXEL_SIZE_MAP: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 80,
  "2xl": 128,
};

const normalizeAvatarSrc = (src?: string | null) => {
  if (typeof src !== "string") {
    return "";
  }
  const value = src.trim();
  if (!value) {
    return "";
  }
  if (["undefined", "null", "nan"].includes(value.toLowerCase())) {
    return "";
  }
  return value;
};

const isRenderableAvatarSrc = (src: string) =>
  src.startsWith("http://") ||
  src.startsWith("https://") ||
  src.startsWith("data:") ||
  src.startsWith("blob:") ||
  src.startsWith("file://") ||
  src.startsWith("asset:") ||
  src.startsWith("tauri:") ||
  src.startsWith("/");

const normalizeName = (name?: string | null) => {
  if (typeof name !== "string") {
    return "Utilisateur";
  }
  const value = name.trim();
  if (!value || value.toLowerCase() === "undefined") {
    return "Utilisateur";
  }
  return value;
};

const getInitials = (name: string) => {
  if (!name) {
    return "?";
  }
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const getDefaultAvatarEmoji = (name: string) => {
  const safeName = normalizeName(name);
  const hash = Array.from(safeName).reduce(
    (total, character) =>
      (total * 31 + character.charCodeAt(0)) % 2_147_483_647,
    0
  );
  return PROFILE_AVATAR_EMOJIS[hash % PROFILE_AVATAR_EMOJIS.length];
};

function EmojiAvatar({
  className,
  emoji,
  name,
  size,
  sizeClass,
}: {
  className?: string;
  emoji: string;
  name: string;
  size: AvatarSize;
  sizeClass: string;
}) {
  return (
    <div
      aria-label={`Avatar de ${name}`}
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full border border-emerald-950/5 bg-[linear-gradient(145deg,rgba(236,253,245,0.98),rgba(239,246,255,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-white/12 dark:bg-[linear-gradient(145deg,rgba(16,185,129,0.16),rgba(14,165,233,0.10))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        EMOJI_SIZE_MAP[size],
        sizeClass,
        className
      )}
      role="img"
    >
      <span aria-hidden="true" className="leading-none">
        {emoji}
      </span>
    </div>
  );
}

function renderImageAvatar({
  className,
  normalizedSrc,
  onError,
  safeName,
  size,
  sizeClass,
}: {
  className?: string;
  normalizedSrc: string;
  onError: () => void;
  safeName: string;
  size: AvatarSize;
  sizeClass: string;
}) {
  const pixelSize = PIXEL_SIZE_MAP[size];

  return (
    <ShadAvatar className={cn("rounded-full bg-muted", sizeClass, className)}>
      <AvatarImage
        alt={safeName}
        draggable={false}
        height={pixelSize}
        onError={onError}
        src={normalizedSrc}
        width={pixelSize}
      />
      <AvatarFallback
        className={cn(
          "size-full rounded-full border border-emerald-950/5 bg-emerald-50 dark:border-white/12 dark:bg-emerald-500/10",
          EMOJI_SIZE_MAP[size]
        )}
      >
        {getDefaultAvatarEmoji(safeName)}
      </AvatarFallback>
    </ShadAvatar>
  );
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "md",
  className,
}) => {
  const sizeClass = SIZE_MAP[size];
  const safeName = normalizeName(name);
  const normalizedSrc = normalizeAvatarSrc(src);
  const [failedSrc, setFailedSrc] = useState("");
  const imageFailed = Boolean(normalizedSrc && failedSrc === normalizedSrc);

  if (normalizedSrc && isRenderableAvatarSrc(normalizedSrc) && !imageFailed) {
    return renderImageAvatar({
      className,
      normalizedSrc,
      onError: () => setFailedSrc(normalizedSrc),
      safeName,
      size,
      sizeClass,
    });
  }

  if (normalizedSrc?.startsWith("gradient:")) {
    const gradientClass = normalizedSrc.replace("gradient:", "");
    const initials = getInitials(safeName);

    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-semibold text-white",
          `bg-gradient-to-br ${gradientClass}`,
          sizeClass,
          className
        )}
      >
        {initials}
      </div>
    );
  }

  if (normalizedSrc?.startsWith("animal:")) {
    const animalKey = normalizedSrc.split(":")[1];
    const config = ANIMAL_ICONS[animalKey] || ANIMAL_ICONS.paw;
    const Icon = config.icon;

    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          config.bg,
          config.text,
          sizeClass,
          className
        )}
      >
        <Icon className="size-[60%]" strokeWidth={2} />
      </div>
    );
  }

  if (normalizedSrc?.startsWith("emoji:")) {
    const emoji = normalizedSrc.slice("emoji:".length).trim();
    return (
      <EmojiAvatar
        className={className}
        emoji={emoji || getDefaultAvatarEmoji(safeName)}
        name={safeName}
        size={size}
        sizeClass={sizeClass}
      />
    );
  }

  return (
    <EmojiAvatar
      className={className}
      emoji={getDefaultAvatarEmoji(safeName)}
      name={safeName}
      size={size}
      sizeClass={sizeClass}
    />
  );
};

export default Avatar;
