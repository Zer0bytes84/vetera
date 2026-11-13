import { ListSearch } from "@/components/ui/list-controls";
import { MagnifyingGlassIcon, UsersIcon } from "@heroicons/react/20/solid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InitialsAvatar } from "@/design-system/patterns/initials-avatar";
import {
  formatNumber,
  formatPersonName,
  formatPhone,
} from "@/utils/display-format";
import {
  AcademicCapIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  EllipsisHorizontalIcon,
  EnvelopeIcon,
  KeyIcon,
  PencilIcon,
  PlusCircleIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/16/solid";
import type React from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import MotivationalHeader from "@/components/MotivationalHeader";
import { type SectionCardItem, SectionCards } from "@/components/section-cards";
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
import { Dialog } from "@/components/ui/dialog";
import { Shell, ShellHeader } from "@/components/ui/surface";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
} from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { TEAM_STATUS_META } from "@/config/status-meta";
import { useAuth } from "@/contexts/AuthContext";
import { useUsersRepository } from "@/data/repositories";
import { cn } from "@/lib/utils";
import { hashPassword, updatePassword } from "@/services/sqlite/auth";
import type { User, UserRole } from "@/types/db";
import Avatar from "./Avatar";
import { readTeam } from "./team-reading";

const ROLE_CONFIG: Record<
  UserRole | string,
  { label: string; color: string; bg: string; icon: typeof ShieldCheckIcon }
> = {
  admin: {
    label: "Administrateur",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-500/20",
    icon: ShieldCheckIcon,
  },
  vet_principal: {
    label: "Vétérinaire Principal",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-500/20",
    icon: PlusCircleIcon,
  },
  vet_adjoint: {
    label: "Vétérinaire Adjoint",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-500/20",
    icon: PlusCircleIcon,
  },
  assistant: {
    label: "Assistant(e)",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-500/20",
    icon: BriefcaseIcon,
  },
  stagiaire: {
    label: "Stagiaire",
    color: "text-muted-foreground",
    bg: "bg-muted/50",
    icon: AcademicCapIcon,
  },
};

function createTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const randomValues = crypto.getRandomValues(new Uint32Array(7));
  const randomPart = Array.from(
    randomValues,
    (value) => alphabet[value % alphabet.length],
  ).join("");
  return `Vet${randomPart}!`;
}

