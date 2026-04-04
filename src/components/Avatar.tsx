import React from "react"
import { Dog, Cat, Bird, Fish, Rabbit, Turtle, PawPrint } from "lucide-react"

import {
  Avatar as ShadAvatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export type AvatarSize = "sm" | "md" | "lg" | "xl" | "2xl"

interface AvatarProps {
  src?: string
  name: string
  size?: AvatarSize
  className?: string
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
}

const SIZE_MAP: Record<AvatarSize, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
  xl: "size-20",
  "2xl": "size-32",
}

const getInitials = (name: string) => {
  if (!name) return "?"
  const parts = name.split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "md",
  className,
}) => {
  const sizeClass = SIZE_MAP[size]

  if (src && (src.startsWith("http") || src.startsWith("data:"))) {
    return (
      <ShadAvatar className={cn(sizeClass, className)}>
        <AvatarImage src={src} alt={name} />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </ShadAvatar>
    )
  }

  if (src && src.startsWith("gradient:")) {
    const gradientClass = src.replace("gradient:", "")
    const initials = getInitials(name)

    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-bold text-white",
          `bg-gradient-to-br ${gradientClass}`,
          sizeClass,
          className
        )}
      >
        {initials}
      </div>
    )
  }

  if (src && src.startsWith("animal:")) {
    const animalKey = src.split(":")[1]
    const config = ANIMAL_ICONS[animalKey] || ANIMAL_ICONS.paw
    const Icon = config.icon

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
    )
  }

  return (
    <ShadAvatar className={cn(sizeClass, className)}>
      <AvatarFallback
        className={cn(
          "font-bold",
          size === "sm"
            ? "text-xs"
            : size === "md"
              ? "text-sm"
              : size === "lg"
                ? "text-base"
                : size === "xl"
                  ? "text-2xl"
                  : "text-4xl"
        )}
      >
        {getInitials(name)}
      </AvatarFallback>
    </ShadAvatar>
  )
}

export default Avatar
