import { careErrorMessage } from "./feedback";
import "./care-page.css";
import { useIsPremium } from "@/modules/dashboard/v2/use-is-premium";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePatientsRepository,
  useProductsRepository,
  useUsersRepository,
} from "@/data/repositories";
import {
  careDisplayStatus,
  type CareDisplayStatus,
  type CareHistory,
  type CareStatus,
  type CareTask,
} from "./domain";
import { CareTaskForm, careTypeLabels } from "./care-task-form";
import { CareCompletionRollbackDialog } from "./care-completion-rollback-dialog";
import { careTasksService } from "./service";
import { announceCareTasksChanged, useCareTasks } from "./use-care-tasks";
import { insufficientStockMessage, stockQuantityLabel, parseStockQuantityInput } from "@/domain/stock";
import { ProductStockFields } from "@/modules/stock/components/product-stock-fields";
const labels: Record<CareDisplayStatus, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  fait: "Fait",
  annule: "Annulé",
  en_retard: "En retard",
};
const tones: Record<CareDisplayStatus, string> = {
  a_faire: "bg-muted text-muted-foreground",
  en_cours: "bg-primary/10 text-primary",
  fait: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  annule: "bg-muted text-muted-foreground",
  en_retard: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};
const time = (value: string) =>
  new Date(value).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
