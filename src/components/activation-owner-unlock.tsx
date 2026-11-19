import { useState, type ReactNode } from "react";
import { requireActivationOwner } from "@/services/adminAccess";
import {
  setStoredAdminToken,
  verifyAdminToken,
} from "@/services/licenseActivationService";
import { guard } from "@/lib/guard";

/** The server secret is entered explicitly and never persisted on disk. */
export function ActivationOwnerUnlock({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (unlocked) {
    return children;
  }
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
      <form
        className="w-full max-w-md space-y-5 rounded-xl border border-border p-8"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || !token.trim()) {
            return;
          }
          setBusy(true);
          setError("");
          await guard(
            async () => {
              await requireActivationOwner();
              if (!(await verifyAdminToken(token.trim()))) {
                throw new Error(
                  "Jeton refusé ou serveur indisponible. Vérifiez le jeton puis réessayez."
                );
              }
              await requireActivationOwner();
              setStoredAdminToken(token);
              setToken("");
              setUnlocked(true);
            },
            {
              recover: (cause) => {
                setError(
                  cause instanceof Error ? cause.message : "Accès impossible."
                );
              },
              cleanup: () => {
                setBusy(false);
              },
            }
          );
        }}
        style={{ background: "var(--surface)" }}
      >
        <h1 className="t-18 font-medium">
          Déverrouiller le Centre d’Activation
        </h1>
        <p className="text-sm text-muted-foreground">
          Accès propriétaire. Le jeton de gestion est vérifié par le serveur et
          conservé uniquement pour cette session.
        </p>
        <label className="grid gap-2 text-sm">
          Jeton de sécurité
          <input
            autoComplete="off"
            className="h-11 rounded-lg border border-border bg-background px-3"
            onChange={(event) => setToken(event.target.value)}
            required
            type="password"
            value={token}
          />
        </label>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <button
          className="h-11 w-full rounded-lg bg-primary px-4 text-primary-foreground disabled:opacity-50"
          disabled={busy || !token.trim()}
          type="submit"
        >
          {busy ? "Vérification…" : "Déverrouiller"}
        </button>
        <a className="block text-center text-sm underline" href="/">
          Revenir à Baitari
        </a>
      </form>
    </main>
  );
}
