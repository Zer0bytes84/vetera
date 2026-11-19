import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsRow, SettingsSection } from "@/components/settings-section";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { RESET_CONFIRMATION, resetLocalData } from "@/services/localDataReset";

export function LocalDataResetSettings() {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (currentUser?.role !== "admin") {
    return null;
  }
  return (
    <SettingsSection
      aria-label="Réinitialisation"
      icon={RotateCcw}
      subtitle="Administration de la base de ce poste."
      title="Réinitialisation"
    >
      <SettingsRow
        detail="Supprime les données du cabinet, les comptes, les sessions, les paramètres et la licence enregistrée sur ce poste. Une sauvegarde automatique est créée avant toute suppression."
        title="Revenir à la première installation"
      >
        <Button
          className="rounded-full"
          onClick={() => {
            setConfirmation("");
            setPassword("");
            setError("");
            setOpen(true);
          }}
          variant="outline"
        >
          Réinitialiser
        </Button>
      </SettingsRow>
      <AlertDialog
        onOpenChange={(value) => {
          if (!busy) {
            setOpen(value);
          }
        }}
        open={open}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Réinitialiser les données locales ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action efface toutes les données de l’application sur ce
              poste, y compris les comptes et la licence enregistrée. Une
              sauvegarde préalable est conservée. Au redémarrage, vous devrez
              effectuer la première installation et activer à nouveau votre
              licence.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field>
            <FieldLabel htmlFor="reset-password">
              Votre mot de passe administrateur
            </FieldLabel>
            <Input
              autoComplete="current-password"
              disabled={busy}
              id="reset-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="reset-confirmation">
              Saisissez {RESET_CONFIRMATION}
            </FieldLabel>
            <Input
              autoComplete="off"
              disabled={busy}
              id="reset-confirmation"
              onChange={(event) => setConfirmation(event.target.value)}
              value={confirmation}
            />
          </Field>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <Button
              disabled={
                busy || confirmation !== RESET_CONFIRMATION || !password
              }
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await resetLocalData(confirmation, password);
                  toast.success("Les données locales ont été réinitialisées.");
                  window.location.reload();
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Réinitialisation impossible."
                  );
                  setBusy(false);
                }
              }}
              variant="destructive"
            >
              {busy ? "Réinitialisation…" : "Confirmer la réinitialisation"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
