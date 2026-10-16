import Logo from "@/components/Logo";
import { MascotAvatar, type MascotMood } from "@/components/mascot/mascot-avatar";
import { useMascotPreferences } from "@/hooks/use-mascot-preferences";

/** The same brand portrait and preferences as SidebarBrand. */
export function AssistantBrandAvatar({
  size = 38,
  mood = "idle",
}: {
  size?: number;
  mood?: MascotMood;
}) {
  const preferences = useMascotPreferences();
  if (preferences.mode === "mascot") {
    return (
      <MascotAvatar
        animal={preferences.animal}
        animated={preferences.animated}
        framing="portrait"
        mood={mood}
        size={size}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-border/70 bg-background shadow-xs overflow-hidden"
      style={{ width: size, height: size }}
    >
      <Logo collapsed variant="refined" className="scale-75" />
    </div>
  );
}
