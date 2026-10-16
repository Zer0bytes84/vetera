import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { RESET_CONFIRMATION, resetLocalData } from "@/services/localDataReset";

export function LocalDataResetSettings() {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (currentUser?.role !== "admin") return null;
  return <section className="settings-panel settings-reset-panel" aria-label="Réinitialisation">
    <div className="settings-panel-heading"><h3>Réinitialisation</h3><p>Administration de la base de ce poste.</p></div>
    <div className="settings-row"><div><p className="settings-row-title">Revenir à la première installation</p><p className="settings-row-detail">Supprime les données du cabinet, les comptes, les sessions, les paramètres et la licence enregistrée sur ce poste. Une sauvegarde automatique est créée avant toute suppression.</p></div><Button variant="outline" onClick={() => { setConfirmation(""); setPassword(""); setError(""); setOpen(true); }}>Réinitialiser</Button></div>
    <AlertDialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Réinitialiser les données locales ?</AlertDialogTitle><AlertDialogDescription>Cette action efface toutes les données de l’application sur ce poste, y compris les comptes et la licence enregistrée. Une sauvegarde préalable est conservée. Au redémarrage, vous devrez effectuer la première installation et activer à nouveau votre licence.</AlertDialogDescription></AlertDialogHeader>
      <Field><FieldLabel htmlFor="reset-password">Votre mot de passe administrateur</FieldLabel><Input id="reset-password" type="password" autoComplete="current-password" value={password} disabled={busy} onChange={event => setPassword(event.target.value)}/></Field>
      <Field><FieldLabel htmlFor="reset-confirmation">Saisissez {RESET_CONFIRMATION}</FieldLabel><Input id="reset-confirmation" value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} autoComplete="off"/></Field>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel><Button variant="destructive" disabled={busy || confirmation !== RESET_CONFIRMATION || !password} onClick={async () => {
        setBusy(true); setError("");
        try { await resetLocalData(confirmation, password); toast.success("Les données locales ont été réinitialisées."); window.location.reload(); }
        catch (err) { setError(err instanceof Error ? err.message : "Réinitialisation impossible."); setBusy(false); }
      }}>{busy ? "Réinitialisation…" : "Confirmer la réinitialisation"}</Button></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </section>;
}
