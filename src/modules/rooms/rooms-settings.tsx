import { DoorOpen } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guard } from "@/lib/guard";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from "@/lib/icons";
import { isTauriRuntime } from "@/services/browser-store";
import { roomsService } from "./service";
import { ROOM_NAME_MAX_LENGTH, type Room } from "./store";
import { announceRoomsChanged, refreshRooms, useRooms } from "./use-rooms";

const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : "La salle n'a pas pu être enregistrée.";

function bookings(count: number) {
  if (count === 0) {
    return "Aucun rendez-vous";
  }
  return count === 1
    ? "1 rendez-vous"
    : `${count.toLocaleString("fr-FR")} rendez-vous`;
}

function RoomRow({
  busy,
  first,
  last,
  onlyActive,
  room,
  run,
  onMove,
}: {
  busy: boolean;
  first: boolean;
  last: boolean;
  onlyActive: boolean;
  room: Room;
  run: (action: () => Promise<unknown>, done?: string) => Promise<void>;
  onMove: (direction: -1 | 1) => void;
}) {
  const [name, setName] = useState(room.name);
  const changed = name.trim() !== room.name;
  const used = room.appointmentCount > 0;

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (changed) {
      void run(() => roomsService.rename(room.id, name), "Salle renommée.");
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <form className="flex min-w-48 flex-1 items-center gap-2" onSubmit={save}>
        <Input
          aria-label={`Nom de la salle ${room.name}`}
          maxLength={ROOM_NAME_MAX_LENGTH}
          onBlur={() => {
            if (!name.trim()) {
              setName(room.name);
            }
          }}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
        {changed && (
          <Button
            disabled={busy || !name.trim()}
            size="sm"
            type="submit"
            variant="outline"
          >
            <Check className="size-4" />
            Renommer
          </Button>
        )}
      </form>
      <span className="w-32 shrink-0 text-muted-foreground text-xs tabular-nums">
        {bookings(room.appointmentCount)}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          aria-label={`Monter ${room.name}`}
          disabled={busy || first}
          onClick={() => onMove(-1)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          aria-label={`Descendre ${room.name}`}
          disabled={busy || last}
          onClick={() => onMove(1)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <ArrowDown className="size-4" />
        </Button>
        <Button
          disabled={busy || onlyActive}
          onClick={() =>
            void run(
              () => roomsService.remove(room.id),
              used
                ? `« ${room.name} » est archivée. Ses rendez-vous gardent leur salle.`
                : `« ${room.name} » est supprimée.`
            )
          }
          size="sm"
          title={
            onlyActive
              ? "Le cabinet doit garder au moins une salle."
              : undefined
          }
          type="button"
          variant="ghost"
        >
          {used ? (
            <Archive className="size-4" />
          ) : (
            <Trash2 className="size-4" />
          )}
          {used ? "Archiver" : "Supprimer"}
        </Button>
      </div>
    </li>
  );
}

export function RoomsSettings() {
  const desktop = isTauriRuntime();
  const { active, error, loaded, rooms } = useRooms();
  const archived = rooms.filter((room) => room.archivedAt);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, done?: string) {
    setBusy(true);
    setProblem(null);
    await guard(
      async () => {
        await action();
        await refreshRooms();
        announceRoomsChanged();
        if (done) {
          toast.success(done);
        }
      },
      {
        recover: (e) => {
          setProblem(message(e));
        },
        cleanup: () => {
          setBusy(false);
        },
      }
    );
  }

  const add = (event: FormEvent) => {
    event.preventDefault();
    const name = draft;
    void run(async () => {
      await roomsService.create(name);
      setDraft("");
    }, "Salle ajoutée.");
  };

  const move = (index: number, direction: -1 | 1) => {
    const order = active.map((room) => room.id);
    const target = index + direction;
    [order[index], order[target]] = [order[target], order[index]];
    void run(() => roomsService.reorder(order));
  };

  return (
    <SettingsSection
      aria-label="Salles du cabinet"
      icon={DoorOpen}
      subtitle="Les espaces où vous recevez les animaux."
      title="Salles du cabinet"
    >
      <p className="p-6 text-muted-foreground text-sm">
        Avec une seule salle, l'agenda ne vous demande rien. Dès la deuxième,
        chaque rendez-vous choisit la sienne et les conflits de salle sont
        signalés.
      </p>
      {desktop ? (
        <div className="space-y-6 p-6">
          {loaded ? (
            <ul className="divide-y rounded-2xl border bg-background">
              {active.map((room, index) => (
                <RoomRow
                  busy={busy}
                  first={index === 0}
                  key={`${room.id}:${room.name}`}
                  last={index === active.length - 1}
                  onlyActive={active.length === 1}
                  onMove={(direction) => move(index, direction)}
                  room={room}
                  run={run}
                />
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="size-4 animate-spin" />
              Chargement des salles…
            </p>
          )}

          <form className="flex flex-wrap items-center gap-2" onSubmit={add}>
            <Input
              aria-label="Nom de la nouvelle salle"
              className="min-w-48 flex-1"
              maxLength={ROOM_NAME_MAX_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Nouvelle salle, par exemple « Box urgences »"
              value={draft}
            />
            <Button disabled={busy || !draft.trim()} type="submit">
              <Plus className="size-4" />
              Ajouter
            </Button>
          </form>

          {(problem || error) && (
            <p
              className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-destructive text-sm"
              role="alert"
            >
              {problem ?? error}
            </p>
          )}

          {archived.length > 0 && (
            <details className="rounded-2xl border">
              <summary className="cursor-pointer px-4 py-3 font-medium text-sm">
                Salles archivées ({archived.length})
              </summary>
              <ul className="divide-y border-t">
                {archived.map((room) => (
                  <li
                    className="flex flex-wrap items-center gap-3 px-4 py-3"
                    key={room.id}
                  >
                    <span className="min-w-48 flex-1 text-sm">{room.name}</span>
                    <span className="w-32 shrink-0 text-muted-foreground text-xs tabular-nums">
                      {bookings(room.appointmentCount)}
                    </span>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => roomsService.restore(room.id),
                          `« ${room.name} » est de nouveau active.`
                        )
                      }
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <RotateCcw className="size-4" />
                      Réactiver
                    </Button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ) : (
        <p className="p-6 text-muted-foreground text-sm">
          Les salles se gèrent dans l'application de bureau.
        </p>
      )}
    </SettingsSection>
  );
}
