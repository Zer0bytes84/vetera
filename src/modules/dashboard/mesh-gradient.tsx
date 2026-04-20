"use client"

import { cn } from "@/lib/utils"

interface MeshGradientProps {
  className?: string
}

export function MeshGradient({ className }: MeshGradientProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden -z-10", className)}>
      {/* Base gradient - subtle overall */}
      <div
        className="absolute inset-0 bg-gradient-to-l from-orange-50/40 via-transparent to-transparent dark:from-orange-950/10 dark:via-transparent"
      />

      {/* Right side mesh blobs only */}
      <div className="absolute inset-0">
        {/* Blob 1 - Orange - Right side */}
        <div
          className="absolute top-[10%] -right-[10%] w-[50%] h-[60%] rounded-full blur-[100px] animate-pulse"
          style={{
            background: "radial-gradient(circle, rgba(249, 115, 22, 0.12) 0%, transparent 70%)",
            animationDuration: "10s"
          }}
        />

        {/* Blob 2 - Amber - Right side lower */}
        <div
          className="absolute bottom-[20%] -right-[5%] w-[40%] h-[50%] rounded-full blur-[90px] animate-pulse"
          style={{
            background: "radial-gradient(circle, rgba(245, 158, 11, 0.10) 0%, transparent 70%)",
            animationDuration: "12s",
            animationDelay: "3s"
          }}
        />

        {/* Blob 3 - Red-Orange - Far right */}
        <div
          className="absolute top-[50%] right-0 w-[30%] h-[40%] rounded-full blur-[80px] animate-pulse"
          style={{
            background: "radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, transparent 70%)",
            animationDuration: "14s",
            animationDelay: "5s"
          }}
        />
      </div>

      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.01]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}

// Alternative: Static gradient for better performance
export function StaticMeshGradient({ className }: MeshGradientProps) {
  return (
    <div className={cn("absolute inset-0 -z-10", className)}>
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(at 0% 0%, rgba(249, 115, 22, 0.15) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(245, 158, 11, 0.1) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(239, 68, 68, 0.1) 0px, transparent 50%),
            radial-gradient(at 0% 100%, rgba(249, 115, 22, 0.08) 0px, transparent 50%),
            linear-gradient(to bottom right, rgba(255, 247, 237, 0.8), rgba(255, 255, 255, 0.9))
          `
        }}
      />
    </div>
  )
}
