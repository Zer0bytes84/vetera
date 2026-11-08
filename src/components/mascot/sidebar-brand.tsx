import { useState } from "react";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useMascotPreferences } from "@/hooks/use-mascot-preferences";
import { saveMascotPreferences } from "@/lib/mascot-preferences";
import { MascotAvatar } from "./mascot-avatar";
import { MascotChoices } from "./mascot-choices";

export function SidebarBrand({ collapsed, onHome }: { collapsed: boolean; onHome: () => void }) {
  const preferences = useMascotPreferences();
  const [open, setOpen] = useState(false);
  const withMascot = preferences.mode === "mascot";
  return (
    <div className="sidebar-brand" data-collapsed={collapsed ? "true" : "false"}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label="Changer de compagnon"
          className="sidebar-mascot-circle mascot-greeting-target"
          data-sidebar-brand={withMascot ? "mascot" : "logo"}
          title="Choisir mon compagnon"
        >
          {withMascot ? (
            // Drawn larger than its box: the box keeps the header's layout, the
            // ears leave the circle above it. Folded into icons, it stays inside.
            <MascotAvatar
              animal={preferences.animal}
              animated={preferences.animated}
              className="sidebar-mascot"
              overflow={!collapsed}
              size={collapsed ? 44 : 68}
            />
          ) : (
            <Logo collapsed variant="refined" />
          )}
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={10} className="mascot-picker">
          <div className="mascot-picker-heading">
            <PopoverTitle>Votre petit compagnon</PopoverTitle>
            <PopoverDescription>Une présence qui vous ressemble.</PopoverDescription>
          </div>
          <MascotChoices compact onSelect={() => setOpen(false)} />
          <div className="mascot-picker-motion">
            <label htmlFor="sidebar-mascot-animation">Animations discrètes</label>
            <Switch
              id="sidebar-mascot-animation"
              checked={preferences.animated}
              disabled={!withMascot}
              onCheckedChange={animated => {
                if (!saveMascotPreferences({ ...preferences, animated })) toast.error("Le réglage n’a pas pu être enregistré. Réessayez.");
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
      {!collapsed && <button type="button" aria-label="Tableau de bord Baitari" className="sidebar-brand-home" onClick={onHome}><span aria-hidden="true" className="sidebar-brand-wordmark">b<span className="sidebar-brand-ai">AI</span>tari</span></button>}
    </div>
  );
}
