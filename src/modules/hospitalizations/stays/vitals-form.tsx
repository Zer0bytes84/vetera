import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { staysService } from "./service";
import { announceStaysChanged } from "./use-stays";
import { guard } from "@/lib/guard";
const fields = [
  { key: "temperatureC", label: "Température (°C)" },
  { key: "heartRate", label: "FC (/min)" },
  { key: "respiratoryRate", label: "FR (/min)" },
  { key: "weightKg", label: "Poids (kg)" },
] as const;
export function VitalsForm({
  stayId,
  onSaved,
}: {
  stayId: string;
  onSaved: () => void;
}) {
  const { currentUser } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!currentUser || busy) {
          return;
        }
        setBusy(true);
        setError(null);
        await guard(
          async () => {
            const number = (key: string) =>
              values[key]?.trim()
                ? Number(values[key].replace(",", "."))
                : undefined;
            await staysService.addVitals(
              stayId,
              {
                recordedAt: new Date().toISOString(),
                temperatureC: number("temperatureC"),
                heartRate: number("heartRate"),
                respiratoryRate: number("respiratoryRate"),
                weightKg: number("weightKg"),
                generalState: values.generalState,
                appetite: values.appetite,
                note: values.note,
              },
              currentUser.id
            );
            announceStaysChanged();
            onSaved();
          },
          {
            recover: (error) => {
              setError(
                error instanceof Error
                  ? error.message
                  : "Le relevé n’a pas pu être enregistré."
              );
            },
            cleanup: () => {
              setBusy(false);
            },
          }
        );
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        {fields.map((field) => (
          <label className="t-13 space-y-2" key={field.key}>
            {field.label}
            <Input
              className="h-11"
              inputMode="decimal"
              onChange={(event) =>
                setValues({ ...values, [field.key]: event.target.value })
              }
              value={values[field.key] || ""}
            />
          </label>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="t-13 space-y-2">
          État général
          <select
            className="h-11 w-full rounded-xl border bg-background px-3"
            onChange={(event) =>
              setValues({ ...values, generalState: event.target.value })
            }
            value={values.generalState || ""}
          >
            <option value="">Non renseigné</option>
            {["Alerte", "Abattu", "Agité", "Non réactif"].map((state) => (
              <option key={state}>{state}</option>
            ))}
          </select>
        </label>
        <label className="t-13 space-y-2">
          Appétit
          <select
            className="h-11 w-full rounded-xl border bg-background px-3"
            onChange={(event) =>
              setValues({ ...values, appetite: event.target.value })
            }
            value={values.appetite || ""}
          >
            <option value="">Non renseigné</option>
            {["Conservé", "Diminué", "Absent"].map((state) => (
              <option key={state}>{state}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="t-13 block space-y-2">
        Observations
        <Input
          className="h-11"
          onChange={(event) =>
            setValues({ ...values, note: event.target.value })
          }
          value={values.note || ""}
        />
      </label>
      {error && (
        <p className="t-13 text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        className="h-11 w-full"
        disabled={busy || !currentUser}
        type="submit"
      >
        {busy ? "Enregistrement…" : "Enregistrer le relevé"}
      </Button>
    </form>
  );
}
