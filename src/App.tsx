import { lazy, Suspense, useEffect, useState } from "react";

import Logo from "@/components/Logo";
import { useTheme } from "@/components/theme-provider";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { appSettingsRepository } from "@/data/repositories";
import i18n, { isRtlLanguage } from "@/i18n/config";
import { applyTheme, getThemeConfig } from "@/lib/theme-store";
import { saveLicenseInfo } from "@/services/appSettingsService";
import { checkAutoBackup } from "@/services/backupService";
import { isTauriRuntime } from "@/services/browser-store";
import {
  purgeDemoDataInTauriIfNeeded,
  seedDemoDataIfNeeded,
} from "@/services/demo-data";
import { createInitialAdmin } from "@/services/sqlite/auth";
import { startAppUpdateCheck } from "@/services/updateService";

const AppShell = lazy(async () => {
  const module = await import("@/modules/shell/app-shell");
  return { default: module.AppShell };
});
const Auth = lazy(() => import("@/components/Auth"));
const SetupWizard = lazy(() => import("@/components/SetupWizard"));

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
    return <AppLoadingState />;
  }

  if (needsSetup) {
    return (
      <Suspense fallback={<AppLoadingState />}>
        <SetupWizard onComplete={handleSetupComplete} />
      </Suspense>
    );
  }

  if (!currentUser) {
    return (
      <Suspense fallback={<AppLoadingState />}>
        <Auth />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<AppLoadingState />}>
      <AppShell />
    </Suspense>
  );
}

function AppLoadingState() {
  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#f4f5f1] text-zinc-950"
      style={{ colorScheme: "light" }}
    >
      <div className="absolute -top-40 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-[#d7eee5]/75 blur-3xl" />
      <div className="relative flex flex-col items-center gap-5">
        <Logo size="xl" />
        <div className="flex items-center gap-2.5 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-sm text-zinc-600 shadow-sm backdrop-blur-xl">
          <Spinner className="size-4 text-emerald-700" />
          Préparation de votre espace
        </div>
      </div>
    </div>
  );
}

export default App;
