import {
  Ban,
  CalendarDays,
  Check,
  Clipboard,
  Copy,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Laptop2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  Server,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import Logo from "@/components/Logo";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useTauriDrag } from "@/hooks/use-tauri-drag";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { closeActivationAdminWindow } from "@/services/activationAdminWindowService";
import { isTauriRuntime } from "@/services/browser-store";
import {
  ACTIVATION_SERVER_URL,
  type ActivationAdminLicense,
  checkActivationServer,
  createActivationLicense,
  createLicenseEmailTemplate,
  getStoredAdminToken,
  releaseActivationDevice,
  listActivationLicenses,
  revokeActivationLicense,
  setStoredAdminToken,
  verifyAdminToken,
} from "@/services/licenseActivationService";

type ServerStatus = "checking" | "online" | "offline";
type StatusFilter = "all" | "active" | "expiring" | "expired" | "revoked";
type ExpiryPreset = "1m" | "1y" | "2y" | "forever" | "custom";

const PLAN_LABELS: Record<string, string> = {
  clinic: "Cabinet Pro",
  trial: "Essai Démo",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Permanente (illimitée)";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatRelativeExpiry(value: string | null) {
  if (!value) {
    return "Illimitée";
  }
  const diffMs = Date.parse(value) - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return `Expirée il y a ${Math.abs(diffDays)} j`;
  }
  if (diffDays === 0) {
    return "Expire aujourd’hui";
  }
  if (diffDays <= 30) {
    return `Expire dans ${diffDays} j`;
  }
  if (diffDays < 365) {
    return `Dans ${Math.round(diffDays / 30)} mois`;
  }
  return `Dans ${(diffDays / 365).toFixed(1)} an(s)`;
}

function isLicenseActive(license: ActivationAdminLicense) {
  return (
    !license.revokedAt &&
    (!license.expiresAt || Date.parse(license.expiresAt) >= Date.now())
  );
}

function isExpiringSoon(license: ActivationAdminLicense) {
  if (!(isLicenseActive(license) && license.expiresAt)) {
    return false;
  }
  const remaining = Date.parse(license.expiresAt) - Date.now();
  return remaining >= 0 && remaining <= 30 * 24 * 60 * 60 * 1000;
}

function getExpiryPresetDate(preset: ExpiryPreset): string {
  const now = new Date();
  if (preset === "1m") {
    const target = new Date(now);
    target.setDate(target.getDate() + 30);
    return target.toISOString().slice(0, 10);
  }
  if (preset === "1y") {
    const target = new Date(now);
    target.setFullYear(target.getFullYear() + 1);
    return target.toISOString().slice(0, 10);
  }
  if (preset === "2y") {
    const target = new Date(now);
    target.setFullYear(target.getFullYear() + 2);
    return target.toISOString().slice(0, 10);
  }
  return "";
}

function LicenseStatusBadge({ license }: { license: ActivationAdminLicense }) {
  if (license.revokedAt) {
    return <Badge variant="destructive">Révoquée</Badge>;
  }
  if (!isLicenseActive(license)) {
    return <Badge variant="warning">Expirée</Badge>;
  }
  if (isExpiringSoon(license)) {
    return <Badge variant="warning">Expire bientôt</Badge>;
  }
  return <Badge variant="success">Active</Badge>;
}

