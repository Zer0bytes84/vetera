import { InvoiceSettingsPanel } from "@/modules/invoices/components/invoice-settings-panel";
import { LicenseStatusCard } from "@/components/LicenseStatusCard";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  DatabaseIcon,
  Delete01Icon,
  InformationSquareIcon,
  LaptopIcon,
  Refresh01Icon,
  SaveIcon,
  Shield01Icon,
  PencilEdit01Icon,
  UserCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { relaunch } from "@tauri-apps/plugin-process";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useLayout } from "@/contexts/layout-provider";
import { useUsersRepository } from "@/data/repositories";
import { APP_NAME } from "@/lib/brand";
import { writeCachedProfile } from "@/lib/profile-cache";
import {
  ACCENT_THEMES,
  applyTheme,
  getThemeConfig,
  saveThemeConfig,
  type ThemeConfig,
} from "@/lib/theme-store";
import { cn } from "@/lib/utils";
import { openActivationAdminWindow } from "@/services/activationAdminWindowService";
import {
  type BackupInfo,
  createBackup,
  deleteBackup,
  exportDatabase,
  getAppVersion,
  getLastBackupDate,
  importDatabase,
  listBackups,
  restoreBackup,
} from "@/services/backupService";
import { isTauriRuntime } from "@/services/browser-store";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { updatePassword } from "@/services/sqlite/auth";
import {
  getCurrentProgress,
  initializeWebLLM,
  isWebLLMLoading,
  isWebLLMReady,
  resetWebLLM,
  type ProgressReport,
  subscribeToProgress,
} from "@/services/webLLMService";
import { getModelPreferences } from "@/lib/ai-models";
import type { View } from "@/types";
import Avatar, { PROFILE_AVATAR_EMOJIS } from "./Avatar";
import Logo from "./Logo";
import { ThemeModeToggle } from "./theme-mode-toggle";

type SettingsTab =
  | "cabinet"
  | "profil"
  | "apparence"
  | "securite"
  | "ia"
  | "sauvegarde"
  | "apropos";

type SettingsNavItem = {
  id: SettingsTab;
  label: string;
  description: string;
  icon: typeof UserCircle02Icon;
  keywords?: string[];
};

type SettingsNavGroup = {
  label: string;
  items: SettingsNavItem[];
};

