import { useLayoutEffect, useRef, useState } from "react";

/** Keep the complete amount and currency together, fitting the available card width. */
export function FittedAmount({ value, className, maxFontSize = 34 }: {
  value: string;
  className?: string;
  maxFontSize?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const context = document.createElement("canvas").getContext("2d");
    if (!context) return;
    const fit = () => {
      const style = getComputedStyle(element);
      const width = element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 8;
      if (width <= 0) return;
      context.font = `${style.fontWeight} ${maxFontSize}px ${style.fontFamily}`;
      const measured = context.measureText(value).width;
      setFontSize(Math.min(maxFontSize, Math.floor(width / Math.max(1, measured) * maxFontSize)));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    let cancelled = false;
    void document.fonts.ready.then(() => { if (!cancelled) fit(); });
    return () => { cancelled = true; observer.disconnect(); };
  }, [value, maxFontSize]);
  return <span ref={ref} className={className} style={{ display: "block", width: "100%", fontSize }} title={value}>{value}</span>;
}