const Team: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [memberPendingDelete, setMemberPendingDelete] = useState<User | null>(
    null,
  );
  const [passwordResetTarget, setPasswordResetTarget] = useState<User | null>(
    null,
  );
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );

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
    role: undefined,
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
        role: undefined,
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
    if (!(formData.displayName && formData.email && formData.role)) {
      return;
    }

    const normalizedEmail = formData.email.trim().toLowerCase();
    const duplicateUser = users.find(
      (user) =>
        user.email?.trim().toLowerCase() === normalizedEmail &&
        user.id !== editingId,
    );

    if (duplicateUser) {
      toast.error("Un membre avec cet email existe déjà.");
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
        const initialPassword = createTemporaryPassword();
        await addUser({
          displayName: formData.displayName.trim(),
          email: normalizedEmail,
          phone: formData.phone || "",
          role: formData.role as UserRole,
          status: "active",
          specialty: formData.specialty || "",
          passwordHash: await hashPassword(initialPassword),
        } as any);
        setTemporaryPassword(initialPassword);
      }
      setIsModalOpen(false);
      if (editingId) {
        toast.success("Membre mis à jour.");
      }
    } catch (error) {
      console.error("[TEAM] Error saving:", error);
      const message = getErrorMessage(error);
      if (
        message.toLowerCase().includes("unique") ||
        message.toLowerCase().includes("email")
      ) {
        toast.error(
          "Impossible d'ajouter ce membre : cet email est déjà utilisé.",
        );
      } else {
        toast.error(`Erreur lors de la sauvegarde : ${message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!memberPendingDelete?.id) {
      return;
    }

    try {
      await removeUser(memberPendingDelete.id);
      toast.success(`${memberPendingDelete.displayName} a été supprimé.`);
      setMemberPendingDelete(null);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de supprimer ce membre. Réessayez.");
    }
  };

  const handleResetPassword = async (
    email: string,
    _name: string,
    userId: string,
  ) => {
    if (!(email && userId)) {
      return;
    }
    const temporaryPassword = createTemporaryPassword();

    setResetStatus({ loading: true, userId });
    try {
      await updatePassword(userId, temporaryPassword);
      setTemporaryPassword(temporaryPassword);
      setPasswordResetTarget(null);
    } catch (error: any) {
      console.error(error);
      toast.error(
        `Erreur lors de la réinitialisation : ${error?.message || "Erreur inconnue"}`,
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
          (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [users, searchTerm],
  );

  // One short, true line at the foot of every card, read by readTeam with the page's own rules.
  const sectionCards = useMemo<SectionCardItem[]>(() => {
    const team = readTeam(users);
    return [
      {
        title: "Équipe active",
        value: formatNumber(team.active),
        tone: team.pending ? "watch" : "positive",
        detailRow: team.lines.active,
        actionLabel: "Voir l'équipe active",
      },
      {
        title: "Vétérinaires",
        value: formatNumber(team.vets),
        tone: "quiet",
        detailRow: team.lines.vets,
        actionLabel: "Voir les praticiens",
      },
      {
        title: "Support & soignants",
        value: formatNumber(team.support),
        tone: "quiet",
        detailRow: team.lines.support,
        actionLabel: "Voir le support clinique",
      },
      {
        title: "Accès & statut",
        value: formatNumber(team.pending),
        tone: team.pending ? "critical" : "positive",
        detailRow: team.lines.access,
        actionLabel: "Vérifier les accès",
      },
    ];
  }, [users]);

  // The band's state line reads the team as the dashboard and Rappels read theirs: day, time, then what is true now.
  const team = readTeam(users);
  const readAt = new Date();
  const readDay = readAt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const bandSubtitle = loading
    ? "Lecture de l’équipe…"
    : `${readDay[0].toLocaleUpperCase("fr-FR")}${readDay.slice(1)} · état à ${readAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · ${team.state}`;

  return (
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-4 px-4 pb-8 lg:px-6">
      <MotivationalHeader section="equipe" />

      <SectionCards
        actions={
          canManageTeam ? (
            <Button
              className="h-9 rounded-full px-4"
              onClick={() => handleOpenModal()}
            >
              <PlusIcon aria-hidden="true" className="size-4" />
              <span>Nouveau membre</span>
            </Button>
          ) : undefined
        }
        badges={false}
        icon={UsersIcon}
        items={sectionCards}
        subtitle={bandSubtitle}
      />

      {/* The directory: no section title block, a tool row as on Flux and Rappels (count on the left, search on the right). */}
      <section aria-label="Annuaire de l’équipe" className="team-directory flex flex-1 flex-col gap-3">
        <div className="team-directory-tools flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="text-muted-foreground t-13">
            <span className="font-medium text-foreground tabular-nums">{formatNumber(filteredUsers.length)}</span>{" "}
            membre{filteredUsers.length > 1 ? "s" : ""}
            {searchTerm ? ` sur ${formatNumber(users.length)}` : ""}
          </p>
          <ListSearch
            className="w-full sm:w-56"
            label="Rechercher un membre"
            placeholder="Rechercher un membre…"
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
        </div>

        {/* Users List */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center p-6">
              <Spinner />
            </div>
          ) : filteredUsers.length === 0 ? (
            // Composed as the Rappels' empty search: the page's band, one true line, and the way out.
            <Shell>
              <ShellHeader
                aside={
                  searchTerm ? (
                    <Button onClick={() => setSearchTerm("")} size="sm" type="button" variant="outline">
                      Effacer la recherche
                    </Button>
                  ) : canManageTeam ? (
                    <Button onClick={() => handleOpenModal()} size="sm" type="button" variant="outline">
                      <PlusIcon aria-hidden="true" className="size-4" />
                      Nouveau membre
                    </Button>
                  ) : undefined
                }
                as="h2"
                icon={searchTerm ? MagnifyingGlassIcon : UsersIcon}
                subtitle={
                  searchTerm
                    ? `Aucun membre ne correspond à « ${searchTerm} ».`
                    : "Aucun membre n’est enregistré pour ce cabinet."
                }
                title={searchTerm ? "Aucun résultat" : "Aucun membre"}
              />
            </Shell>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredUsers.map((user) => {
                const effectiveRole =
                  user.email === "zohir.kh@gmail.com" ? "admin" : user.role;
                const config =
                  ROLE_CONFIG[effectiveRole] || ROLE_CONFIG["stagiaire"];
                const RoleIcon = config.icon || AcademicCapIcon;
                const isCurrentUserRow =
                  user.email?.trim().toLowerCase() ===
                  currentUser?.email?.trim().toLowerCase();
                const resolvedAvatar =
                  user.avatarUrl ||
                  (isCurrentUserRow ? (currentUser?.avatarUrl ?? "") : "");

                const isResetting =
                  resetStatus.loading && resetStatus.userId === user.id;

                return (
                  <div
                    className="group relative flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-5 transition hover:bg-muted/50 hover:shadow-md"
                    key={user.id}
                  >
                    {/* Top Row: Info */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        {/^(https?:|data:|blob:|\/)/.test(resolvedAvatar) ? (
                          <Avatar
                            name={user.displayName}
                            size="lg"
                            src={resolvedAvatar}
                          />
                        ) : (
                          <InitialsAvatar
                            className="size-12"
                            name={user.displayName}
                          />
                        )}
                        <div>
                          <h3 className="font-bold text-base text-foreground leading-tight">
                            {formatPersonName(user.displayName) ||
                              "Utilisateur inconnu"}
                          </h3>
                          {user.specialty && (
                            <p className="mt-0.5 text-muted-foreground text-xs">
                              {user.specialty}
                            </p>
                          )}
                        </div>
                      </div>

                      {canManageTeam && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                aria-label={`Actions pour ${user.displayName}`}
                                className="text-muted-foreground"
                                size="icon-sm"
                                title="Actions"
                                variant="ghost"
                              />
                            }
                          >
                            {isResetting ? (
                              <Spinner className="size-4" />
                            ) : (
                              <EllipsisHorizontalIcon aria-hidden="true" className="size-4" />
                            )}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={isResetting}
                              onClick={() => setPasswordResetTarget(user)}
                            >
                              <KeyIcon aria-hidden="true" className="size-4" />
                              Réinitialiser le mot de passe
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenModal(user)}
                            >
                              <PencilIcon aria-hidden="true" className="size-4" />
                              Modifier le rôle / statut
                            </DropdownMenuItem>
                            {user.email !== "zohir.kh@gmail.com" && (
                              <DropdownMenuItem
                                onClick={() => setMemberPendingDelete(user)}
                                variant="destructive"
                              >
                                <TrashIcon aria-hidden="true" className="size-4" />
                                Supprimer définitivement
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Role Badge */}
                    <div className="flex">
                      <Badge
                        className={cn(
                          "gap-1.5 border-transparent",
                          config.bg,
                          config.color,
                        )}
                      >
                        <RoleIcon aria-hidden="true" className="size-3" />
                        {config.label}
                      </Badge>
                    </div>

                    {/* Contact Info */}
                    <div className="mt-auto space-y-2 border-border/50 border-t pt-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <EnvelopeIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
                        <span className="truncate">
                          {user.email || "Pas d'email"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <DevicePhoneMobileIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
                        <span>
                          {formatPhone(user.phone) || "Non renseigné"}
                        </span>
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="absolute right-5 bottom-5">
                      <Badge
                        className={cn(
                          "gap-1 t-12",
                          TEAM_STATUS_META[
                            user.status === "active" ? "active" : "inactive"
                          ].className,
                        )}
                      >
                        {user.status === "active" ? <CheckCircleIcon aria-hidden="true" className="size-3" /> : <XMarkIcon aria-hidden="true" className="size-3" />}{" "}
                        {
                          TEAM_STATUS_META[
                            user.status === "active" ? "active" : "inactive"
                          ].label
                        }
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setMemberPendingDelete(null);
          }
        }}
        open={Boolean(memberPendingDelete)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte de {memberPendingDelete?.displayName} sera supprimé de
              l’équipe. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setPasswordResetTarget(null);
          }
        }}
        open={Boolean(passwordResetTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser le mot de passe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Un mot de passe temporaire sera généré pour
              {` ${passwordResetTarget?.displayName}`}. L’accès actuel ne sera
              plus valide.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (passwordResetTarget) {
                  void handleResetPassword(
                    passwordResetTarget.email,
                    passwordResetTarget.displayName,
                    passwordResetTarget.id,
                  );
                }
              }}
            >
              Générer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setTemporaryPassword(null);
          }
        }}
        open={Boolean(temporaryPassword)}
      >
        <FormDialogContent size="sm">
          <FormDialogHeader
            artwork="credentials"
            description="Copiez-le maintenant et transmettez-le par un canal sécurisé. Il disparaîtra à la fermeture."
            icon={<KeyIcon aria-hidden="true" />}
            title="Mot de passe temporaire"
            tone="violet"
          />
          <FormDialogBody>
            <div className="rounded-xl border bg-muted/40 p-4 font-mono text-lg tracking-[0.12em]">
              {temporaryPassword}
            </div>
          </FormDialogBody>
          <FormDialogFooter>
            <Button
              onClick={async () => {
                if (!temporaryPassword) {
                  return;
                }
                try {
                  await navigator.clipboard.writeText(temporaryPassword);
                  toast.success("Mot de passe copié.");
                } catch (error) {
                  console.error(error);
                  toast.error(
                    "La copie a échoué. Sélectionnez le code manuellement.",
                  );
                }
              }}
              variant="outline"
            >
              Copier
            </Button>
            <Button onClick={() => setTemporaryPassword(null)}>Terminé</Button>
          </FormDialogFooter>
        </FormDialogContent>
      </Dialog>

      {/* Add/Edit Member Dialog */}
      <Dialog onOpenChange={setIsModalOpen} open={isModalOpen}>
        <FormDialogContent size="sm">
          <FormDialogHeader
            artwork="team"
            description={
              editingId
                ? "Identité, rôle et accès."
                : "Identité, rôle et accès."
            }
            icon={<BriefcaseIcon aria-hidden="true" />}
            title={editingId ? "Modifier le membre" : "Ajouter un membre"}
            tone="rose"
          />

          <FormDialogBody>
            <FieldGroup>
              <Field>
                <FieldLabel>
                  Nom complet <span className="modal-required">requis</span>
                </FieldLabel>
                <Input
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  placeholder="Prénom et nom"
                  type="text"
                  value={formData.displayName || ""}
                />
              </Field>

              <Field>
                <FieldLabel>
                  Email <span className="modal-required">requis</span>
                </FieldLabel>
                <Input
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Adresse e-mail"
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
                  placeholder="Numéro de téléphone"
                  type="tel"
                  value={formData.phone || ""}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>
                    Rôle <span className="modal-required">requis</span>
                  </FieldLabel>
                  <NativeSelect
                    className="w-full cursor-pointer"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as UserRole,
                      })
                    }
                    value={formData.role || ""}
                  >
                    <NativeSelectOption value="" disabled>
                      Choisir un rôle
                    </NativeSelectOption>
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
                    className="w-full cursor-pointer"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "active" | "inactive",
                      })
                    }
                    value={formData.status}
                  >
                    <NativeSelectOption value="active">
                      Actif
                    </NativeSelectOption>
                    <NativeSelectOption value="inactive">
                      Inactif
                    </NativeSelectOption>
                  </NativeSelect>
                </Field>
              </div>

              <Field>
                <FieldLabel>Spécialité</FieldLabel>
                <Input
                  onChange={(e) =>
                    setFormData({ ...formData, specialty: e.target.value })
                  }
                  placeholder="Ex. chirurgie"
                  type="text"
                  value={formData.specialty || ""}
                />
              </Field>
            </FieldGroup>
          </FormDialogBody>

          <FormDialogFooter>
            <Button
              className="cursor-pointer"
              onClick={() => setIsModalOpen(false)}
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              className="cursor-pointer"
              disabled={
                isSubmitting ||
                !formData.role ||
                !formData.displayName?.trim() ||
                !formData.email?.trim()
              }
              onClick={handleSave}
            >
              {isSubmitting && <Spinner className="size-4" />}
              {editingId ? "Mettre à jour" : "Ajouter"}
            </Button>
          </FormDialogFooter>
        </FormDialogContent>
      </Dialog>
    </div>
  );
};

export default Team;