const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: "Personnel",
    items: [
      {
        id: "profil",
        label: "Profil",
        description: "Identité, avatar et coordonnées",
        icon: UserCircle02Icon,
        keywords: ["nom", "email", "téléphone", "cabinet", "photo", "avatar", "bio"],
      },
      {
        id: "securite",
        label: "Sécurité",
        description: "Mot de passe et accès",
        icon: Shield01Icon,
        keywords: ["mot de passe", "password", "connexion", "session"],
      },
    ],
  },
  {
    label: "Espace de travail",
    items: [
      { id: "cabinet", label: "Cabinet & factures", description: "Coordonnées, logo et présentation des PDF", icon: InformationSquareIcon },
      {
        id: "apparence",
        label: "Apparence",
        description: "Thème, couleur et navigation",
        icon: LaptopIcon,
        keywords: ["clair", "sombre", "dark", "couleur", "accent", "police", "font", "arrondi", "sidebar", "barre latérale"],
      },
      {
        id: "ia",
        label: "Rédaction",
        description: "Outils de rédaction sur cet appareil",
        icon: PencilEdit01Icon,
        keywords: ["assistant", "modèle", "modèle local", "intelligence artificielle", "webllm"],
      },
    ],
  },
  {
    label: "Données & système",
    items: [
      {
        id: "sauvegarde",
        label: "Sauvegarde",
        description: "Protéger et restaurer les données",
        icon: DatabaseIcon,
        keywords: ["backup", "export", "import", "restaurer", "base de données"],
      },
      {
        id: "apropos",
        label: "À propos",
        description: "Version et activation",
        icon: InformationSquareIcon,
        keywords: ["version", "équipe", "crédits", "support", "aide"],
      },
    ],
  },
];

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
      if (report.status === "ready") {
        setModelStatus("ready");
      } else if (report.status === "error") {
        setModelStatus("error");
      } else if (report.status === "loading") {
        setModelStatus("downloading");
      } else {
        setModelStatus("not_downloaded");
      }
    });

    return unsubscribe;
  }, []);

  const handleDownloadModel = async () => {
    setIsInitializing(true);
    setModelStatus("downloading");

    try {
      const preferences = getModelPreferences();
      await initializeWebLLM(preferences.defaultModelId, (report) => {
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
    <section className="settings-panel">
      <div className="settings-panel-heading">
        <h3>Rédaction assistée sur cet appareil</h3>
        <p>Correction, reformulation et résumé des notes, une fois le modèle installé.</p>
      </div>
      <div className="settings-row">
        <div>
          <p className="settings-row-title">
            {modelStatus === "ready" ? "Prêt à utiliser" : modelStatus === "downloading" ? "Installation en cours" : modelStatus === "error" ? "Installation interrompue" : "Modèle non installé"}
          </p>
          <p className="settings-row-detail">
            {modelStatus === "ready" ? "Fonctionne localement, y compris sans connexion." : modelStatus === "downloading" ? `${progress.text.startsWith("Fetching param") ? "Téléchargement des fichiers du modèle…" : /shader|pipeline/i.test(progress.text) ? "Préparation du modèle sur le GPU…" : progress.text} · ${Math.round(progress.progress * 100)} %` : modelStatus === "error" ? progress.text : "Installation nécessaire pour les outils de rédaction hors ligne."}
          </p>
        </div>
        {(modelStatus === "not_downloaded" || modelStatus === "error") && (
          <Button disabled={isInitializing} onClick={handleDownloadModel}>
            {isInitializing && <Spinner className="size-4" />}
            {modelStatus === "error" ? "Réessayer" : "Installer"}
          </Button>
        )}
        {modelStatus === "ready" && <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Actif</span>}
        {modelStatus === "downloading" && (
          <div className="flex shrink-0 items-center gap-3">
            <Spinner className="size-4" />
            <Button variant="outline" onClick={() => { void resetWebLLM(); }}>Annuler</Button>
          </div>
        )}
      </div>
      {modelStatus === "downloading" && (
        <div className="px-6 pb-5">
          <div role="progressbar" aria-label="Installation du modèle local" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.progress * 100)} className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${Math.round(progress.progress * 100)}%` }} />
          </div>
        </div>
      )}
      <p className="border-t border-border px-6 py-4 text-xs leading-5 text-muted-foreground">
        Le modèle est téléchargé une fois puis conservé sur cet appareil. Les fonctions locales n’envoient pas vos notes à un service distant.
      </p>
    </section>
  );
};

// Backup Settings Component
const BackupSettings: React.FC = () => {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ kind: "restore" | "delete" | "import"; filename?: string } | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const desktop = isTauriRuntime();

  const load = async () => {
    setLoading(true);
    try {
      const [items, date] = await Promise.all([listBackups(), getLastBackupDate()]);
      setBackups(items);
      setLastBackup(date);
    } catch {
      toast.error("Impossible de lire les sauvegardes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  const formatDate = (date: string) => new Date(date).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

  const run = async (operation: () => Promise<boolean | BackupInfo | null>, success: string, restart = false) => {
    setBusy(true);
    try {
      const result = await operation();
      if (!result) {
        if (success.startsWith("Sauvegarde")) toast.error("L’opération a échoué. Réessayez.");
        return;
      }
      toast.success(success);
      if (restart) {
        try { await relaunch(); } catch { window.location.reload(); }
      } else {
        await load();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L’opération a échoué. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const confirmPending = () => {
    if (!pending) return;
    const action = pending;
    const password = passphrase || undefined;
    setPending(null);
    setPassphrase("");
    if (action.kind === "restore" && action.filename) {
      void run(() => restoreBackup(action.filename!, password), "Sauvegarde restaurée. Redémarrage…", true);
    } else if (action.kind === "delete" && action.filename) {
      void run(() => deleteBackup(action.filename!), "Sauvegarde supprimée.");
    } else {
      void run(() => importDatabase(password), "Base importée. Redémarrage…", true);
    }
  };

  return (
    <div className="settings-section-stack">
      {!desktop && <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">Les sauvegardes de la base sont disponibles dans l’application de bureau.</p>}
      <section className="settings-panel">
        <div className="settings-row border-t-0">
          <div>
            <p className="settings-row-title">Dernière sauvegarde</p>
            <p className="settings-row-detail">{lastBackup ? formatDate(lastBackup) : "Aucune sauvegarde enregistrée"}</p>
          </div>
          <Button disabled={!desktop || busy || loading} onClick={() => void run(() => createBackup("manual"), "Sauvegarde créée.")}>
            {busy && <Spinner className="size-4" />}
            Sauvegarder maintenant
          </Button>
        </div>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Copie externe</p>
            <p className="settings-row-detail">Conserver une copie de la base sur un autre support.</p>
          </div>
          <Button disabled={!desktop || busy} onClick={() => void run(() => exportDatabase(), "Base exportée.")} variant="outline">Exporter</Button>
        </div>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Importer une base</p>
            <p className="settings-row-detail">Remplace les données actuelles par celles du fichier choisi.</p>
          </div>
          <Button disabled={!desktop || busy} onClick={() => setPending({ kind: "import" })} variant="outline">Importer…</Button>
        </div>
      </section>
      <section className="settings-panel">
        <div className="settings-panel-heading flex items-center justify-between gap-3">
          <div>
            <h3>Sauvegardes conservées</h3>
            <p>Les cinq dernières copies sont conservées automatiquement.</p>
          </div>
          <Button aria-label="Actualiser les sauvegardes" disabled={loading || busy} onClick={() => void load()} size="icon-sm" variant="ghost">
            <HugeiconsIcon className={cn("size-4", loading && "animate-spin")} icon={Refresh01Icon} strokeWidth={1.8} />
          </Button>
        </div>
        {loading ? <div className="flex justify-center p-6"><Spinner /></div> : backups.length === 0 ? (
          <p className="border-t border-border px-6 py-6 text-sm text-muted-foreground">Votre première copie apparaîtra ici après la sauvegarde.</p>
        ) : backups.map((backup) => (
          <div className="settings-row" key={backup.filename}>
            <div>
              <p className="settings-row-title">{formatDate(backup.date)}</p>
              <p className="settings-row-detail">Version {backup.version} · {backup.filename.includes("auto") ? "Automatique" : "Manuelle"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button disabled={busy} onClick={() => setPending({ kind: "restore", filename: backup.filename })} size="sm" variant="outline">Restaurer…</Button>
              <Button aria-label={`Supprimer la sauvegarde du ${formatDate(backup.date)}`} disabled={busy} onClick={() => setPending({ kind: "delete", filename: backup.filename })} size="icon-sm" variant="ghost">
                <HugeiconsIcon className="size-4" icon={Delete01Icon} strokeWidth={1.8} />
              </Button>
            </div>
          </div>
        ))}
      </section>
      <p className="text-xs leading-5 text-muted-foreground">Une copie de sécurité est créée avant toute importation ou restauration.</p>
      <AlertDialog open={pending !== null} onOpenChange={(open) => { if (!open) { setPending(null); setPassphrase(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.kind === "delete" ? "Supprimer cette sauvegarde ?" : pending?.kind === "restore" ? "Restaurer cette sauvegarde ?" : "Importer une base de données ?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === "delete" ? "Cette copie sera supprimée définitivement. Les données actuelles du cabinet resteront intactes." : "Les données actuelles seront remplacées. Une copie de sécurité sera conservée et l’application redémarrera après l’opération."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pending?.kind !== "delete" && (
            <Field>
              <FieldLabel htmlFor="backup-password">Mot de passe de la sauvegarde, si chiffrée</FieldLabel>
              <Input autoComplete="off" id="backup-password" onChange={(event) => setPassphrase(event.target.value)} type="password" value={passphrase} />
            </Field>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPending} variant={pending?.kind === "delete" ? "destructive" : "default"}>{pending?.kind === "delete" ? "Supprimer" : pending?.kind === "restore" ? "Restaurer" : "Choisir le fichier"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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


    };

    loadProfileState();

  }, [currentUser, userDoc]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    applyTheme(themeConfig, isDark);
    saveThemeConfig(themeConfig);
  }, [currentTheme, themeConfig]);

  const handleThemeConfigChange = (newConfig: ThemeConfig) => {
    setThemeConfig(newConfig);
  };

  const navItems = SETTINGS_NAV_GROUPS.flatMap((group) => group.items);
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
          <div className="settings-section-stack">
            {message && (
              <p className={cn("rounded-lg border px-4 py-3 text-sm", message.type === "success" ? "border-emerald-500/25 text-emerald-700 dark:text-emerald-300" : "border-destructive/25 text-destructive")} role="status">
                {message.text}
              </p>
            )}
            <section className="settings-panel">
              <div className="settings-profile-identity">
                <Avatar name={displayName} size="xl" src={avatarUrl} />
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold">{displayName || "Votre profil"}</h3>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{currentUser?.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{roleLabel}</p>
                </div>
              </div>
              <details className="settings-avatar-picker">
                <summary>Changer l’avatar</summary>
                <div className="mt-4 flex flex-wrap gap-2">
                  {PROFILE_AVATAR_EMOJIS.map((emoji) => {
                    const value = `emoji:${emoji}`;
                    return (
                      <button
                        aria-label={`Choisir l’avatar ${emoji}`}
                        aria-pressed={avatarUrl === value}
                        className={cn("settings-avatar-choice", avatarUrl === value && "settings-avatar-choice-active")}
                        key={emoji}
                        onClick={() => setAvatarUrl(value)}
                        type="button"
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => setAvatarUrl("")} size="sm" type="button" variant="outline">Automatique</Button>
                  <label className={cn(buttonVariants({ size: "sm", variant: "outline" }), "cursor-pointer")} htmlFor="profile-photo-upload">Choisir une photo</label>
                  <input accept="image/*" className="sr-only" id="profile-photo-upload" onChange={handleImageUpload} type="file" />
                </div>
              </details>
            </section>
            <section className="settings-panel">
              <div className="settings-panel-heading">
                <h3>Informations professionnelles</h3>
                <p>Vos coordonnées personnelles dans l’équipe.</p>
              </div>
              <div className="settings-profile-fields">
                <Field>
                  <FieldLabel htmlFor="settings-name">Nom complet</FieldLabel>
                  <Input id="settings-name" autoComplete="name" onChange={(event) => setDisplayName(event.target.value)} value={displayName} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="settings-phone">Téléphone</FieldLabel>
                  <Input id="settings-phone" autoComplete="tel" onChange={(event) => setPhone(event.target.value)} placeholder="+213…" type="tel" value={phone} />
                </Field>
              </div>
              <div className="settings-profile-footer">
                <Button disabled={isSaving} onClick={handleSaveProfile}>
                  {isSaving && <Spinner className="size-4" />}
                  Enregistrer
                </Button>
              </div>
            </section>
          </div>
        );
      case "cabinet":
        return null;
      case "apparence":
        return (
          <div className="settings-section-stack">
            <section className="settings-panel">
              <div className="settings-panel-heading">
                <h3>Affichage</h3>
                <p>Un espace lisible, de jour comme de nuit.</p>
              </div>
              <div className="settings-row">
                <div>
                  <p className="settings-row-title">Mode</p>
                  <p className="settings-row-detail">Suit votre environnement ou reste fixe.</p>
                </div>
                <ThemeModeToggle
                  mode={currentTheme}
                  onChange={(nextMode) => onThemeChange?.(nextMode)}
                />
              </div>
              <div className="settings-row">
                <div>
                  <p className="settings-row-title">Couleur d’accent</p>
                  <p className="settings-row-detail">Repère discret dans l’interface.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(ACCENT_THEMES) as [keyof typeof ACCENT_THEMES, typeof ACCENT_THEMES.blue][]).map(([key, theme]) => (
                    <button
                      aria-label={`Couleur ${theme.label}`}
                      aria-pressed={themeConfig.accent === key}
                      className={cn("settings-swatch", themeConfig.accent === key && "settings-swatch-active")}
                      key={key}
                      onClick={() => handleThemeConfigChange({ ...themeConfig, accent: key })}
                      title={theme.label}
                      type="button"
                    >
                      <span className={cn("size-5 rounded-full bg-gradient-to-br", theme.previewGradient)} />
                    </button>
                  ))}
                </div>
              </div>
            </section>
            <SidebarLayoutSettings />
          </div>
        );
      case "securite":
        return (
          <div className="settings-section-stack">
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
                  <FieldLabel htmlFor="settings-password">Nouveau mot de passe</FieldLabel>
                  <Input
                    id="settings-password"
                    autoComplete="new-password"
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    type="password"
                    value={newPassword}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="settings-confirm">Confirmer le mot de passe</FieldLabel>
                  <Input
                    id="settings-confirm"
                    autoComplete="new-password"
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


          </div>
        );
      case "ia":
        return <IASettings />;
      case "sauvegarde":
        return <BackupSettings />;
      case "apropos":
        return (
          <div className="settings-section-stack">
            <section className="settings-panel">
              <div className="flex items-center gap-4 p-6">
                <Logo collapsed size="lg" />
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold">{APP_NAME}</h3>
                  <p className="text-sm text-muted-foreground">Version {getAppVersion()}</p>
                </div>
              </div>
            </section>
            <LicenseStatusCard />
            <section className="settings-panel">
              <div className="settings-row">
                <div>
                  <p className="settings-row-title">Centre d’activation</p>
                  <p className="settings-row-detail">Gérer les accès accordés aux testeurs.</p>
                </div>
                <Button
                  onClick={() => {
                    openActivationAdminWindow().catch((error) => {
                      toast.error(error instanceof Error ? error.message : "Impossible d’ouvrir le centre d’activation.");
                    });
                  }}
                  type="button"
                  variant="outline"
                >
                  Ouvrir
                </Button>
              </div>
            </section>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <div>
          <h1>Paramètres</h1>
          <p>Votre compte, votre espace et les données du cabinet.</p>
        </div>
      </div>
      <div className="settings-page-layout">
        <nav aria-label="Sections des paramètres" className="settings-page-nav">
          {SETTINGS_NAV_GROUPS.map((group) => (
            <div className="settings-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => (
                <button
                  aria-current={activeTab === item.id ? "page" : undefined}
                  className={cn("settings-nav-item", activeTab === item.id && "settings-nav-item-active")}
                  key={item.id}
                  onClick={(event) => {
                    const scrollContainer = event.currentTarget.closest('[data-slot="sidebar-inset"]');
                    setActiveTab(item.id);
                    requestAnimationFrame(() => scrollContainer?.scrollTo({ top: 0, behavior: "instant" }));
                  }}
                  type="button"
                >
                  <HugeiconsIcon icon={item.icon} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <section aria-labelledby="settings-section-title" className="settings-page-main">
          <div className="settings-content-heading">
            <h2 id="settings-section-title">{activeNavItem.label}</h2>
            <p>{activeNavItem.description}</p>
          </div>
          <div className="settings-content" hidden={activeTab !== "cabinet"}><InvoiceSettingsPanel /></div>
          {activeTab !== "cabinet" && <div className="settings-content" key={activeTab}>{renderContent()}</div>}
        </section>
      </div>
    </div>
  );
};

function SidebarLayoutSettings() {
  const { variant, setVariant, collapsible, setCollapsible, glassContrast, setGlassContrast } = useLayout();
  return (
    <section className="settings-panel">
      <div className="settings-panel-heading">
        <h3>Navigation</h3>
        <p>Choisissez l’espace qui convient à votre façon de travailler.</p>
      </div>
      <div className="settings-row">
        <div>
          <p className="settings-row-title">Présentation</p>
          <p className="settings-row-detail">La version épurée laisse plus de place au contenu.</p>
        </div>
        <div className="settings-segmented" role="group" aria-label="Présentation de la barre latérale">
          {([
            ["minimal", "Épurée"],
            ["inset", "Encadrée"],
          ] as const).map(([value, label]) => (
            <button
              aria-pressed={variant === value}
              className={cn(variant === value && "settings-segmented-active")}
              key={value}
              onClick={() => setVariant(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-row">
        <div>
          <p className="settings-row-title">Réduire la barre latérale</p>
          <p className="settings-row-detail">Laissez les icônes visibles ou masquez la barre.</p>
        </div>
        <div className="settings-segmented" role="group" aria-label="Réduction de la barre latérale">
          {([
            ["icon", "Icônes"],
            ["offcanvas", "Masquée"],
            ["none", "Jamais"],
          ] as const).map(([value, label]) => (
            <button
              aria-pressed={collapsible === value}
              className={cn(collapsible === value && "settings-segmented-active")}
              key={value}
              onClick={() => setCollapsible(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {variant === "glass" && (
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Contraste du verre</p>
            <p className="settings-row-detail">Réglage conservé pour votre disposition actuelle.</p>
          </div>
          <div className="flex w-40 items-center gap-3">
            <Slider aria-label="Contraste du verre" max={100} min={0} onValueChange={(value) => setGlassContrast(Array.isArray(value) ? value[0] ?? 0 : value)} value={[glassContrast]} />
            <span className="text-xs tabular-nums">{glassContrast}%</span>
          </div>
        </div>
      )}
    </section>
  );
}

export default React.memo(Parametres);
