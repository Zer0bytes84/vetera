import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, Microphone, MessageSquarePlus, Search, Check, FolderOpen } from "@/lib/icons";
import { isTauriRuntime } from "@/services/browser-store";
import { importLocalModel } from "../local-ai/models";
import { aiModelInstallation, useAIModelInstallation } from "../services/ai-model-installation";
import { AI_MODELS_CATALOG, AI_MODELS_CHANGED_EVENT, allAIModelsReady, type AIModelId, TOTAL_AI_MODELS_SIZE_LABEL } from "../services/ai-model-provisioning";

const icons = {whisper: Microphone, generator: MessageSquarePlus, embeddinggemma: Search};

export function AIModelSettings() {
  const desktop = isTauriRuntime();
  const state = useAIModelInstallation();
  const [accessKey, setAccessKey] = useState("");
  const [importing, setImporting] = useState<AIModelId | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
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
  const ready = {whisper: state.status.whisperReady, generator: state.status.generatorReady, embeddinggemma: state.status.embeddingReady};

  return <section className="settings-panel" aria-label="Outils IA locaux">
    <div className="settings-panel-heading">
      <h3>Vos outils IA</h3>
      <p>Une installation facultative ({TOTAL_AI_MODELS_SIZE_LABEL}), puis une utilisation hors ligne. Vos dictées et dossiers restent sur cet ordinateur.</p>
    </div>
    {!desktop && <p role="status" className="mx-4 my-4 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
      Ces outils sont disponibles dans l’application de bureau. Vous pouvez continuer à utiliser la version web sans les installer.
    </p>}
    <div className="grid gap-3 p-4 sm:grid-cols-3">
      {AI_MODELS_CATALOG.map(model => {
        const Icon = icons[model.id];
        const stage = state.running ? state.progress?.models[model.id] : undefined;
        const installed = ready[model.id] || stage === "ready";
        return <article key={model.id} className="flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-4">
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
    {desktop && <div className="space-y-4 px-4 pb-4">
      {state.running && <div role="status" aria-live="polite" className="space-y-2 rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3 text-sm"><span>{state.progress?.stepMessage || "Préparation du téléchargement…"}</span><span className="tabular-nums">{state.progress?.percentage ?? 0} %</span></div>
        <Progress value={state.progress?.percentage ?? 0} aria-label="Progression de l’installation"/>
        <p className="text-xs text-muted-foreground">Vous pouvez changer de page. Le téléchargement continue en arrière-plan.</p>
      </div>}
      {(state.error || importError) && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{importError || state.error}</p>}
      {!allReady && <details open={state.errorCode === "access_required" ? true : undefined} className="rounded-xl border p-4">
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
  </section>;
}
