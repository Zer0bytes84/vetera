import {
  Alert02Icon,
  BookOpenTextIcon,
  Camera01Icon,
  CheckmarkCircle02Icon,
  CodeCircleIcon,
  DatabaseIcon,
  Delete01Icon,
  Download01Icon,
  HardDriveIcon,
  InformationSquareIcon,
  LaptopIcon,
  Notification02Icon,
  Package02Icon,
  Refresh01Icon,
  SaveIcon,
  Shield01Icon,
  SmartPhone01Icon,
  SparklesIcon,
  StethoscopeIcon,
  TestTube01Icon,
  Upload01Icon,
  UserCircle02Icon,
  Wifi01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { relaunch } from "@tauri-apps/plugin-process";
import React, { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useLayout } from "@/contexts/layout-provider";
import { useUsersRepository } from "@/data/repositories";
import { APP_NAME } from "@/lib/brand";
import { writeCachedProfile } from "@/lib/profile-cache";
import {
  ACCENT_THEMES,
  applyTheme,
  FONT_MAP,
  getThemeConfig,
  RADIUS_MAP,
  saveThemeConfig,
  type ThemeConfig,
} from "@/lib/theme-store";
import { cn } from "@/lib/utils";
import { getSetting, setSetting } from "@/services/appSettingsService";
import {
  type BackupInfo,
  createBackup,
  deleteBackup,
  exportDatabase,
  getAppVersion,
  getLastBackupDate,
  importDatabase,
  importDatabaseFromFile,
  listBackups,
  restoreBackup,
} from "@/services/backupService";
import { updatePassword } from "@/services/sqlite/auth";
import {
  getCurrentProgress,
  initializeWebLLM,
  isWebLLMLoading,
  isWebLLMReady,
  type ProgressReport,
  subscribeToProgress,
} from "@/services/webLLMService";
import type { View } from "@/types";
import Avatar, { PROFILE_AVATAR_EMOJIS } from "./Avatar";
import Logo from "./Logo";
import { ThemeModeToggle } from "./theme-mode-toggle";

type SettingsTab =
  | "profil"
  | "apparence"
  | "notifications"
  | "securite"
  | "ia"
  | "sauvegarde"
  | "apropos";
// IA Settings Component
const IASettings: React.FC = () => {
  const [modelStatus, setModelStatus] = useState<
    "not_downloaded" | "downloading" | "ready" | "error"
  >("not_downloaded");
  const [progress, setProgress] = useState<ProgressReport>({
    progress: 0,
    text: "Initializing...",
  });
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (isWebLLMReady()) {
      setModelStatus("ready");
    } else if (isWebLLMLoading()) {
      setModelStatus("downloading");
      setProgress(getCurrentProgress());
    }

    const unsubscribe = subscribeToProgress((report) => {
      setProgress(report);
      if (report.progress === 1 && report.text === "Completed") {
        setModelStatus("ready");
      } else if (report.text === "Error") {
        setModelStatus("error");
      } else {
        setModelStatus("downloading");
      }
    });

    return unsubscribe;
  }, []);

  const handleDownloadModel = async () => {
    setIsInitializing(true);
    setModelStatus("downloading");

    try {
      await initializeWebLLM((report) => {
        setProgress(report);
      });
      setModelStatus("ready");
    } catch (error) {
      console.error("[IASettings] Model download failed:", error);
      setModelStatus("error");
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="fade-in animate-in space-y-6 duration-300">
      <div>
        <h2 className="mb-1 font-medium text-foreground text-xl">
          Assistant intelligent
        </h2>
        <p className="text-muted-foreground text-sm">
          Assistant IA intégré, fonctionne 100% en local et hors ligne
        </p>
      </div>

      <Card size="sm">
        <CardContent className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
            <HugeiconsIcon
              className="size-6"
              icon={SparklesIcon}
              strokeWidth={2}
            />
          </div>
          <div className="flex-1">
            <h3 className="mb-1 font-medium text-foreground text-lg">
              Assistant IA
            </h3>
            <p className="mb-3 text-muted-foreground text-sm">
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
          className="border-amber-200 bg-amber-500/5 dark:border-amber-500/20"
          size="sm"
        >
          <CardContent className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
              <HugeiconsIcon
                className="size-4"
                icon={Download01Icon}
                strokeWidth={2}
              />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 font-semibold text-amber-800 text-sm dark:text-amber-400">
                Assistant non installé
              </h3>
              <p className="mb-3 text-amber-700 text-xs dark:text-amber-500">
                Installez l'assistant pour utiliser les fonctions IA hors ligne.
                Les données restent sur votre appareil.
              </p>
              <Button
                className="rounded-[0.95rem] bg-[linear-gradient(135deg,#ea580c,#f97316)]"
                disabled={isInitializing}
                onClick={handleDownloadModel}
              >
                {isInitializing ? (
                  <Spinner className="size-4" />
                ) : (
                  <HugeiconsIcon
                    className="size-4"
                    icon={Download01Icon}
                    strokeWidth={2}
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
          className="border-blue-200 bg-blue-500/5 dark:border-blue-500/20"
          size="sm"
        >
          <CardContent className="flex items-start gap-3">
            <Spinner className="mt-0.5 size-5 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <h3 className="mb-2 font-semibold text-blue-800 text-sm dark:text-blue-400">
                Téléchargement en cours...
              </h3>
              <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900/30">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${progress.progress * 100}%` }}
                />
              </div>
              <p className="text-blue-700 text-xs dark:text-blue-500">
                {progress.text} - {(progress.progress * 100).toFixed(0)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {modelStatus === "ready" && (
        <Card
          className="border-green-200 bg-green-500/5 dark:border-green-500/20"
          size="sm"
        >
          <CardContent className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
              <HugeiconsIcon
                className="size-4"
                icon={CheckmarkCircle02Icon}
                strokeWidth={2}
              />
            </div>
            <div>
              <h3 className="font-semibold text-green-800 text-sm dark:text-green-400">
                Assistant prêt
              </h3>
              <p className="text-green-700 text-xs dark:text-green-500">
                L'assistant est actif et prêt à l'emploi. Fonctionne même hors
                ligne !
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {modelStatus === "error" && (
        <Card
          className="border-red-200 bg-red-500/5 dark:border-red-500/20"
          size="sm"
        >
          <CardContent className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
              <HugeiconsIcon
                className="size-4"
                icon={Alert02Icon}
                strokeWidth={2}
              />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 font-semibold text-red-800 text-sm dark:text-red-400">
                Erreur de téléchargement
              </h3>
              <p className="mb-3 text-red-700 text-xs dark:text-red-500">
                Le modèle n'a pas pu être téléchargé. Vérifiez votre connexion
                internet et réessayez.
              </p>
              <Button onClick={handleDownloadModel} variant="destructive">
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card size="sm">
        <CardContent>
          <h4 className="mb-3 font-semibold text-foreground text-sm">
            Avantages du modèle local
          </h4>
          <div className="space-y-2 text-muted-foreground text-xs">
            <div className="flex items-start gap-2">
              <HugeiconsIcon
                className="mt-0.5 size-3.5 shrink-0 text-green-500"
                icon={Wifi01Icon}
                strokeWidth={2}
              />
              <span>
                <strong>Hors ligne :</strong> Fonctionne sans connexion internet
                après téléchargement
              </span>
            </div>
            <div className="flex items-start gap-2">
              <HugeiconsIcon
                className="mt-0.5 size-3.5 shrink-0 text-blue-500"
                icon={Shield01Icon}
                strokeWidth={2}
              />
              <span>
                <strong>Confidentialité :</strong> Vos données restent 100%
                locales sur votre appareil
              </span>
            </div>
            <div className="flex items-start gap-2">
              <HugeiconsIcon
                className="mt-0.5 size-3.5 shrink-0 text-purple-500"
                icon={Package02Icon}
                strokeWidth={2}
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
  );
};

// Backup Settings Component
const BackupSettings: React.FC = () => {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isAwaitingImportFile, setIsAwaitingImportFile] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  useEffect(() => {
    loadBackupData();
  }, []);

  const loadBackupData = async () => {
    setIsLoading(true);
    try {
      const [backupList, lastDate] = await Promise.all([
        listBackups(),
        getLastBackupDate(),
      ]);
      setBackups(backupList);
      setLastBackup(lastDate);
    } catch (error) {
      console.error("[BackupSettings] Error loading backup data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      await createBackup("manual");
      await loadBackupData();
      alert("✅ Sauvegarde créée avec succès !");
    } catch (error) {
      console.error("[BackupSettings] Error creating backup:", error);
      alert("❌ Erreur lors de la création de la sauvegarde");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir restaurer cette sauvegarde ?\n\nCela remplacera toutes vos données actuelles.\n\n⚠️ L'application devra être redémarrée manuellement.`
      )
    ) {
      return;
    }

    setIsRestoring(filename);
    setFeedbackMessage(null);
    try {
      const success = await restoreBackup(filename);
      if (success) {
        setFeedbackMessage({
          type: "success",
          text: "✅ Restauration réussie ! Redémarrage automatique...",
        });
        setTimeout(async () => {
          try {
            await relaunch();
          } catch (e) {
            console.error("[BackupSettings] Relaunch failed:", e);
            window.location.reload();
          }
        }, 1200);
      } else {
        setFeedbackMessage({
          type: "error",
          text: "❌ Erreur lors de la restauration",
        });
      }
    } catch (error) {
      console.error("[BackupSettings] Error restoring backup:", error);
      setFeedbackMessage({
        type: "error",
        text: "❌ Erreur: " + String(error),
      });
    } finally {
      setIsRestoring(null);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const success = await exportDatabase();
      if (success) {
        alert("✅ Base de données exportée avec succès !");
      }
    } catch (error) {
      console.error("[BackupSettings] Error exporting:", error);
      alert("❌ Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (
      !confirm(
        "⚠️ Attention : cela remplacera toutes vos données actuelles par celles du fichier sélectionné.\n\nContinuer ?"
      )
    ) {
      return;
    }
    setFeedbackMessage(null);
    setIsImporting(true);
    setIsAwaitingImportFile(false);

    try {
      const success = await importDatabase();
      if (success) {
        setFeedbackMessage({
          type: "success",
          text: "✅ Base de données importée ! L'application va redémarrer...",
        });

        setTimeout(async () => {
          try {
            await relaunch();
          } catch (e) {
            console.error("[BackupSettings] Relaunch failed:", e);
            window.location.reload();
          }
        }, 1200);
      } else {
        setFeedbackMessage({
          type: "error",
          text: "❌ Import annulé ou impossible",
        });
      }
    } catch (error) {
      console.error("[BackupSettings] Error importing:", error);
      setFeedbackMessage({
        type: "error",
        text:
          "❌ " +
          (error instanceof Error
            ? error.message
            : "Erreur lors de l'importation"),
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      setIsAwaitingImportFile(false);
      setIsImporting(false);
      return;
    }

    setIsImporting(true);
    setIsAwaitingImportFile(false);
    try {
      const success = await importDatabaseFromFile(file);
      if (success) {
        setFeedbackMessage({
          type: "success",
          text: "✅ Base de données importée ! L'application va redémarrer...",
        });
        setTimeout(async () => {
          try {
            await relaunch();
          } catch (e) {
            console.error("[BackupSettings] Relaunch failed:", e);
            window.location.reload();
          }
        }, 1200);
      } else {
        setFeedbackMessage({
          type: "error",
          text: "❌ Échec de l'importation",
        });
      }
    } catch (error) {
      console.error("[BackupSettings] Error importing from file:", error);
      setFeedbackMessage({
        type: "error",
        text:
          "❌ " +
          (error instanceof Error
            ? error.message
            : "Erreur lors de l'importation"),
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm("Supprimer cette sauvegarde ?")) {
      return;
    }
    try {
      await deleteBackup(filename);
      await loadBackupData();
    } catch (error) {
      console.error("[BackupSettings] Error deleting backup:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fade-in animate-in space-y-6 duration-300">
      <div>
        <h2 className="mb-1 font-medium text-foreground text-xl">
          Sauvegarde & Données
        </h2>
        <p className="text-muted-foreground text-sm">
          Protégez vos données avec des sauvegardes automatiques
        </p>
      </div>

      {feedbackMessage && (
        <Card
          className={cn(
            "slide-in-from-top animate-in duration-300",
            feedbackMessage.type === "success"
              ? "border-green-200 bg-green-500/5 dark:border-green-800"
              : "border-red-200 bg-red-500/5 dark:border-red-800"
          )}
          size="sm"
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
        className="border-emerald-200 bg-emerald-500/5 dark:border-emerald-800"
        size="sm"
      >
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-800/50">
              <HugeiconsIcon
                className="size-6 text-emerald-600 dark:text-emerald-400"
                icon={HardDriveIcon}
                strokeWidth={2}
              />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Dernière sauvegarde
              </h3>
              <p className="text-muted-foreground text-sm">
                {lastBackup ? formatDate(lastBackup) : "Aucune sauvegarde"}
              </p>
            </div>
          </div>
          <Button disabled={isCreating} onClick={handleCreateBackup}>
            {isCreating ? (
              <Spinner className="size-4" />
            ) : (
              <HugeiconsIcon
                className="size-4.5"
                icon={DatabaseIcon}
                strokeWidth={2}
              />
            )}
            {isCreating ? "Création..." : "Créer une sauvegarde"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <input
          accept=".db,.sqlite,.sqlite3"
          className="hidden"
          onChange={handleImportFileChange}
          ref={importInputRef}
          type="file"
        />
        <Button
          className="h-auto justify-start gap-3 p-4"
          disabled={isExporting}
          onClick={handleExport}
          variant="outline"
        >
          <HugeiconsIcon
            className="size-5 text-primary"
            icon={Download01Icon}
            strokeWidth={2}
          />
          <div className="text-left">
            <div className="font-medium text-foreground">Exporter la base</div>
            <div className="text-muted-foreground text-xs">
              Sauvegarder vers un fichier
            </div>
          </div>
        </Button>
        <Button
          className="h-auto justify-start gap-3 p-4"
          disabled={isImporting || isAwaitingImportFile}
          onClick={handleImport}
          variant="outline"
        >
          <HugeiconsIcon
            className="size-5 text-primary"
            icon={Upload01Icon}
            strokeWidth={2}
          />
          <div className="text-left">
            <div className="font-medium text-foreground">Importer une base</div>
            <div className="text-muted-foreground text-xs">
              {isAwaitingImportFile
                ? "Choisissez maintenant votre sauvegarde"
                : "Restaurer depuis un fichier"}
            </div>
          </div>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          className="h-auto justify-start gap-3 p-4"
          disabled={isLoading}
          onClick={loadBackupData}
          variant="outline"
        >
          <HugeiconsIcon
            className={cn(
              "size-5 text-muted-foreground",
              isLoading && "animate-spin"
            )}
            icon={Refresh01Icon}
            strokeWidth={2}
          />
          <div className="text-left">
            <div className="font-medium text-foreground">Actualiser</div>
            <div className="text-muted-foreground text-xs">
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
            <div className="flex items-center justify-center p-6">
              <Spinner />
            </div>
          ) : backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <HugeiconsIcon
                className="mb-2 size-8 text-muted-foreground/50"
                icon={DatabaseIcon}
                strokeWidth={2}
              />
              <p className="text-muted-foreground text-sm">
                Aucune sauvegarde disponible
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                Créez votre première sauvegarde pour protéger vos données
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {backups.map((backup) => (
                <div
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30"
                  key={backup.filename}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                      <HugeiconsIcon
                        className="size-4.5 text-blue-600 dark:text-blue-400"
                        icon={DatabaseIcon}
                        strokeWidth={2}
                      />
                    </div>
                    <div>
                      <div className="font-medium text-foreground text-sm">
                        {formatDate(backup.date)}
                      </div>
                      <div className="text-muted-foreground text-xs">
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
                      className="text-primary"
                      disabled={isRestoring === backup.filename}
                      onClick={() => handleRestoreBackup(backup.filename)}
                      size="sm"
                      variant="ghost"
                    >
                      {isRestoring === backup.filename ? (
                        <Spinner className="size-3.5" />
                      ) : (
                        <HugeiconsIcon
                          className="size-3.5"
                          icon={Upload01Icon}
                          strokeWidth={2}
                        />
                      )}
                      Restaurer
                    </Button>
                    <Button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteBackup(backup.filename)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <HugeiconsIcon
                        className="size-3.5"
                        icon={Delete01Icon}
                        strokeWidth={2}
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
        className="border-blue-200 bg-blue-500/5 dark:border-blue-800"
        size="sm"
      >
        <CardContent>
          <h4 className="mb-2 flex items-center gap-2 font-medium text-blue-800 dark:text-blue-300">
            <HugeiconsIcon
              className="size-4"
              icon={InformationSquareIcon}
              strokeWidth={2}
            />
            Protection automatique
          </h4>
          <ul className="space-y-1.5 text-blue-700 text-sm dark:text-blue-400">
            <li className="flex items-start gap-2">
              <HugeiconsIcon
                className="mt-0.5 size-3.5 shrink-0"
                icon={CheckmarkCircle02Icon}
                strokeWidth={2}
              />
              <span>
                Sauvegarde automatique à chaque mise à jour de l'application
              </span>
            </li>
            <li className="flex items-start gap-2">
              <HugeiconsIcon
                className="mt-0.5 size-3.5 shrink-0"
                icon={CheckmarkCircle02Icon}
                strokeWidth={2}
              />
              <span>
                Conservation des 5 dernières sauvegardes (rotation automatique)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <HugeiconsIcon
                className="mt-0.5 size-3.5 shrink-0"
                icon={CheckmarkCircle02Icon}
                strokeWidth={2}
              />
              <span>Sauvegarde de sécurité avant chaque restauration</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

interface ParametresProps {
  currentTheme?: "light" | "dark" | "system";
  onNavigate?: (view: View) => void;
  onThemeChange?: (theme: "light" | "dark" | "system") => void;
}

const Parametres: React.FC<ParametresProps> = ({
  currentTheme = "light",
  onNavigate,
  onThemeChange,
}) => {
  const sanitizeAvatarValue = (value?: string | null) => {
    if (typeof value !== "string") {
      return "";
    }
    const normalized = value.trim();
    if (!normalized) {
      return "";
    }
    if (["undefined", "null", "nan"].includes(normalized.toLowerCase())) {
      return "";
    }
    return normalized;
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>("profil");
  const { currentUser, refreshCurrentUser } = useAuth();
  const { data: users, update: updateUserDoc } = useUsersRepository();
  const userDoc = users.find((u) => u.email === currentUser?.email);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() =>
    getThemeConfig()
  );

  useEffect(() => {
    let cancelled = false;

    const loadProfileState = async () => {
      if (currentUser) {
        setDisplayName(currentUser.displayName || "");
      }
      if (userDoc) {
        setPhone(userDoc.phone || "");
        setAvatarUrl(sanitizeAvatarValue(userDoc.avatarUrl));
      } else if (currentUser?.email === "zohir.kh@gmail.com") {
        setDisplayName("Zouhir Kherroubi");
      }

      try {
        const [savedBio, savedClinicName, savedCabinetName, savedPracticeName] =
          await Promise.all([
            getSetting("profile_bio"),
            getSetting("clinic_name"),
            getSetting("cabinet_name"),
            getSetting("practice_name"),
          ]);

        if (cancelled) {
          return;
        }
        setBio(savedBio || "");
        setClinicName(
          savedClinicName || savedCabinetName || savedPracticeName || ""
        );
      } catch (error) {
        console.error("[SETTINGS] Error loading profile settings:", error);
      }
    };

    loadProfileState();

    return () => {
      cancelled = true;
    };
  }, [currentUser, userDoc]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    applyTheme(themeConfig, isDark);
    saveThemeConfig(themeConfig);
  }, [currentTheme, themeConfig]);

  const handleThemeConfigChange = (newConfig: ThemeConfig) => {
    setThemeConfig(newConfig);
  };

  const navItems: {
    id: SettingsTab;
    label: string;
    icon: typeof UserCircle02Icon;
  }[] = [
    { id: "profil", label: "Profil", icon: UserCircle02Icon },
    { id: "apparence", label: "Apparence", icon: LaptopIcon },
    { id: "notifications", label: "Notifications", icon: Notification02Icon },
    { id: "securite", label: "Sécurité", icon: Shield01Icon },
    { id: "ia", label: "IA Locale", icon: SparklesIcon },
    { id: "sauvegarde", label: "Sauvegarde", icon: DatabaseIcon },
    { id: "apropos", label: "À propos", icon: InformationSquareIcon },
  ];

  const activeNavItem =
    navItems.find((item) => item.id === activeTab) ?? navItems[0];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 1024 * 1024) {
      setMessage({
        type: "error",
        text: "L'image est trop volumineuse (Max 1Mo). Préférez un avatar animal si besoin.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) {
      return;
    }
    setIsSaving(true);
    setMessage(null);

    try {
      const dbUser = users.find(
        (u) => u.id === currentUser.id || u.email === currentUser.email
      );

      if (!dbUser) {
        setMessage({
          type: "error",
          text: "Utilisateur non trouvé dans la base de données.",
        });
        return;
      }

      await updateUserDoc(dbUser.id, {
        displayName,
        phone,
        avatarUrl: sanitizeAvatarValue(avatarUrl),
      });

      await Promise.all([
        setSetting("profile_bio", bio.trim()),
        setSetting("clinic_name", clinicName.trim()),
        setSetting("cabinet_name", clinicName.trim()),
        setSetting("practice_name", clinicName.trim()),
      ]);

      writeCachedProfile(currentUser.email, {
        displayName,
        avatarUrl: sanitizeAvatarValue(avatarUrl),
      });

      await refreshCurrentUser();

      setMessage({ type: "success", text: "Profil mis à jour avec succès." });
    } catch (error) {
      console.error("[SETTINGS] Error updating profile:", error);
      setMessage({
        type: "error",
        text: "Une erreur est survenue lors de la mise à jour.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser) {
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({
        type: "error",
        text: "Les nouveaux mots de passe ne correspondent pas.",
      });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "Le mot de passe doit contenir au moins 6 caractères.",
      });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      await updatePassword(currentUser.uid, newPassword);

      setMessage({
        type: "success",
        text: "Mot de passe modifié avec succès.",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Password change error:", error);
      if (error.code === "auth/requires-recent-login") {
        setMessage({
          type: "error",
          text: "Par sécurité, veuillez vous reconnecter avant de changer le mot de passe.",
        });
      } else {
        setMessage({
          type: "error",
          text: `Erreur: ${error.message || String(error)}`,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleDisplay = () => {
    if (currentUser?.email === "zohir.kh@gmail.com") {
      return "Super Administrateur";
    }
    const role = userDoc?.role || "stagiaire";
    switch (role) {
      case "admin":
        return "Administrateur";
      case "vet_principal":
        return "Vétérinaire Principal";
      case "vet_adjoint":
        return "Vétérinaire Adjoint";
      case "assistant":
        return "Assistant(e)";
      default:
        return "Stagiaire";
    }
  };

  const roleLabel = getRoleDisplay();

  const renderContent = () => {
    switch (activeTab) {
      case "profil":
        return (
          <div className="space-y-4">
            {message && (
              <Card
                className={cn(
                  message.type === "success"
                    ? "border-green-200 bg-green-500/5"
                    : "border-red-200 bg-red-500/5"
                )}
                size="sm"
              >
                <CardContent className="flex items-center gap-3 p-4">
                  {message.type === "success" ? (
                    <HugeiconsIcon
                      className="size-4.5 text-green-700"
                      icon={CheckmarkCircle02Icon}
                      strokeWidth={2}
                    />
                  ) : (
                    <HugeiconsIcon
                      className="size-4.5 text-red-700"
                      icon={Alert02Icon}
                      strokeWidth={2}
                    />
                  )}
                  <p
                    className={cn(
                      "font-medium text-sm",
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

            <Card className="overflow-hidden" size="sm">
              <CardContent className="grid p-0 lg:grid-cols-[300px_minmax(0,1fr)]">
                <aside className="border-border/70 border-b bg-muted/20 p-5 lg:border-r lg:border-b-0 dark:border-white/10 dark:bg-white/[0.025]">
                  <div className="flex items-center gap-4 lg:flex-col lg:items-start">
                    <Avatar
                      className="ring-4 ring-background"
                      name={displayName}
                      size="xl"
                      src={avatarUrl}
                    />
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-xl tracking-tight">
                        {displayName || "Votre profil"}
                      </h2>
                      <p className="mt-1 truncate text-muted-foreground text-sm">
                        {currentUser?.email}
                      </p>
                      <Badge className="mt-3 rounded-full" variant="outline">
                        {roleLabel}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-6 border-border/70 border-t pt-5 dark:border-white/10">
                    <p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.15em]">
                      Choisir un avatar
                    </p>
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {PROFILE_AVATAR_EMOJIS.map((emoji) => {
                        const value = `emoji:${emoji}`;
                        const selected = avatarUrl === value;
                        return (
                          <button
                            aria-label={`Choisir l’avatar ${emoji}`}
                            aria-pressed={selected}
                            className={cn(
                              "flex aspect-square items-center justify-center rounded-xl border text-xl transition-all hover:-translate-y-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                              selected
                                ? "border-primary bg-primary/8 ring-2 ring-primary/15"
                                : "border-border/70 bg-background/70 dark:border-white/10 dark:bg-white/[0.025]"
                            )}
                            key={emoji}
                            onClick={() => setAvatarUrl(value)}
                            type="button"
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        className="justify-center"
                        onClick={() => setAvatarUrl("")}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Automatique
                      </Button>
                      <label
                        className={cn(
                          buttonVariants({ size: "sm", variant: "outline" }),
                          "justify-center gap-2"
                        )}
                        htmlFor="profile-photo-upload"
                      >
                        <HugeiconsIcon
                          className="size-4"
                          icon={Camera01Icon}
                          strokeWidth={1.8}
                        />
                        Photo
                      </label>
                      <input
                        accept="image/*"
                        className="hidden"
                        id="profile-photo-upload"
                        onChange={handleImageUpload}
                        type="file"
                      />
                    </div>
                    <p className="mt-3 text-muted-foreground text-xs leading-relaxed">
                      Votre choix apparaît partout dans l’application après
                      l’enregistrement.
                    </p>
                  </div>
                </aside>

                <div className="p-5 lg:p-6">
                  <div className="mb-5">
                    <h3 className="font-semibold text-lg tracking-tight">
                      Identité professionnelle
                    </h3>
                    <p className="mt-1 text-muted-foreground text-sm">
                      Les informations utiles au cabinet et aux documents.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel>Nom de la clinique / cabinet</FieldLabel>
                      <Input
                        onChange={(e) => setClinicName(e.target.value)}
                        placeholder="Ex: Clinique vétérinaire du Centre"
                        type="text"
                        value={clinicName}
                      />
                      <FieldDescription>
                        Ce nom apparaîtra dans l'en-tête des factures.
                      </FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel>Nom complet</FieldLabel>
                      <Input
                        onChange={(e) => setDisplayName(e.target.value)}
                        type="text"
                        value={displayName}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Email</FieldLabel>
                      <Input
                        disabled
                        type="email"
                        value={currentUser?.email || ""}
                      />
                      <FieldDescription>
                        L'email ne peut pas être modifié
                      </FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel>Téléphone</FieldLabel>
                      <Input
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+213..."
                        type="tel"
                        value={phone}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Rôle</FieldLabel>
                      <Input disabled type="text" value={roleLabel} />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel>Bio</FieldLabel>
                    <Textarea
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Quelques mots sur vous, votre spécialité ou le ton du cabinet..."
                      value={bio}
                    />
                  </Field>
                  <div className="mt-5 flex justify-end border-border/70 border-t pt-5 dark:border-white/10">
                    <Button
                      className="flex items-center gap-2"
                      disabled={isSaving}
                      onClick={handleSaveProfile}
                    >
                      {isSaving ? (
                        <Spinner className="size-4" />
                      ) : (
                        <HugeiconsIcon
                          className="size-4"
                          icon={CheckmarkCircle02Icon}
                          strokeWidth={2}
                        />
                      )}
                      Enregistrer les modifications
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case "apparence":
        return (
          <div className="grid gap-4 xl:grid-cols-2">
            <AppearancePreview config={themeConfig} />
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
                    const isActive = themeConfig.accent === key;
                    return (
                      <button
                        className={cn(
                          "group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all hover:scale-[1.02]",
                          isActive
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/30"
                        )}
                        key={key}
                        onClick={() =>
                          handleThemeConfigChange({
                            ...themeConfig,
                            accent: key,
                          })
                        }
                      >
                        {key === "noir" ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-current border-dashed font-semibold text-[10px] transition-transform group-hover:scale-110">
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
                        <span className="font-medium text-[10px] text-muted-foreground">
                          {theme.label}
                        </span>
                        {isActive && (
                          <div className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                            <HugeiconsIcon
                              className="size-3"
                              icon={CheckmarkCircle02Icon}
                              strokeWidth={2}
                            />
                          </div>
                        )}
                      </button>
                    );
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
                    const isActive = themeConfig.font === font;
                    const f = FONT_MAP[font];
                    return (
                      <button
                        className={cn(
                          "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                          isActive
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/30"
                        )}
                        key={font}
                        onClick={() =>
                          handleThemeConfigChange({ ...themeConfig, font })
                        }
                      >
                        <span
                          className="font-semibold text-foreground text-lg"
                          style={{ fontFamily: f.css }}
                        >
                          Aa
                        </span>
                        <div className="text-center">
                          <div className="font-medium text-[10px] text-foreground">
                            {f.label}
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            {f.description}
                          </div>
                        </div>
                        {isActive && (
                          <div className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                            <HugeiconsIcon
                              className="size-3"
                              icon={CheckmarkCircle02Icon}
                              strokeWidth={2}
                            />
                          </div>
                        )}
                      </button>
                    );
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
                    const isActive = themeConfig.radius === radius;
                    return (
                      <button
                        className={cn(
                          "flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                          isActive
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/30"
                        )}
                        key={radius}
                        onClick={() =>
                          handleThemeConfigChange({ ...themeConfig, radius })
                        }
                      >
                        <div
                          className="h-8 w-12 border-2 transition-all"
                          style={{
                            borderRadius: RADIUS_MAP[radius],
                            borderColor: isActive
                              ? "var(--primary)"
                              : "var(--border)",
                          }}
                        />
                        <span className="font-medium text-[10px] text-muted-foreground uppercase">
                          {radius}
                        </span>
                      </button>
                    );
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
                      const isActive = themeConfig.density === density;
                      return (
                        <button
                          className={cn(
                            "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                            isActive
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card hover:border-primary/30"
                          )}
                          key={density}
                          onClick={() =>
                            handleThemeConfigChange({ ...themeConfig, density })
                          }
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
                          <span className="font-medium text-[10px] text-muted-foreground capitalize">
                            {density === "compact"
                              ? "Compact"
                              : density === "comfortable"
                                ? "Confortable"
                                : "Spacieux"}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sidebar Layout */}
            <SidebarLayoutSettings />
          </div>
        );
      case "notifications":
        return (
          <div className="space-y-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Alertes du cabinet</CardTitle>
                <CardDescription>
                  Choisissez les informations qui méritent votre attention.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2">
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
                    className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/15 p-4 transition-colors hover:bg-muted/35 dark:border-white/10 dark:bg-white/[0.025]"
                    key={i}
                  >
                    <div>
                      <h3 className="font-medium text-foreground text-sm">
                        {item.title}
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        {item.sub}
                      </p>
                    </div>
                    <Switch defaultChecked={item.checked} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        );
      case "securite":
        return (
          <div className="grid gap-4 xl:grid-cols-2">
            {message && (
              <Card
                className={cn(
                  "xl:col-span-2",
                  message.type === "success"
                    ? "border-green-200 bg-green-500/5"
                    : "border-red-200 bg-red-500/5"
                )}
                size="sm"
              >
                <CardContent className="flex items-center gap-3 p-4">
                  {message.type === "success" ? (
                    <HugeiconsIcon
                      className="size-4.5 text-green-700"
                      icon={CheckmarkCircle02Icon}
                      strokeWidth={2}
                    />
                  ) : (
                    <HugeiconsIcon
                      className="size-4.5 text-red-700"
                      icon={Alert02Icon}
                      strokeWidth={2}
                    />
                  )}
                  <p
                    className={cn(
                      "font-medium text-sm",
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
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    type="password"
                    value={newPassword}
                  />
                </Field>
                <Field>
                  <FieldLabel>Confirmer le mot de passe</FieldLabel>
                  <Input
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    type="password"
                    value={confirmPassword}
                  />
                </Field>
                <Button
                  className="flex items-center gap-2"
                  disabled={isSaving || !newPassword}
                  onClick={handleChangePassword}
                >
                  {isSaving ? (
                    <Spinner className="size-4" />
                  ) : (
                    <HugeiconsIcon
                      className="size-4"
                      icon={SaveIcon}
                      strokeWidth={2}
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
                      className="size-5"
                      icon={SmartPhone01Icon}
                      strokeWidth={2}
                    />
                    Sessions actives
                  </span>
                  <Button
                    className="text-destructive"
                    size="sm"
                    variant="ghost"
                  >
                    Déconnecter tout
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                  <div className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                    <HugeiconsIcon
                      className="size-4.5"
                      icon={LaptopIcon}
                      strokeWidth={2}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm">
                        Session Actuelle
                      </h3>
                      <Badge
                        className="text-[10px] text-primary"
                        variant="outline"
                      >
                        En ligne
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {currentUser?.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case "ia":
        return <IASettings />;
      case "sauvegarde":
        return (
          <div className="space-y-6">
            <BackupSettings />
            <Card className="border-dashed" size="sm">
              <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <HugeiconsIcon
                      className="size-5"
                      icon={BookOpenTextIcon}
                      strokeWidth={1.8}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Archives de notes</h3>
                    <p className="mt-1 max-w-xl text-muted-foreground text-sm">
                      Les anciennes notes sont conservées, mais retirées du
                      parcours quotidien pour alléger l'application.
                    </p>
                  </div>
                </div>
                <Button
                  className="shrink-0"
                  onClick={() => onNavigate?.("notes")}
                  variant="outline"
                >
                  Consulter l'archive
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      case "apropos":
        return (
          <div className="space-y-4">
            <Card className="overflow-hidden" size="sm">
              <CardContent className="p-0">
                <div className="flex flex-col gap-5 border-border/70 border-b bg-muted/15 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background shadow-xs">
                      <Logo collapsed size="lg" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading font-semibold text-foreground text-lg tracking-tight">
                        {APP_NAME}
                      </h3>
                      <p className="mt-0.5 text-muted-foreground text-sm">
                        La pratique vétérinaire, mieux organisée.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full" variant="outline">
                      Version {getAppVersion()}
                    </Badge>
                    <Badge className="rounded-full" variant="secondary">
                      Données locales
                    </Badge>
                  </div>
                </div>

                <div className="p-5">
                  <div className="mb-4">
                    <p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
                      Équipe Baitari
                    </p>
                    <p className="mt-1 text-muted-foreground text-sm">
                      Produit, expertise clinique et validation terrain réunis
                      autour d'un même outil.
                    </p>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    <article className="relative overflow-hidden rounded-2xl border border-sky-200/70 bg-sky-50/55 p-4 dark:border-sky-900/50 dark:bg-sky-950/20">
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-sky-500/70" />
                      <div className="flex items-start justify-between gap-3">
                        <Avatar
                          name="Zouhir Kherroubi"
                          size="lg"
                          src="/zouhir-kherroubi.jpg"
                        />
                        <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300">
                          <HugeiconsIcon
                            className="size-[18px]"
                            icon={CodeCircleIcon}
                            strokeWidth={1.8}
                          />
                        </div>
                      </div>
                      <h4 className="mt-4 font-semibold text-foreground text-sm">
                        Zouhir Kherroubi
                      </h4>
                      <p className="mt-0.5 font-medium text-sky-700 text-xs dark:text-sky-300">
                        Fondateur · Produit & Ingénierie
                      </p>
                      <p className="mt-3 text-muted-foreground text-xs leading-relaxed">
                        Conçoit l'expérience, l'architecture et les fonctions
                        intelligentes qui donnent vie à Baitari.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {["Produit", "Architecture", "IA"].map((skill) => (
                          <span
                            className="rounded-full border border-sky-200/70 bg-background/75 px-2 py-1 font-medium text-[10px] text-sky-800 dark:border-sky-900/60 dark:text-sky-200"
                            key={skill}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </article>

                    <article className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-emerald-50/55 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-500/70" />
                      <div className="flex items-start justify-between gap-3">
                        <Avatar
                          name="Dr Aissa Zeghouini"
                          size="lg"
                          src="/dr-aissa-zeghouini.jpg"
                        />
                        <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          <HugeiconsIcon
                            className="size-[18px]"
                            icon={StethoscopeIcon}
                            strokeWidth={1.8}
                          />
                        </div>
                      </div>
                      <h4 className="mt-4 font-semibold text-foreground text-sm">
                        Dr Aissa Zeghouini
                      </h4>
                      <p className="mt-0.5 font-medium text-emerald-700 text-xs dark:text-emerald-300">
                        Co-fondateur · Référent clinique
                      </p>
                      <p className="mt-3 text-muted-foreground text-xs leading-relaxed">
                        Oriente les parcours de soin et veille à leur cohérence
                        avec les réalités quotidiennes de la clinique.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {["Parcours de soin", "Protocoles", "Priorités"].map(
                          (skill) => (
                            <span
                              className="rounded-full border border-emerald-200/70 bg-background/75 px-2 py-1 font-medium text-[10px] text-emerald-800 dark:border-emerald-900/60 dark:text-emerald-200"
                              key={skill}
                            >
                              {skill}
                            </span>
                          )
                        )}
                      </div>
                    </article>

                    <article className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-amber-50/55 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-amber-500/70" />
                      <div className="flex items-start justify-between gap-3">
                        <Avatar
                          name="Karim Abderrahmani"
                          size="lg"
                          src="/karim-abderrahmani.jpg"
                        />
                        <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          <HugeiconsIcon
                            className="size-[18px]"
                            icon={TestTube01Icon}
                            strokeWidth={1.8}
                          />
                        </div>
                      </div>
                      <h4 className="mt-4 font-semibold text-foreground text-sm">
                        Karim Abderrahmani
                      </h4>
                      <p className="mt-0.5 font-medium text-amber-700 text-xs dark:text-amber-300">
                        Validation terrain · Qualité d'usage
                      </p>
                      <p className="mt-3 text-muted-foreground text-xs leading-relaxed">
                        Teste l'application, identifie les points de friction et
                        enrichit le produit grâce à son expertise terrain.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {["Tests", "Ergonomie", "Retours métier"].map(
                          (skill) => (
                            <span
                              className="rounded-full border border-amber-200/70 bg-background/75 px-2 py-1 font-medium text-[10px] text-amber-800 dark:border-amber-900/60 dark:text-amber-200"
                              key={skill}
                            >
                              {skill}
                            </span>
                          )
                        )}
                      </div>
                    </article>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="settings-workspace dashboard-stage flex w-full min-w-0 flex-col gap-4 px-4 pt-16 pb-8 md:pt-24 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-semibold text-[11px] text-primary uppercase tracking-[0.18em]">
            Espace de configuration
          </p>
          <h1 className="mt-1 font-heading font-semibold text-2xl tracking-[-0.035em] sm:text-3xl">
            Paramètres
          </h1>
          <p className="mt-1 max-w-xl text-muted-foreground text-sm">
            Adaptez Baitari à votre identité, votre équipe et votre façon de
            travailler.
          </p>
        </div>
        <Badge className="w-fit rounded-full px-3 py-1.5" variant="outline">
          {roleLabel}
        </Badge>
      </div>

      <nav
        aria-label="Sections des paramètres"
        className="scrollbar-hide flex overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white/75 p-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.03)] backdrop-blur-xl dark:border-white/12 dark:bg-white/[0.035]"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              className={cn(
                "relative flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 font-medium text-sm transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-black/[0.035] hover:text-foreground dark:hover:bg-white/[0.06]"
              )}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
            >
              <HugeiconsIcon
                className="size-4"
                icon={item.icon}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <section
        aria-labelledby="settings-section-title"
        className="min-h-[400px]"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-muted/40 text-foreground dark:border-white/10 dark:bg-white/[0.05]">
            <HugeiconsIcon
              className="size-[18px]"
              icon={activeNavItem.icon}
              strokeWidth={1.7}
            />
          </div>
          <h2 className="font-semibold text-base" id="settings-section-title">
            {activeNavItem.label}
          </h2>
        </div>
        <div className="settings-content">{renderContent()}</div>
      </section>
    </div>
  );
};

function AppearancePreview({ config }: { config: ThemeConfig }) {
  const { collapsible, variant } = useLayout();
  const densityLabel = {
    compact: "Compacte",
    comfortable: "Confortable",
    spacious: "Aérée",
  }[config.density];
  const layoutLabel = {
    floating: "Flottante",
    inset: "Encadrée",
    minimal: "Épurée",
    sidebar: "Classique",
  }[variant];
  const collapseLabel = {
    icon: "Icônes",
    none: "Désactivée",
    offcanvas: "Masquée",
  }[collapsible];

  return (
    <Card className="xl:col-span-2" size="sm">
      <CardHeader>
        <CardTitle>Aperçu de votre espace</CardTitle>
        <CardDescription>
          Les changements sont appliqués instantanément et conservés sur cet
          appareil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div
            className={cn(
              "overflow-hidden rounded-2xl p-2",
              variant === "minimal"
                ? "bg-transparent"
                : "border border-border/80 bg-muted/20 dark:border-white/12 dark:bg-black/20"
            )}
          >
            <div
              className={cn(
                "flex h-44 overflow-hidden rounded-xl bg-background",
                variant === "minimal"
                  ? "shadow-[0_16px_40px_-34px_rgba(15,23,42,0.3)]"
                  : "border border-border/70 shadow-sm dark:border-white/10"
              )}
            >
              <div
                className={cn(
                  "flex shrink-0 flex-col bg-muted/25 p-2 transition-all dark:bg-white/[0.025]",
                  variant !== "minimal" &&
                    "border-border/70 border-r dark:border-white/10",
                  collapsible === "icon" ? "w-11" : "w-28",
                  collapsible === "offcanvas" && "w-1 p-0"
                )}
              >
                {collapsible !== "offcanvas" && (
                  <>
                    <div className="mb-4 flex items-center gap-2">
                      <div className="size-5 rounded-md bg-primary" />
                      {collapsible !== "icon" && (
                        <span className="font-semibold text-[9px]">
                          Baitari
                        </span>
                      )}
                    </div>
                    {[0, 1, 2, 3].map((item) => (
                      <div
                        className={cn(
                          "mb-1.5 flex h-6 items-center gap-2 rounded-md px-1.5",
                          item === 0
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        )}
                        key={item}
                      >
                        <div className="size-2.5 shrink-0 rounded-sm border border-current/50" />
                        {collapsible !== "icon" && (
                          <span className="h-1 w-12 rounded-full bg-current opacity-55" />
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
              <div className="min-w-0 flex-1 p-3">
                <div className="flex items-center justify-between border-border/60 border-b pb-2 dark:border-white/10">
                  <div className="h-2 w-24 rounded-full bg-foreground/70" />
                  <div className="size-5 rounded-full border border-border bg-muted dark:border-white/10" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((item) => (
                    <div
                      className="rounded-lg border border-border/70 bg-card p-2 dark:border-white/10"
                      key={item}
                    >
                      <div className="size-3 rounded bg-primary/15" />
                      <div className="mt-3 h-2 w-8 rounded-full bg-foreground/75" />
                      <div className="mt-1.5 h-1 w-full rounded-full bg-muted-foreground/20" />
                    </div>
                  ))}
                </div>
                <div className="mt-2 h-14 rounded-lg border border-border/70 bg-card p-2 dark:border-white/10">
                  <div className="h-1.5 w-20 rounded-full bg-foreground/65" />
                  <div className="mt-3 flex items-end gap-1">
                    {[35, 58, 42, 72, 54, 82, 64].map((height, index) => (
                      <div
                        className="flex-1 rounded-t-sm bg-primary/70"
                        key={`${height}-${index}`}
                        style={{ height: `${height / 4}px` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid content-start gap-2">
            {[
              ["Police", FONT_MAP[config.font].label],
              ["Densité", densityLabel],
              ["Navigation", layoutLabel],
              ["Réduction", collapseLabel],
            ].map(([label, value]) => (
              <div
                className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/15 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.025]"
                key={label}
              >
                <span className="text-muted-foreground text-xs">{label}</span>
                <span className="font-medium text-xs">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SidebarLayoutSettings() {
  const { variant, setVariant, collapsible, setCollapsible, resetLayout } =
    useLayout();

  const variants = [
    {
      value: "inset" as const,
      label: "Encadrée",
      description: "Contenu détaché et vitré",
    },
    {
      value: "minimal" as const,
      label: "Épurée",
      description: "Inset sans bordure",
    },
    {
      value: "sidebar" as const,
      label: "Classique",
      description: "Pleine hauteur",
    },
    {
      value: "floating" as const,
      label: "Flottante",
      description: "Marge extérieure",
    },
  ];

  const collapsibles = [
    {
      value: "icon" as const,
      label: "Compacte",
      description: "Réduction en icônes",
    },
    {
      value: "offcanvas" as const,
      label: "Masquée",
      description: "Libère tout l’espace",
    },
    {
      value: "none" as const,
      label: "Toujours ouverte",
      description: "Navigation permanente",
    },
  ];

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
          <Label className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Variante
          </Label>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {variants.map((v) => {
              const isActive = variant === v.value;
              const sidebarPreviewClass = {
                floating: "m-0.5 rounded-sm bg-muted-foreground/20",
                inset: "bg-muted-foreground/15",
                minimal: "m-0.5 rounded-sm bg-muted-foreground/8",
                sidebar: "bg-muted-foreground/20",
              }[v.value];
              return (
                <button
                  className={cn(
                    "relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
                    isActive
                      ? "border-primary bg-primary/8 ring-2 ring-primary/10"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                  key={v.value}
                  onClick={() => setVariant(v.value)}
                >
                  <div className="flex h-10 w-14 items-stretch gap-0.5 overflow-hidden rounded-md border border-border/60 bg-muted-foreground/[0.04]">
                    {v.value === "sidebar" ? (
                      <>
                        <div className="flex w-5 shrink-0 flex-col border-border/60 border-e bg-muted-foreground/[0.13]">
                          <div className="mx-1 mt-1 h-1.5 rounded-full bg-muted-foreground/35" />
                          <div className="mx-1 mt-0.5 h-1 rounded-full bg-muted-foreground/25" />
                          <div className="mx-1 mt-1 h-[1px] bg-border/70" />
                          <div className="mx-1 mt-1 h-1 rounded-full bg-muted-foreground/25" />
                          <div className="mx-1 mt-0.5 h-1 rounded-full bg-muted-foreground/20" />
                        </div>
                        <div className="flex flex-1 flex-col">
                          <div className="h-2 border-border/70 border-b bg-muted-foreground/[0.08]" />
                          <div className="mx-1 mt-1 h-1 rounded-full bg-muted-foreground/25" />
                          <div className="mx-1 mt-0.5 h-1 rounded-full bg-muted-foreground/20" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className={cn(
                            "w-3.5 shrink-0",
                            sidebarPreviewClass
                          )}
                        />
                        <div className="flex-1 bg-muted-foreground/5" />
                      </>
                    )}
                  </div>
                  <span className="font-medium text-foreground text-xs">
                    {v.label}
                  </span>
                  <span className="text-center text-[9px] text-muted-foreground">
                    {v.description}
                  </span>
                  {isActive && (
                    <div className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                      <HugeiconsIcon
                        className="size-3"
                        icon={CheckmarkCircle02Icon}
                        strokeWidth={2}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Comportement au collapse
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {collapsibles.map((c) => {
              const isActive = collapsible === c.value;
              return (
                <button
                  className={cn(
                    "relative flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all",
                    isActive
                      ? "border-primary bg-primary/8 ring-2 ring-primary/10"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                  key={c.value}
                  onClick={() => setCollapsible(c.value)}
                >
                  <span className="font-medium text-foreground text-xs">
                    {c.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {c.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Button onClick={resetLayout} size="sm" variant="outline">
          Réinitialiser la disposition
        </Button>
      </CardContent>
    </Card>
  );
}

export default React.memo(Parametres);
