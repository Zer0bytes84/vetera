import { PawPrint } from "lucide-react";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { SettingsRow, SettingsSection } from "@/components/settings-section";
import { Switch } from "@/components/ui/choice-controls";
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
    <SettingsSection
      aside={
        <div className="mascot-settings-preview mascot-greeting-target">
          {preferences.mode === "mascot" ? (
            <MascotAvatar animal={preferences.animal} animated={preferences.animated} overflow size={56} />
          ) : <Logo collapsed size="lg" variant="refined" />}
        </div>
      }
      className="mascot-settings"
      icon={PawPrint}
      subtitle="Choisissez le compagnon qui vous accueille dans la barre latérale. Réglage propre à ce poste."
      title="Votre petit compagnon"
    >
      <MascotChoices />
      <SettingsRow
        detail="Ses yeux suivent la souris, il cligne, respire et change d’humeur. Immobile si le système demande de réduire les animations."
        detailId="mascot-animation-detail"
        htmlFor="mascot-animation"
        title="Donner vie au compagnon"
      >
        <Switch
          aria-describedby="mascot-animation-detail"
          checked={preferences.animated}
          disabled={preferences.mode === "logo"}
          id="mascot-animation"
          onCheckedChange={animated => update({ animated })}
        />
      </SettingsRow>
    </SettingsSection>
  );
}
