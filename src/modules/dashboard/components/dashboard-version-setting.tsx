import { useDashboardVersion } from "../hooks/use-dashboard-version";
export function DashboardVersionSetting() {
  const { version, setVersion } = useDashboardVersion();
  return <div className="settings-row"><div><p className="settings-row-title">Tableau de bord</p><p className="settings-row-detail">La vue d’ensemble est proposée par défaut. La journée clinique regroupe les prises en charge et les actions.</p></div><select aria-label="Version du tableau de bord" value={version} onChange={event => { void setVersion(event.target.value as "clinical" | "analytics"); }} className="h-9 rounded-control border border-hairline bg-surface px-3 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><option value="analytics">Vue d’ensemble</option><option value="clinical">Journée clinique</option></select></div>;
}
