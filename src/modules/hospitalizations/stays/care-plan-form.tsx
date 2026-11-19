import type { CarePlan } from "./store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useProductsRepository } from "@/data/repositories";
import { CARE_TYPES, type CareType } from "@/modules/care-tasks/domain";
import { careTypeLabels } from "@/modules/care-tasks/care-task-form";
import { announceCareTasksChanged } from "@/modules/care-tasks/use-care-tasks";
import { carePlanOccurrences } from "./domain";
import { staysService } from "./service";
import { announceStaysChanged } from "./use-stays";
import { StayDateTimeField } from "./stay-date-time-field";
import { guard, guardSync } from "@/lib/guard";
function localDate(value?: string) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}
export function CarePlanForm({
  stayId,
  onSaved,
  plan,
}: {
  stayId: string;
  onSaved: () => void;
  plan?: CarePlan;
}) {
  const { currentUser } = useAuth();
  const products = useProductsRepository();
  const [label, setLabel] = useState(plan?.label || ""),
    [type, setType] = useState<CareType>(plan?.type || "controle"),
    [product, setProduct] = useState(plan?.product_id || ""),
    [starts, setStarts] = useState(localDate(plan?.starts_at)),
    [ends, setEnds] = useState(localDate(plan?.ends_at)),
    [times, setTimes] = useState(
      plan ? (JSON.parse(plan.times_json) as string[]).join(", ") : ""
    ),
    [note, setNote] = useState(plan?.note || "");
  const [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const hours = times.split(/[,;\s]+/).filter(Boolean);
  let count = 0,
    validation = "";
  guardSync(
    () => {
      if (starts && ends && hours.length) {
        count = carePlanOccurrences(
          new Date(starts),
          new Date(ends),
          hours
        ).filter((value) => !plan || new Date(value) >= new Date()).length;
      }
    },
    {
      recover: (error) => {
        validation =
          error instanceof Error ? error.message : "Vérifiez les horaires.";
      },
    }
  );
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!currentUser || busy || !count) {
          return;
        }
        setBusy(true);
        setError(null);
        await guard(
          async () => {
            const draft = {
              label,
              type,
              productId: product || undefined,
              startsAt: starts,
              endsAt: ends,
              times: hours,
              note,
            };
            if (plan) {
              await staysService.updatePlan(plan.id, draft, currentUser.id);
            } else {
              await staysService.createPlan(stayId, draft, currentUser.id);
            }
            announceStaysChanged();
            announceCareTasksChanged();
            onSaved();
          },
          {
            recover: (error) => {
              setError(
                error instanceof Error
                  ? error.message
                  : "Le plan n’a pas pu être créé."
              );
            },
            cleanup: () => {
              setBusy(false);
            },
          }
        );
      }}
    >
      <label className="t-13 block space-y-2">
        Soin
        <Input
          className="h-11"
          onChange={(event) => setLabel(event.target.value)}
          required
          value={label}
        />
      </label>
      <label className="t-13 block space-y-2">
        Type
        <select
          className="h-11 w-full rounded-xl border bg-background px-3"
          onChange={(event) => setType(event.target.value as CareType)}
          value={type}
        >
          {CARE_TYPES.map((item) => (
            <option key={item} value={item}>
              {careTypeLabels[item]}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="t-13 space-y-2">
          <span>Début</span>
          <StayDateTimeField
            label="Date de début du plan"
            onChange={setStarts}
            timeLabel="Heure de début"
            value={starts}
          />
        </div>
        <div className="t-13 space-y-2">
          <span>Fin</span>
          <StayDateTimeField
            label="Date de fin du plan"
            onChange={setEnds}
            timeLabel="Heure de fin"
            value={ends}
          />
        </div>
      </div>
      <label className="t-13 block space-y-2">
        Horaires quotidiens
        <Input
          className="h-11"
          onChange={(event) => setTimes(event.target.value)}
          placeholder="Ex. 08:00, 18:00"
          required
          value={times}
        />
      </label>
      <label className="t-13 block space-y-2">
        Produit lié (facultatif)
        <select
          className="h-11 w-full rounded-xl border bg-background px-3"
          onChange={(event) => setProduct(event.target.value)}
          value={product}
        >
          <option value="">Aucun produit</option>
          {products.data.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="t-13 block space-y-2">
        Consignes
        <Input
          className="h-11"
          onChange={(event) => setNote(event.target.value)}
          value={note}
        />
      </label>
      <p className="t-13 text-muted-foreground" role="status">
        {validation ||
          `${count} soin(s) à planifier. ${plan ? "Les soins réalisés ou en cours sont conservés." : "Vérifiez les horaires avant confirmation."}`}
      </p>
      {error && (
        <p className="t-13 text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        className="h-11 w-full"
        disabled={
          busy || !currentUser || !label.trim() || !count || Boolean(validation)
        }
        type="submit"
      >
        {busy ? "Enregistrement…" : "Confirmer le plan de soins"}
      </Button>
    </form>
  );
}
