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
import { guard } from "@/lib/guard";
import { isTauriRuntime } from "@/services/browser-store";
import { activateLicense } from "@/services/licenseActivationService";
import {
  acceptLicenseActivation,
  checkLicenseAccess,
  getCachedLicenseAccess,
  LICENSE_LOCAL_RECHECK_MS,
  type LicenseAccess,
  recheckLicenseInBackground,
} from "@/services/licenseRuntime";
import { formatLicenseKey } from "@/services/licenseService";

export function LicenseGate({ children }: { children: ReactNode }) {
  // Browser-only development demos have no desktop installation to license.
  // Production builds never bypass the check, even outside Tauri.
  if (import.meta.env.DEV && !isTauriRuntime()) {
    return children;
  }
  return <CheckedLicenseGate>{children}</CheckedLicenseGate>;
}

/** Same verdict, same object: a background recheck that changes nothing renders nothing. */
function sameAccess(a: LicenseAccess | null, b: LicenseAccess) {
  return (
    Boolean(a) &&
    a!.allowed === b.allowed &&
    a!.message === b.message &&
    a!.offlineUntil === b.offlineUntil &&
    a!.expiresAt === b.expiresAt &&
    a!.email === b.email
  );
}

function CheckedLicenseGate({ children }: { children: ReactNode }) {
  // Remounted (React 19 hides a suspended tree and reruns its effects), the
  // gate starts from the access this process already verified: no wait.
  const [access, setAccess] = useState<LicenseAccess | null>(() =>
    getCachedLicenseAccess()
  );
  const [email, setEmail] = useState("");
  const [key, setKey] = useState("");
  // Au démarrage, sans accès déjà vérifié, la vérification complète part tout de suite : l'écran est déjà « occupé ».
  const [busy, setBusy] = useState(() => !getCachedLicenseAccess());
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const { handleMouseDown: handleWindowMouseDown, ref: windowDragRef } =
    useTauriDrag<HTMLDivElement>(true);
  const apply = useCallback((result: LicenseAccess) => {
    if (!mounted.current) {
      return;
    }
    setAccess((previous) => (sameAccess(previous, result) ? previous : result));
    setEmail((previous) => previous || result.email || "");
  }, []);
  // Startup and explicit retries: the full check, with its usual wait.
  const check = useCallback(
    async (online: boolean) => {
      if (inFlight.current) {
        return;
      }
      inFlight.current = true;
      await guard(
        async () => {
          apply(await checkLicenseAccess(online));
        },
        {
          cleanup: () => {
            inFlight.current = false;
            if (mounted.current) {
              setBusy(false);
            }
          },
        }
      );
    },
    [apply]
  );
  const refresh = useCallback(
    async (online: boolean) => {
      if (inFlight.current) {
        return;
      }
      setBusy(true);
      await check(online);
    },
    [check]
  );

  useEffect(() => {
    mounted.current = true;
    // One full check per process; a remount reuses the verified access.
    if (!getCachedLicenseAccess()) {
      void check(true);
    }
    // Background rechecks: no busy state, no wait, a verdict only if it changes.
    const recheck = (cause: "interval" | "visibility" | "online") => {
      if (inFlight.current) {
        return;
      }
      void recheckLicenseInBackground(cause)?.then(apply);
    };
    const tick = () => recheck("interval");
    const focus = () => {
      if (document.visibilityState === "visible") {
        recheck("visibility");
      }
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
  }, [apply, check]);

  const activate = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    await guard(
      async () => {
        const result = await activateLicense(email, key);
        await acceptLicenseActivation(email, result.activationToken);
        setAccess(await checkLicenseAccess(false));
        setKey("");
      },
      {
        recover: (cause) => {
          setError(
            cause instanceof Error ? cause.message : "Activation impossible."
          );
        },
        cleanup: () => {
          inFlight.current = false;
          setBusy(false);
        },
      }
    );
  };

  if (access?.allowed) {
    return (
      <>
        {access.offlineUntil && (
          <div
            className="fixed bottom-3 left-1/2 z-[100] flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-xl border bg-background px-4 py-2 text-xs shadow-sm"
            role="status"
          >
            <span>
              Licence hors connexion · accès jusqu’au{" "}
              {new Date(access.offlineUntil).toLocaleString("fr-FR")}
            </span>
            <Button
              disabled={busy}
              onClick={() => void refresh(true)}
              size="sm"
              variant="ghost"
            >
              Réessayer
            </Button>
          </div>
        )}
        {children}
      </>
    );
  }

  // While the check runs, the same quiet wait as the rest of startup; the
  // licence screen below only appears once there is something to say.
  if (!access) {
    return <StartupSplash />;
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-background px-6 py-16 text-foreground">
      <div
        className="absolute inset-x-0 top-0 h-12 select-none"
        onMouseDown={handleWindowMouseDown}
        ref={windowDragRef}
      />
      <section className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-sm">
        <Logo />
        <h1 className="mt-6 font-semibold text-2xl">
          {access ? "Licence de ce poste" : "Vérification de votre licence"}
        </h1>
        <p
          className="mt-3 text-muted-foreground text-sm leading-6"
          role="status"
        >
          {access?.message || "Connexion au serveur d’activation…"}
        </p>
        {access && (
          <>
            <p className="mt-2 text-muted-foreground text-sm">
              Vos dossiers restent conservés sur cet appareil.
            </p>
            <form className="mt-6 space-y-4" onSubmit={activate}>
              <div className="space-y-2">
                <Label htmlFor="license-email">Courriel de la licence</Label>
                <Input
                  autoComplete="email"
                  disabled={busy}
                  id="license-email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license-key">Clé d’activation</Label>
                <Input
                  autoComplete="off"
                  disabled={busy}
                  id="license-key"
                  maxLength={24}
                  onChange={(event) =>
                    setKey(formatLicenseKey(event.target.value))
                  }
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                  required
                  spellCheck={false}
                  value={key}
                />
              </div>
              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}
              <Button className="w-full" disabled={busy} type="submit">
                {busy ? "Vérification…" : "Activer ce poste"}
              </Button>
              <Button
                className="w-full"
                disabled={busy}
                onClick={() => void refresh(true)}
                type="button"
                variant="outline"
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
