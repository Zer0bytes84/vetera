import { isActivationOwner } from "@/services/adminAccess";
import { LocalDataResetSettings } from "./local-data-reset-settings";
import { AboutTeam } from "./about-team";
import { MascotSettings } from "@/components/mascot/mascot-settings";
import { DashboardVersionSetting } from "@/modules/dashboard/components/dashboard-version-setting";
import { ClinicIdentityPanel, InvoiceSettingsPanel } from "@/modules/invoices/components/invoice-settings-panel";
import DocumentTemplateManager from "@/modules/documents/components/document-template-manager";
import { PatientRemindersContent } from "@/modules/patient-reminders/patient-reminders-panel";
import { usePatientReminders } from "@/modules/patient-reminders/use-patient-reminders";
import { LicenseStatusCard } from "@/components/LicenseStatusCard";
import {
  Building01Icon,
  DatabaseIcon,
  Delete01Icon,
  Door01Icon,
  File02Icon,
  InformationCircleIcon,
  LaptopIcon,
  Notification01Icon,
  ReceiptTextIcon,
  Refresh01Icon,
  Shield01Icon,
  SparklesIcon,
  PencilEdit01Icon,
  UserCircle02Icon,
  Wifi01Icon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Bell,
  History,
  IdCard,
  Info,
  KeyRound,
  LayoutDashboard,
  Palette,
  PanelLeft,
  UserRound,
  Database,
  KeySquare,
} from "lucide-react";
import { relaunch } from "@tauri-apps/plugin-process";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented-control";
import { Spinner } from "@/components/ui/spinner";
import {
  SettingsBody,
  SettingsFooter,
  SettingsNotice,
  SettingsRow,
  SettingsSection,
  SettingsStack,
} from "@/components/settings-section";
import { useAuth } from "@/contexts/AuthContext";
import { useLayout } from "@/contexts/layout-provider";
import { useUsersRepository } from "@/data/repositories";
import { APP_NAME } from "@/lib/brand";
import { writeCachedProfile } from "@/lib/profile-cache";
import {
  applyTheme,
  CLEAN_FONT_SETS,
  type CleanFontSet,
  getThemeConfig,
  normalizeCleanFont,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { updatePassword } from "@/services/sqlite/auth";
import { AIModelSettings } from "@/modules/consultations/components/ai-model-settings";
import { ClinicNetworkSettings } from "@/modules/clinic-network/clinic-network-settings";
import { RoomsSettings } from "@/modules/rooms/rooms-settings";
import { ReleaseNotesArchive } from "@/modules/release-notes/release-notes-archive";
import {
  AI_ONBOARDING_OPEN_EVENT,
  AI_SETTINGS_PENDING_KEY,
} from "@/modules/consultations/services/ai-model-provisioning";
import {
  isSettingsTab,
  SETTINGS_SECTION_EVENT,
  SETTINGS_SECTION_KEY,
  type SettingsTab,
} from "@/lib/settings-navigation";
import type { View } from "@/types";
import Avatar, { PROFILE_AVATAR_EMOJIS } from "./Avatar";
import Logo from "./Logo";
import { APP_THEMES, appThemeSettings, currentAppTheme, normalizeSkin, type AppTheme } from "@/lib/theme-skin";
import { getSidebarTone, saveSidebarTone, SIDEBAR_TONES, type SidebarTone } from "@/lib/sidebar-tone";
import { formatPersonName } from "@/utils/display-format";
import { roleLabel as displayRole } from "@/lib/user-role";
import { PageHeader } from "@/design-system/patterns/page-header";

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
        keywords: [
          "nom",
          "email",
          "téléphone",
          "photo",
          "avatar",
          "bio",
        ],
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
      {
        id: "mon-cabinet",
        label: "Mon cabinet",
        description: "Nom, adresse, coordonnées et logo du cabinet",
        icon: Building01Icon,
        keywords: ["nom", "adresse", "téléphone", "email", "e-mail", "logo", "identité", "clinique", "nif"],
      },
      {
        id: "cabinet",
        label: "Facturation",
        description: "Couleur, pied de page et aperçu des factures",
        icon: ReceiptTextIcon,
        keywords: ["facture", "pdf", "pied de page", "couleur"],
      },
      {
        id: "salles",
        label: "Salles",
        description: "Les espaces où vous recevez les animaux",
        icon: Door01Icon,
        keywords: ["salle", "consultation", "chirurgie", "bloc", "box", "espace", "agenda"],
      },
      {
        id: "apparence",
        label: "Apparence",
        description: "Thème, police et navigation",
        icon: LaptopIcon,
        keywords: [
          "clair",
          "sombre",
          "dark",
          "thème",
          "clean",
          "premium",
          "police",
          "font",
          "sidebar",
          "barre latérale",
          "peluche",
          "mascotte",
          "compagnon",
        ],
      },
      {
        id: "ia",
        label: "Assistant IA",
        description: "Dictée, rédaction et recherche sur cet appareil",
        icon: PencilEdit01Icon,
        keywords: [
          "assistant",
          "modèle",
          "modèle local",
          "intelligence artificielle",
        ],
      },
      {
        id: "rappels-medicaux",
        label: "Rappels médicaux",
        description: "Types et intervalles préventifs",
        icon: Notification01Icon,
        keywords: ["vaccin", "vermifuge", "contrôle", "dentaire", "échéance"],
      },
      {
        id: "modeles-documents",
        label: "Modèles de documents",
        description: "Formulations et champs des documents du cabinet",
        icon: File02Icon,
        keywords: [
          "ordonnance",
          "certificat",
          "compte-rendu",
          "lettre",
          "document",
          "modèle",
        ],
      },
    ],
  },
  {
    label: "Données & système",
    items: [
      {
        id: "sauvegarde",
        label: "Sauvegarde",
        description: "Sauvegarder, restaurer et réinitialiser les données",
        icon: DatabaseIcon,
        keywords: [
          "backup",
          "export",
          "import",
          "restaurer",
          "base de données",
          "réinitialisation",
          "réinitialiser",
        ],
      },
      {
        id: "reseau",
        label: "Réseau local",
        description: "Partager la base entre les postes du cabinet",
        icon: Wifi01Icon,
        keywords: ["réseau", "poste", "accueil", "secrétaire", "partage", "synchronisation", "lan"],
      },
      {
        id: "nouveautes",
        label: "Nouveautés",
        description: "Ce qui a changé à chaque version",
        icon: SparklesIcon,
        keywords: ["nouveautés", "version", "mise à jour", "quoi de neuf", "notes de version", "changements"],
      },
      {
        id: "apropos",
        label: "À propos",
        description: "Version et activation",
        icon: InformationCircleIcon,
        keywords: ["version", "équipe", "crédits", "support", "aide"],
      },
    ],
  },
];

