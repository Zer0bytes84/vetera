import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTauriDrag } from "@/hooks/use-tauri-drag";
import { isTauriRuntime } from "@/services/browser-store";
import { activateLicense } from "@/services/licenseActivationService";
import {
  acceptLicenseActivation,
  checkLicenseAccess,
  type LicenseAccess,
} from "@/services/licenseRuntime";
import { formatLicenseKey } from "@/services/licenseService";

export function LicenseGate({ children }: { children: ReactNode }) {
  // Browser-only development demos have no desktop installation to license.
  // Production builds never bypass the check, even outside Tauri.
  if (import.meta.env.DEV && !isTauriRuntime()) return children;
  return <CheckedLicenseGate>{children}</CheckedLicenseGate>;
}

function CheckedLicenseGate({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<LicenseAccess | null>(null);
  const [email, setEmail] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const drag = useTauriDrag<HTMLDivElement>(true);
  const refresh = useCallback(async (online: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await checkLicenseAccess(online);
      if (mounted.current) {
        setAccess(result);
        setEmail((previous) => previous || result.email || "");
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh(true);
    let lastOnline = Date.now();
    const tick = () => {
      const online = Date.now() - lastOnline >= 15 * 60_000;
      if (online) lastOnline = Date.now();
      void refresh(online);
    };
    const focus = () => {
      if (document.visibilityState !== "visible") return;
      const online = Date.now() - lastOnline >= 60_000;
      if (online) lastOnline = Date.now();
      void refresh(online);
    };
    const reconnect = () => {
      lastOnline = Date.now();
      void refresh(true);
    };
    const timer = window.setInterval(tick, 60_000);
    window.addEventListener("online", reconnect);
    document.addEventListener("visibilitychange", focus);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      window.removeEventListener("online", reconnect);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [refresh]);

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
