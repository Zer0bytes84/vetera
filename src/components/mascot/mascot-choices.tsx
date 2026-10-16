import { toast } from "sonner";
import Logo from "@/components/Logo";
import { useMascotPreferences } from "@/hooks/use-mascot-preferences";
import {
  type MascotPreferences,
  saveMascotPreferences,
} from "@/lib/mascot-preferences";
import { MASCOT_ASSETS, NEW_3D_MASCOTS } from "./mascot-assets";
import { MascotAvatar } from "./mascot-avatar";

export function MascotChoices({
  compact = false,
  onSelect,
}: {
  compact?: boolean;
  onSelect?: () => void;
}) {
  const preferences = useMascotPreferences();

  const choose = (next: Partial<MascotPreferences>) => {
    if (saveMascotPreferences({ ...preferences, ...next })) {
      onSelect?.();
    } else {
      toast.error(
        "Le choix n’a pas pu être enregistré sur cet appareil. Réessayez."
      );
    }
  };

  return (
    <div
      className="mascot-choices-container"
      role="group"
      aria-label="Choix de la mascotte ou du logo"
    >
      {/* Grid of choices */}
      <div className="mascot-choices" data-compact={compact ? "true" : "false"}>
        {NEW_3D_MASCOTS.map((animal) => {
          const selected =
            preferences.mode === "mascot" && preferences.animal === animal;
          return (
            <button
              aria-label={`Choisir le compagnon ${MASCOT_ASSETS[animal].label.toLowerCase()}`}
              aria-pressed={selected}
              className="mascot-choice mascot-greeting-target"
              data-selected={selected ? "true" : "false"}
              key={animal}
              onClick={() => choose({ mode: "mascot", animal })}
              type="button"
            >
              <MascotAvatar
                animal={animal}
                animated={preferences.animated}
                idle={false}
                size={compact ? 54 : 64}
              />
              <span>{MASCOT_ASSETS[animal].label}</span>
              <span className="mascot-choice-check" aria-hidden="true">
                {selected ? "✓" : ""}
              </span>
            </button>
          );
        })}

        {/* Logo classique */}
        <button
          aria-label="Revenir au logo classique"
          aria-pressed={preferences.mode === "logo"}
          className="mascot-choice mascot-choice-logo"
          data-selected={preferences.mode === "logo" ? "true" : "false"}
          onClick={() => choose({ mode: "logo" })}
          type="button"
        >
          <span className="mascot-classic-mark">
            <Logo collapsed variant="refined" />
          </span>
          <span>Logo classique</span>
          <span className="mascot-choice-check" aria-hidden="true">
            {preferences.mode === "logo" ? "✓" : ""}
          </span>
        </button>
      </div>
    </div>
  );
}
