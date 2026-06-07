import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface DeferredWidgetProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: number;
  className?: string;
}

export function DeferredWidget({
  children,
  fallback,
  minHeight = 300,
  className,
}: DeferredWidgetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
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
      ref={ref}
      style={{ minHeight }}
      className={cn(
        "w-full rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/30 animate-pulse",
        className
      )}
    >
      {fallback}
    </div>
  );
}
