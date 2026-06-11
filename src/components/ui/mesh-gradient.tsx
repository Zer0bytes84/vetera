import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const MeshGradient = ({ className, children }: { className?: string, children?: React.ReactNode }) => {
  return (
    <div className={cn("relative w-full h-full overflow-hidden bg-background", className)}>
      {/* Noise Overlay */}
      <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-30 mix-blend-overlay dark:opacity-20">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
      
      {/* Gradient Blobs */}
      <div className="absolute inset-0 z-0 opacity-70 dark:opacity-30 blur-[100px] saturate-150">
        {/* Blob 1 - Primary (Emerald/Teal) */}
        <motion.div
          animate={{
            x: ["0%", "15%", "-15%", "0%"],
            y: ["0%", "-15%", "15%", "0%"],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] h-[60vh] w-[60vw] rounded-full bg-primary/50 mix-blend-multiply dark:mix-blend-screen"
        />
        {/* Blob 2 - Blue */}
        <motion.div
          animate={{
            x: ["0%", "-20%", "20%", "0%"],
            y: ["0%", "20%", "-20%", "0%"],
            scale: [1, 0.9, 1.2, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] right-[5%] h-[60vh] w-[50vw] rounded-full bg-blue-500/40 mix-blend-multiply dark:mix-blend-screen"
        />
        {/* Blob 3 - Light Green / Yellowish */}
        <motion.div
          animate={{
            x: ["0%", "25%", "-10%", "0%"],
            y: ["0%", "10%", "-25%", "0%"],
            scale: [1, 1.2, 0.8, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] left-[10%] h-[70vh] w-[70vw] rounded-full bg-emerald-300/40 mix-blend-multiply dark:bg-emerald-700/40 dark:mix-blend-screen"
        />
        {/* Blob 4 - Purple / Pink accent */}
        <motion.div
          animate={{
            x: ["0%", "-10%", "25%", "0%"],
            y: ["0%", "-25%", "10%", "0%"],
            scale: [1, 0.8, 1.1, 1],
          }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[5%] right-[10%] h-[50vh] w-[50vw] rounded-full bg-purple-400/30 mix-blend-multiply dark:bg-purple-600/30 dark:mix-blend-screen"
        />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 flex h-full w-full items-center justify-center">
        {children}
      </div>
    </div>
  );
};