// Backup Settings Component
const BackupSettings: React.FC = () => {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{
    kind: "restore" | "delete" | "import";
    filename?: string;
  } | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const desktop = isTauriRuntime();

  const load = async () => {
    setLoading(true);
    try {
      const [items, date] = await Promise.all([
        listBackups(),
        getLastBackupDate(),
      ]);
      setBackups(items);
      setLastBackup(date);
    } catch {
      toast.error("Impossible de lire les sauvegardes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);
  const formatDate = (date: string) =>
    new Date(date).toLocaleString("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const run = async (
    operation: () => Promise<boolean | BackupInfo | null>,
    success: string,
    restart = false,
  ) => {
    setBusy(true);
    try {
      const result = await operation();
      if (!result) {
        if (success.startsWith("Sauvegarde"))
          toast.error("L’opération a échoué. Réessayez.");
        return;
      }
      toast.success(success);
      if (restart) {
        try {
          await relaunch();
        } catch {
          window.location.reload();
        }
      } else {
        await load();
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "L’opération a échoué. Réessayez.",
      );
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
      void run(
        () => restoreBackup(action.filename!, password),
        "Sauvegarde restaurée. Redémarrage…",
        true,
      );
    } else if (action.kind === "delete" && action.filename) {
      void run(() => deleteBackup(action.filename!), "Sauvegarde supprimée.");
    } else {
      void run(
        () => importDatabase(password),
        "Base importée. Redémarrage…",
        true,
      );
    }
  };

  return (
    <SettingsStack>
      {!desktop && (
        <SettingsNotice tone="info">
          Les sauvegardes de la base sont disponibles dans l’application de bureau.
        </SettingsNotice>
      )}
      <SettingsSection
        icon={Database}
        subtitle="Une copie de sécurité est créée avant toute importation ou restauration."
        title="Sauvegarde"
      >
        <SettingsRow
          detail={lastBackup ? formatDate(lastBackup) : "Aucune sauvegarde enregistrée"}
          title="Dernière sauvegarde"
        >
          <Button
            className="rounded-full"
            disabled={!desktop || busy || loading}
            onClick={() =>
              void run(() => createBackup("manual"), "Sauvegarde créée.")
            }
          >
            {busy && <Spinner className="size-4" />}
            Sauvegarder maintenant
          </Button>
        </SettingsRow>
        <SettingsRow
          detail="Conserver une copie de la base sur un autre support."
          title="Copie externe"
        >
          <Button
            className="rounded-full"
            disabled={!desktop || busy}
            onClick={() => void run(() => exportDatabase(), "Base exportée.")}
            variant="outline"
          >
            Exporter
          </Button>
        </SettingsRow>
        <SettingsRow
          detail="Remplace les données actuelles par celles du fichier choisi."
          title="Importer une base"
        >
          <Button
            className="rounded-full"
            disabled={!desktop || busy}
            onClick={() => setPending({ kind: "import" })}
            variant="outline"
          >
            Importer…
          </Button>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection
        aside={
          <Button
            aria-label="Actualiser les sauvegardes"
            className="rounded-full"
            disabled={loading || busy}
            onClick={() => void load()}
            size="icon-sm"
            variant="ghost"
          >
            <HugeiconsIcon
              className={cn("size-4", loading && "animate-spin")}
              icon={Refresh01Icon}
              strokeWidth={1.5}
            />
          </Button>
        }
        icon={History}
        subtitle="Les cinq dernières copies sont conservées automatiquement."
        title="Sauvegardes conservées"
      >
        {loading ? (
          <div className="flex justify-center p-6">
            <Spinner />
          </div>
        ) : backups.length === 0 ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">
            Votre première copie apparaîtra ici après la sauvegarde.
          </p>
        ) : (
          backups.map((backup) => (
            <SettingsRow
              detail={`Version ${backup.version} · ${
                backup.filename.includes("auto") ? "Automatique" : "Manuelle"
              }`}
              key={backup.filename}
              title={formatDate(backup.date)}
            >
              <Button
                className="rounded-full"
                disabled={busy}
                onClick={() =>
                  setPending({ kind: "restore", filename: backup.filename })
                }
                size="sm"
                variant="outline"
              >
                Restaurer…
              </Button>
              <Button
                aria-label={`Supprimer la sauvegarde du ${formatDate(backup.date)}`}
                className="rounded-full"
                disabled={busy}
                onClick={() =>
                  setPending({ kind: "delete", filename: backup.filename })
                }
                size="icon-sm"
                variant="ghost"
              >
                <HugeiconsIcon
                  className="size-4"
                  icon={Delete01Icon}
                  strokeWidth={1.5}
                />
              </Button>
            </SettingsRow>
          ))
        )}
      </SettingsSection>
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
            setPassphrase("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === "delete"
                ? "Supprimer cette sauvegarde ?"
                : pending?.kind === "restore"
                  ? "Restaurer cette sauvegarde ?"
                  : "Importer une base de données ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === "delete"
                ? "Cette copie sera supprimée définitivement. Les données actuelles du cabinet resteront intactes."
                : "Les données actuelles seront remplacées. Une copie de sécurité sera conservée et l’application redémarrera après l’opération."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pending?.kind !== "delete" && (
            <Field>
              <FieldLabel htmlFor="backup-password">
                Mot de passe de la sauvegarde, si chiffrée
              </FieldLabel>
              <Input
                autoComplete="off"
                id="backup-password"
                onChange={(event) => setPassphrase(event.target.value)}
                type="password"
                value={passphrase}
              />
            </Field>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPending}
              variant={pending?.kind === "delete" ? "destructive" : "default"}
            >
              {pending?.kind === "delete"
                ? "Supprimer"
                : pending?.kind === "restore"
                  ? "Restaurer"
                  : "Choisir le fichier"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsStack>
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

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (typeof window === "undefined") return "profil";
    // A section asked for from elsewhere (the account menu's « Mon cabinet ») opens directly.
    const requested = window.sessionStorage.getItem(SETTINGS_SECTION_KEY);
    if (isSettingsTab(requested)) return requested;
    return window.sessionStorage.getItem(AI_SETTINGS_PENDING_KEY) === "true"
      ? "ia"
      : "profil";
  });
  useEffect(() => {
    const openAISettings = () => {
      window.sessionStorage.removeItem(AI_SETTINGS_PENDING_KEY);
      setActiveTab("ia");
    };
    const openRequestedSection = () => {
      const requested = window.sessionStorage.getItem(SETTINGS_SECTION_KEY);
      window.sessionStorage.removeItem(SETTINGS_SECTION_KEY);
      if (isSettingsTab(requested)) setActiveTab(requested);
    };
    if (window.sessionStorage.getItem(SETTINGS_SECTION_KEY)) openRequestedSection();
    else if (window.sessionStorage.getItem(AI_SETTINGS_PENDING_KEY) === "true")
      openAISettings();
    window.addEventListener(AI_ONBOARDING_OPEN_EVENT, openAISettings);
    window.addEventListener(SETTINGS_SECTION_EVENT, openRequestedSection);
    return () => {
      window.removeEventListener(AI_ONBOARDING_OPEN_EVENT, openAISettings);
      window.removeEventListener(SETTINGS_SECTION_EVENT, openRequestedSection);
    };
  }, []);
  const { currentUser, refreshCurrentUser } = useAuth();
  const medicalReminders = usePatientReminders();
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
    getThemeConfig(),
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
        (u) => u.id === currentUser.id || u.email === currentUser.email,
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

  const roleLabel = displayRole(userDoc?.role, currentUser?.email);

  const isDarkNow =
    currentTheme === "dark" ||
    (currentTheme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const appTheme = currentAppTheme(normalizeSkin(themeConfig.skin), isDarkNow);

  const renderContent = () => {
    switch (activeTab) {
      case "modeles-documents":
        return (
          <DocumentTemplateManager
            embedded
            onConfigureClinic={() => setActiveTab("mon-cabinet")}
          />
        );
      case "profil":
        return (
          <SettingsStack>
            {message && (
              <SettingsNotice tone={message.type}>{message.text}</SettingsNotice>
            )}
            <SettingsSection
              icon={UserRound}
              subtitle="Votre identité et votre avatar dans l’équipe."
              title="Profil"
            >
              <div className="flex items-center gap-3 p-6">
                <Avatar name={displayName} size="xl" src={avatarUrl} />
                <div className="min-w-0">
                  <p className="truncate text-lg font-medium">
                    {formatPersonName(displayName) || "Votre profil"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {currentUser?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </div>
              </div>
              <details className="settings-avatar-picker">
                <summary>Changer l’avatar</summary>
                <div className="mt-6 flex flex-wrap gap-3">
                  {PROFILE_AVATAR_EMOJIS.map((emoji) => {
                    const value = `emoji:${emoji}`;
                    return (
                      <button
                        aria-label={`Choisir l’avatar ${emoji}`}
                        aria-pressed={avatarUrl === value}
                        className={cn(
                          "settings-avatar-choice",
                          avatarUrl === value &&
                            "settings-avatar-choice-active",
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
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    className="rounded-full"
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
                      "cursor-pointer rounded-full",
                    )}
                    htmlFor="profile-photo-upload"
                  >
                    Choisir une photo
                  </label>
                  <input
                    accept="image/*"
                    className="sr-only"
                    id="profile-photo-upload"
                    onChange={handleImageUpload}
                    type="file"
                  />
                </div>
              </details>
            </SettingsSection>
            <SettingsSection
              icon={IdCard}
              subtitle="Vos coordonnées personnelles dans l’équipe."
              title="Informations professionnelles"
            >
              <SettingsBody>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="settings-name">Nom complet</FieldLabel>
                    <Input
                      id="settings-name"
                      autoComplete="name"
                      onChange={(event) => setDisplayName(event.target.value)}
                      value={displayName}
                    />
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="settings-phone">Téléphone</FieldLabel>
                    <Input
                      id="settings-phone"
                      autoComplete="tel"
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Numéro de téléphone"
                      type="tel"
                      value={phone}
                    />
                  </Field>
                </div>
              </SettingsBody>
              <SettingsFooter className="justify-end">
                <Button
                  className="rounded-full"
                  disabled={isSaving}
                  onClick={handleSaveProfile}
                >
                  {isSaving && <Spinner className="size-4" />}
                  Enregistrer
                </Button>
              </SettingsFooter>
            </SettingsSection>
          </SettingsStack>
        );
      case "mon-cabinet":
        return <ClinicIdentityPanel />;
      case "cabinet":
        return (
          <InvoiceSettingsPanel onOpenClinic={() => setActiveTab("mon-cabinet")} />
        );
      case "apparence":
        return (
          <SettingsStack>
            <MascotSettings />
            <SettingsSection
              icon={Palette}
              subtitle="Un espace lisible, de jour comme de nuit."
              title="Affichage"
            >
              <SettingsRow
                detail={`${APP_THEMES.find((theme) => theme.id === appTheme)?.description ?? ""}`}
                title="Thème"
              >
                <Segmented<AppTheme>
                  label="Thème"
                  onValueChange={(theme) => {
                    const { skin, mode } = appThemeSettings(theme);
                    handleThemeConfigChange({ ...themeConfig, skin });
                    onThemeChange?.(mode);
                  }}
                  options={APP_THEMES.map((theme) => ({
                    value: theme.id,
                    label: theme.label,
                  }))}
                  value={appTheme}
                />
              </SettingsRow>
              <SettingsRow
                detail="Suit votre environnement ou reste fixe."
                title="Mode"
              >
                <Segmented<"light" | "system" | "dark">
                  label="Mode"
                  onValueChange={(nextMode) => onThemeChange?.(nextMode)}
                  options={[
                    { value: "light", label: "Clair" },
                    { value: "system", label: "Auto" },
                    { value: "dark", label: "Sombre" },
                  ]}
                  value={currentTheme}
                />
              </SettingsRow>
              <SidebarToneSetting userId={currentUser?.id} />
              {normalizeSkin(themeConfig.skin) === "clean" && (
                <SettingsRow
                  detail={`${CLEAN_FONT_SETS[normalizeCleanFont(themeConfig.cleanFont)].description}. Thème Clean seulement.`}
                  title="Police"
                >
                  <Segmented<CleanFontSet>
                    label="Police du thème Clean"
                    onValueChange={(cleanFont) =>
                      handleThemeConfigChange({ ...themeConfig, cleanFont })
                    }
                    options={(
                      Object.entries(CLEAN_FONT_SETS) as [
                        CleanFontSet,
                        (typeof CLEAN_FONT_SETS)[CleanFontSet],
                      ][]
                    ).map(([value, set]) => ({
                      value,
                      label: (
                        <span style={{ fontFamily: set.sample }}>
                          {set.label}
                        </span>
                      ),
                    }))}
                    value={normalizeCleanFont(themeConfig.cleanFont)}
                  />
                </SettingsRow>
              )}
            </SettingsSection>
            <SettingsSection
              icon={LayoutDashboard}
              subtitle="La vue d’ensemble ou la journée clinique, et l’ordre des widgets."
              title="Tableau de bord"
            >
              <DashboardVersionSetting />
              <SettingsRow
                detail="Réorganisez les rangées de widgets de la journée clinique."
                title="Disposition du tableau de bord"
              >
                <Button
                  className="rounded-full"
                  variant="outline"
                  onClick={() => {
                    window.sessionStorage.setItem(
                      "baitari:customize-dashboard",
                      "true",
                    );
                    onNavigate?.("dashboard");
                  }}
                  disabled={!onNavigate}
                >
                  Réorganiser les widgets
                </Button>
              </SettingsRow>
            </SettingsSection>
            <SidebarLayoutSettings />
          </SettingsStack>
        );
      case "securite":
        return (
          <SettingsStack>
            {message && (
              <SettingsNotice tone={message.type}>{message.text}</SettingsNotice>
            )}
            <SettingsSection
              icon={KeyRound}
              subtitle="Modifiez votre mot de passe pour sécuriser votre compte."
              title="Mot de passe"
            >
              <SettingsBody>
                <Field>
                  <FieldLabel htmlFor="settings-password">
                    Nouveau mot de passe
                  </FieldLabel>
                  <Input
                    id="settings-password"
                    autoComplete="new-password"
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    type="password"
                    value={newPassword}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="settings-confirm">
                    Confirmer le mot de passe
                  </FieldLabel>
                  <Input
                    id="settings-confirm"
                    autoComplete="new-password"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Saisir à nouveau"
                    type="password"
                    value={confirmPassword}
                  />
                </Field>
              </SettingsBody>
              <SettingsFooter className="justify-end">
                <Button
                  className="rounded-full"
                  disabled={isSaving || !newPassword}
                  onClick={handleChangePassword}
                >
                  {isSaving && <Spinner className="size-4" />}
                  {isSaving ? "Modification..." : "Modifier le mot de passe"}
                </Button>
              </SettingsFooter>
            </SettingsSection>
          </SettingsStack>
        );
      case "ia":
        return <AIModelSettings />;
      case "rappels-medicaux":
        return (
          <SettingsSection
            icon={Bell}
            panelClassName="p-6"
            subtitle="Types et intervalles préventifs."
            title="Rappels médicaux"
          >
            <PatientRemindersContent
              embedded
              model={medicalReminders}
              view="types"
            />
          </SettingsSection>
        );
      case "sauvegarde":
        return (
          <SettingsStack>
            <BackupSettings />
            <LocalDataResetSettings />
          </SettingsStack>
        );
      case "salles":
        return <RoomsSettings />;
      case "reseau":
        return <ClinicNetworkSettings />;
      case "nouveautes":
        return <ReleaseNotesArchive />;
      case "apropos":
        return (
          <SettingsStack>
            <SettingsSection
              icon={Info}
              subtitle="Version et activation"
              title="À propos"
            >
              <div className="flex items-center gap-6 p-6">
                <Logo collapsed size="lg" />
                <div className="min-w-0">
                  <p className="text-lg font-medium">{APP_NAME}</p>
                  <p className="text-sm text-muted-foreground">
                    Version {getAppVersion()}
                  </p>
                </div>
              </div>
            </SettingsSection>
            <AboutTeam />
            <LicenseStatusCard />
            {isActivationOwner(currentUser?.email) && (
              <SettingsSection
                icon={KeySquare}
                subtitle="Gérer les accès accordés aux testeurs."
                title="Centre d’activation"
              >
                <SettingsRow
                  detail="Ouvre la fenêtre de gestion des activations."
                  title="Accès des testeurs"
                >
                  <Button
                    className="rounded-full"
                    onClick={() => {
                      openActivationAdminWindow().catch((error) => {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Impossible d’ouvrir le centre d’activation.",
                        );
                      });
                    }}
                    type="button"
                    variant="outline"
                  >
                    Ouvrir
                  </Button>
                </SettingsRow>
              </SettingsSection>
            )}
          </SettingsStack>
        );
      default:
        return null;
    }
  };

  return (
    <div className="settings-page flex w-full min-w-0 flex-col px-4 pb-12 lg:px-6">
      <PageHeader subtitle="réglages du cabinet" title="Paramètres" />
      <div className="settings-page-layout">
        <nav aria-label="Sections des paramètres" className="settings-page-nav">
          {SETTINGS_NAV_GROUPS.map((group) => (
            <div className="settings-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => (
                <button
                  aria-current={activeTab === item.id ? "page" : undefined}
                  className={cn(
                    "settings-nav-item",
                    activeTab === item.id && "settings-nav-item-active",
                  )}
                  key={item.id}
                  onClick={(event) => {
                    const scrollContainer = event.currentTarget.closest(
                      '[data-slot="sidebar-inset"]',
                    );
                    setActiveTab(item.id);
                    requestAnimationFrame(() =>
                      scrollContainer?.scrollTo({
                        top: 0,
                        behavior: "instant",
                      }),
                    );
                  }}
                  type="button"
                >
                  <HugeiconsIcon icon={item.icon} strokeWidth={1.5} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <section
          aria-labelledby="settings-section-title"
          className="settings-page-main"
          data-settings-section={activeTab}
        >
          <h2 className="sr-only" id="settings-section-title">
            {activeNavItem.label} : {activeNavItem.description}
          </h2>
          <div className="settings-content" key={activeTab}>
            {renderContent()}
          </div>
        </section>
      </div>
    </div>
  );
};

/** The sidebar's tone, per user: the theme's own, or always light or dark. */
function SidebarToneSetting({ userId }: { userId: string | undefined }) {
  // The choice made here, for the user it was made for; another user reads their own.
  const [chosen, setChosen] = useState<{ userId: string; tone: SidebarTone } | null>(null);
  const tone = chosen && chosen.userId === userId ? chosen.tone : getSidebarTone(userId);
  return (
    <SettingsRow
      detail="Automatique suit le thème. Claire ou Sombre reste votre choix, quel que soit le thème."
      title="Barre latérale"
    >
      <Segmented<SidebarTone>
        label="Teinte de la barre latérale"
        onValueChange={(next) => {
          if (!userId) return;
          setChosen({ userId, tone: next });
          saveSidebarTone(userId, next);
        }}
        options={SIDEBAR_TONES.map(({ value, label }) => ({
          value,
          label,
          disabled: !userId,
        }))}
        value={tone}
      />
    </SettingsRow>
  );
}

function SidebarLayoutSettings() {
  const { collapsible, setCollapsible } = useLayout();
  return (
    <SettingsSection
      icon={PanelLeft}
      subtitle="Choisissez l’espace qui convient à votre façon de travailler."
      title="Navigation"
    >
      <SettingsRow
        detail="Laissez les icônes visibles ou masquez la barre."
        title="Réduire la barre latérale"
      >
        <Segmented<"icon" | "offcanvas" | "none">
          label="Réduction de la barre latérale"
          onValueChange={setCollapsible}
          options={[
            { value: "icon", label: "Icônes" },
            { value: "offcanvas", label: "Masquée" },
            { value: "none", label: "Jamais" },
          ]}
          value={collapsible}
        />
      </SettingsRow>
    </SettingsSection>
  );
}

export default React.memo(Parametres);
