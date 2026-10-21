import { APP_THEMES, type AppTheme } from "@/lib/theme-skin";
import { cn } from "@/lib/utils";

/** A miniature of each theme's sheet, sidebar and rows, so the three read apart. */
const PREVIEWS: Record<AppTheme, { frame: string; sheet: string; line: string; ink: string; row: string }> = {
  "premium-light": { frame: "#efefef", sheet: "#f5f5f5", line: "#dcdcdc", ink: "#292929", row: "#ffffff" },
  "premium-dark": { frame: "#151515", sheet: "#1e1e1e", line: "#303030", ink: "#eeeeee", row: "#262626" },
  clean: { frame: "#fafafa", sheet: "#ffffff", line: "#ebebeb", ink: "#292929", row: "#f0f0f0" },
};

export function AppThemePicker({
  value,
  onChange,
}: {
  value: AppTheme;
  onChange: (theme: AppTheme) => void;
}) {
  return (
    <div aria-label="Thème" className="app-theme-picker" role="radiogroup">
      {APP_THEMES.map((theme) => {
        const preview = PREVIEWS[theme.id];
        const checked = value === theme.id;
        return (
          <button
            aria-checked={checked}
            className={cn("app-theme-option", checked && "app-theme-option-active")}
            data-theme-option={theme.id}
            key={theme.id}
            onClick={() => onChange(theme.id)}
            role="radio"
            type="button"
          >
            <span aria-hidden="true" className="app-theme-preview" style={{ background: preview.frame }}>
              <span className="app-theme-preview-nav" style={{ background: preview.frame, borderColor: preview.line }}>
                <i style={{ background: preview.ink }} />
                <i style={{ background: preview.line }} />
                <i style={{ background: preview.line }} />
              </span>
              <span className="app-theme-preview-sheet" style={{ background: preview.sheet, borderColor: preview.line }}>
                <i style={{ background: preview.ink }} />
                <i style={{ background: preview.row }} />
                <i style={{ background: preview.line }} />
              </span>
            </span>
            <span className="app-theme-label">{theme.label}</span>
            <span className="app-theme-description">{theme.description}</span>
          </button>
        );
      })}
    </div>
  );
}
