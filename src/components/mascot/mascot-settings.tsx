import { toast } from "sonner";
import Logo from "@/components/Logo";
import { Switch } from "@/components/ui/switch";
import { useMascotPreferences } from "@/hooks/use-mascot-preferences";
import { saveMascotPreferences, type MascotPreferences } from "@/lib/mascot-preferences";
import { MascotAvatar } from "./mascot-avatar";
import { MascotChoices } from "./mascot-choices";

export function MascotSettings() {
  const preferences = useMascotPreferences();
  const update = (next: Partial<MascotPreferences>) => {
    if (!saveMascotPreferences({ ...preferences, ...next })) {
      toast.error("Le choix n’a pas pu être enregistré sur cet appareil. Réessayez.");
    }
  };
  return (
    <section className="settings-panel mascot-settings" aria-labelledby="mascot-settings-title">
      <div className="mascot-settings-intro">
        <div>
          <span className="mascot-settings-eyebrow">VOTRE PETIT COMPAGNON</span>
          <h3 id="mascot-settings-title">Une petite présence, à votre image.</h3>
          <p>Choisissez la peluche qui vous accueille dans la barre latérale.</p>
        </div>
        <div className="mascot-settings-preview mascot-greeting-target">
          {preferences.mode === "mascot" ? (
            <MascotAvatar animal={preferences.animal} animated={preferences.animated} size={100} />
          ) : <Logo collapsed size="2xl" variant="refined" />}
        </div>
      </div>
      <MascotChoices />
      <div className="settings-row">
        <div>
          <label className="settings-row-title cursor-pointer" htmlFor="mascot-animation">Donner vie à la peluche</label>
          <p className="settings-row-detail" id="mascot-animation-detail">Un clignement, une respiration et un portrait qui réagit à la souris.</p>
        </div>
        <Switch
          aria-describedby="mascot-animation-detail"
          checked={preferences.animated}
          disabled={preferences.mode === "logo"}
          id="mascot-animation"
          onCheckedChange={animated => update({ animated })}
        />
      </div>
    </section>
  );
}
