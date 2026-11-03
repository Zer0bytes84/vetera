import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Logo from "@/components/Logo";
import { StartupSplash } from "@/components/startup-splash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTauriDrag } from "@/hooks/use-tauri-drag";
import { isTauriRuntime } from "@/services/browser-store";
import { activateLicense } from "@/services/licenseActivationService";
import {
  acceptLicenseActivation,
  checkLicenseAccess,
  getCachedLicenseAccess,
  type LicenseAccess,
  LICENSE_LOCAL_RECHECK_MS,
  recheckLicenseInBackground,
} from "@/services/licenseRuntime";
import { formatLicenseKey } from "@/services/licenseService";

export function LicenseGate({ children }: { children: ReactNode }) {
  // Browser-only development demos have no desktop installation to license.
  // Production builds never bypass the check, even outside Tauri.
  if (import.meta.env.DEV && !isTauriRuntime()) return children;
  return <CheckedLicenseGate>{children}</CheckedLicenseGate>;
}

/** Same verdict, same object: a background recheck that changes nothing renders nothing. */
function sameAccess(a: LicenseAccess | null, b: LicenseAccess) {
  return Boolean(a) && a!.allowed === b.allowed && a!.message === b.message && a!.offlineUntil === b.offlineUntil && a!.expiresAt === b.expiresAt && a!.email === b.email;
}

function CheckedLicenseGate({ children }: { children: ReactNode }) {
  // Remounted (React 19 hides a suspended tree and reruns its effects), the
  // gate starts from the access this process already verified: no wait.
  const [access, setAccess] = useState<LicenseAccess | null>(() => getCachedLicenseAccess());
  const [email, setEmail] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const drag = useTauriDrag<HTMLDivElement>(true);
  const apply = useCallback((result: LicenseAccess) => {
    if (!mounted.current) return;
    setAccess((previous) => (sameAccess(previous, result) ? previous : result));
    setEmail((previous) => previous || result.email || "");
  }, []);
  // Startup and explicit retries: the full check, with its usual wait.
  const refresh = useCallback(async (online: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      apply(await checkLicenseAccess(online));
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [apply]);

  useEffect(() => {
    mounted.current = true;
    // One full check per process; a remount reuses the verified access.
    if (!getCachedLicenseAccess()) void refresh(true);
    // Background rechecks: no busy state, no wait, a verdict only if it changes.
    const recheck = (cause: "interval" | "visibility" | "online") => {
      if (inFlight.current) return;
      void recheckLicenseInBackground(cause)?.then(apply);
    };
    const tick = () => recheck("interval");
    const focus = () => {
      if (document.visibilityState === "visible") recheck("visibility");
    };
    const reconnect = () => recheck("online");
    const timer = window.setInterval(tick, LICENSE_LOCAL_RECHECK_MS);
    window.addEventListener("online", reconnect);
    document.addEventListener("visibilitychange", focus);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      window.removeEventListener("online", reconnect);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [apply, refresh]);

  const activate = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await activateLicense(email, key);
      await acceptLicenseActivation(email, result.activationToken);
      setAccess(await checkLicenseAccess(false));
      setKey("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Activation impossible."
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  if (access?.allowed)
    return (
      <>
        {access.offlineUntil && (
          <div
            role="status"
            className="fixed bottom-3 left-1/2 z-[100] flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-xl border bg-background px-4 py-2 text-xs shadow-sm"
          >
            <span>
              Licence hors connexion · accès jusqu’au{" "}
              {new Date(access.offlineUntil).toLocaleString("fr-FR")}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void refresh(true)}
            >
              Réessayer
            </Button>
          </div>
        )}
        {children}
      </>
    );

  // While the check runs, the same quiet wait as the rest of startup; the
  // licence screen below only appears once there is something to say.
  if (!access) return <StartupSplash />;

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-background px-6 py-16 text-foreground">
      <div
        ref={drag.ref}
        onMouseDown={drag.handleMouseDown}
        className="absolute inset-x-0 top-0 h-12 select-none"
      />
      <section className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-sm">
        <Logo />
        <h1 className="mt-6 text-2xl font-semibold">
          {access ? "Licence de ce poste" : "Vérification de votre licence"}
        </h1>
        <p
          role="status"
          className="mt-3 text-sm leading-6 text-muted-foreground"
        >
          {access?.message || "Connexion au serveur d’activation…"}
        </p>
        {access && (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Vos dossiers restent conservés sur cet appareil.
            </p>
            <form onSubmit={activate} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="license-email">Courriel de la licence</Label>
                <Input
                  id="license-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  disabled={busy}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license-key">Clé d’activation</Label>
                <Input
                  id="license-key"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={24}
                  value={key}
                  disabled={busy}
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                  onChange={(event) =>
                    setKey(formatLicenseKey(event.target.value))
                  }
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Vérification…" : "Activer ce poste"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={() => void refresh(true)}
              >
                Vérifier l’activation existante
              </Button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
