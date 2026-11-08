import { Segmented } from "@/components/ui/segmented-control";
import { SettingsRow } from "@/components/settings-section";
import { useDashboardVersion } from "../hooks/use-dashboard-version";

/** One row of the « Tableau de bord » section of Paramètres: which dashboard opens by default. */
export function DashboardVersionSetting() {
  const { version, setVersion } = useDashboardVersion();
  return (
    <SettingsRow
      detail="La vue d’ensemble est proposée par défaut. La journée clinique regroupe les prises en charge et les actions."
      title="Tableau de bord"
    >
      <Segmented<"analytics" | "clinical">
        label="Version du tableau de bord"
        onValueChange={(next) => { void setVersion(next); }}
        options={[
          { value: "analytics", label: "Vue d’ensemble" },
          { value: "clinical", label: "Journée clinique" },
        ]}
        value={version}
      />
    </SettingsRow>
  );
}
