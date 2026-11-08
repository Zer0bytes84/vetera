import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/choice-controls";
import { Cpu } from "lucide-react";
import { SettingsSection } from "@/components/settings-section";
import { ArrowDown, Microphone, MessageSquarePlus, Search, Check, FolderOpen, Sparkles } from "@/lib/icons";
import { isTauriRuntime } from "@/services/browser-store";
import { importLocalModel } from "../local-ai/models";
import { aiModelInstallation, useAIModelInstallation } from "../services/ai-model-installation";
import { AI_MODELS_CATALOG, AI_MODELS_CHANGED_EVENT, allAIModelsReady, type AIModelId, dictationModelReady, NEW_ASSISTANT, TOTAL_AI_MODELS_SIZE_LABEL } from "../services/ai-model-provisioning";
import { GEMMA4_SUSPENDED, getGeneratorPreference, hasGeneratorFallenBack, setGeneratorPreference } from "../local-ai/generator-choice";

const icons = {whisper: Microphone, generator: MessageSquarePlus, embeddinggemma: Search};

export function AIModelSettings() {
  const desktop = isTauriRuntime();
  const state = useAIModelInstallation();
  const [accessKey, setAccessKey] = useState("");
  const [importing, setImporting] = useState<AIModelId | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [useNewAssistant, setUseNewAssistant] = useState(() => getGeneratorPreference() === "gemma4");
  useEffect(() => {
    if (!desktop) return;
    const refresh = () => { void aiModelInstallation.refresh(); };
    refresh();
    window.addEventListener(AI_MODELS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(AI_MODELS_CHANGED_EVENT, refresh);
  }, [desktop]);

  async function importFiles(kind: AIModelId) {
    setImporting(kind); setImportError(null);
    try {
      if (await importLocalModel(kind)) {
        await aiModelInstallation.refresh();
        window.dispatchEvent(new Event(AI_MODELS_CHANGED_EVENT));
        toast.success("Outil installé depuis vos fichiers.");
      }
    } catch { setImportError("Ces fichiers n’ont pas pu être installés. Vérifiez qu’ils sont complets et compatibles."); }
    finally { setImporting(null); }
  }
  const allReady = allAIModelsReady(state.status);
  const ready = {whisper: dictationModelReady(state.status), generator: state.status.generatorReady, embeddinggemma: state.status.embeddingReady};

  return <SettingsSection aria-label="Outils IA locaux" icon={Cpu} title="Vos outils IA"
    subtitle={`Une installation facultative (${TOTAL_AI_MODELS_SIZE_LABEL}), puis une utilisation hors ligne. Vos dictées et dossiers restent sur cet ordinateur.`}>
    {!desktop && <p role="status" className="p-6 text-sm text-muted-foreground">
      Ces outils sont disponibles dans l’application de bureau. Vous pouvez continuer à utiliser la version web sans les installer.
    </p>}
    <div className="grid gap-3 p-6 sm:grid-cols-3">
      {AI_MODELS_CATALOG.map(model => {
        const Icon = icons[model.id];
        const stages = state.progress?.models as Record<string, string | undefined> | undefined;
        // The dictation card follows its native model while that one is being installed.
        const stage = !state.running ? undefined
          : model.id === "whisper" && stages?.["whisper-turbo"] && stages["whisper-turbo"] !== "ready" ? stages["whisper-turbo"] : stages?.[model.id];
        const installed = ready[model.id] || stage === "ready";
        return <article key={model.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-background p-4">
          <div className="flex items-center gap-2"><Icon className="size-4 shrink-0 text-muted-foreground"/><h4 className="text-sm font-medium">{model.name}</h4></div>
          <p className="flex-1 text-xs leading-relaxed text-muted-foreground">{model.description}</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline">{installed ? <><Check className="size-3"/>Prêt</> : stage === "downloading" ? "Téléchargement…" : stage === "verifying" ? "Vérification…" : stage === "error" ? "À reprendre" : "Non installé"}</Badge>
            <span className="text-xs tabular-nums text-muted-foreground">{model.sizeLabel}</span>
          </div>
          <Button variant="outline" size="sm" type="button" disabled={!desktop || state.running || importing !== null} onClick={() => { const key = accessKey; setAccessKey(""); setImportError(null); void aiModelInstallation.start(key); }}>
            <ArrowDown className="size-4"/>{state.running ? "Téléchargement…" : "Télécharger"}
          </Button>
        </article>;
      })}
    </div>
    {desktop && state.status.generatorReady && <NewAssistantCard
      installed={Boolean(state.status.generator4Ready)}
      downloading={state.running && state.target === "generator4"}
      busy={state.running || importing !== null}
      enabled={useNewAssistant}
      fellBack={hasGeneratorFallenBack()}
      onEnable={enabled => { setGeneratorPreference(enabled ? "gemma4" : "gemma3"); setUseNewAssistant(enabled); }}
    />}
    {desktop && <div className="space-y-6 p-6 pt-0">
      {state.running && <div role="status" aria-live="polite" className="space-y-2 rounded-2xl border p-4">
        <div className="flex items-center justify-between gap-3 text-sm"><span>{state.progress?.stepMessage || "Préparation du téléchargement…"}</span><span className="tabular-nums">{state.progress?.percentage ?? 0} %</span></div>
        <Progress value={state.progress?.percentage ?? 0} aria-label="Progression de l’installation"/>
        <p className="text-xs text-muted-foreground">Vous pouvez changer de page. Le téléchargement continue en arrière-plan.</p>
      </div>}
      {(state.error || importError) && <p role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{importError || state.error}</p>}
      {!allReady && <details open={state.errorCode === "access_required" ? true : undefined} className="rounded-2xl border p-4">
        <summary className="cursor-pointer text-sm font-medium">Accès au téléchargement</summary>
        <div className="mt-4 space-y-3">
          <p className="text-xs leading-relaxed text-muted-foreground">L’assistant IA nécessite un accès autorisé chez son fournisseur. Les autres outils se téléchargent directement. Le téléchargement installe les outils manquants. Vous pouvez aussi utiliser des fichiers déjà téléchargés.</p>
          <a href="https://huggingface.co/litert-community/Gemma3-1B-IT" target="_blank" rel="noreferrer" className="inline-block text-sm text-primary underline underline-offset-4">Autoriser l’accès chez le fournisseur</a>
          <div className="flex flex-wrap gap-2">{AI_MODELS_CATALOG.map(model => <Button key={model.id} variant="outline" size="sm" disabled={state.running || importing !== null} onClick={() => void importFiles(model.id)}><FolderOpen className="size-4"/>Importer {model.name}</Button>)}</div>
          <Field>
            <FieldLabel htmlFor="ai-download-access">Clé de téléchargement (facultatif)</FieldLabel>
            <Input id="ai-download-access" type="password" autoComplete="off" value={accessKey} disabled={state.running} onChange={event => setAccessKey(event.target.value)}/>
            <FieldDescription>Utilisée uniquement pour ce téléchargement, sans sauvegarde sur cet ordinateur.</FieldDescription>
          </Field>
        </div>
      </details>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={state.running || importing !== null || allReady} onClick={() => {
          const key = accessKey; setAccessKey(""); setImportError(null); void aiModelInstallation.start(key);
        }}><ArrowDown className="size-4"/>{state.running ? "Installation en cours…" : allReady ? "Tous les outils sont prêts" : state.error ? "Réessayer le téléchargement" : "Télécharger les outils IA"}</Button>
        <p className="text-xs text-muted-foreground">Seuls les outils manquants sont installés.</p>
      </div>
    </div>}
  </SettingsSection>;
}

/** The new assistant version: one-tap download, then an explicit choice; the current one stays the fallback. */
export function NewAssistantCard({installed, downloading, busy, enabled, fellBack, onEnable, suspended = GEMMA4_SUSPENDED}: {
  installed: boolean; downloading: boolean; busy: boolean; enabled: boolean; fellBack: boolean; onEnable: (enabled: boolean) => void;
  /** Kept installed but not selectable until its generation is fixed. */
  suspended?: boolean;
}) {
  return <article className="mx-6 mb-6 flex min-w-0 flex-col gap-3 rounded-2xl border bg-background p-4">
    <div className="flex items-center gap-2"><Sparkles className="size-4 shrink-0 text-muted-foreground"/><h4 className="text-sm font-medium">{NEW_ASSISTANT.name}</h4></div>
    <p className="text-xs leading-relaxed text-muted-foreground">{NEW_ASSISTANT.description}</p>
    {suspended && <p role="status" className="text-xs text-muted-foreground">Temporairement indisponible : cette version est en cours de correction. L’assistant actuel rédige vos notes.</p>}
    {!suspended && installed && enabled && fellBack && <p role="status" className="text-xs text-muted-foreground">Cet ordinateur n’a pas pu la charger : l’assistant actuel a pris le relais.</p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      {installed
        ? <Switch checked={enabled && !suspended} disabled={suspended} onCheckedChange={onEnable} aria-label="Utiliser la nouvelle version de l’assistant"
            label="Utiliser la nouvelle version" className={suspended ? "cursor-not-allowed text-muted-foreground" : undefined}/>
        : <Badge variant="outline">{downloading ? "Téléchargement…" : "Non installée"}</Badge>}
      {installed
        ? <Badge variant="outline"><Check className="size-3"/>Prête</Badge>
        : <Button variant="outline" size="sm" type="button" disabled={busy} onClick={() => { void aiModelInstallation.startNewAssistant(); }}>
            <ArrowDown className="size-4"/>{downloading ? "Téléchargement…" : `Télécharger (${NEW_ASSISTANT.sizeLabel})`}
          </Button>}
    </div>
  </article>;
}
