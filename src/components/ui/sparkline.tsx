"use client"

import { cn } from "@/lib/utils"

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
  fillOpacity?: number
  className?: string
}

export function Sparkline({
  data,
  width = 80,
  height = 32,
  color = "hsl(var(--primary))",
  strokeWidth = 2,
  fillOpacity = 0.2,
  className,
}: SparklineProps) {
  if (data.length < 2) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  // Calculate points
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * (height - 4) - 2 // padding
    return { x, y }
  })

  // Create path
  const pathD = points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`
      const prev = points[index - 1]
      const cp1x = prev.x + (point.x - prev.x) / 2
      const cp2x = prev.x + (point.x - prev.x) / 2
      return `C ${cp1x} ${prev.y}, ${cp2x} ${point.y}, ${point.x} ${point.y}`
    })
    .join(" ")

  // Create fill path (close the shape)
  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0", className)}
      style={{ width, height }}
    >
      <defs>
        <linearGradient id={`gradient-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={fillD}
        fill={`url(#gradient-${color.replace(/[^a-z0-9]/gi, "")})`}
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
