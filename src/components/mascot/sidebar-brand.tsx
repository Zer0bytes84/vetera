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
          {withMascot ? <MascotAvatar animal={preferences.animal} animated={preferences.animated} framing="portrait" size={collapsed ? 42 : 56} /> : <Logo collapsed variant="refined" />}
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
      {!collapsed && <button type="button" aria-label="Tableau de bord Baitari" className="sidebar-brand-home" onClick={onHome}><span className="sidebar-brand-wordmark">Baitari</span></button>}
    </div>
  );
}
