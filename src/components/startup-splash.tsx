import Logo from "@/components/Logo";
import "./startup-splash.css";

/**
 * What the user sees while startup checks run: Baitari's mark alone on the
 * page ground, breathing slowly. Nothing appears for the first 300 ms, so a
 * quick start never flashes; the checks themselves are unchanged.
 */
export function StartupSplash() {
  return (
    <div className="startup-splash" role="status" aria-live="polite">
      <span className="startup-splash-mark" aria-hidden="true">
        <Logo collapsed variant="refined" />
      </span>
      <span className="sr-only">Chargement de Baitari</span>
    </div>
  );
}
