import { check, type Update } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"
import { toast } from "sonner"

import { APP_NAME } from "@/lib/brand"
import { isTauriRuntime } from "@/services/browser-store"
import { getSetting, setSetting } from "@/services/appSettingsService"

const DISMISSED_VERSION_KEY = "updates.dismissed_version"
const LAST_CHECKED_AT_KEY = "updates.last_checked_at"

let startupCheckStarted = false
let installInFlight = false

function summarizeNotes(notes?: string | null) {
  if (!notes) {
    return `Une nouvelle version de ${APP_NAME} est disponible.`
  }

  const normalized = notes.replace(/\s+/g, " ").trim()
  if (normalized.length <= 140) {
    return normalized
  }

  return `${normalized.slice(0, 137)}...`
}

async function markDismissedVersion(version: string) {
  await setSetting(DISMISSED_VERSION_KEY, version)
}

async function clearDismissedVersion() {
  await setSetting(DISMISSED_VERSION_KEY, "")
}

async function installUpdate(update: Update) {
  if (installInFlight) {
    return
  }

  installInFlight = true
  const loadingToastId = toast.loading(`Installation de ${APP_NAME} ${update.version}...`, {
    description: "Telechargement de la mise a jour en cours.",
    duration: Infinity,
    closeButton: true,
  })

  try {
    await clearDismissedVersion()
    await update.downloadAndInstall()
    toast.dismiss(loadingToastId)
    toast.success("Mise a jour installee. Redemarrage de l'application...", {
      duration: 8000,
      closeButton: true,
    })
    await relaunch()
  } catch (error) {
    toast.dismiss(loadingToastId)
    await markDismissedVersion(update.version)
    console.error("[Updater] Failed to install update:", error)
    toast.error("Impossible d'installer la mise a jour pour le moment.", {
      description: "Vous pourrez reessayer au prochain lancement.",
      duration: 10000,
      closeButton: true,
    })
  } finally {
    installInFlight = false
  }
}

function notifyAboutUpdate(update: Update) {
  toast.info(`${APP_NAME} ${update.version} est disponible`, {
    description: summarizeNotes(update.body),
    duration: 20000,
    closeButton: true,
    action: {
      label: "Installer",
      onClick: () => {
        void installUpdate(update)
      },
    },
    cancel: {
      label: "Plus tard",
      onClick: () => {
        void markDismissedVersion(update.version)
      },
    },
  })
}

export async function checkForAppUpdates(options?: { userInitiated?: boolean }) {
  if (!isTauriRuntime()) {
    return null
  }

  const userInitiated = options?.userInitiated ?? false

  const update = await check()
  await setSetting(LAST_CHECKED_AT_KEY, new Date().toISOString())

  if (!update) {
    if (userInitiated) {
      toast.success(`Vous utilisez deja la derniere version de ${APP_NAME}.`, {
        duration: 5000,
        closeButton: true,
      })
    }
    return null
  }

  const dismissedVersion = await getSetting(DISMISSED_VERSION_KEY)
  if (!userInitiated && dismissedVersion === update.version) {
    return update
  }

  notifyAboutUpdate(update)
  return update
}

export async function startAppUpdateCheck() {
  if (startupCheckStarted) {
    return
  }

  startupCheckStarted = true
  await checkForAppUpdates()
}
