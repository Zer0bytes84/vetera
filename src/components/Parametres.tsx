import React, { useEffect, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  Camera01Icon,
  CheckmarkCircle02Icon,
  Delete01Icon,
  Download01Icon,
  HardDriveIcon,
  InformationSquareIcon,
  LaptopIcon,
  MonitorDotIcon,
  Moon02Icon,
  Package02Icon,
  Settings01Icon,
  Refresh01Icon,
  SaveIcon,
  Shield01Icon,
  SmartPhone01Icon,
  SparklesIcon,
  Sun03Icon,
  Upload01Icon,
  UserCircle02Icon,
  Wifi01Icon,
  DatabaseIcon,
  Notification02Icon,
} from "@hugeicons/core-free-icons"
import { useAuth } from "@/contexts/AuthContext"
import { useUsersRepository } from "@/data/repositories"
import { APP_NAME } from "@/lib/brand"
import { writeCachedProfile } from "@/lib/profile-cache"
import Avatar from "./Avatar"
import Logo from "./Logo"
import { ThemeModeToggle } from "./theme-mode-toggle"
import { updatePassword } from "@/services/sqlite/auth"
import {
  getCurrentProgress,
  initializeWebLLM,
  isWebLLMLoading,
  isWebLLMReady,
  ProgressReport,
  subscribeToProgress,
} from "@/services/webLLMService"
import {
  createBackup,
  listBackups,
  restoreBackup,
  exportDatabase,
  importDatabase,
  importDatabaseFromFile,
  getLastBackupDate,
  deleteBackup,
  BackupInfo,
} from "@/services/backupService"
import { relaunch } from "@tauri-apps/plugin-process"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ThemeSelector } from "./ThemeSelector"
import { useLayout, type Collapsible } from "@/contexts/layout-provider"
import {
  getThemeConfig,
  saveThemeConfig,
  applyTheme,
  type ThemeConfig,
  DEFAULT_THEME,
  ACCENT_THEMES,
} from "@/lib/theme-store"
import { getSetting, setSetting } from "@/services/appSettingsService"

type SettingsTab =
  | "profil"
  | "apparence"
  | "notifications"
  | "securite"
  | "ia"
  | "sauvegarde"
  | "apropos"
