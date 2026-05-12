import {
  Add01Icon,
  BankIcon,
  Briefcase01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Delete01Icon,
  Edit01Icon,
  GraduationScrollIcon,
  Key01Icon,
  MailIcon,
  SearchIcon,
  Shield01Icon,
  SmartPhone01Icon,
  StethoscopeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type React from "react";
import { useMemo, useState } from "react";
import {
  type MetricOverviewItem,
  MetricOverviewStrip,
} from "@/components/metric-overview-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useUsersRepository } from "@/data/repositories";
import { cn } from "@/lib/utils";
import { updatePassword } from "@/services/sqlite/auth";
import type { User, UserRole } from "@/types/db";
import Avatar from "./Avatar";

const ROLE_CONFIG: Record<
  UserRole | string,
  { label: string; color: string; bg: string; icon: typeof Shield01Icon }
> = {
  admin: {
    label: "Administrateur",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-500/20",
    icon: Shield01Icon,
  },
  vet_principal: {
    label: "Vétérinaire Principal",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-500/20",
    icon: StethoscopeIcon,
  },
  vet_adjoint: {
    label: "Vétérinaire Adjoint",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-500/20",
    icon: StethoscopeIcon,
  },
  assistant: {
    label: "Assistant(e)",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-500/20",
    icon: Briefcase01Icon,
  },
  stagiaire: {
    label: "Stagiaire",
    color: "text-muted-foreground",
    bg: "bg-muted/50",
    icon: GraduationScrollIcon,
  },
};

const buildTeamSparkline = (
  base: number,
  pattern: "steady" | "rise" | "watch" | "stable"
) => {
  const deltas = {
    steady: [-1, 0, 1, 0, 1, 1, 2, 2],
    rise: [0, 1, 1, 2, 2, 3, 3, 4],
    watch: [2, 1, 3, 2, 4, 3, 5, 4],
    stable: [1, 1, 0, 1, 0, 1, 0, 0],
  }[pattern];

  return deltas.map((delta) => Math.max(base + delta, 0));
};

const Team: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // State for password reset feedback
  const [resetStatus, setResetStatus] = useState<{
    loading: boolean;
    userId: string | null;
  }>({ loading: false, userId: null });

  const { currentUser } = useAuth();
  const {
    data: users,
    loading,
    add: addUser,
    update: updateUser,
    remove: removeUser,
  } = useUsersRepository();

  // Déterminer les permissions
  const currentUserDb = users.find((u) => u.email === currentUser?.email);
  const isSuperAdmin =
    currentUser?.email === "zohir.kh@gmail.com" ||
    currentUserDb?.role === "admin";
  const isPrincipal = currentUserDb?.role === "vet_principal";

  // Zohir (SuperAdmin) et les vétérinaires principaux peuvent gérer l'équipe
  const canManageTeam = isSuperAdmin || isPrincipal;

  // Form State
  const [formData, setFormData] = useState<Partial<User>>({
    role: "stagiaire",
    status: "active",
  });

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    if (error && typeof error === "object") {
      const maybeMessage = (error as { message?: unknown }).message;
      if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
        return maybeMessage;
      }
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") {
        return serialized;
      }
    }
    return "Erreur inconnue";
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingId(user.id);
      setFormData({
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        specialty: user.specialty,
        status: user.status,
      });
    } else {
      setEditingId(null);
      setFormData({
        role: "stagiaire",
        status: "active",
        displayName: "",
        email: "",
        phone: "",
        specialty: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!(formData.displayName && formData.email)) {
      return;
    }

    const normalizedEmail = formData.email.trim().toLowerCase();
    const duplicateUser = users.find(
      (user) =>
        user.email?.trim().toLowerCase() === normalizedEmail &&
        user.id !== editingId
    );

    if (duplicateUser) {
      alert("Un membre avec cet email existe déjà.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingId) {
        await updateUser(editingId, {
          displayName: formData.displayName.trim(),
          email: normalizedEmail,
          phone: formData.phone || "",
          role: formData.role as UserRole,
          status: formData.status as "active" | "inactive",
          specialty: formData.specialty || "",
        });
      } else {
        await addUser({
          displayName: formData.displayName.trim(),
          email: normalizedEmail,
          phone: formData.phone || "",
          role: (formData.role as UserRole) || "stagiaire",
          status: "active",
          specialty: formData.specialty || "",
          passwordHash:
            "5b12f2e8a325d9dbe26572b3f218abf000e49f27b794c15a3f2d0f0bd87f65b1",
        } as any);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("[TEAM] Error saving:", error);
      const message = getErrorMessage(error);
      if (
        message.toLowerCase().includes("unique") ||
        message.toLowerCase().includes("email")
      ) {
        alert("Impossible d'ajouter ce membre: cet email est déjà utilisé.");
      } else {
        alert(`Erreur lors de la sauvegarde: ${message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) {
      return;
    }
    if (
      window.confirm(
        "Êtes-vous sûr de vouloir supprimer ce membre de l'équipe ? Cette action est irréversible."
      )
    ) {
      await removeUser(id);
    }
  };

  const handleResetPassword = async (
    email: string,
    name: string,
    userId: string
  ) => {
    if (!(email && userId)) {
      return;
    }
    const confirmMsg = `Réinitialiser le mot de passe de ${name} (${email}) ?`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    const temporaryPassword = `Vet${Math.random().toString(36).slice(-6)}!`
      .replace(/[^a-zA-Z0-9!]/g, "A")
      .slice(0, 10);

    setResetStatus({ loading: true, userId });
    try {
      await updatePassword(userId, temporaryPassword);
      alert(
        `Mot de passe temporaire généré:\n${temporaryPassword}\n\nPartagez-le de façon sécurisée puis demandez le changement immédiat.`
      );
    } catch (error: any) {
      console.error(error);
      alert(
        `Erreur lors de la réinitialisation: ${error?.message || "Erreur inconnue"}`
      );
    } finally {
      setResetStatus({ loading: false, userId: null });
    }
  };

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          (u.displayName || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [users, searchTerm]
  );

  const overviewCards = useMemo<MetricOverviewItem[]>(() => {
    const activeUsers = users.filter((user) => user.status === "active").length;
    const vets = users.filter((user) =>
      ["vet_principal", "vet_adjoint"].includes(user.role || "")
    ).length;
    const support = users.filter((user) =>
      ["assistant", "stagiaire"].includes(user.role || "")
    ).length;
    const accessReview = users.filter(
      (user) => user.status !== "active"
    ).length;

    return [
      {
        label: "Équipe active",
        value: String(activeUsers),
        meta: `${users.length} compte${users.length > 1 ? "s" : ""}`,
        note: "Présence",
        icon: BankIcon,
        tone: "blue",
        sparklineData: buildTeamSparkline(activeUsers, "steady"),
      },
      {
        label: "Vétérinaires",
        value: String(vets),
        meta: "pratique clinique",
        note: "Capacité",
        icon: StethoscopeIcon,
        tone: "orange",
        sparklineData: buildTeamSparkline(vets, "rise"),
      },
      {
        label: "Support & relève",
        value: String(support),
        meta: "assistant·e·s et stagiaires",
        note: "Couverture",
        icon: Briefcase01Icon,
        tone: "emerald",
        sparklineData: buildTeamSparkline(support, "stable"),
      },
      {
        label: "Accès à revoir",
        value: String(accessReview),
        meta: accessReview > 0 ? "statut inactif" : "tout est OK",
        note: "Permissions",
        icon: Key01Icon,
        tone: accessReview > 0 ? "amber" : "slate",
        sparklineData: buildTeamSparkline(accessReview, "watch"),
      },
    ];
  }, [users]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 pt-4 pb-6 lg:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-end">
        <div className="flex flex-col gap-2 sm:flex-row">
          {canManageTeam ? (
            <Button
              className="h-10 rounded-xl px-4"
              onClick={() => handleOpenModal()}
            >
              <HugeiconsIcon
                className="size-4"
                icon={Add01Icon}
                strokeWidth={2}
              />
              <span>Nouveau Membre</span>
            </Button>
          ) : null}
        </div>
      </div>

      <MetricOverviewStrip items={overviewCards} />

      {/* Main Card */}
      <Card className="card-vibrant card-hover-lift flex flex-1 flex-col overflow-hidden rounded-[24px] border border-border bg-card shadow-none">
        <CardHeader className="border-border border-b px-6 py-5">
          <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Annuaire interne
          </CardDescription>
          <CardTitle className="font-normal text-[22px] tracking-[-0.04em]">
            Coordination de l'équipe
          </CardTitle>
          <CardAction>
            <Badge className="rounded-full px-3 py-1" variant="outline">
              {filteredUsers.length} visible
              {filteredUsers.length > 1 ? "s" : ""}
            </Badge>
          </CardAction>
        </CardHeader>
        {/* Toolbar */}
        <div className="flex flex-col items-center justify-between gap-4 border-border border-b px-6 py-4 md:flex-row">
          <div className="relative w-full md:w-[400px]">
            <HugeiconsIcon
              className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
              icon={SearchIcon}
              strokeWidth={2}
            />
            <Input
              className="h-10 rounded-xl pl-9"
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un membre..."
              type="text"
              value={searchTerm}
            />
          </div>

          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {users.filter((u) => u.status === "active").length} Actifs
            </span>
          </div>
        </div>

        {/* Users List */}
        <CardContent className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center p-6">
              <Spinner />
            </div>
          ) : filteredUsers.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Aucun membre trouvé</EmptyTitle>
                <EmptyDescription>
                  Aucun membre ne correspond à votre recherche.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredUsers.map((user) => {
                const effectiveRole =
                  user.email === "zohir.kh@gmail.com" ? "admin" : user.role;
                const config =
                  ROLE_CONFIG[effectiveRole] || ROLE_CONFIG["stagiaire"];
                const RoleIcon = config.icon || GraduationScrollIcon;
                const isCurrentUserRow =
                  user.email?.trim().toLowerCase() ===
                  currentUser?.email?.trim().toLowerCase();
                const resolvedAvatar =
                  user.avatarUrl ||
                  (isCurrentUserRow
                    ? (currentUser?.avatarUrl ?? "")
                    : "");

                const isResetting =
                  resetStatus.loading && resetStatus.userId === user.id;

                return (
                  <div
                    className="group relative flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-5 transition-all hover:bg-muted/50 hover:shadow-md"
                    key={user.id}
                  >
                    {/* Top Row: Info */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar
                          name={user.displayName}
                          size="lg"
                          src={resolvedAvatar}
                        />
                        <div>
                          <h3 className="font-bold text-base text-foreground leading-tight">
                            {user.displayName || "Utilisateur inconnu"}
                          </h3>
                          {user.specialty && (
                            <p className="mt-0.5 text-muted-foreground text-xs">
                              {user.specialty}
                            </p>
                          )}
                        </div>
                      </div>

                      {canManageTeam && (
                        <div className="flex items-center gap-1">
                          <Button
                            className="text-muted-foreground hover:bg-amber-50 hover:text-amber-500 dark:hover:bg-amber-900/20"
                            disabled={isResetting}
                            onClick={() =>
                              handleResetPassword(
                                user.email,
                                user.displayName,
                                user.id
                              )
                            }
                            size="icon-sm"
                            title="Réinitialiser le mot de passe"
                            variant="ghost"
                          >
                            {isResetting ? (
                              <Spinner className="size-4" />
                            ) : (
                              <HugeiconsIcon
                                className="size-4"
                                icon={Key01Icon}
                                strokeWidth={2}
                              />
                            )}
                          </Button>
                          <Button
                            className="text-muted-foreground hover:bg-blue-50 hover:text-primary dark:hover:bg-blue-900/20"
                            onClick={() => handleOpenModal(user)}
                            size="icon-sm"
                            title="Modifier le rôle / statut"
                            variant="ghost"
                          >
                            <HugeiconsIcon
                              className="size-4"
                              icon={Edit01Icon}
                              strokeWidth={2}
                            />
                          </Button>
                          {user.email !== "zohir.kh@gmail.com" && (
                            <Button
                              className="text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                              onClick={() => handleDelete(user.id)}
                              size="icon-sm"
                              title="Supprimer définitivement"
                              variant="ghost"
                            >
                              <HugeiconsIcon
                                className="size-4"
                                icon={Delete01Icon}
                                strokeWidth={2}
                              />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Role Badge */}
                    <div className="flex">
                      <Badge
                        className={cn(
                          "gap-1.5 border-transparent",
                          config.bg,
                          config.color
                        )}
                      >
                        <HugeiconsIcon
                          className="size-3"
                          icon={RoleIcon}
                          strokeWidth={2}
                        />
                        {config.label}
                      </Badge>
                    </div>

                    {/* Contact Info */}
                    <div className="mt-auto space-y-2 border-border/50 border-t pt-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <HugeiconsIcon
                          className="size-3.5 text-muted-foreground"
                          icon={MailIcon}
                          strokeWidth={2}
                        />
                        <span className="truncate">
                          {user.email || "Pas d'email"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <HugeiconsIcon
                          className="size-3.5 text-muted-foreground"
                          icon={SmartPhone01Icon}
                          strokeWidth={2}
                        />
                        <span>{user.phone || "Non renseigné"}</span>
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="absolute right-5 bottom-5">
                      {user.status === "active" ? (
                        <Badge className="gap-1 border-green-100 bg-green-50 text-[10px] text-green-600 dark:border-green-500/20 dark:bg-green-500/10">
                          <HugeiconsIcon
                            className="size-2.5"
                            icon={CheckmarkCircle02Icon}
                            strokeWidth={2}
                          />{" "}
                          Actif
                        </Badge>
                      ) : (
                        <Badge className="gap-1 bg-muted/50 text-[10px] text-muted-foreground">
                          <HugeiconsIcon
                            className="size-2.5"
                            icon={Cancel01Icon}
                            strokeWidth={2}
                          />{" "}
                          Inactif
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Member Dialog */}
      <Dialog onOpenChange={setIsModalOpen} open={isModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier le membre" : "Ajouter un membre"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Modifiez les informations du membre de l'équipe."
                : "Remplissez les informations du nouveau membre."}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel>Nom complet</FieldLabel>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                placeholder="Ex: Dr. Aissa Zeghouini"
                type="text"
                value={formData.displayName || ""}
              />
            </Field>

            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="email@clinique.com"
                type="email"
                value={formData.email || ""}
              />
            </Field>

            <Field>
              <FieldLabel>Téléphone</FieldLabel>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+213..."
                type="tel"
                value={formData.phone || ""}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Rôle</FieldLabel>
                <NativeSelect
                  className="w-full"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as UserRole,
                    })
                  }
                  value={formData.role}
                >
                  <NativeSelectOption value="vet_principal">
                    Vétérinaire Principal
                  </NativeSelectOption>
                  <NativeSelectOption value="vet_adjoint">
                    Vétérinaire Adjoint
                  </NativeSelectOption>
                  <NativeSelectOption value="assistant">
                    Assistant(e)
                  </NativeSelectOption>
                  <NativeSelectOption value="stagiaire">
                    Stagiaire
                  </NativeSelectOption>
                  <NativeSelectOption value="admin">
                    Administrateur
                  </NativeSelectOption>
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel>Statut</FieldLabel>
                <NativeSelect
                  className="w-full"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                  value={formData.status}
                >
                  <NativeSelectOption value="active">Actif</NativeSelectOption>
                  <NativeSelectOption value="inactive">
                    Inactif
                  </NativeSelectOption>
                </NativeSelect>
              </Field>
            </div>

            <Field>
              <FieldLabel>Spécialité (Opt.)</FieldLabel>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, specialty: e.target.value })
                }
                placeholder="Ex: Chirurgie"
                type="text"
                value={formData.specialty || ""}
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button onClick={() => setIsModalOpen(false)} variant="outline">
              Annuler
            </Button>
            <Button disabled={isSubmitting} onClick={handleSave}>
              {isSubmitting && <Spinner className="size-4" />}
              {editingId ? "Mettre à jour" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Team;
