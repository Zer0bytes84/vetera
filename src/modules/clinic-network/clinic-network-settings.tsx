import { relaunch } from "@tauri-apps/plugin-process";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, Copy, Laptop2, Loader2, RefreshCw, Search, Server } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { isTauriRuntime } from "@/services/browser-store";
import {
  clinicNetwork,
  networkErrorMessage,
  type DiscoveredHost,
  type NetworkMode,
  type NetworkStatus,
  type RemoteHostInfo,
} from "./clinic-network";

const MODES: { id: NetworkMode; title: string; description: string }[] = [
  {
    id: "standalone",
    title: "Poste seul",
    description: "La base reste sur cet ordinateur. Rien n'est partagé.",
  },
  {
    id: "host",
    title: "Poste principal",
    description: "Ce poste garde la base et la partage. Il doit rester allumé.",
  },
  {
    id: "client",
    title: "Poste secondaire",
    description: "Ce poste travaille sur la base du poste principal.",
  },
];

function StatusDot({ tone }: { tone: "on" | "off" | "warn" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        tone === "on" && "bg-emerald-500",
        tone === "warn" && "bg-amber-500",
        tone === "off" && "bg-muted-foreground/40"
      )}
    />
  );
}

export function ClinicNetworkSettings() {
  const desktop = isTauriRuntime();
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [choice, setChoice] = useState<NetworkMode>("standalone");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [address, setAddress] = useState("");
  const [key, setKey] = useState("");
  const [found, setFound] = useState<DiscoveredHost[] | null>(null);
  const [tested, setTested] = useState<RemoteHostInfo | null>(null);
  const [remote, setRemote] = useState<RemoteHostInfo | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  const apply = useCallback((next: NetworkStatus) => {
    setStatus(next);
    setChoice(next.mode);
    setName((current) => current || next.workstationName);
  }, []);

  useEffect(() => {
    if (!desktop) return;
    clinicNetwork.status().then(apply, (e) => setError(networkErrorMessage(e)));
  }, [apply, desktop]);

  // Keep the list of connected workstations fresh on the main workstation.
  const hosting = status?.host.running ?? false;
  useEffect(() => {
    if (!hosting) return;
    const timer = window.setInterval(() => {
      clinicNetwork.status().then(setStatus, () => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [hosting]);

  const linked = status?.launchMode === "client";
  useEffect(() => {
    if (!linked) return;
    const check = () =>
      clinicNetwork.ping().then(
        (info) => {
          setRemote(info);
          setRemoteError(null);
        },
        (e) => setRemoteError(networkErrorMessage(e))
      );
    void check();
    const timer = window.setInterval(check, 5000);
    return () => window.clearInterval(timer);
  }, [linked]);

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(networkErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const share = () =>
    run("share", async () => {
      apply(await clinicNetwork.startHost(name));
      toast.success("La base de ce poste est partagée sur le réseau local.");
    });

  const stop = () =>
    run("stop", async () => {
      apply(await clinicNetwork.stop());
      toast.success("Ce poste est revenu en poste seul.");
    });

  const newKey = () =>
    run("key", async () => {
      apply(await clinicNetwork.regenerateKey());
      toast.success("Nouvelle clé créée. Les postes reliés devront la saisir.");
    });

  const discover = () =>
    run("discover", async () => {
      const hosts = await clinicNetwork.discover();
      setFound(hosts);
      if (hosts.length === 1) setAddress(`${hosts[0].address}:${hosts[0].port}`);
    });

  const test = () =>
    run("test", async () => {
      setTested(null);
      setTested(await clinicNetwork.test(address, key, name));
    });

  const join = () =>
    run("join", async () => {
      apply(await clinicNetwork.join(address, key, name));
    });

  const copyKey = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Clé copiée.");
    } catch {
      toast.error("Copie impossible. Recopiez la clé à la main.");
    }
  };

  if (!desktop) {
    return (
      <section className="settings-panel" aria-label="Réseau local">
        <div className="settings-panel-heading">
          <h3>Réseau local</h3>
          <p>Le partage entre postes est disponible dans l'application de bureau.</p>
        </div>
      </section>
    );
  }

  const host = status?.host;

  return (
    <section className="settings-panel" aria-label="Réseau local">
      <div className="settings-panel-heading flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <h3>Postes du cabinet</h3>
          <p>
            Plusieurs postes du cabinet travaillent sur la même base, par le réseau de la clinique. Rien ne
            passe par internet.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">Aperçu technique</Badge>
      </div>

      <div className="space-y-4 px-4 pb-4">
        <RadioGroup
          aria-label="Rôle de ce poste"
          // Wraps on the panel's own width: settings content is narrower than the window.
          className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-2"
          value={choice}
          onValueChange={(value) => {
            setChoice(value as NetworkMode);
            setError(null);
          }}
        >
          {MODES.map((mode) => (
            <label
              key={mode.id}
              className={cn(
                "flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border bg-background p-4 transition-colors",
                choice === mode.id ? "border-primary/60 bg-primary/5" : "hover:bg-muted/40"
              )}
            >
              <RadioGroupItem value={mode.id} className="mt-0.5" />
              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium">
                  {mode.title}
                  {status?.mode === mode.id && <span className="text-xs font-normal text-muted-foreground">actuel</span>}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{mode.description}</span>
              </span>
            </label>
          ))}
        </RadioGroup>

        {choice !== "standalone" && !(choice === "client" && linked) && (
          <Field>
            <FieldLabel htmlFor="clinic-network-name">Nom de ce poste</FieldLabel>
            <Input
              id="clinic-network-name"
              maxLength={40}
              placeholder={choice === "host" ? "Accueil" : "Salle de consultation"}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <FieldDescription>Affiché sur les autres postes pour savoir qui est relié.</FieldDescription>
          </Field>
        )}

        {choice === "standalone" && status && status.mode !== "standalone" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              {status.mode === "host"
                ? "Les postes secondaires ne pourront plus travailler tant que ce poste ne partage plus sa base."
                : "Ce poste retrouvera sa propre base, sans les données du poste principal."}
            </p>
            <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={stop}>
              {busy === "stop" && <Loader2 className="size-4 animate-spin" />}
              Revenir en poste seul
            </Button>
          </div>
        )}

        {choice === "host" && host && (
          <div className="space-y-4 rounded-xl border p-4">
            {host.running ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  <StatusDot tone="on" />
                  Partage actif
                  <span className="font-normal text-muted-foreground">
                    {host.addresses.length > 0
                      ? host.addresses.map((ip) => `${ip}:${host.port}`).join(" · ")
                      : `port ${host.port}`}
                  </span>
                </div>
                {host.key && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Clé de connexion à saisir sur chaque poste secondaire</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-lg border bg-muted/40 px-3 py-2 font-mono text-base tracking-[0.12em] tabular-nums">
                        {host.key}
                      </code>
                      <Button type="button" variant="outline" size="sm" onClick={() => void copyKey(host.key!)}>
                        <Copy className="size-4" />
                        Copier
                      </Button>
                      <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={newKey}>
                        {busy === "key" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                        Nouvelle clé
                      </Button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Postes reliés en ce moment</p>
                  {host.workstations.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                      {host.workstations.map((workstation) => (
                        <li key={workstation} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
                          <Laptop2 className="size-4 text-muted-foreground" />
                          {workstation}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun pour l'instant.</p>
                  )}
                </div>
                {host.advertiseError && (
                  <p className="text-xs text-muted-foreground">
                    Ce poste ne peut pas s'annoncer sur le réseau ({host.advertiseError}). Les postes secondaires
                    devront saisir son adresse.
                  </p>
                )}
                {name.trim() && name.trim() !== status.workstationName && (
                  <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={share}>
                    Renommer en « {name.trim()} »
                  </Button>
                )}
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-prose text-sm text-muted-foreground">
                  {host.error ??
                    "Le système peut demander d'autoriser Baitari sur le réseau : acceptez pour les réseaux privés."}
                </p>
                <Button type="button" size="sm" disabled={busy !== null || !name.trim()} onClick={share}>
                  {busy === "share" ? <Loader2 className="size-4 animate-spin" /> : <Server className="size-4" />}
                  Partager la base de ce poste
                </Button>
              </div>
            )}
          </div>
        )}

        {choice === "client" && linked && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <StatusDot tone={remoteError ? "warn" : remote ? "on" : "off"} />
              {remoteError ? (
                <span className="text-muted-foreground">{remoteError}</span>
              ) : remote ? (
                <span>
                  Relié à <span className="font-medium">{remote.workstationName}</span>{" "}
                  <span className="text-muted-foreground">({remote.address})</span>
                </span>
              ) : (
                <span className="text-muted-foreground">Vérification de la connexion…</span>
              )}
            </div>
          </div>
        )}

        {choice === "client" && !linked && status?.mode !== "client" && (
          <div className="space-y-4 rounded-xl border p-4">
            <div className="flex flex-wrap items-end gap-3">
              <Field className="min-w-48 flex-1">
                <FieldLabel htmlFor="clinic-network-address">Adresse du poste principal</FieldLabel>
                <Input
                  id="clinic-network-address"
                  inputMode="decimal"
                  placeholder="192.168.1.20"
                  value={address}
                  onChange={(event) => {
                    setAddress(event.target.value);
                    setTested(null);
                  }}
                />
              </Field>
              <Button type="button" variant="outline" disabled={busy !== null} onClick={discover}>
                {busy === "discover" ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                Rechercher
              </Button>
            </div>
            {found && (
              <div className="space-y-2">
                {found.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun poste principal trouvé. Vérifiez qu'il partage sa base, ou saisissez son adresse affichée
                    dans ses paramètres.
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {found.map((candidate) => {
                      const value = `${candidate.address}:${candidate.port}`;
                      return (
                        <li key={value}>
                          <button
                            type="button"
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/40",
                              address === value && "border-primary/60 bg-primary/5"
                            )}
                            onClick={() => {
                              setAddress(value);
                              setTested(null);
                            }}
                          >
                            <Server className="size-4 text-muted-foreground" />
                            {candidate.workstationName}
                            <span className="text-muted-foreground">{candidate.address}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
            <Field>
              <FieldLabel htmlFor="clinic-network-key">Clé de connexion</FieldLabel>
              <Input
                id="clinic-network-key"
                autoCapitalize="characters"
                autoComplete="off"
                className="font-mono tracking-[0.12em]"
                placeholder="ABCD-EFGH-JKMN"
                spellCheck={false}
                value={key}
                onChange={(event) => {
                  setKey(event.target.value.toUpperCase());
                  setTested(null);
                }}
              />
              <FieldDescription>Affichée dans les paramètres du poste principal, rubrique Réseau local.</FieldDescription>
            </Field>
            {tested && (
              <p role="status" className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                {tested.workstationName} répond, Baitari {tested.appVersion}.
              </p>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Une fois relié, ce poste affiche les données du poste principal. Ses propres données restent sur cet
              ordinateur et reviennent si vous repassez en poste seul.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy !== null || !address.trim() || !key.trim() || !name.trim()}
                onClick={test}
              >
                {busy === "test" && <Loader2 className="size-4 animate-spin" />}
                Tester la connexion
              </Button>
              <Button type="button" disabled={busy !== null || !tested} onClick={join}>
                {busy === "join" && <Loader2 className="size-4 animate-spin" />}
                Relier ce poste
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </p>
        )}

        {status?.needsRestart && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
          >
            <p className="text-sm">
              {status.mode === "client"
                ? `Ce poste est relié à ${status.remoteAddress ?? "son poste principal"}. Redémarrez Baitari pour travailler sur la base partagée.`
                : "Redémarrez Baitari pour retrouver la base de ce poste."}
            </p>
            <Button type="button" size="sm" onClick={() => void relaunch()}>
              Redémarrer Baitari
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
