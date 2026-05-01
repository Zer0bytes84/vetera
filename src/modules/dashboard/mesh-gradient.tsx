"use client"

import { cn } from "@/lib/utils"

interface MeshGradientProps {
  className?: string
}

export function MeshGradient({ className }: MeshGradientProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden -z-10 pointer-events-none", className)}>
      {/* Base subtle background */}
      <div className="absolute inset-0 bg-background/50 backdrop-blur-3xl" />

      {/* Large animated blobs */}
      <div className="absolute inset-0 opacity-60 dark:opacity-40 mix-blend-soft-light dark:mix-blend-screen">
        {/* Blob 1 - Top Left - Violet/Indigo */}
        <div
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[70%] rounded-full blur-[120px] animate-pulse"
          style={{
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)",
            animationDuration: "15s",
            animationDirection: "alternate-reverse"
          }}
        />

        {/* Blob 2 - Bottom Right - Orange/Amber */}
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[70%] rounded-full blur-[120px] animate-pulse"
          style={{
            background: "radial-gradient(circle, rgba(249, 115, 22, 0.3) 0%, transparent 70%)",
            animationDuration: "20s",
            animationDelay: "2s",
            animationDirection: "alternate"
          }}
        />

        {/* Blob 3 - Center - Blue/Cyan */}
        <div
          className="absolute top-[20%] left-[20%] w-[50%] h-[60%] rounded-full blur-[100px] animate-pulse"
          style={{
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)",
            animationDuration: "18s",
            animationDelay: "5s",
            animationDirection: "alternate"
          }}
        />

        {/* Blob 4 - Top Right - Rose/Pink */}
        <div
          className="absolute top-[0%] right-[10%] w-[40%] h-[50%] rounded-full blur-[90px] animate-pulse"
          style={{
            background: "radial-gradient(circle, rgba(244, 63, 94, 0.25) 0%, transparent 70%)",
            animationDuration: "22s",
            animationDelay: "1s",
            animationDirection: "alternate-reverse"
          }}
        />
      </div>

      {/* Noise texture overlay for premium feel */}
      <div 
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}

// Alternative: Static gradient for better performance
export function StaticMeshGradient({ className }: MeshGradientProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden -z-10 pointer-events-none", className)}>
      <div className="absolute inset-0 bg-background/50 backdrop-blur-3xl" />
      <div
        className="absolute inset-0 opacity-50 dark:opacity-30 mix-blend-soft-light dark:mix-blend-screen"
        style={{
          background: `
            radial-gradient(circle at 0% 0%, rgba(139, 92, 246, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(249, 115, 22, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 100% 0%, rgba(244, 63, 94, 0.2) 0%, transparent 50%)
          `
        }}
      />
      <div 
        className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}
