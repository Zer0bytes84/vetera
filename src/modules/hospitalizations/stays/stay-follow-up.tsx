import { CalendarDaysIcon } from "@heroicons/react/20/solid";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useAuth } from "@/contexts/AuthContext";
import { emitSQLiteDataChanged } from "@/hooks/useSQLite";
import { guard } from "@/lib/guard";
import { staysService } from "./service";
import { StaySection } from "./stay-section";

export function StayFollowUp({ stayId }: { stayId: string }) {
  const { currentUser } = useAuth();
  const [date, setDate] = useState("");
  const [task, setTask] = useState<{
    id: string;
    due_date: string;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    await guard(
      async () => {
        setTask(await staysService.followUp(stayId));
      },
      {
        recover: () => {
          setError("Le contrôle de sortie n’a pas pu être chargé.");
        },
        cleanup: () => {
          setLoading(false);
        },
      }
    );
  }, [stayId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <StaySection icon={CalendarDaysIcon} title="Contrôle à la sortie">
      {loading ? (
        <p className="t-13 text-muted-foreground" role="status">
          Chargement du contrôle…
        </p>
      ) : task ? (
        <p className="t-13">
          Contrôle prévu le{" "}
          {new Date(`${task.due_date}T12:00:00`).toLocaleDateString("fr-FR")}.
          Retrouvez-le dans Rappels.
        </p>
      ) : (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!currentUser || busy || !date) {
              return;
            }
            setBusy(true);
            setError(null);
            await guard(
              async () => {
                await staysService.scheduleFollowUp(
                  stayId,
                  date,
                  currentUser.id
                );
                emitSQLiteDataChanged("tasks");
                await refresh();
              },
              {
                recover: (cause) => {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Le contrôle n’a pas pu être planifié."
                  );
                },
                cleanup: () => {
                  setBusy(false);
                },
              }
            );
          }}
        >
          <label className="t-13 space-y-2">
            Date du contrôle
            <DatePicker
              className="h-11"
              onChange={(value) => setDate(value)}
              required
              value={date}
            />
          </label>
          <Button
            className="h-11"
            disabled={busy || !date || !currentUser}
            type="submit"
          >
            {busy ? "Enregistrement…" : "Ajouter dans Rappels"}
          </Button>
        </form>
      )}
      {error && (
        <p className="t-13 text-destructive" role="alert">
          {error}
        </p>
      )}
    </StaySection>
  );
}