export default function CarePage({
  patientId,
  onNavigateToPatient,
  initialTaskId,
}: {
  initialTaskId?: string;
  patientId?: string;
  onNavigateToPatient?: (patientId: string) => void;
}) {
  const isPremium = useIsPremium();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const {
    tasks: allTasks,
    now,
    loading,
    error,
    refresh,
  } = useCareTasks(selectedDate ?? undefined);
  const careDate = selectedDate ?? now;
  const setCareDate = (date: Date) => {
    const today = new Date();
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
    setSelectedDate(isToday ? null : date);
  };
  const tasks = patientId
    ? allTasks.filter((task) => task.patient_id === patientId)
    : allTasks;
  const overdueCount = tasks.filter(
    (task) => careDisplayStatus(task, now) === "en_retard"
  ).length;
  const patients = usePatientsRepository();
  const products = useProductsRepository();
  const stockWarning = (task: CareTask) => {
    if (!task.produit_id || ["fait", "annule"].includes(task.statut)) return null;
    const product = products.data.find(p => p.id === task.produit_id);
    if (products.loading) return null;
    if (!product || product.archivedAt) return "Ce produit n’est plus disponible. Vérifiez le stock avant de valider.";
    const requested = task.produit_quantite ?? 1;
    if (product.stockTracked !== false && product.availabilityPending) return "Vérification du stock utilisable…";
    if (product.inventoryInvalid) return "Les données d’un lot sont à vérifier avant validation.";
    const available = product.availableQuantity ?? product.quantity;
    return product.stockTracked !== false && available < requested
      ? insufficientStockMessage(product.name, available, requested, product.unit) : null;
  };
  const users = useUsersRepository();
  const { currentUser } = useAuth();
  const [mode, setMode] = useState<"patient" | "heure">("patient");
  const [filter, setFilter] = useState("tous");
  const [search, setSearch] = useState("");
  const [usageDrafts, setUsageDrafts] = useState<Record<string, {productId: string; quantity: string}>>({});
  const hasUnsavedProductUsage = (task: CareTask) => {
    const draft = usageDrafts[task.id];
    if (!draft) return false;
    const product = products.data.find(p => p.id === draft.productId);
    const quantity = !draft.productId || product?.stockTracked === false ? 1 : parseStockQuantityInput(draft.quantity);
    return (draft.productId || null) !== task.produit_id || quantity !== (task.produit_quantite ?? 1);
  };
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    const open = () => { sessionStorage.removeItem("vetera:pending-care-form"); setCreating(true); };
    if (sessionStorage.getItem("vetera:pending-care-form") === "true") open();
    window.addEventListener("vetera:plan-care", open);
    return () => window.removeEventListener("vetera:plan-care", open);
  }, []);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (!initialTaskId) return;
    let live = true;
    void careTasksService
      .get(initialTaskId)
      .then((task) => {
        if (live && task) {
          setSelectedDate(new Date(task.heure_prevue));
          setSelected(task.id);
        }
      })
      .catch(() => {
        if (live) setActionError("Le soin n’a pas pu être ouvert.");
      });
    return () => {
      live = false;
    };
  }, [initialTaskId]);
  const [history, setHistory] = useState<CareHistory[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [undoing, setUndoing] = useState<CareTask | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);
  const patientName = (id: string) =>
    patients.data.find((p) => p.id === id)?.name ?? "Patient indisponible";
  const userName = (id: string | null) =>
    users.data.find((u) => u.id === id)?.displayName ?? "Utilisateur";
  const detail = tasks.find((t) => t.id === selected);
  useEffect(() => {
    let live = true;
    if (selected) {
      setHistory([]);
      setHistoryError(false);
      void careTasksService
        .history(selected)
        .then((rows) => {
          if (live) setHistory(rows);
        })
        .catch(() => {
          if (live) setHistoryError(true);
        });
    }
    return () => {
      live = false;
    };
  }, [selected, tasks]);
  async function transition(task: CareTask, status: CareStatus) {
    if (busy) return;
    if (status === "fait" && hasUnsavedProductUsage(task)) {
      setActionError("Enregistrez la modification du produit ou de la quantité avant de valider le soin.");
      return;
    }
    const warning = status === "fait" ? stockWarning(task) : null;
    if (warning) { setActionError(warning); return; }
    setBusy(task.id);
    setActionError(null);
    try {
      await careTasksService.transition(
        task.id,
        status,
        currentUser?.id ?? "",
        reason
      );
      announceCareTasksChanged();
      await refresh();
      setReason("");
    } catch (e) {
      setActionError(careErrorMessage(e, "update"));
    } finally {
      setBusy(null);
    }
  }
  async function undoCompletion(task: CareTask, correctionReason: string) {
    if (busy) return;
    setBusy(task.id);
    setUndoError(null);
    try {
      await careTasksService.undoCompletion(task.id, currentUser?.id ?? "", correctionReason, task.completion_revision ?? 0);
      announceCareTasksChanged();
      await refresh();
      setUsageDrafts(rows => {const copy = {...rows}; delete copy[task.id]; return copy;});
      setFilter("tous");
      setUndoing(null);
      setSavedMessage("Validation annulée. Le soin est de nouveau à faire et le stock consommé a été restitué.");
    } catch (error) {
      setUndoError(careErrorMessage(error, "update"));
    } finally {
      setBusy(null);
    }
  }
  const visible = tasks
    .filter((t) =>
      patientName(t.patient_id)
        .toLocaleLowerCase("fr")
        .includes(search.toLocaleLowerCase("fr"))
    )
    .filter((t) => {
      const s = careDisplayStatus(t, now);
      return (
        filter === "tous" ||
        (filter === "a_faire" &&
          ["a_faire", "en_cours", "en_retard"].includes(s)) ||
        (filter === "retard" && s === "en_retard") ||
        (filter === "fait" && s === "fait")
      );
    })
    .sort(
      (a, b) =>
        Number(careDisplayStatus(b, now) === "en_retard") -
          Number(careDisplayStatus(a, now) === "en_retard") ||
        a.heure_prevue.localeCompare(b.heure_prevue)
    );
  const groups =
    mode === "patient"
      ? [...new Set(visible.map((t) => t.patient_id))]
      : [
          ...new Set(
            visible.map(
              (t) =>
                `${careDisplayStatus(t, now) === "en_retard" ? "Retards · " : ""}${time(t.heure_prevue).slice(0, 2)} h`
            )
          ),
        ];
  function row(task: CareTask) {
    const status = careDisplayStatus(task, now);
    const terminal = task.statut === "fait" || task.statut === "annule";
    return (
      <div
        key={task.id}
        className={`care-task-row flex items-center gap-3 rounded-xl border p-3 ${status === "en_retard" ? "border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/15" : "border-border bg-background"}`}
      >
        <div className="min-w-0 flex-1">
          {mode === "heure" && (
            <button
              type="button"
              className="mb-1 rounded text-[13px] font-medium hover:underline focus-visible:outline-2 focus-visible:outline-primary"
              onClick={() => onNavigateToPatient?.(task.patient_id)}
            >
              {patientName(task.patient_id)}
            </button>
          )}
          <button
            type="button"
            className="flex w-full min-h-11 min-w-0 flex-1 items-center gap-4 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-primary"
            onClick={() => {
              setSelected(task.id);
              setActionError(null);
              setReason("");
            }}
          >
            <time className="shrink-0 text-[16px] font-medium tabular-nums">
              {time(task.heure_prevue)}
            </time>
            <span className="min-w-0 flex-1">
              <span className="block break-words text-[14px] font-medium">
                {task.label}
              </span>
              <span className="block text-[12px] text-muted-foreground">
                {careTypeLabels[task.type]}{task.produit_id && products.data.find(p => p.id === task.produit_id)?.stockTracked !== false
                  ? ` · ${stockQuantityLabel(task.produit_quantite ?? 1, products.data.find(p => p.id === task.produit_id)?.unit ?? "unité")}` : ""}
              </span>
              {stockWarning(task) && <span className="block text-[12px] text-destructive">Stock insuffisant, ouvrez le soin pour vérifier.</span>}
            </span>
            <span data-premium-status={status}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-[12px] font-medium ${tones[status]}`}
            >
              {labels[status]}
            </span>
          </button>
        </div>
        {!terminal && (
          <Button
            className="min-h-11 shrink-0"
            variant="outline"
            disabled={!!busy || !currentUser || !!stockWarning(task) || hasUnsavedProductUsage(task)}
            onClick={() => void transition(task, "fait")}
            aria-label={`Valider ${task.label} pour ${patientName(task.patient_id)}`}
          >
            {busy === task.id ? "…" : "Valider"}
          </Button>
        )}
      </div>
    );
  }
  const dateControl = (
    <Input
      type="date"
      aria-label="Date des soins"
      className="h-11 w-44"
      value={`${careDate.getFullYear()}-${String(careDate.getMonth() + 1).padStart(2, "0")}-${String(careDate.getDate()).padStart(2, "0")}`}
      onChange={(e) => {
        if (e.target.value)
          setCareDate(new Date(`${e.target.value}T12:00:00`));
      }}
    />
  );
  return (
    <section
      aria-label="Soins"
      className={
        patientId
          ? "care-page min-w-0 space-y-4 text-[13px]"
          : "care-page dashboard-stage min-w-0 px-4 pb-8 lg:px-6 space-y-6 font-sans text-[13px] font-normal"
      }
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {!patientId && (
            <p className="text-[12px] text-muted-foreground">
              {careDate.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          )}
          <h2
            className={
              patientId
                ? "text-[18px] font-medium tracking-tight"
                : "mt-1 text-[24px] font-medium tracking-tight"
            }
          >
            Soins
          </h2>
          <p className="mt-1 text-muted-foreground">
            Les soins planifiés, suivis par votre équipe.
          </p>
        </div>
        <Button className="min-h-11" onClick={() => setCreating(true)}>
          Planifier un soin
        </Button>
      </header>
      {!patientId && (
        <>
          <div className="care-summary grid gap-3 sm:grid-cols-3">
            {[
              ["Soins prévus", tasks.length],
              [
                "À terminer",
                tasks.filter((t) => ["a_faire", "en_cours"].includes(t.statut))
                  .length,
              ],
              ["En retard", overdueCount],
            ].map(([title, value]) => (
              <div
                key={title}
                data-care-alert={title === "En retard" && overdueCount > 0 ? "true" : undefined}
                className={`care-summary-item rounded-2xl border p-4 ${title === "En retard" && overdueCount ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/20" : "border-border bg-card"}`}
              >
                <p className="text-muted-foreground">{title}</p>
                <p className="mt-1 text-[24px] font-medium tabular-nums">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className="care-toolbar flex flex-wrap items-center justify-between gap-3">
            <div
              className="flex flex-wrap gap-1"
              role="group"
              aria-label="Filtrer les soins"
            >
              {[
                ["tous", "Tous"],
                ["a_faire", "À faire"],
                ["retard", "En retard"],
                ["fait", "Terminés"],
              ].map(([key, label]) => (
                <Button
                  key={key}
                  variant={filter === key ? "secondary" : "ghost"}
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="care-toolbar-controls flex flex-wrap gap-3">
              <Input
                aria-label="Rechercher un patient"
                placeholder="Rechercher un patient…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56"
              />
              <div
                className="flex rounded-xl border border-border p-1"
                role="group"
                aria-label="Mode d’affichage"
              >
                {(["patient", "heure"] as const).map((m) => (
                  <Button
                    key={m}
                    variant={mode === m ? "secondary" : "ghost"}
                    size="sm"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                  >
                    Par {m}
                  </Button>
                ))}
              </div>
            </div>
              {isPremium && dateControl}
          </div>
        </>
      )}
      {(!isPremium || patientId) && dateControl}
      {savedMessage && (
        <p
          role="status"
          className="rounded-xl border border-border bg-muted/50 px-4 py-3"
        >
          {savedMessage}
        </p>
      )}

      {error ? (
        <div role="alert" className="rounded-xl border border-border p-5">
          {error}
          <Button
            variant="outline"
            className="ml-3"
            onClick={() => void refresh()}
          >
            Réessayer
          </Button>
        </div>
      ) : loading ? (
        <p role="status">Chargement des soins…</p>
      ) : !visible.length ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-[16px] font-medium">Aucun soin pour cette date</p>
          <p className="mt-2 text-muted-foreground">
            {tasks.length
              ? "Adaptez les filtres ou la recherche."
              : "Les soins planifiés pour une autre date apparaîtront le jour prévu."}
          </p>
        </div>
      ) : (
        <div
          className={
            mode === "patient"
              ? groups.length > 1
                ? "grid items-start gap-4 xl:grid-cols-2"
                : "grid items-start gap-4"
              : "space-y-4"
          }
        >
          {groups.map((group) => (
            <article
              key={group}
              className="care-task-group space-y-3 rounded-2xl border border-border bg-card p-4"
            >
              <h2 className="text-[16px] font-medium">
                {mode === "patient" ? (
                  onNavigateToPatient ? (
                    <button
                      type="button"
                      className="rounded text-left hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                      onClick={() => onNavigateToPatient(group)}
                    >
                      {patientName(group)}
                    </button>
                  ) : (
                    patientName(group)
                  )
                ) : (
                  group
                )}
              </h2>
              {visible
                .filter((t) =>
                  mode === "patient"
                    ? t.patient_id === group
                    : `${careDisplayStatus(t, now) === "en_retard" ? "Retards · " : ""}${time(t.heure_prevue).slice(0, 2)} h` ===
                      group
                )
                .map(row)}
            </article>
          ))}
        </div>
      )}
      {actionError && (
        <p role="alert" className="text-destructive">
          {actionError}
        </p>
      )}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-[600px] sm:p-7">
          <DialogHeader>
            <DialogTitle className="font-medium text-[18px]">
              Planifier un soin
            </DialogTitle>
            <DialogDescription>
              Une tâche pour un patient, à l’heure de votre choix.
            </DialogDescription>
          </DialogHeader>
          <CareTaskForm
            patientId={patientId}
            onSaved={(scheduledAt) => {
              setCreating(false);
              setFilter("tous");
              setSearch("");
              if (scheduledAt) {
                const date = new Date(scheduledAt);
                setCareDate(date);
                setSavedMessage(
                  `Soin enregistré pour le ${date.toLocaleDateString("fr-FR")} à ${time(scheduledAt)}. La liste affiche la date du soin enregistré.`
                );
              }
            }}
            onCancel={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent
          showCloseButton={false}
          className="care-page overflow-y-auto p-6 sm:max-w-[440px]"
        >
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4"
            onClick={() => setSelected(null)}
          >
            Fermer
          </Button>
          <SheetHeader>
            <SheetTitle className="font-medium text-[18px]">
              Détail du soin
            </SheetTitle>
            <SheetDescription>
              {detail ? patientName(detail.patient_id) : "Chargement…"}
            </SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="mt-6 space-y-5">
              <h2 className="text-[18px] font-medium">{detail.label}</h2>
              <dl className="grid grid-cols-2 gap-3 text-[13px]">
                {[
                  ["Heure prévue", time(detail.heure_prevue)],
                  ["Type", careTypeLabels[detail.type]],
                  ["Statut", labels[careDisplayStatus(detail, now)]],
                  [
                    "Exécutant",
                    detail.execute_par
                      ? userName(detail.execute_par)
                      : "Non attribué",
                  ],
                  [
                    "Produit",
                    products.data.find((p) => p.id === detail.produit_id)
                      ?.name ??
                      (detail.produit_id ? "Produit indisponible" : "Aucun"),
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-words">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="whitespace-pre-wrap">
                {detail.note || "Aucune note complémentaire."}
              </p>
              {detail.motif_annulation && (
                <p>Motif : {detail.motif_annulation}</p>
              )}
              {detail.statut === "fait" && <div className="border-y border-border py-4">
                <Button variant="outline" className="min-h-11 w-full" disabled={!!busy || !currentUser}
                  onClick={() => {setUndoError(null); setUndoing(detail);}}>Annuler la validation</Button>
              </div>}
              {!["fait", "annule"].includes(detail.statut) && (
                <div className="space-y-3">
                  <div className="space-y-3 border-y border-border py-4">
                    <ProductStockFields products={products.data} optional disabled={!!busy}
                      productId={usageDrafts[detail.id]?.productId ?? detail.produit_id ?? ""}
                      quantity={usageDrafts[detail.id]?.quantity ?? String(detail.produit_quantite ?? 1)}
                      onProductChange={productId => setUsageDrafts(rows => ({...rows, [detail.id]: {productId, quantity: "1"}}))}
                      onQuantityChange={quantity => setUsageDrafts(rows => ({...rows, [detail.id]: {productId: rows[detail.id]?.productId ?? detail.produit_id ?? "", quantity}}))} />
                    {hasUnsavedProductUsage(detail) && <p role="status" className="text-[13px] text-muted-foreground">Enregistrez la modification du produit ou de la quantité avant de valider le soin.</p>}
                    <Button variant="outline" disabled={!!busy || !currentUser || !usageDrafts[detail.id]} onClick={async () => {
                      const draft = usageDrafts[detail.id]; if (!draft || busy) return;
                      setBusy(detail.id); setActionError(null);
                      try {
                        const product = products.data.find(p => p.id === draft.productId);
                        await careTasksService.updateProductUsage(detail.id, draft.productId || null, product?.stockTracked === false ? 1 : parseStockQuantityInput(draft.quantity), currentUser?.id ?? "");
                        announceCareTasksChanged(); await refresh();
                        setUsageDrafts(rows => {const copy = {...rows}; delete copy[detail.id]; return copy;});
                      } catch (error) {setActionError(careErrorMessage(error, "update"));}
                      finally {setBusy(null);}
                    }}>Mettre à jour le produit</Button>
                  </div>
                  {stockWarning(detail) && <p role="alert" className="text-[13px] text-destructive">{stockWarning(detail)}</p>}
                  <div className="flex flex-wrap gap-2">
                    {detail.statut === "a_faire" && (
                      <Button
                        variant="outline"
                        className="min-h-11"
                        disabled={!!busy}
                        onClick={() => void transition(detail, "en_cours")}
                      >
                        Commencer
                      </Button>
                    )}
                    <Button
                      className="min-h-11"
                      disabled={!!busy || !!stockWarning(detail) || hasUnsavedProductUsage(detail)}
                      onClick={() => void transition(detail, "fait")}
                    >
                      Valider le soin
                    </Button>
                  </div>
                  <Input
                    aria-label="Motif d’annulation"
                    placeholder="Motif d’annulation"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    disabled={!!busy || !reason.trim()}
                    onClick={() => void transition(detail, "annule")}
                  >
                    Annuler ce soin
                  </Button>
                </div>
              )}
              <div className="border-t border-border pt-4">
                <h3 className="font-medium">Historique</h3>
                {historyError ? (
                  <p role="alert">L’historique n’a pas pu être chargé.</p>
                ) : (
                  <ol className="mt-3 space-y-3">
                    {history.map((h) => (
                      <li key={h.id}>
                        <p>
                          {h.from_status
                            ? `${labels[h.from_status]} → `
                            : "Création · "}
                          {labels[h.to_status]}
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {time(h.changed_at)} · {userName(h.author_id)}
                          {h.reason ? ` · ${h.reason}` : ""}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      {undoing && <CareCompletionRollbackDialog key={`${undoing.id}:${undoing.completion_revision ?? 0}`}
        task={undoing} busy={!!busy} error={undoError} onClose={() => setUndoing(null)}
        onConfirm={reason => {void undoCompletion(undoing, reason);}}/>}
    </section>
  );
}
