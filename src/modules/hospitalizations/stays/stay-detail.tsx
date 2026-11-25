import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useNow } from "@/hooks/use-now";
import { guard } from "@/lib/guard";
import { announceCareTasksChanged } from "@/modules/care-tasks/use-care-tasks";
import { CarePlanForm } from "./care-plan-form";
import type { StayStatus } from "./domain";
import { ACTIVE_STAY_STATUSES, stayDays } from "./domain";
import { staysService } from "./service";
import { StayBilling } from "./stay-billing";
import { StayDateTimeField } from "./stay-date-time-field";
import { StayFollowUp } from "./stay-follow-up";
import { StayTransfer } from "./stay-location-controls";
import { StayRecords } from "./stay-records";
import type { Stay, VitalSign } from "./store";
import { announceStaysChanged } from "./use-stays";
import { vitalAlerts } from "./vital-alerts";
import { VitalsCurves } from "./vitals-curves";
import { VitalsForm } from "./vitals-form";
import { VitalsByDay, VitalsLatest } from "./vitals-summary-view";
export function StayDetail({
  stay,
  patientName,
  species,
  onBack,
}: {
  stay: Stay;
  patientName: string;
  species: string;
  onBack: () => void;
}) {
  const { currentUser } = useAuth();
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [summary, setSummary] = useState(""),
    [reason, setReason] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [planned, setPlanned] = useState("");
  const refresh = useCallback(async () => {
    await guard(
      async () => {
        setVitals(await staysService.vitals(stay.id));
      },
      {
        recover: () => {
          setError("Les constantes n’ont pas pu être chargées.");
        },
      }
    );
  }, [stay.id]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const now = useNow();
  async function transition(to: StayStatus) {
    if (!currentUser || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    await guard(
      async () => {
        await staysService.transition(stay.id, to, currentUser.id, {
          reason,
          summary,
          plannedAt: planned || undefined,
        });
        announceStaysChanged();
        announceCareTasksChanged();
      },
      {
        recover: (error) => {
          setError(
            error instanceof Error
              ? error.message
              : "Le séjour n’a pas pu être mis à jour."
          );
        },
        cleanup: () => {
          setBusy(false);
        },
      }
    );
  }
  const active = ACTIVE_STAY_STATUSES.includes(stay.status);
  return (
    <div className="stay-detail space-y-5">
      <Button className="h-11" onClick={onBack} variant="ghost">
        Retour aux séjours
      </Button>
      <header>
        <h2 className="t-18 font-medium">{patientName}</h2>
        <p className="t-13 mt-1 text-muted-foreground">{stay.reason}</p>
        <p className="t-13 mt-2">
          {stayDays(
            new Date(stay.admitted_at),
            new Date(
              stay.discharged_at ||
                Math.max(now, new Date(stay.admitted_at).getTime())
            )
          )}{" "}
          journée(s) occupée(s)
        </p>
      </header>
      {active && <StayTransfer stay={stay} />}
      {error && (
        <p className="t-13 text-destructive" role="alert">
          {error}
        </p>
      )}
      {active && (
        <section className="space-y-4 rounded-2xl border border-[#F2F2F2] bg-card p-5 dark:border-border">
          <h3 className="t-16 font-medium">Parcours du séjour</h3>
          {stay.status === "admis" && (
            <Button
              className="h-11"
              disabled={busy}
              onClick={() => void transition("en_cours")}
            >
              Commencer le suivi
            </Button>
          )}
          {stay.status === "en_cours" && (
            <div className="flex flex-wrap gap-3">
              <div className="w-full max-w-sm">
                <StayDateTimeField
                  label="Date de sortie prévue"
                  onChange={setPlanned}
                  timeLabel="Heure de sortie prévue"
                  value={planned}
                />
              </div>
              <Button
                className="h-11"
                disabled={busy || !planned}
                onClick={() => void transition("sortie_prevue")}
              >
                Préparer la sortie
              </Button>
            </div>
          )}
          {stay.status === "sortie_prevue" && (
            <div className="space-y-3">
              <label className="t-13 block">
                Résumé de sortie
                <Input
                  className="mt-2 h-11"
                  onChange={(event) => setSummary(event.target.value)}
                  value={summary}
                />
              </label>
              <Button
                className="h-11"
                disabled={busy || !summary.trim()}
                onClick={() => void transition("sorti")}
              >
                Confirmer la sortie
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-3 border-t pt-4">
            <Input
              aria-label="Motif d’annulation du séjour"
              className="h-11 min-w-48 flex-1"
              onChange={(event) => setReason(event.target.value)}
              placeholder="Motif d’annulation"
              value={reason}
            />
            <Button
              className="h-11"
              disabled={busy || !reason.trim()}
              onClick={() => void transition("annule")}
              variant="outline"
            >
              Annuler le séjour
            </Button>
          </div>
        </section>
      )}
      {stay.discharge_summary && (
        <p className="t-13 rounded-xl bg-muted p-4">{stay.discharge_summary}</p>
      )}
      {stay.status === "sorti" && (
        <>
          <StayFollowUp stayId={stay.id} />
          <StayBilling stay={stay} />
        </>
      )}
      <section className="space-y-3 rounded-2xl border border-[#F2F2F2] bg-card p-5 dark:border-border">
        <div className="flex items-center justify-between">
          <h3 className="t-16 font-medium">Constantes</h3>
          {active && (
            <Button
              className="h-11"
              onClick={() => setVitalsOpen(true)}
              variant="outline"
            >
              Ajouter un relevé
            </Button>
          )}
        </div>
        <VitalsLatest species={species} vitals={vitals} />
        <VitalsByDay vitals={vitals} />
        <VitalsCurves species={species} vitals={vitals} />
        {vitals.length > 0 &&
          vitalAlerts(species, vitals[vitals.length - 1]).map((alert) => (
            <p
              className="t-13 rounded-xl bg-amber-50 px-3 py-2 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
              key={alert}
              role="status"
            >
              {alert}. Repère au repos, à interpréter selon le contexte
              clinique.
            </p>
          ))}
        {vitals.length ? (
          vitals.map((vital) => (
            <div
              className="t-13 flex flex-wrap gap-4 border-t py-3"
              key={vital.id}
            >
              <time className="text-muted-foreground tabular-nums">
                {new Date(vital.recorded_at).toLocaleString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              {vital.temperature_c != null && (
                <span>{vital.temperature_c.toLocaleString("fr-FR")} °C</span>
              )}
              {vital.heart_rate != null && (
                <span>FC {vital.heart_rate}/min</span>
              )}
              {vital.respiratory_rate != null && (
                <span>FR {vital.respiratory_rate}/min</span>
              )}
              {vital.weight_kg != null && (
                <span>{vital.weight_kg.toLocaleString("fr-FR")} kg</span>
              )}
              <span>{vital.general_state}</span>
              <span>{vital.appetite}</span>
            </div>
          ))
        ) : (
          <p className="t-13 text-muted-foreground">
            Aucune constante relevée.
          </p>
        )}
      </section>
      <StayRecords stayId={stay.id} />
      {active && (
        <Button
          className="h-11"
          onClick={() => setPlanOpen(true)}
          variant="outline"
        >
          Planifier des soins multi-jours
        </Button>
      )}
      <Dialog onOpenChange={setPlanOpen} open={planOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Plan de soins</DialogTitle>
            <DialogDescription>
              Les horaires sont explicites et les tâches utilisent le suivi de
              soins existant.
            </DialogDescription>
          </DialogHeader>
          <CarePlanForm onSaved={() => setPlanOpen(false)} stayId={stay.id} />
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={setVitalsOpen} open={vitalsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Relevé des constantes</DialogTitle>
            <DialogDescription>
              La mesure sera datée et attribuée à votre compte.
            </DialogDescription>
          </DialogHeader>
          <VitalsForm
            onSaved={() => {
              setVitalsOpen(false);
              void refresh();
            }}
            stayId={stay.id}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
