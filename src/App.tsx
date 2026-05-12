import { useEffect, useState } from "react";

import Auth from "@/components/Auth";
import SetupWizard from "@/components/SetupWizard";
import { useTheme } from "@/components/theme-provider";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { appSettingsRepository } from "@/data/repositories";
import i18n, { isRtlLanguage } from "@/i18n/config";
import { applyTheme, getThemeConfig } from "@/lib/theme-store";
import { AppShell } from "@/modules/shell/app-shell";
import { saveLicenseInfo } from "@/services/appSettingsService";
import { checkAutoBackup } from "@/services/backupService";
import { isTauriRuntime } from "@/services/browser-store";
import {
  purgeDemoDataInTauriIfNeeded,
  seedDemoDataIfNeeded,
} from "@/services/demo-data";
import { createInitialAdmin } from "@/services/sqlite/auth";
import { startAppUpdateCheck } from "@/services/updateService";

interface SetupPayload {
  email: string;
  licenseKey: string;
  name: string;
  password: string;
}

function isDatabaseLockedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("database is locked");
}

export function App() {
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);
  const { currentUser, loading, login } = useAuth();
  const { theme } = useTheme();

  // Once the auth context has finished its initial load AND the setup check
  // has finished, we consider the app "bootstrapped". From then on, even if
  // `loading` flips back to true (e.g. background refresh), we no longer
  // show the full-page skeleton — that prevents the flicker on Windows when
  // the WebView2 is minimized, moved or when focus changes.
  useEffect(() => {
    if (!(hasBootstrapped || isCheckingSetup || loading)) {
      setHasBootstrapped(true);
    }
  }, [hasBootstrapped, isCheckingSetup, loading]);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const setupDone = await appSettingsRepository.isSetupComplete();
        setNeedsSetup(!setupDone);
      } catch (error) {
        console.error("[App] Error checking setup status:", error);
        setNeedsSetup(true);
      } finally {
        setIsCheckingSetup(false);
      }
    };

    // Never block initial UI boot on maintenance tasks.
    // Setup check runs first so the app can leave the loading screen quickly.
    checkSetup();

    const purgeTimer = isTauriRuntime()
      ? window.setTimeout(() => {
          purgeDemoDataInTauriIfNeeded().catch((error) => {
            if (!isDatabaseLockedError(error)) {
              console.error("[App] Demo data purge failed:", error);
            }
          });
        }, 1500)
      : null;

    const maintenanceDelay = isTauriRuntime() ? 10_000 : 3000;
    const maintenanceTimer = window.setTimeout(() => {
      checkAutoBackup().catch((error) => {
        console.error("[App] Auto-backup check failed:", error);
      });

      startAppUpdateCheck().catch((error) => {
        if (!isDatabaseLockedError(error)) {
          console.error("[App] Update check failed:", error);
        }
      });
    }, maintenanceDelay);

    return () => {
      if (purgeTimer !== null) {
        window.clearTimeout(purgeTimer);
      }
      window.clearTimeout(maintenanceTimer);
    };
  }, []);

  useEffect(() => {
    if (isTauriRuntime()) {
      return;
    }

    seedDemoDataIfNeeded(currentUser ?? null).catch((error) => {
      console.error("[App] Demo seed failed:", error);
    });
  }, [currentUser]);

  useEffect(() => {
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const isDark =
      theme === "dark" || (theme === "system" && systemPrefersDark);

    applyTheme(getThemeConfig(), isDark);
  }, [theme]);

  useEffect(() => {
    const applyLanguageDirection = (language: string) => {
      document.documentElement.lang = language;
      document.documentElement.dir = isRtlLanguage(language) ? "rtl" : "ltr";
    };

    applyLanguageDirection(i18n.language);
    i18n.on("languageChanged", applyLanguageDirection);

    return () => {
      i18n.off("languageChanged", applyLanguageDirection);
    };
  }, []);

  const handleSetupComplete = async (userData: SetupPayload) => {
    await saveLicenseInfo(userData.licenseKey, userData.email);
    await createInitialAdmin({
      email: userData.email,
      password: userData.password,
      displayName: userData.name,
    });
    await appSettingsRepository.markSetupComplete();
    await login(userData.email, userData.password);
    setNeedsSetup(false);
  };

  if (!hasBootstrapped && (isCheckingSetup || loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (needsSetup) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  if (!currentUser) {
    return <Auth />;
  }

  return <AppShell />;
}

export default App;
