import type { ReactNode } from "react";
import { EmptyMedia } from "@/components/ui/empty";
import { Mascot } from "./mascot";
import { useMascotPreferences } from "@/hooks/use-mascot-preferences";

/**
 * The media of an empty state: the clinic's mascot, still, in place of an
 * icon. A clinic that chose the logo over a mascot keeps the icon.
 */
export function EmptyMascot({ icon }: { icon: ReactNode }) {
  const { mode } = useMascotPreferences();
  if (mode === "logo") return <EmptyMedia variant="icon">{icon}</EmptyMedia>;
  return (
    <EmptyMedia>
      <Mascot animated={false} fallbackToLogo={false} size={64} />
    </EmptyMedia>
  );
}
