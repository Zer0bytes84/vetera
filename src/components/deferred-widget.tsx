import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DeferredWidgetProps {
  children: React.ReactNode;
  className?: string;
  fallback?: React.ReactNode;
  minHeight?: number;
}

export function DeferredWidget({
  children,
  fallback,
  minHeight = 300,
  className,
}: DeferredWidgetProps) {
  const [isVisible, setIsVisible] = useState(
    () => typeof IntersectionObserver === "undefined"
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" } // Load a bit before it enters the viewport
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  if (isVisible) {
    return <div className={cn("w-full", className)}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "w-full animate-pulse rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/30",
        className
      )}
      ref={ref}
      style={{ minHeight }}
    >
      {fallback}
    </div>
  );
}