function ServerStatusPill({
  status,
  pingMs,
  onPing,
}: {
  status: ServerStatus;
  pingMs: number | null;
  onPing: () => void;
}) {
  let styleClasses = "border-border bg-muted/50 text-muted-foreground";
  let dotColor = "bg-amber-500";
  let statusText = "Vérification...";

  if (status === "online") {
    styleClasses =
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300";
    dotColor = "bg-emerald-500";
    statusText = `127.0.0.1:8787 ${pingMs === null ? "" : `· ${pingMs}ms`}`;
  } else if (status === "offline") {
    styleClasses =
      "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15";
    dotColor = "bg-destructive";
    statusText = "Serveur hors-ligne";
  }

  return (
    <button
      className={cn(
        "flex h-8 items-center gap-2 rounded-full border px-3 text-xs transition-colors",
        styleClasses
      )}
      onClick={onPing}
      title="Cliquer pour tester la connexion"
      type="button"
    >
      <span className="relative flex size-2">
        {status === "online" && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={cn("relative inline-flex size-2 rounded-full", dotColor)}
        />
      </span>
      <span className="font-medium">{statusText}</span>
      <RefreshCw
        aria-hidden="true"
        className={cn("size-3", status === "checking" && "animate-spin")}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// SUBCOMPONENT: LICENSES TABLE VIEW
// ---------------------------------------------------------------------------
interface LicensesTableViewProps {
  activeCount: number;
  expiringCount: number;
  isLoading: boolean;
  licenses: ActivationAdminLicense[];
  onCreateTabOpen: () => void;
  onDetailClick: (license: ActivationAdminLicense) => void;
  onEmailClick: (license: ActivationAdminLicense) => void;
  onPlanFilterChange: (p: string) => void;
  onRevokeClick: (license: ActivationAdminLicense) => void;
  onSearchChange: (q: string) => void;
  onStatusFilterChange: (f: StatusFilter) => void;
  planFilter: string;
  revokedCount: number;
  searchQuery: string;
  statusFilter: StatusFilter;
}

function LicensesTableView({
  licenses,
  isLoading,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  planFilter,
  onPlanFilterChange,
  activeCount,
  expiringCount,
  revokedCount,
  onEmailClick,
  onDetailClick,
  onRevokeClick,
  onCreateTabOpen,
}: LicensesTableViewProps) {
  return (
    <Card className="border-border/60 bg-card/75 shadow-none backdrop-blur-md">
      <div className="flex flex-col gap-3 border-border/50 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 ps-9 text-xs"
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filtrer par clinique, email..."
            value={searchQuery}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            className="h-7 text-xs"
            onClick={() => onStatusFilterChange("all")}
            size="sm"
            variant={statusFilter === "all" ? "secondary" : "ghost"}
          >
            Toutes
          </Button>
          <Button
            className="h-7 text-xs"
            onClick={() => onStatusFilterChange("active")}
            size="sm"
            variant={statusFilter === "active" ? "secondary" : "ghost"}
          >
            Actives ({activeCount})
          </Button>
          {expiringCount > 0 && (
            <Button
              className="h-7 text-amber-600 text-xs dark:text-amber-400"
              onClick={() => onStatusFilterChange("expiring")}
              size="sm"
              variant={statusFilter === "expiring" ? "secondary" : "ghost"}
            >
              Expire bientôt ({expiringCount})
            </Button>
          )}
          {revokedCount > 0 && (
            <Button
              className="h-7 text-destructive text-xs"
              onClick={() => onStatusFilterChange("revoked")}
              size="sm"
              variant={statusFilter === "revoked" ? "secondary" : "ghost"}
            >
              Révoquées ({revokedCount})
            </Button>
          )}

          <Separator className="mx-1 h-4 w-px" orientation="vertical" />

          <Select onValueChange={onPlanFilterChange} value={planFilter}>
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous plans</SelectItem>
              <SelectItem value="clinic">Cabinet</SelectItem>
              <SelectItem value="trial">Essai</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && licenses.length === 0 && (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-8">
          <Spinner className="size-6 text-primary" />
          <p className="text-muted-foreground text-xs">
            Chargement des licences...
          </p>
        </div>
      )}

      {!isLoading && licenses.length === 0 && (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
            <Clipboard className="size-6" />
          </div>
          <div>
            <p className="font-medium text-sm">Aucune licence trouvée</p>
            <p className="mt-1 text-muted-foreground text-xs">
              Générez une licence pour autoriser l'accès d'un cabinet.
            </p>
          </div>
          <Button className="mt-2 text-xs" onClick={onCreateTabOpen} size="sm">
            <Plus className="me-1 size-3.5" />
            Créer une licence
          </Button>
        </div>
      )}

      {licenses.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/50">
                <TableHead className="ps-4">Cabinet / Destinataire</TableHead>
                <TableHead>Formule</TableHead>
                <TableHead>Postes</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="pe-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenses.map((license) => {
                const expiring = isExpiringSoon(license);
                const isRevoked = Boolean(license.revokedAt);

                return (
                  <TableRow
                    className="border-border/40 hover:bg-muted/20"
                    key={license.id}
                  >
                    <TableCell className="py-3 ps-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono font-semibold text-primary text-xs">
                          {license.email.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-xs">
                            {license.email}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Créé le {formatDate(license.createdAt)}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        className="text-[11px]"
                        variant={
                          license.plan === "clinic" ? "outline" : "secondary"
                        }
                      >
                        {PLAN_LABELS[license.plan] || license.plan}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <button
                        className="flex items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
                        onClick={() => onDetailClick(license)}
                        title="Voir les appareils enregistrés"
                        type="button"
                      >
                        <Laptop2 className="size-3.5" />
                        <span>
                          {license.deviceCount} / {license.maxDevices}
                        </span>
                      </button>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs">
                        <p>{formatDate(license.expiresAt)}</p>
                        <p
                          className={cn(
                            "text-[10px]",
                            expiring
                              ? "font-medium text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {formatRelativeExpiry(license.expiresAt)}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <LicenseStatusBadge license={license} />
                    </TableCell>

                    <TableCell className="pe-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          aria-label="Transmettre la clé par courriel"
                          className="h-8 gap-1.5 px-2.5 text-emerald-600 text-xs hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                          onClick={() => onEmailClick(license)}
                          size="sm"
                          title="Envoyer les accès au cabinet par courriel"
                          type="button"
                          variant="ghost"
                        >
                          <Mail className="size-3.5" />
                          <span className="hidden sm:inline">Courriel</span>
                        </Button>

                        <Button
                          aria-label="Détails"
                          className="size-8"
                          onClick={() => onDetailClick(license)}
                          size="icon"
                          title="Détails techniques"
                          type="button"
                          variant="ghost"
                        >
                          <Info className="size-3.5" />
                        </Button>

                        {isRevoked ? (
                          <span className="px-2 text-[11px] text-muted-foreground">
                            Fermée
                          </span>
                        ) : (
                          <Button
                            aria-label="Révoquer l'accès"
                            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onRevokeClick(license)}
                            size="icon"
                            title="Révoquer cette licence"
                            type="button"
                            variant="ghost"
                          >
                            <Ban className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SUBCOMPONENT: GENERATOR TAB VIEW
// ---------------------------------------------------------------------------
interface GeneratorTabViewProps {
  createdResult: {
    key: string;
    license: ActivationAdminLicense;
    clinicName?: string;
  } | null;
  isCreating: boolean;
  onCopyKey: (key: string) => void;
  onSendEmailClick: (created: {
    key: string;
    license: ActivationAdminLicense;
    clinicName?: string;
  }) => void;
  onSubmit: (data: {
    email: string;
    clinicName: string;
    plan: string;
    maxDevices: string;
    expiresAt: string | null;
    autoEmail: boolean;
  }) => Promise<void>;
  serverOffline: boolean;
}

function GeneratorTabView({
  isCreating,
  serverOffline,
  onSubmit,
  createdResult,
  onSendEmailClick,
  onCopyKey,
}: GeneratorTabViewProps) {
  const [email, setEmail] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [plan, setPlan] = useState("clinic");
  const [maxDevices, setMaxDevices] = useState("2");
  const [preset, setPreset] = useState<ExpiryPreset>("1y");
  const [customDate, setCustomDate] = useState(() => getExpiryPresetDate("1y"));
  const [autoEmail, setAutoEmail] = useState(true);

  const handlePresetSelect = (selected: ExpiryPreset) => {
    setPreset(selected);
    if (selected !== "custom") {
      setCustomDate(getExpiryPresetDate(selected));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const expiresAtIso = customDate
      ? new Date(`${customDate}T23:59:59Z`).toISOString()
      : null;

    await onSubmit({
      email,
      clinicName,
      plan,
      maxDevices,
      expiresAt: expiresAtIso,
      autoEmail,
    });
    setEmail("");
    setClinicName("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <Card className="border-border/60 bg-card/75 shadow-none backdrop-blur-md">
        <CardHeader className="border-border/50 border-b p-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            Générer une licence cabinet
          </CardTitle>
          <CardDescription className="text-xs">
            Crée une clé cryptographique unique liée à l'adresse de la clinique.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <form className="space-y-4" onSubmit={handleFormSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="gen-email">Adresse email du cabinet *</Label>
              <Input
                autoFocus
                className="h-9 text-xs"
                id="gen-email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@clinique-veterinaire.fr"
                required
                type="email"
                value={email}
              />
              <p className="text-[11px] text-muted-foreground">
                Cette adresse sera requise par le cabinet pour activer l'app.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gen-clinic-name">
                Nom du cabinet ou praticien (optionnel)
              </Label>
              <Input
                className="h-9 text-xs"
                id="gen-clinic-name"
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="Clinique Vétérinaire du Parc · Dr. Martin"
                value={clinicName}
              />
              <p className="text-[11px] text-muted-foreground">
                Utilisé pour personnaliser le courriel de transmission.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="gen-plan">Formule</Label>
                <Select onValueChange={(value) => { if (value) setPlan(value); }} value={plan}>
                  <SelectTrigger className="h-9 w-full text-xs" id="gen-plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinic">
                      Cabinet Vétérinaire (Pro)
                    </SelectItem>
                    <SelectItem value="trial">
                      Période d'essai (Démo)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gen-devices">Postes autorisés</Label>
                <Select onValueChange={(value) => { if (value) setMaxDevices(value); }} value={maxDevices}>
                  <SelectTrigger
                    className="h-9 w-full text-xs"
                    id="gen-devices"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 poste (Solo)</SelectItem>
                    <SelectItem value="2">
                      2 postes (Cabinet standard)
                    </SelectItem>
                    <SelectItem value="5">5 postes (Clinique)</SelectItem>
                    <SelectItem value="10">10 postes (Hôpital)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Durée de validité</Label>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  className="h-7 text-xs"
                  onClick={() => handlePresetSelect("1y")}
                  size="sm"
                  type="button"
                  variant={preset === "1y" ? "default" : "outline"}
                >
                  1 an (Standard)
                </Button>
                <Button
                  className="h-7 text-xs"
                  onClick={() => handlePresetSelect("2y")}
                  size="sm"
                  type="button"
                  variant={preset === "2y" ? "default" : "outline"}
                >
                  2 ans
                </Button>
                <Button
                  className="h-7 text-xs"
                  onClick={() => handlePresetSelect("1m")}
                  size="sm"
                  type="button"
                  variant={preset === "1m" ? "default" : "outline"}
                >
                  30 jours (Essai)
                </Button>
                <Button
                  className="h-7 text-xs"
                  onClick={() => handlePresetSelect("forever")}
                  size="sm"
                  type="button"
                  variant={preset === "forever" ? "default" : "outline"}
                >
                  Permanente
                </Button>
                <Button
                  className="h-7 text-xs"
                  onClick={() => handlePresetSelect("custom")}
                  size="sm"
                  type="button"
                  variant={preset === "custom" ? "default" : "outline"}
                >
                  Date personnalisée
                </Button>
              </div>

              {preset === "custom" && (
                <div className="pt-1">
                  <Input
                    className="h-9 text-xs"
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setCustomDate(e.target.value)}
                    type="date"
                    value={customDate}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                checked={autoEmail}
                className="size-4 rounded border-border text-primary focus:ring-primary/40"
                id="gen-auto-email"
                onChange={(e) => setAutoEmail(e.target.checked)}
                type="checkbox"
              />
              <Label
                className="cursor-pointer font-normal text-muted-foreground text-xs"
                htmlFor="gen-auto-email"
              >
                Préparer immédiatement l'envoi par courriel au cabinet
              </Label>
            </div>

            <Button
              className="mt-2 w-full gap-2 text-xs"
              disabled={isCreating || serverOffline}
              type="submit"
            >
              {isCreating ? (
                <Spinner className="size-4" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Générer la clé d'activation
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {createdResult ? (
          <Card className="border-emerald-500/30 bg-emerald-500/[0.04] shadow-none backdrop-blur-md">
            <CardHeader className="border-emerald-500/20 border-b p-5">
              <div className="flex items-center justify-between">
                <Badge className="gap-1" variant="success">
                  <Check className="size-3" />
                  Clé active sur le serveur
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  ID: {createdResult.license.id.slice(0, 8)}
                </span>
              </div>
              <CardTitle className="mt-2 text-base text-emerald-800 dark:text-emerald-200">
                Licence prête pour {createdResult.license.email}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Clé d'activation unique
                </Label>
                <div className="mt-1.5 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-background/90 p-3 shadow-inner">
                  <code className="select-all font-bold font-mono text-base text-foreground tracking-wider">
                    {createdResult.key}
                  </code>
                  <Button
                    aria-label="Copier la clé"
                    className="size-8 shrink-0"
                    onClick={() => onCopyKey(createdResult.key)}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-background/50 p-3 text-xs">
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>Formule :</div>
                  <div className="font-medium text-foreground">
                    {PLAN_LABELS[createdResult.license.plan]}
                  </div>
                  <div>Postes :</div>
                  <div className="font-medium text-foreground">
                    {createdResult.license.maxDevices} appareil(s)
                  </div>
                  <div>Validité :</div>
                  <div className="font-medium text-foreground">
                    {formatDate(createdResult.license.expiresAt)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  className="w-full gap-2 text-xs"
                  onClick={() => onSendEmailClick(createdResult)}
                  type="button"
                >
                  <Mail className="size-4" />
                  Envoyer la clé par courriel
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  Ouvre le client Mail ou copie le texte prêt à l'emploi.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/60 bg-card/60 shadow-none backdrop-blur-md">
            <CardHeader className="p-5">
              <CardTitle className="text-sm">
                Comment fonctionne l'activation ?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-muted-foreground text-xs leading-relaxed">
              <div className="flex gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-[10px] text-primary">
                  1
                </span>
                <p>
                  Générez la licence ci-contre en renseignant l'adresse courriel
                  du cabinet.
                </p>
              </div>
              <div className="flex gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-[10px] text-primary">
                  2
                </span>
                <p>
                  Transmettez la clé par courriel en 1 clic grâce au modèle
                  intégré prérempli.
                </p>
              </div>
              <div className="flex gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-[10px] text-primary">
                  3
                </span>
                <p>
                  Le praticien saisit son email et sa clé dans Baitari.
                  L'application valide les postes locaux sans dépendre
                  d'Internet.
                </p>
              </div>

              <Separator className="my-3" />

              <div className="rounded-lg bg-muted/40 p-3 text-[11px]">
                <p className="font-medium text-foreground">
                  🔒 Sécurité cryptographique locale
                </p>
                <p className="mt-1">
                  Les clés sont chiffrées en HMAC-SHA256 avec votre clé secrète
                  locale. Le serveur ne stocke pas la clé en clair.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN ROOT COMPONENT
// ---------------------------------------------------------------------------
export default function ActivationAdminPage() {
  const isTauri = isTauriRuntime();
  const {
    handleMouseDown: handleWindowMouseDown,
    ref: windowDragRef,
  } = useTauriDrag<HTMLElement>();

  // Server & auth state
  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");
  const [serverPingMs, setServerPingMs] = useState<number | null>(null);
  const [adminToken, setAdminToken] = useState<string>(() =>
    getStoredAdminToken()
  );
  const [showToken, setShowToken] = useState(false);

  // Licenses data state
  const [licenses, setLicenses] = useState<ActivationAdminLicense[]>([]);
  const [isLoadingLicenses, setIsLoadingLicenses] = useState(false);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("licenses");

  // License creation state
  const [isCreating, setIsCreating] = useState(false);
  const [createdResult, setCreatedResult] = useState<{
    key: string;
    license: ActivationAdminLicense;
    clinicName?: string;
  } | null>(null);

  // Email transmission modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailClinicEmail, setEmailClinicEmail] = useState("");
  const [emailClinicName, setEmailClinicName] = useState("");
  const [emailLicenseKey, setEmailLicenseKey] = useState("");
  const [emailPlan, setEmailPlan] = useState("clinic");
  const [emailMaxDevices, setEmailMaxDevices] = useState(2);
  const [emailExpiresAt, setEmailExpiresAt] = useState<string | null>(null);
  const [customSubject, setCustomSubject] = useState("");

  // Revoke confirmation modal state
  const [licenseToRevoke, setLicenseToRevoke] =
    useState<ActivationAdminLicense | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Details dialog state
  const [detailLicense, setDetailLicense] =
    useState<ActivationAdminLicense | null>(null);

  // Settings / Token dialog state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempToken, setTempToken] = useState(adminToken);

  // Heartbeat & Ping check
  const pingServer = useCallback(async () => {
    setServerStatus("checking");
    const start = performance.now();
    try {
      await checkActivationServer();
      const elapsed = Math.round(performance.now() - start);
      setServerStatus("online");
      setServerPingMs(elapsed);
    } catch {
      setServerStatus("offline");
      setServerPingMs(null);
    }
  }, []);

  // Load licenses list (simplified to reduce cognitive complexity)
  const loadLicenses = useCallback(
    async (tokenToUse?: string, silent = false) => {
      const token = (tokenToUse ?? adminToken).trim();
      if (!token) {
        if (!silent) {
          toast.error("Veuillez renseigner le jeton administrateur.");
        }
        return;
      }

      setIsLoadingLicenses(true);
      try {
        const next = await listActivationLicenses(token);
        setLicenses(next);
        setServerStatus("online");
        if (!silent) {
          toast.success(`${next.length} licence(s) synchronisée(s).`);
        }
      } catch (err) {
        setServerStatus("offline");
        if (!silent) {
          const msg =
            err instanceof Error
              ? err.message
              : "Impossible de joindre le serveur d'activation.";
          toast.error(msg);
        }
      } finally {
        setIsLoadingLicenses(false);
      }
    },
    [adminToken]
  );

  // On mount: ping server and auto-load if token exists
  useEffect(() => {
    pingServer();
    if (adminToken) {
      loadLicenses(adminToken, true);
    }
  }, [adminToken, loadLicenses, pingServer]);

  // Statistics calculation
  const stats = useMemo(() => {
    const active = licenses.filter(isLicenseActive);
    const expiring = active.filter(isExpiringSoon);
    const expired = licenses.filter(
      (l) => !l.revokedAt && l.expiresAt && Date.parse(l.expiresAt) < Date.now()
    );
    const revoked = licenses.filter((l) => Boolean(l.revokedAt));
    const devices = active.reduce((acc, curr) => acc + curr.deviceCount, 0);

    return {
      total: licenses.length,
      active: active.length,
      devices,
      expiring: expiring.length,
      expired: expired.length,
      revoked: revoked.length,
    };
  }, [licenses]);

  // Filter logic helper
  const filterMatch = useCallback(
    (license: ActivationAdminLicense) => {
      if (statusFilter === "active" && !isLicenseActive(license)) {
        return false;
      }
      if (statusFilter === "expiring" && !isExpiringSoon(license)) {
        return false;
      }
      if (
        statusFilter === "expired" &&
        (license.revokedAt ||
          !license.expiresAt ||
          Date.parse(license.expiresAt) >= Date.now())
      ) {
        return false;
      }
      if (statusFilter === "revoked" && !license.revokedAt) {
        return false;
      }
      if (planFilter !== "all" && license.plan !== planFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchEmail = license.email.toLowerCase().includes(query);
        const matchId = license.id.toLowerCase().includes(query);
        const matchPlan = (PLAN_LABELS[license.plan] || license.plan)
          .toLowerCase()
          .includes(query);
        return matchEmail || matchId || matchPlan;
      }
      return true;
    },
    [statusFilter, planFilter, searchQuery]
  );

  const filteredLicenses = useMemo(
    () => licenses.filter(filterMatch),
    [licenses, filterMatch]
  );

  // Open Email Modal helper
  const openEmailModalFor = useCallback(
    (params: {
      clinicEmail: string;
      recipientEmail?: string;
      clinicName?: string;
      licenseKey?: string;
      plan: string;
      maxDevices: number;
      expiresAt: string | null;
    }) => {
      setEmailClinicEmail(params.clinicEmail);
      setEmailRecipient(params.recipientEmail || params.clinicEmail);
      setEmailClinicName(params.clinicName || "");
      setEmailLicenseKey(params.licenseKey || "XXXX-XXXX-XXXX-XXXX");
      setEmailPlan(params.plan);
      setEmailMaxDevices(params.maxDevices);
      setEmailExpiresAt(params.expiresAt);

      const tmpl = createLicenseEmailTemplate({
        clinicEmail: params.clinicEmail,
        recipientEmail: params.recipientEmail || params.clinicEmail,
        clinicName: params.clinicName,
        licenseKey: params.licenseKey || "XXXX-XXXX-XXXX-XXXX",
        plan: params.plan,
        maxDevices: params.maxDevices,
        expiresAt: params.expiresAt,
      });
      setCustomSubject(tmpl.subject);
      setEmailModalOpen(true);
    },
    []
  );

  // Email template for currently configured modal
  const computedEmailTemplate = useMemo(
    () =>
      createLicenseEmailTemplate({
        clinicEmail: emailClinicEmail,
        recipientEmail: emailRecipient,
        clinicName: emailClinicName,
        licenseKey: emailLicenseKey,
        plan: emailPlan,
        maxDevices: emailMaxDevices,
        expiresAt: emailExpiresAt,
      }),
    [
      emailClinicEmail,
      emailRecipient,
      emailClinicName,
      emailLicenseKey,
      emailPlan,
      emailMaxDevices,
      emailExpiresAt,
    ]
  );

  // Creation form submission handler
  const handleCreateSubmit = async (data: {
    email: string;
    clinicName: string;
    plan: string;
    maxDevices: string;
    expiresAt: string | null;
    autoEmail: boolean;
  }) => {
    if (!adminToken.trim()) {
      toast.error("Veuillez configurer votre jeton administrateur.");
      setIsSettingsOpen(true);
      return;
    }

    setIsCreating(true);
    try {
      const created = await createActivationLicense(adminToken.trim(), {
        email: data.email.trim(),
        plan: data.plan,
        maxDevices: Number(data.maxDevices),
        expiresAt: data.expiresAt,
      });

      const res = {
        key: created.licenseKey,
        license: created.license,
        clinicName: data.clinicName.trim(),
      };
      setCreatedResult(res);
      setLicenses((current) => [created.license, ...current]);
      setServerStatus("online");
      toast.success("Licence générée avec succès !");

      if (data.autoEmail) {
        openEmailModalFor({
          clinicEmail: created.license.email,
          recipientEmail: created.license.email,
          clinicName: data.clinicName.trim(),
          licenseKey: created.licenseKey,
          plan: created.license.plan,
          maxDevices: created.license.maxDevices,
          expiresAt: created.license.expiresAt,
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la création."
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Revoke license execution
  const executeRevoke = async () => {
    if (!licenseToRevoke) {
      return;
    }
    setIsRevoking(true);
    try {
      const revoked = await revokeActivationLicense(
        adminToken.trim(),
        licenseToRevoke.id
      );
      setLicenses((current) =>
        current.map((item) => (item.id === revoked.id ? revoked : item))
      );
      toast.success(`Accès révoqué pour ${revoked.email}.`);
      setLicenseToRevoke(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de révoquer cette licence."
      );
    } finally {
      setIsRevoking(false);
    }
  };

  // Copy helpers
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié dans le presse-papiers.`);
    } catch {
      toast.error("Impossible de copier automatiquement.");
    }
  };

  // Open default mail client
  const handleOpenMailClient = () => {
    const encodedSubject = encodeURIComponent(
      customSubject || computedEmailTemplate.subject
    );
    const encodedBody = encodeURIComponent(computedEmailTemplate.body);
    const mailto = `mailto:${encodeURIComponent(emailRecipient.trim())}?subject=${encodedSubject}&body=${encodedBody}`;

    window.open(mailto, "_blank");
    toast.success(
      "Client de messagerie ouvert avec le courriel prêt à l'envoi."
    );
  };

  // Save admin token
  const handleSaveToken = async () => {
    const trimmed = tempToken.trim();
    if (!trimmed) {
      toast.error("Le jeton ne peut pas être vide.");
      return;
    }

    const isValid = await verifyAdminToken(trimmed);
    if (!isValid) {
      toast.error("Jeton administrateur invalide ou serveur inaccessible.");
      return;
    }

    setStoredAdminToken(trimmed);
    setAdminToken(trimmed);
    setIsSettingsOpen(false);
    toast.success("Jeton vérifié pour cette session uniquement.");
    loadLicenses(trimmed);
  };

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground selection:bg-primary/20">
      {/* Ambient background blur */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-[15%] size-[38rem] rounded-full bg-emerald-500/[0.05] blur-3xl dark:bg-emerald-400/[0.04]" />
        <div className="absolute top-[25%] right-[-10rem] size-[34rem] rounded-full bg-sky-500/[0.05] blur-3xl dark:bg-sky-400/[0.03]" />
      </div>

      {/* Desktop macOS Header */}
      <header
        className={cn(
          "relative z-20 flex h-14 shrink-0 items-center justify-between border-border/60 border-b bg-background/85 px-4 backdrop-blur-md dark:border-white/[0.07]",
          isTauri && "ps-22"
        )}
        data-window-drag-region={isTauri ? "true" : undefined}
        onMouseDown={handleWindowMouseDown}
        ref={windowDragRef}
      >
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <Separator className="h-5 w-px" orientation="vertical" />
          <div className="flex items-center gap-2">
            <span className="font-heading font-semibold text-sm tracking-tight">
              Baitari
            </span>
            <Badge
              className="h-5 px-1.5 font-normal text-[11px]"
              variant="outline"
            >
              Centre d'Activation
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <ServerStatusPill
            onPing={pingServer}
            pingMs={serverPingMs}
            status={serverStatus}
          />

          <Button
            className="h-8 gap-1.5 px-3 text-xs shadow-xs"
            onClick={() => setActiveTab("create")}
            size="sm"
            type="button"
          >
            <Plus aria-hidden="true" className="size-3.5" />
            <span>Nouvelle licence</span>
          </Button>

          <Button
            aria-label="Configuration serveur"
            className="size-8"
            onClick={() => {
              setTempToken(adminToken);
              setIsSettingsOpen(true);
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Settings2 aria-hidden="true" className="size-4" />
          </Button>

          <Button
            aria-label="Fermer la fenêtre"
            className="size-8"
            onClick={() => closeActivationAdminWindow().catch(() => undefined)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          {serverStatus === "offline" && (
            <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
              <div className="flex items-center gap-3">
                <ShieldAlert className="size-5 shrink-0" />
                <div>
                  <p className="font-medium">
                    Serveur d'activation local inaccessible
                  </p>
                  <p className="text-destructive/90 text-xs">
                    Démarrez le serveur avec{" "}
                    <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-[11px] dark:bg-white/10">
                      npm run activation-server
                    </code>{" "}
                    ou vérifiez que le port 8787 est disponible.
                  </p>
                </div>
              </div>
              <Button
                className="shrink-0"
                onClick={pingServer}
                size="sm"
                variant="outline"
              >
                Réessayer
              </Button>
            </div>
          )}

          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="border-border/60 bg-card/60 shadow-none backdrop-blur-md">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-muted-foreground text-xs">
                    Licences actives
                  </p>
                  <p className="mt-1 font-heading font-semibold text-2xl tracking-tight">
                    {stats.active}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Cabinets validés
                  </p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 shadow-none backdrop-blur-md">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-muted-foreground text-xs">
                    Postes autorisés
                  </p>
                  <p className="mt-1 font-heading font-semibold text-2xl tracking-tight">
                    {stats.devices}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Appareils déployés
                  </p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Laptop2 className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 shadow-none backdrop-blur-md">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-muted-foreground text-xs">À renouveler</p>
                  <p className="mt-1 font-heading font-semibold text-2xl tracking-tight">
                    {stats.expiring}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Sous les 30 jours
                  </p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <CalendarDays className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 shadow-none backdrop-blur-md">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-muted-foreground text-xs">Total émises</p>
                  <p className="mt-1 font-heading font-semibold text-2xl tracking-tight">
                    {stats.total}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Historique local
                  </p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <KeyRound className="size-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs Navigation */}
          <Tabs onValueChange={setActiveTab} value={activeTab}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="h-9">
                <TabsTrigger className="text-xs" value="licenses">
                  <Clipboard className="me-1.5 size-3.5" />
                  Licences & Cabinets ({licenses.length})
                </TabsTrigger>
                <TabsTrigger className="text-xs" value="create">
                  <Plus className="me-1.5 size-3.5" />
                  Générateur de clé
                </TabsTrigger>
                <TabsTrigger className="text-xs" value="server">
                  <Server className="me-1.5 size-3.5" />
                  Serveur & Sécurité
                </TabsTrigger>
              </TabsList>

              {activeTab === "licenses" && (
                <Button
                  className="h-8 gap-1.5 text-xs"
                  disabled={isLoadingLicenses}
                  onClick={() => loadLicenses(adminToken)}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCw
                    className={cn(
                      "size-3.5",
                      isLoadingLicenses && "animate-spin"
                    )}
                  />
                  <span>Actualiser</span>
                </Button>
              )}
            </div>

            {/* TAB 1: LICENSES TABLE */}
            <TabsContent className="mt-4 space-y-4" value="licenses">
              <LicensesTableView
                activeCount={stats.active}
                expiringCount={stats.expiring}
                isLoading={isLoadingLicenses}
                licenses={filteredLicenses}
                onCreateTabOpen={() => setActiveTab("create")}
                onDetailClick={(lic) => setDetailLicense(lic)}
                onEmailClick={(lic) =>
                  openEmailModalFor({
                    clinicEmail: lic.email,
                    recipientEmail: lic.email,
                    plan: lic.plan,
                    maxDevices: lic.maxDevices,
                    expiresAt: lic.expiresAt,
                  })
                }
                onPlanFilterChange={setPlanFilter}
                onRevokeClick={(lic) => setLicenseToRevoke(lic)}
                onSearchChange={setSearchQuery}
                onStatusFilterChange={setStatusFilter}
                planFilter={planFilter}
                revokedCount={stats.revoked}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
              />
            </TabsContent>

            {/* TAB 2: GENERATE NEW LICENSE */}
            <TabsContent className="mt-4" value="create">
              <GeneratorTabView
                createdResult={createdResult}
                isCreating={isCreating}
                onCopyKey={(k) => copyToClipboard(k, "Clé d'activation")}
                onSendEmailClick={(res) =>
                  openEmailModalFor({
                    clinicEmail: res.license.email,
                    recipientEmail: res.license.email,
                    clinicName: res.clinicName,
                    licenseKey: res.key,
                    plan: res.license.plan,
                    maxDevices: res.license.maxDevices,
                    expiresAt: res.license.expiresAt,
                  })
                }
                onSubmit={handleCreateSubmit}
                serverOffline={serverStatus === "offline"}
              />
            </TabsContent>

            {/* TAB 3: SERVER & DIAGNOSTICS */}
            <TabsContent className="mt-4" value="server">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-border/60 bg-card/75 shadow-none backdrop-blur-md">
                  <CardHeader className="border-border/50 border-b p-5">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Server className="size-4 text-primary" />
                      État du serveur local
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Instance locale d'activation Baitari
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5 text-xs">
                    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-3">
                      <span className="text-muted-foreground">
                        Statut du service
                      </span>
                      <Badge
                        variant={
                          serverStatus === "online" ? "success" : "destructive"
                        }
                      >
                        {serverStatus === "online"
                          ? "En ligne"
                          : "Inaccessible"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-3">
                      <span className="text-muted-foreground">
                        Point de terminaison
                      </span>
                      <span className="font-medium font-mono">
                        {ACTIVATION_SERVER_URL}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-3">
                      <span className="text-muted-foreground">
                        Temps de réponse
                      </span>
                      <span className="font-mono">
                        {serverPingMs === null ? "—" : `${serverPingMs} ms`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-3">
                      <span className="text-muted-foreground">
                        Stockage des données
                      </span>
                      <span className="font-mono text-[11px]">
                        activation-server/data/licenses.json
                      </span>
                    </div>

                    <Button
                      className="w-full text-xs"
                      onClick={pingServer}
                      variant="outline"
                    >
                      <RefreshCw className="me-1.5 size-3.5" />
                      Tester la connectivité
                    </Button>
                  </CardContent>
                </Card>

                {/* Token & Authentication */}
                <Card className="border-border/60 bg-card/75 shadow-none backdrop-blur-md">
                  <CardHeader className="border-border/50 border-b p-5">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <KeyRound className="size-4 text-primary" />
                      Jeton d'administration
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Contrôle l'accès à la génération et la révocation des
                      licences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5 text-xs">
                    <div className="space-y-1.5">
                      <Label htmlFor="token-display">
                        Jeton actuellement mémorisé
                      </Label>
                      <div className="relative">
                        <Input
                          className="h-9 pe-10 font-mono text-xs"
                          id="token-display"
                          readOnly
                          type={showToken ? "text" : "password"}
                          value={adminToken}
                        />
                        <button
                          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowToken(!showToken)}
                          type="button"
                        >
                          {showToken ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Ce jeton est automatiquement sauvegardé dans votre
                        espace local.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 text-xs"
                        onClick={() => {
                          setTempToken(adminToken);
                          setIsSettingsOpen(true);
                        }}
                        variant="outline"
                      >
                        Modifier le jeton
                      </Button>
                      <Button
                        className="text-xs"
                        onClick={() =>
                          copyToClipboard(adminToken, "Jeton administrateur")
                        }
                        variant="ghost"
                      >
                        Copier
                      </Button>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground">
                      <p className="font-medium text-foreground">
                        💡 Fichier source :
                      </p>
                      <p className="mt-0.5">
                        <code className="font-mono">
                          activation-server/data/admin-token
                        </code>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: TRANSMIT LICENSE KEY BY EMAIL                                  */}
      {/* ========================================================================= */}
      <Dialog onOpenChange={setEmailModalOpen} open={emailModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Mail className="size-4" />
              </div>
              Transmettre la clé par courriel
            </DialogTitle>
            <DialogDescription className="text-xs">
              Envoyez directement les identifiants d'activation et le guide
              d'installation au cabinet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="modal-email-recipient">
                  Adresse courriel de destination
                </Label>
                <Input
                  className="h-8 text-xs"
                  id="modal-email-recipient"
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="praticien@clinique.fr"
                  type="email"
                  value={emailRecipient}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modal-clinic-name">
                  Nom ou praticien référent
                </Label>
                <Input
                  className="h-8 text-xs"
                  id="modal-clinic-name"
                  onChange={(e) => setEmailClinicName(e.target.value)}
                  placeholder="Clinique Vétérinaire..."
                  value={emailClinicName}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modal-email-subject">Objet du courriel</Label>
              <Input
                className="h-8 text-xs"
                id="modal-email-subject"
                onChange={(e) => setCustomSubject(e.target.value)}
                value={customSubject || computedEmailTemplate.subject}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-2.5">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium text-xs">Clé d'activation :</span>
                <code className="font-bold font-mono text-xs">
                  {emailLicenseKey}
                </code>
              </div>
              <Button
                aria-label="Copier la clé seule"
                className="size-7"
                onClick={() => copyToClipboard(emailLicenseKey, "Clé seule")}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Copy className="size-3.5" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">
                Aperçu du message formaté
              </Label>
              <div className="max-h-48 select-text overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/30 p-3 font-mono text-[11px] text-foreground/90 leading-relaxed">
                {computedEmailTemplate.body}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              onClick={() =>
                copyToClipboard(computedEmailTemplate.body, "Message complet")
              }
              type="button"
              variant="outline"
            >
              <Copy className="me-1.5 size-3.5" />
              Copier le texte
            </Button>

            <Button
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleOpenMailClient}
              type="button"
            >
              <Send className="size-3.5" />
              Ouvrir dans le client Mail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIRM REVOCATION ALERT DIALOG                                */}
      {/* ========================================================================= */}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setLicenseToRevoke(null);
          }
        }}
        open={Boolean(licenseToRevoke)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="size-5" />
              Révoquer cette licence ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              L'accès pour le cabinet{" "}
              <strong className="text-foreground">
                {licenseToRevoke?.email}
              </strong>{" "}
              sera immédiatement suspendu. Les postes connectés ne pourront plus
              valider leur session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isRevoking}
              onClick={executeRevoke}
            >
              {isRevoking ? <Spinner className="size-3.5" /> : "Oui, révoquer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========================================================================= */}
      {/* MODAL 3: LICENSE TECHNICAL DETAILS                                      */}
      {/* ========================================================================= */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setDetailLicense(null);
          }
        }}
        open={Boolean(detailLicense)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Info className="size-4 text-primary" />
              Détails de la licence
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informations techniques enregistrées sur le serveur.
            </DialogDescription>
          </DialogHeader>

          {detailLicense && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                  <div>Identifiant :</div>
                  <div className="col-span-2 select-all font-medium font-mono text-foreground">
                    {detailLicense.id}
                  </div>

                  <div>Cabinet :</div>
                  <div className="col-span-2 select-all font-medium text-foreground">
                    {detailLicense.email}
                  </div>

                  <div>Formule :</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {PLAN_LABELS[detailLicense.plan] || detailLicense.plan}
                  </div>

                  <div>Date de création :</div>
                  <div className="col-span-2 text-foreground">
                    {new Date(detailLicense.createdAt).toLocaleString("fr-FR")}
                  </div>

                  <div>Date d'expiration :</div>
                  <div className="col-span-2 text-foreground">
                    {formatDate(detailLicense.expiresAt)}
                  </div>

                  <div>Appareils autorisés :</div>
                  <div className="col-span-2 font-medium text-foreground">
                    {detailLicense.deviceCount} / {detailLicense.maxDevices}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  Postes enregistrés (identifiants d’installation)
                </Label>
                {detailLicense.devices && detailLicense.devices.length > 0 ? (
                  <div className="max-h-28 overflow-y-auto rounded-lg border border-border/60 bg-background p-2 font-mono text-[10px]">
                    {detailLicense.devices.map((dev, idx) => (
                      <div
                        className="flex items-center justify-between border-border/30 border-b py-1 last:border-0"
                        key={dev}
                      >
                        <span className="text-muted-foreground">
                          Poste #{idx + 1}
                        </span>
                        <span className="select-all font-medium text-foreground">
                          {dev}
                        </span>
                        <Button size="sm" variant="ghost" type="button" onClick={async () => {
                          if (!window.confirm("Libérer ce poste ? Son accès sera retiré au prochain contrôle en ligne, au plus tard à la fin de son autorisation hors connexion.")) return;
                          try {
                            const updated = await releaseActivationDevice(adminToken, detailLicense.id, dev);
                            setDetailLicense(updated);
                            await loadLicenses(adminToken, true);
                            toast.success("Poste libéré.");
                          } catch (error) { toast.error(error instanceof Error ? error.message : "Impossible de libérer ce poste."); }
                        }}>Libérer</Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-border/60 border-dashed p-2.5 text-center text-[11px] text-muted-foreground">
                    Aucun appareil n'a encore validé sa première connexion.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => {
                if (detailLicense) {
                  openEmailModalFor({
                    clinicEmail: detailLicense.email,
                    plan: detailLicense.plan,
                    maxDevices: detailLicense.maxDevices,
                    expiresAt: detailLicense.expiresAt,
                  });
                }
                setDetailLicense(null);
              }}
              type="button"
              variant="default"
            >
              <Mail className="me-1.5 size-3.5" />
              Transmettre par courriel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: SERVER SETTINGS & TOKEN CONFIGURATION                         */}
      {/* ========================================================================= */}
      <Dialog onOpenChange={setIsSettingsOpen} open={isSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Settings2 className="size-4 text-primary" />
              Configuration du serveur d'activation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Renseignez le jeton administrateur pour gérer les licences de vos
              cabinets.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="input-token-edit">Jeton administrateur</Label>
              <Input
                autoComplete="off"
                className="h-9 font-mono text-xs"
                id="input-token-edit"
                onChange={(e) => setTempToken(e.target.value)}
                placeholder="ACTIVATION_ADMIN_TOKEN"
                type="text"
                value={tempToken}
              />
              <p className="text-[11px] text-muted-foreground">
                Généré lors du premier lancement dans{" "}
                <code className="font-mono">
                  activation-server/data/admin-token
                </code>
                .
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Adresse du serveur
                </span>
                <span className="font-medium font-mono">
                  {ACTIVATION_SERVER_URL}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsSettingsOpen(false)}
              type="button"
              variant="outline"
            >
              Annuler
            </Button>
            <Button onClick={handleSaveToken} type="button">
              Valider et mémoriser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
