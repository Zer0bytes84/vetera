import { useEffect, useState } from "react"

import Auth from "@/components/Auth"
import SetupWizard from "@/components/SetupWizard"
import { useTheme } from "@/components/theme-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/AuthContext"
import { appSettingsRepository } from "@/data/repositories"
import { applyTheme, getThemeConfig } from "@/lib/theme-store"
import { checkAutoBackup } from "@/services/backupService"
import { seedDemoDataIfNeeded } from "@/services/demo-data"
import i18n, { isRtlLanguage } from "@/i18n/config"
import { saveLicenseInfo } from "@/services/appSettingsService"
import { startAppUpdateCheck } from "@/services/updateService"
import { createInitialAdmin } from "@/services/sqlite/auth"
import { AppShell } from "@/modules/shell/app-shell"

type SetupPayload = {
  name: string
  email: string
  password: string
  licenseKey: string
}

export function App() {
  const [isCheckingSetup, setIsCheckingSetup] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const { currentUser, loading, login } = useAuth()
  const { theme } = useTheme()

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const setupDone = await appSettingsRepository.isSetupComplete()
        setNeedsSetup(!setupDone)
      } catch (error) {
        console.error("[App] Error checking setup status:", error)
        setNeedsSetup(true)
      } finally {
        setIsCheckingSetup(false)
      }
    }

    checkAutoBackup().catch((error) => {
      console.error("[App] Auto-backup check failed:", error)
    })

    startAppUpdateCheck().catch((error) => {
      console.error("[App] Update check failed:", error)
    })

    checkSetup()
  }, [])

  useEffect(() => {
    seedDemoDataIfNeeded(currentUser ?? null).catch((error) => {
      console.error("[App] Demo seed failed:", error)
    })
  }, [currentUser])

  useEffect(() => {
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark =
      theme === "dark" ||
      (theme === "system" && systemPrefersDark)

    applyTheme(getThemeConfig(), isDark)
  }, [theme])

  useEffect(() => {
    const applyLanguageDirection = (language: string) => {
      document.documentElement.lang = language
      document.documentElement.dir = isRtlLanguage(language) ? "rtl" : "ltr"
    }

    applyLanguageDirection(i18n.language)
    i18n.on("languageChanged", applyLanguageDirection)

    return () => {
      i18n.off("languageChanged", applyLanguageDirection)
    }
  }, [])

  const handleSetupComplete = async (userData: SetupPayload) => {
    await saveLicenseInfo(userData.licenseKey, userData.email)
    await createInitialAdmin({
      email: userData.email,
      password: userData.password,
      displayName: userData.name,
    })
    await appSettingsRepository.markSetupComplete()
    await login(userData.email, userData.password)
    setNeedsSetup(false)
  }

  if (isCheckingSetup || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)] px-6">
        <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-36 rounded-lg" />
              <Skeleton className="h-3 w-24 rounded-lg" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-[92%] rounded-xl" />
            <Skeleton className="h-10 w-[85%] rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (needsSetup) {
    return <SetupWizard onComplete={handleSetupComplete} />
  }

  if (!currentUser) {
    return <Auth />
  }

  return <AppShell />
}

export default App