// IA Settings Component
const IASettings: React.FC = () => {
  const [modelStatus, setModelStatus] = useState<
    "not_downloaded" | "downloading" | "ready" | "error"
  >("not_downloaded")
  const [progress, setProgress] = useState<ProgressReport>({
    progress: 0,
    text: "Initializing...",
  })
  const [isInitializing, setIsInitializing] = useState(false)

  useEffect(() => {
    if (isWebLLMReady()) {
      setModelStatus("ready")
    } else if (isWebLLMLoading()) {
      setModelStatus("downloading")
      setProgress(getCurrentProgress())
    }

    const unsubscribe = subscribeToProgress((report) => {
      setProgress(report)
      if (report.progress === 1 && report.text === "Completed") {
        setModelStatus("ready")
      } else if (report.text === "Error") {
        setModelStatus("error")
      } else {
        setModelStatus("downloading")
      }
    })

    return unsubscribe
  }, [])

  const handleDownloadModel = async () => {
    setIsInitializing(true)
    setModelStatus("downloading")

    try {
      await initializeWebLLM((report) => {
        setProgress(report)
      })
      setModelStatus("ready")
    } catch (error) {
      console.error("[IASettings] Model download failed:", error)
      setModelStatus("error")
    } finally {
      setIsInitializing(false)
    }
  }

  return (
    <div className="animate-in space-y-6 duration-300 fade-in">
      <div>
        <h2 className="mb-1 text-xl font-medium text-foreground">
          Assistant intelligent
        </h2>
        <p className="text-sm text-muted-foreground">
          Assistant IA intégré, fonctionne 100% en local et hors ligne
        </p>
      </div>

      <Card size="sm">
        <CardContent className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
            <HugeiconsIcon
              icon={SparklesIcon}
              strokeWidth={2}
              className="size-6"
            />
          </div>
          <div className="flex-1">
            <h3 className="mb-1 text-lg font-medium text-foreground">
              Assistant IA
            </h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Correction, reformulation et résumé de textes en français.
              Fonctionne directement sur votre appareil.
            </p>
            <div className="flex flex-wrap gap-2">
              {["100% Local", "Hors ligne", "Privé"].map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {modelStatus === "not_downloaded" && (
        <Card
          size="sm"
          className="border-amber-200 bg-amber-500/5 dark:border-amber-500/20"
        >
          <CardContent className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
              <HugeiconsIcon
                icon={Download01Icon}
                strokeWidth={2}
                className="size-4"
              />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-sm font-semibold text-amber-800 dark:text-amber-400">
                Assistant non installé
              </h3>
              <p className="mb-3 text-xs text-amber-700 dark:text-amber-500">
                Installez l'assistant pour utiliser les fonctions IA hors
                ligne. Les données restent sur votre appareil.
              </p>
              <Button
                onClick={handleDownloadModel}
                disabled={isInitializing}
                className="rounded-[0.95rem] bg-[linear-gradient(135deg,#ea580c,#f97316)]"
              >
                {isInitializing ? (
                  <Spinner className="size-4" />
                ) : (
                  <HugeiconsIcon
                    icon={Download01Icon}
                    strokeWidth={2}
                    className="size-4"
                  />
                )}
                Installer l'assistant
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {modelStatus === "downloading" && (
        <Card
          size="sm"
          className="border-blue-200 bg-blue-500/5 dark:border-blue-500/20"
        >
          <CardContent className="flex items-start gap-3">
            <Spinner className="mt-0.5 size-5 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <h3 className="mb-2 text-sm font-semibold text-blue-800 dark:text-blue-400">
                Téléchargement en cours...
              </h3>
              <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900/30">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${progress.progress * 100}%` }}
                />
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-500">
                {progress.text} - {(progress.progress * 100).toFixed(0)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {modelStatus === "ready" && (
        <Card
          size="sm"
          className="border-green-200 bg-green-500/5 dark:border-green-500/20"
        >
          <CardContent className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                strokeWidth={2}
                className="size-4"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-400">
                Assistant prêt
              </h3>
              <p className="text-xs text-green-700 dark:text-green-500">
                L'assistant est actif et prêt à l'emploi. Fonctionne même hors
                ligne !
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {modelStatus === "error" && (
        <Card
          size="sm"
          className="border-red-200 bg-red-500/5 dark:border-red-500/20"
        >
          <CardContent className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
              <HugeiconsIcon
                icon={Alert02Icon}
                strokeWidth={2}
                className="size-4"
              />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-sm font-semibold text-red-800 dark:text-red-400">
                Erreur de téléchargement
              </h3>
              <p className="mb-3 text-xs text-red-700 dark:text-red-500">
                Le modèle n'a pas pu être téléchargé. Vérifiez votre connexion
                internet et réessayez.
              </p>
              <Button variant="destructive" onClick={handleDownloadModel}>
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card size="sm">
        <CardContent>
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            Avantages du modèle local
          </h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <HugeiconsIcon
                icon={Wifi01Icon}
                strokeWidth={2}
                className="mt-0.5 size-3.5 shrink-0 text-green-500"
              />
              <span>
                <strong>Hors ligne :</strong> Fonctionne sans connexion internet
                après téléchargement
              </span>
            </div>
            <div className="flex items-start gap-2">
              <HugeiconsIcon
                icon={Shield01Icon}
                strokeWidth={2}
                className="mt-0.5 size-3.5 shrink-0 text-blue-500"
              />
              <span>
                <strong>Confidentialité :</strong> Vos données restent 100%
                locales sur votre appareil
              </span>
            </div>
            <div className="flex items-start gap-2">
              <HugeiconsIcon
                icon={Package02Icon}
                strokeWidth={2}
                className="mt-0.5 size-3.5 shrink-0 text-purple-500"
              />
              <span>
                <strong>Cache navigateur :</strong> Le modèle est stocké dans le
                cache (pas de réinstallation)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Backup Settings Component
const BackupSettings: React.FC = () => {
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isRestoring, setIsRestoring] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [isAwaitingImportFile, setIsAwaitingImportFile] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [feedbackMessage])

  useEffect(() => {
    loadBackupData()
  }, [])

  const loadBackupData = async () => {
    setIsLoading(true)
    try {
      const [backupList, lastDate] = await Promise.all([
        listBackups(),
        getLastBackupDate(),
      ])
      setBackups(backupList)
      setLastBackup(lastDate)
    } catch (error) {
      console.error("[BackupSettings] Error loading backup data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    setIsCreating(true)
    try {
      await createBackup("manual")
      await loadBackupData()
      alert("✅ Sauvegarde créée avec succès !")
    } catch (error) {
      console.error("[BackupSettings] Error creating backup:", error)
      alert("❌ Erreur lors de la création de la sauvegarde")
    } finally {
      setIsCreating(false)
    }
  }

  const handleRestoreBackup = async (filename: string) => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir restaurer cette sauvegarde ?\n\nCela remplacera toutes vos données actuelles.\n\n⚠️ L'application devra être redémarrée manuellement.`
      )
    ) {
      return
    }

    setIsRestoring(filename)
    setFeedbackMessage(null)
    try {
      const success = await restoreBackup(filename)
      if (success) {
        setFeedbackMessage({
          type: "success",
          text: "✅ Restauration réussie ! Redémarrage automatique...",
        })
        setTimeout(async () => {
          try {
            await relaunch()
          } catch (e) {
            console.error("[BackupSettings] Relaunch failed:", e)
            window.location.reload()
          }
        }, 1200)
      } else {
        setFeedbackMessage({
          type: "error",
          text: "❌ Erreur lors de la restauration",
        })
      }
    } catch (error) {
      console.error("[BackupSettings] Error restoring backup:", error)
      setFeedbackMessage({ type: "error", text: "❌ Erreur: " + String(error) })
    } finally {
      setIsRestoring(null)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const success = await exportDatabase()
      if (success) {
        alert("✅ Base de données exportée avec succès !")
      }
    } catch (error) {
      console.error("[BackupSettings] Error exporting:", error)
      alert("❌ Erreur lors de l'export")
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async () => {
    if (
      !confirm(
        "⚠️ Attention : cela remplacera toutes vos données actuelles par celles du fichier sélectionné.\n\nContinuer ?"
      )
    ) {
      return
    }
    setFeedbackMessage(null)
    setIsImporting(true)
    setIsAwaitingImportFile(false)

    try {
      const success = await importDatabase()
      if (success) {
        setFeedbackMessage({
          type: "success",
          text: "✅ Base de données importée ! L'application va redémarrer...",
        })

        setTimeout(async () => {
          try {
            await relaunch()
          } catch (e) {
            console.error("[BackupSettings] Relaunch failed:", e)
            window.location.reload()
          }
        }, 1200)
      } else {
        setFeedbackMessage({
          type: "error",
          text: "❌ Import annulé ou impossible",
        })
      }
    } catch (error) {
      console.error("[BackupSettings] Error importing:", error)
      setFeedbackMessage({
        type: "error",
        text:
          "❌ " +
          (error instanceof Error
            ? error.message
            : "Erreur lors de l'importation"),
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleImportFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      setIsAwaitingImportFile(false)
      setIsImporting(false)
      return
    }

    setIsImporting(true)
    setIsAwaitingImportFile(false)
    try {
      const success = await importDatabaseFromFile(file)
      if (success) {
        setFeedbackMessage({
          type: "success",
          text: "✅ Base de données importée ! L'application va redémarrer...",
        })
        setTimeout(async () => {
          try {
            await relaunch()
          } catch (e) {
            console.error("[BackupSettings] Relaunch failed:", e)
            window.location.reload()
          }
        }, 1200)
      } else {
        setFeedbackMessage({
          type: "error",
          text: "❌ Échec de l'importation",
        })
      }
    } catch (error) {
      console.error("[BackupSettings] Error importing from file:", error)
      setFeedbackMessage({
        type: "error",
        text:
          "❌ " +
          (error instanceof Error
            ? error.message
            : "Erreur lors de l'importation"),
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm("Supprimer cette sauvegarde ?")) return
    try {
      await deleteBackup(filename)
      await loadBackupData()
    } catch (error) {
      console.error("[BackupSettings] Error deleting backup:", error)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="animate-in space-y-6 duration-300 fade-in">
      <div>
        <h2 className="mb-1 text-xl font-medium text-foreground">
          Sauvegarde & Données
        </h2>
        <p className="text-sm text-muted-foreground">
          Protégez vos données avec des sauvegardes automatiques
        </p>
      </div>

      {feedbackMessage && (
        <Card
          size="sm"
          className={cn(
            "animate-in duration-300 slide-in-from-top",
            feedbackMessage.type === "success"
              ? "border-green-200 bg-green-500/5 dark:border-green-800"
              : "border-red-200 bg-red-500/5 dark:border-red-800"
          )}
        >
          <CardContent className="flex items-center gap-3">
            <span className="text-lg">
              {feedbackMessage.type === "success" ? "✅" : "❌"}
            </span>
            <span
              className={cn(
                "font-medium",
                feedbackMessage.type === "success"
                  ? "text-green-700 dark:text-green-300"
                  : "text-red-700 dark:text-red-300"
              )}
            >
              {feedbackMessage.text.replace(/^[✅❌]\s*/, "")}
            </span>
          </CardContent>
        </Card>
      )}

      <Card
        size="sm"
        className="border-emerald-200 bg-emerald-500/5 dark:border-emerald-800"
      >
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-800/50">
              <HugeiconsIcon
                icon={HardDriveIcon}
                strokeWidth={2}
                className="size-6 text-emerald-600 dark:text-emerald-400"
              />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Dernière sauvegarde
              </h3>
              <p className="text-sm text-muted-foreground">
                {lastBackup ? formatDate(lastBackup) : "Aucune sauvegarde"}
              </p>
            </div>
          </div>
          <Button onClick={handleCreateBackup} disabled={isCreating}>
            {isCreating ? (
              <Spinner className="size-4" />
            ) : (
              <HugeiconsIcon
                icon={DatabaseIcon}
                strokeWidth={2}
                className="size-4.5"
              />
            )}
            {isCreating ? "Création..." : "Créer une sauvegarde"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <input
          ref={importInputRef}
          type="file"
          accept=".db,.sqlite,.sqlite3"
          className="hidden"
          onChange={handleImportFileChange}
        />
        <Button
          variant="outline"
          className="h-auto justify-start gap-3 p-4"
          onClick={handleExport}
          disabled={isExporting}
        >
          <HugeiconsIcon
            icon={Download01Icon}
            strokeWidth={2}
            className="size-5 text-primary"
          />
          <div className="text-left">
            <div className="font-medium text-foreground">Exporter la base</div>
            <div className="text-xs text-muted-foreground">
              Sauvegarder vers un fichier
            </div>
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-auto justify-start gap-3 p-4"
          onClick={handleImport}
          disabled={isImporting || isAwaitingImportFile}
        >
          <HugeiconsIcon
            icon={Upload01Icon}
            strokeWidth={2}
            className="size-5 text-primary"
          />
          <div className="text-left">
            <div className="font-medium text-foreground">Importer une base</div>
            <div className="text-xs text-muted-foreground">
              {isAwaitingImportFile
                ? "Choisissez maintenant votre sauvegarde"
                : "Restaurer depuis un fichier"}
            </div>
          </div>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          className="h-auto justify-start gap-3 p-4"
          onClick={loadBackupData}
          disabled={isLoading}
        >
          <HugeiconsIcon
            icon={Refresh01Icon}
            strokeWidth={2}
            className={cn(
              "size-5 text-muted-foreground",
              isLoading && "animate-spin"
            )}
          />
          <div className="text-left">
            <div className="font-medium text-foreground">Actualiser</div>
            <div className="text-xs text-muted-foreground">
              Recharger la liste
            </div>
          </div>
        </Button>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Sauvegardes disponibles ({backups.length}/5)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`backup-skeleton-row-${index}`}
                  className="flex items-center justify-between rounded-2xl border border-border/60 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40 rounded-md" />
                      <Skeleton className="h-3 w-28 rounded-md" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <HugeiconsIcon
                icon={DatabaseIcon}
                strokeWidth={2}
                className="mb-2 size-8 text-muted-foreground/50"
              />
              <p className="text-sm text-muted-foreground">
                Aucune sauvegarde disponible
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Créez votre première sauvegarde pour protéger vos données
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {backups.map((backup) => (
                <div
                  key={backup.filename}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                      <HugeiconsIcon
                        icon={DatabaseIcon}
                        strokeWidth={2}
                        className="size-4.5 text-blue-600 dark:text-blue-400"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {formatDate(backup.date)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        v{backup.version} •{" "}
                        {backup.filename.includes("auto")
                          ? "Auto"
                          : backup.filename.includes("manual")
                            ? "Manuel"
                            : "Autre"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestoreBackup(backup.filename)}
                      disabled={isRestoring === backup.filename}
                      className="text-primary"
                    >
                      {isRestoring === backup.filename ? (
                        <Spinner className="size-3.5" />
                      ) : (
                        <HugeiconsIcon
                          icon={Upload01Icon}
                          strokeWidth={2}
                          className="size-3.5"
                        />
                      )}
                      Restaurer
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteBackup(backup.filename)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <HugeiconsIcon
                        icon={Delete01Icon}
                        strokeWidth={2}
                        className="size-3.5"
                      />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card
        size="sm"
        className="border-blue-200 bg-blue-500/5 dark:border-blue-800"
      >
        <CardContent>
          <h4 className="mb-2 flex items-center gap-2 font-medium text-blue-800 dark:text-blue-300">
            <HugeiconsIcon
              icon={InformationSquareIcon}
              strokeWidth={2}
              className="size-4"
            />
            Protection automatique
          </h4>
          <ul className="space-y-1.5 text-sm text-blue-700 dark:text-blue-400">
            <li className="flex items-start gap-2">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                strokeWidth={2}
                className="mt-0.5 size-3.5 shrink-0"
              />
              <span>
                Sauvegarde automatique à chaque mise à jour de l'application
              </span>
            </li>
            <li className="flex items-start gap-2">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                strokeWidth={2}
                className="mt-0.5 size-3.5 shrink-0"
              />
              <span>
                Conservation des 5 dernières sauvegardes (rotation automatique)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                strokeWidth={2}
                className="mt-0.5 size-3.5 shrink-0"
              />
              <span>Sauvegarde de sécurité avant chaque restauration</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

interface ParametresProps {
  currentTheme?: "light" | "dark" | "system"
  onThemeChange?: (theme: "light" | "dark" | "system") => void
}

const Parametres: React.FC<ParametresProps> = ({
  currentTheme = "light",
  onThemeChange,
}) => {
  const sanitizeAvatarValue = (value?: string | null) => {
    if (typeof value !== "string") return ""
    const normalized = value.trim()
    if (!normalized) return ""
    if (["undefined", "null", "nan"].includes(normalized.toLowerCase())) {
      return ""
    }
    return normalized
  }

  const [activeTab, setActiveTab] = useState<SettingsTab>("profil")
  const { currentUser, refreshCurrentUser } = useAuth()
  const { data: users, update: updateUserDoc } = useUsersRepository()
  const userDoc = users.find((u) => u.email === currentUser?.email)

  const [displayName, setDisplayName] = useState("")
  const [phone, setPhone] = useState("")
  const [bio, setBio] = useState("")
  const [clinicName, setClinicName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() =>
    getThemeConfig()
  )

  useEffect(() => {
    let cancelled = false

    const loadProfileState = async () => {
      if (currentUser) {
        setDisplayName(currentUser.displayName || "")
      }
      if (userDoc) {
        setPhone(userDoc.phone || "")
        setAvatarUrl(sanitizeAvatarValue(userDoc.avatarUrl))
      } else if (currentUser?.email === "zohir.kh@gmail.com") {
        setDisplayName("Zouhir Kherroubi")
      }

      try {
        const [savedBio, savedClinicName, savedCabinetName, savedPracticeName] =
          await Promise.all([
            getSetting("profile_bio"),
            getSetting("clinic_name"),
            getSetting("cabinet_name"),
            getSetting("practice_name"),
          ])

        if (cancelled) return
        setBio(savedBio || "")
        setClinicName(
          savedClinicName || savedCabinetName || savedPracticeName || ""
        )
      } catch (error) {
        console.error("[SETTINGS] Error loading profile settings:", error)
      }
    }

    loadProfileState()

    return () => {
      cancelled = true
    }
  }, [currentUser, userDoc])

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark")
    applyTheme(themeConfig, isDark)
    saveThemeConfig(themeConfig)
  }, [themeConfig])

  const handleThemeConfigChange = (newConfig: ThemeConfig) => {
    setThemeConfig(newConfig)
  }

  const navItems: {
    id: SettingsTab
    label: string
    icon: typeof UserCircle02Icon
  }[] = [
    { id: "profil", label: "Profil", icon: UserCircle02Icon },
    { id: "apparence", label: "Apparence", icon: Settings01Icon },
    { id: "notifications", label: "Notifications", icon: Notification02Icon },
    { id: "securite", label: "Sécurité", icon: Shield01Icon },
    { id: "ia", label: "IA Locale", icon: SparklesIcon },
    { id: "sauvegarde", label: "Sauvegarde", icon: DatabaseIcon },
    { id: "apropos", label: "À propos", icon: InformationSquareIcon },
  ]

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 1024 * 1024) {
      setMessage({
        type: "error",
        text: "L'image est trop volumineuse (Max 1Mo). Préférez un avatar animal si besoin.",
      })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async () => {
    if (!currentUser) return
    setIsSaving(true)
    setMessage(null)

    try {
      const dbUser = users.find(
        (u) => u.id === currentUser.id || u.email === currentUser.email
      )

      if (!dbUser) {
        setMessage({
          type: "error",
          text: "Utilisateur non trouvé dans la base de données.",
        })
        return
      }

      await updateUserDoc(dbUser.id, {
        displayName,
        phone,
        avatarUrl: sanitizeAvatarValue(avatarUrl),
      })

      await Promise.all([
        setSetting("profile_bio", bio.trim()),
        setSetting("clinic_name", clinicName.trim()),
        setSetting("cabinet_name", clinicName.trim()),
        setSetting("practice_name", clinicName.trim()),
      ])

      writeCachedProfile(currentUser.email, {
        displayName,
        avatarUrl: sanitizeAvatarValue(avatarUrl),
      })

      await refreshCurrentUser()

      setMessage({ type: "success", text: "Profil mis à jour avec succès." })
    } catch (error) {
      console.error("[SETTINGS] Error updating profile:", error)
      setMessage({
        type: "error",
        text: "Une erreur est survenue lors de la mise à jour.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentUser) return
    if (newPassword !== confirmPassword) {
      setMessage({
        type: "error",
        text: "Les nouveaux mots de passe ne correspondent pas.",
      })
      return
    }
    if (newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "Le mot de passe doit contenir au moins 6 caractères.",
      })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      await updatePassword(currentUser.uid, newPassword)

      setMessage({ type: "success", text: "Mot de passe modifié avec succès." })
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      console.error("Password change error:", error)
      if (error.code === "auth/requires-recent-login") {
        setMessage({
          type: "error",
          text: "Par sécurité, veuillez vous reconnecter avant de changer le mot de passe.",
        })
      } else {
        setMessage({
          type: "error",
          text: `Erreur: ${error.message || String(error)}`,
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const getRoleDisplay = () => {
    if (currentUser?.email === "zohir.kh@gmail.com")
      return "Super Administrateur"
    const role = userDoc?.role || "stagiaire"
    switch (role) {
      case "admin":
        return "Administrateur"
      case "vet_principal":
        return "Vétérinaire Principal"
      case "vet_adjoint":
        return "Vétérinaire Adjoint"
      case "assistant":
        return "Assistant(e)"
      default:
        return "Stagiaire"
    }
  }

  const roleLabel = getRoleDisplay()

  const renderContent = () => {
    switch (activeTab) {
      case "profil":
        return (
          <div className="space-y-6">
            {/* Profile Header */}
            <Card size="sm" className="overflow-hidden">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="relative shrink-0 self-start">
                  <Avatar src={avatarUrl} name={displayName} size="xl" />
                  <label
                    htmlFor="profile-photo-upload"
                    className="absolute right-0 bottom-0 inline-flex cursor-pointer items-center justify-center rounded-full border-2 border-background bg-primary p-2 text-primary-foreground shadow-md transition-transform hover:scale-105"
                    title="Changer la photo de profil"
                  >
                    <HugeiconsIcon
                      icon={Camera01Icon}
                      strokeWidth={2}
                      className="size-3.5"
                    />
                  </label>
                  <input
                    id="profile-photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-semibold text-foreground">
                    {displayName || "Votre profil"}
                  </h2>
                  <p className="truncate text-sm text-muted-foreground">
                    {currentUser?.email}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {clinicName
                      ? `Cabinet ${clinicName}`
                      : "Cabinet à définir"}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{getRoleDisplay()}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {message && (
              <Card
                size="sm"
                className={cn(
                  message.type === "success"
                    ? "border-green-200 bg-green-500/5"
                    : "border-red-200 bg-red-500/5"
                )}
              >
                <CardContent className="flex items-center gap-3">
                  {message.type === "success" ? (
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      strokeWidth={2}
                      className="size-4.5 text-green-700"
                    />
                  ) : (
                    <HugeiconsIcon
                      icon={Alert02Icon}
                      strokeWidth={2}
                      className="size-4.5 text-red-700"
                    />
                  )}
                  <p
                    className={cn(
                      "text-sm font-medium",
                      message.type === "success"
                        ? "text-green-700"
                        : "text-red-700"
                    )}
                  >
                    {message.text}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Form Fields */}
            <Card size="sm">
              <CardHeader>
                <CardTitle>Informations du praticien 🩺</CardTitle>
                <CardDescription>
                  Modifiez votre identité et celle du cabinet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel>Nom de la clinique / cabinet</FieldLabel>
                    <Input
                      type="text"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      placeholder="Ex: Clinique vétérinaire du Centre"
                    />
                    <FieldDescription>
                      Ce nom apparaîtra dans l'en-tête des factures.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel>Nom complet</FieldLabel>
                    <Input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Email</FieldLabel>
                    <Input
                      type="email"
                      value={currentUser?.email || ""}
                      disabled
                    />
                    <FieldDescription>
                      L'email ne peut pas être modifié
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel>Téléphone</FieldLabel>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+213..."
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Rôle</FieldLabel>
                    <Input type="text" value={getRoleDisplay()} disabled />
                  </Field>
                </div>
                <Field>
                  <FieldLabel>Bio</FieldLabel>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Quelques mots sur vous, votre spécialité ou le ton du cabinet..."
                  />
                </Field>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    {isSaving ? (
                      <Spinner className="size-4" />
                    ) : (
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        strokeWidth={2}
                        className="size-4"
                      />
                    )}
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      case "apparence":
        return (
          <div className="space-y-6">
            {/* Appearance Header */}
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Apparence
              </h2>
              <p className="text-sm text-muted-foreground">
                Personnalisez le look de votre application
              </p>
            </div>

            {/* Theme Mode */}
            <Card size="sm">
              <CardHeader>
                <CardTitle>Mode d'affichage</CardTitle>
                <CardDescription>
                  Choisissez entre le mode clair, sombre ou automatique
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ThemeModeToggle
                  mode={currentTheme}
                  onChange={(nextMode) =>
                    onThemeChange && onThemeChange(nextMode)
                  }
                />
              </CardContent>
            </Card>

            {/* Accent Color */}
            <Card size="sm">
              <CardHeader>
                <CardTitle>Couleur d'accent</CardTitle>
                <CardDescription>
                  La couleur principale utilisée dans toute l'interface
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {(
                    Object.entries(ACCENT_THEMES) as [
                      keyof typeof ACCENT_THEMES,
                      typeof ACCENT_THEMES.blue,
                    ][]
                  ).map(([key, theme]) => {
                    const isActive = themeConfig.accent === key
                    return (
                      <button
                        key={key}
                        onClick={() =>
                          handleThemeConfigChange({
                            ...themeConfig,
                            accent: key,
                          })
                        }
                        className={cn(
                          "group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all hover:scale-[1.02]",
                          isActive
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/30"
                        )}
                      >
                        {key === "noir" ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-current text-[10px] font-semibold transition-transform group-hover:scale-110">
                            Aa
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "h-8 w-8 rounded-full bg-gradient-to-br shadow-sm transition-transform group-hover:scale-110",
                              theme.previewGradient
                            )}
                          />
                        )}
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {theme.label}
                        </span>
                        {isActive && (
                          <div className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              strokeWidth={2}
                              className="size-2.5"
                            />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Font Family */}
            <Card size="sm">
              <CardHeader>
                <CardTitle>Police de caractères</CardTitle>
                <CardDescription>
                  Choisissez la typographie de l'interface
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {(["geist", "inter", "system"] as const).map((font) => {
                    const isActive = themeConfig.font === font
                    const fontMap: Record<
                      string,
                      { label: string; css: string; description: string }
                    > = {
                      geist: {
                        label: "Geist",
                        css: "'Geist Variable', sans-serif",
                        description: "Moderne et géométrique",
                      },
                      inter: {
                        label: "Inter",
                        css: "'Inter Variable', sans-serif",
                        description: "Lisible et polyvalent",
                      },
                      system: {
                        label: "Système",
                        css: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                        description: "Natif et rapide",
                      },
                    }
                    const f = fontMap[font]
                    return (
                      <button
                        key={font}
                        onClick={() =>
                          handleThemeConfigChange({ ...themeConfig, font })
                        }
                        className={cn(
                          "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                          isActive
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/30"
                        )}
                      >
                        <span
                          className="text-lg font-semibold text-foreground"
                          style={{ fontFamily: f.css }}
                        >
                          Aa
                        </span>
                        <div className="text-center">
                          <div className="text-[10px] font-medium text-foreground">
                            {f.label}
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            {f.description}
                          </div>
                        </div>
                        {isActive && (
                          <div className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              strokeWidth={2}
                              className="size-2.5"
                            />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Border Radius */}
            <Card size="sm">
              <CardHeader>
                <CardTitle>Arrondi des coins</CardTitle>
                <CardDescription>
                  Ajustez le rayon des bordures pour tous les composants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {(["sm", "md", "lg", "xl", "full"] as const).map((radius) => {
                    const radiusValues: Record<string, string> = {
                      sm: "0.375rem",
                      md: "0.5rem",
                      lg: "0.75rem",
                      xl: "1rem",
                      full: "9999px",
                    }
                    const isActive = themeConfig.radius === radius
                    return (
                      <button
                        key={radius}
                        onClick={() =>
                          handleThemeConfigChange({ ...themeConfig, radius })
                        }
                        className={cn(
                          "flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                          isActive
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/30"
                        )}
                      >
                        <div
                          className="h-8 w-12 border-2 transition-all"
                          style={{
                            borderRadius: radiusValues[radius],
                            borderColor: isActive
                              ? "var(--primary)"
                              : "var(--border)",
                          }}
                        />
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">
                          {radius}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Density */}
            <Card size="sm">
              <CardHeader>
                <CardTitle>Densité</CardTitle>
                <CardDescription>
                  Contrôlez l'espacement global de l'interface
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {(["compact", "comfortable", "spacious"] as const).map(
                    (density) => {
                      const isActive = themeConfig.density === density
                      return (
                        <button
                          key={density}
                          onClick={() =>
                            handleThemeConfigChange({ ...themeConfig, density })
                          }
                          className={cn(
                            "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                            isActive
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card hover:border-primary/30"
                          )}
                        >
                          <div className="flex w-full flex-col gap-1">
                            {density === "compact" && (
                              <>
                                <div className="h-1 w-full rounded-full bg-muted-foreground/20" />
                                <div className="h-1 w-3/4 rounded-full bg-muted-foreground/20" />
                                <div className="h-1 w-1/2 rounded-full bg-muted-foreground/20" />
                              </>
                            )}
                            {density === "comfortable" && (
                              <>
                                <div className="h-1.5 w-full rounded-full bg-muted-foreground/20" />
                                <div className="h-1.5 w-3/4 rounded-full bg-muted-foreground/20" />
                                <div className="h-1.5 w-1/2 rounded-full bg-muted-foreground/20" />
                              </>
                            )}
                            {density === "spacious" && (
                              <>
                                <div className="h-2 w-full rounded-full bg-muted-foreground/20" />
                                <div className="h-2 w-3/4 rounded-full bg-muted-foreground/20" />
                                <div className="h-2 w-1/2 rounded-full bg-muted-foreground/20" />
                              </>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground capitalize">
                            {density === "compact"
                              ? "Compact"
                              : density === "comfortable"
                                ? "Confortable"
                                : "Spacieux"}
                          </span>
                        </button>
                      )
                    }
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sidebar Layout */}
            <SidebarLayoutSettings />
          </div>
        )
      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Notifications
              </h2>
              <p className="text-sm text-muted-foreground">
                Gérez vos préférences de notification
              </p>
            </div>
            <Card size="sm">
              <CardContent className="space-y-1 pt-4">
                {[
                  {
                    title: "Rendez-vous",
                    sub: "Confirmations et rappels de RDV",
                    checked: true,
                  },
                  {
                    title: "Rappels",
                    sub: "Vaccinations et suivis à venir",
                    checked: true,
                  },
                  {
                    title: "Alertes stock",
                    sub: "Produits en rupture ou périmés",
                    checked: true,
                  },
                  {
                    title: "Équipe",
                    sub: "Changements d'équipe et planning",
                    checked: false,
                  },
                  {
                    title: "Actualités",
                    sub: "Nouveautés et mises à jour",
                    checked: false,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl p-4 transition-colors hover:bg-muted/30"
                  >
                    <div>
                      <h3 className="text-sm font-medium text-foreground">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {item.sub}
                      </p>
                    </div>
                    <Switch defaultChecked={item.checked} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )
      case "securite":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Sécurité
              </h2>
              <p className="text-sm text-muted-foreground">
                Gérez votre mot de passe et vos sessions
              </p>
            </div>

            {message && (
              <Card
                size="sm"
                className={cn(
                  message.type === "success"
                    ? "border-green-200 bg-green-500/5"
                    : "border-red-200 bg-red-500/5"
                )}
              >
                <CardContent className="flex items-center gap-3">
                  {message.type === "success" ? (
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      strokeWidth={2}
                      className="size-4.5 text-green-700"
                    />
                  ) : (
                    <HugeiconsIcon
                      icon={Alert02Icon}
                      strokeWidth={2}
                      className="size-4.5 text-red-700"
                    />
                  )}
                  <p
                    className={cn(
                      "text-sm font-medium",
                      message.type === "success"
                        ? "text-green-700"
                        : "text-red-700"
                    )}
                  >
                    {message.text}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card size="sm">
              <CardHeader>
                <CardTitle>Mot de passe</CardTitle>
                <CardDescription>
                  Modifiez votre mot de passe pour sécuriser votre compte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field>
                  <FieldLabel>Nouveau mot de passe</FieldLabel>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </Field>
                <Field>
                  <FieldLabel>Confirmer le mot de passe</FieldLabel>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </Field>
                <Button
                  onClick={handleChangePassword}
                  disabled={isSaving || !newPassword}
                  className="flex items-center gap-2"
                >
                  {isSaving ? (
                    <Spinner className="size-4" />
                  ) : (
                    <HugeiconsIcon
                      icon={SaveIcon}
                      strokeWidth={2}
                      className="size-4"
                    />
                  )}
                  {isSaving ? "Modification..." : "Modifier le mot de passe"}
                </Button>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={SmartPhone01Icon}
                      strokeWidth={2}
                      className="size-5"
                    />
                    Sessions actives
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                  >
                    Déconnecter tout
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                  <div className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                    <HugeiconsIcon
                      icon={LaptopIcon}
                      strokeWidth={2}
                      className="size-4.5"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Session Actuelle
                      </h3>
                      <Badge
                        variant="outline"
                        className="text-[10px] text-primary"
                      >
                        En ligne
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {currentUser?.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      case "ia":
        return <IASettings />
      case "sauvegarde":
        return <BackupSettings />
      case "apropos":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                À propos
              </h2>
              <p className="text-sm text-muted-foreground">
                Informations sur l'application
              </p>
            </div>
            <Card size="sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-5">
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/20 shadow-xs">
                    <Logo size="lg" collapsed flatMark />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">{APP_NAME}</h3>
                    <p className="text-sm text-muted-foreground">
                      Logiciel de gestion vétérinaire
                    </p>
                    <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                      <span>Version 2.0.0</span>
                      <span>•</span>
                      <span>19 avril 2026</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                      Developpement
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <Avatar
                        src={sanitizeAvatarValue(userDoc?.avatarUrl || currentUser?.avatarUrl || avatarUrl)}
                        name="Zouhir Kherroubi"
                        size="lg"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Zouhir Kherroubi
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Developpeur de bAItari
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                      Contribution medicale
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <Avatar
                        src="/dr-aissa-zeghouini.jpg"
                        name="Dr Aissa Zeghouini"
                        size="lg"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Dr Aissa Zeghouini
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Contributeur cite dans la conception et l'evolution clinique de bAItari.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 pt-4 pb-6 lg:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-end">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Badge variant="outline" className="h-10 rounded-xl px-4 text-sm font-normal">
            {roleLabel}
          </Badge>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="scrollbar-hide flex overflow-x-auto rounded-[24px] border border-border bg-card p-2 shadow-none">
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "relative flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium whitespace-nowrap transition-all",
                isActive
                  ? "bg-[var(--color-surface-soft)] text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <HugeiconsIcon
                icon={item.icon}
                strokeWidth={isActive ? 2 : 1.5}
                className="size-4"
              />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">{renderContent()}</div>
    </div>
  )
}

function SidebarLayoutSettings() {
  const { variant, setVariant, collapsible, setCollapsible, resetLayout } =
    useLayout()

  const variants = [
    { value: "inset" as const, label: "Inset", description: "Intégré dans la page" },
    { value: "sidebar" as const, label: "Sidebar", description: "Barre latérale classique" },
    { value: "floating" as const, label: "Floating", description: "Flottant avec bordure" },
  ]

  const collapsibles = [
    { value: "icon" as const, label: "Icônes", description: "Réduit en icônes" },
    { value: "offcanvas" as const, label: "Offcanvas", description: "Se masque complètement" },
    { value: "none" as const, label: "Fixe", description: "Toujours visible" },
  ]

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Disposition de la barre latérale</CardTitle>
        <CardDescription>
          Choisissez le style et le comportement de la sidebar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Variante
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {variants.map((v) => {
              const isActive = variant === v.value
              return (
                <button
                  key={v.value}
                  onClick={() => setVariant(v.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all",
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <div className="flex h-10 w-14 items-stretch gap-0.5 overflow-hidden rounded-md border border-border/60 bg-muted-foreground/[0.04]">
                    {v.value === "sidebar" ? (
                      <>
                        <div className="flex w-5 shrink-0 flex-col border-e border-border/60 bg-muted-foreground/[0.13]">
                          <div className="mx-1 mt-1 h-1.5 rounded-full bg-muted-foreground/35" />
                          <div className="mx-1 mt-0.5 h-1 rounded-full bg-muted-foreground/25" />
                          <div className="mx-1 mt-1 h-[1px] bg-border/70" />
                          <div className="mx-1 mt-1 h-1 rounded-full bg-muted-foreground/25" />
                          <div className="mx-1 mt-0.5 h-1 rounded-full bg-muted-foreground/20" />
                        </div>
                        <div className="flex flex-1 flex-col">
                          <div className="h-2 border-b border-border/70 bg-muted-foreground/[0.08]" />
                          <div className="mx-1 mt-1 h-1 rounded-full bg-muted-foreground/25" />
                          <div className="mx-1 mt-0.5 h-1 rounded-full bg-muted-foreground/20" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className={cn(
                            "w-3.5 shrink-0",
                            v.value === "floating"
                              ? "m-0.5 rounded-sm bg-muted-foreground/20"
                              : v.value === "inset"
                                ? "bg-muted-foreground/15"
                                : "bg-muted-foreground/20"
                          )}
                        />
                        <div className="flex-1 bg-muted-foreground/5" />
                      </>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {v.label}
                  </span>
                  {isActive && (
                    <div className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        strokeWidth={2}
                        className="size-2.5"
                      />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Comportement au collapse
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {collapsibles.map((c) => {
              const isActive = collapsible === c.value
              return (
                <button
                  key={c.value}
                  onClick={() => setCollapsible(c.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all",
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <span className="text-xs font-medium text-foreground">
                    {c.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {c.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={resetLayout}>
          Réinitialiser la disposition
        </Button>
      </CardContent>
    </Card>
  )
}

export default React.memo(Parametres)
