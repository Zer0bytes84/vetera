import { useEffect, useState } from "react"

import Auth from "@/components/Auth"
import SetupWizard from "@/components/SetupWizard"
import { useTheme } from "@/components/theme-provider"
import { useAuth } from "@/contexts/AuthContext"
import { appSettingsRepository } from "@/data/repositories"
import { applyTheme, getThemeConfig } from "@/lib/theme-store"
import { checkAutoBackup } from "@/services/backupService"
import { seedDemoDataIfNeeded } from "@/services/demo-data"
import { saveLicenseInfo } from "@/services/appSettingsService"
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)]">
        <div className="text-sm text-[var(--text-muted)]">Chargement...</div>
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
