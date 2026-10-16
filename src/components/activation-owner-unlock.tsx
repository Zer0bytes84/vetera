import { useState, type ReactNode } from "react";
import { requireActivationOwner } from "@/services/adminAccess";
import { setStoredAdminToken, verifyAdminToken } from "@/services/licenseActivationService";

/** The server secret is entered explicitly and never persisted on disk. */
export function ActivationOwnerUnlock({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (unlocked) return children;
  return <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
    <form style={{ background: "var(--surface)" }} className="w-full max-w-md space-y-5 rounded-xl border border-border p-8" onSubmit={async event => {
      event.preventDefault();
      if (busy || !token.trim()) return;
      setBusy(true);
      setError("");
      try {
        await requireActivationOwner();
        if (!await verifyAdminToken(token.trim())) throw new Error("Jeton refusé ou serveur indisponible. Vérifiez le jeton puis réessayez.");
        await requireActivationOwner();
        setStoredAdminToken(token);
        setToken("");
        setUnlocked(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Accès impossible.");
      } finally { setBusy(false); }
    }}>
      <h1 className="text-xl font-medium">Déverrouiller le Centre d’Activation</h1>
      <p className="text-sm text-muted-foreground">Accès propriétaire. Le jeton de gestion est vérifié par le serveur et conservé uniquement pour cette session.</p>
      <label className="grid gap-2 text-sm">Jeton de sécurité<input type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} required className="h-11 rounded-lg border border-border bg-background px-3" /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={busy || !token.trim()} className="h-11 w-full rounded-lg bg-primary px-4 text-primary-foreground disabled:opacity-50">{busy ? "Vérification…" : "Déverrouiller"}</button>
      <a className="block text-center text-sm underline" href="/">Revenir à Baitari</a>
    </form>
  </main>;
}
