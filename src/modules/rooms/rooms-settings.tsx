import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/settings-section";
import { Input } from "@/components/ui/input";
import { Archive, ArrowDown, ArrowUp, Check, Loader2, Plus, RotateCcw, Trash2 } from "@/lib/icons";
import { isTauriRuntime } from "@/services/browser-store";
import { roomsService } from "./service";
import { ROOM_NAME_MAX_LENGTH, type Room } from "./store";
import { announceRoomsChanged, refreshRooms, useRooms } from "./use-rooms";

const message = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : "La salle n'a pas pu être enregistrée.";

function bookings(count: number) {
  if (count === 0) return "Aucun rendez-vous";
  return count === 1 ? "1 rendez-vous" : `${count.toLocaleString("fr-FR")} rendez-vous`;
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
    if (changed) void run(() => roomsService.rename(room.id, name), "Salle renommée.");
  };

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <form className="flex min-w-48 flex-1 items-center gap-2" onSubmit={save}>
        <Input
          aria-label={`Nom de la salle ${room.name}`}
          maxLength={ROOM_NAME_MAX_LENGTH}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            if (!name.trim()) setName(room.name);
          }}
        />
        {changed && (
          <Button type="submit" size="sm" variant="outline" disabled={busy || !name.trim()}>
            <Check className="size-4" />
            Renommer
          </Button>
        )}
      </form>
      <span className="w-32 shrink-0 text-xs tabular-nums text-muted-foreground">{bookings(room.appointmentCount)}</span>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={`Monter ${room.name}`}
          disabled={busy || first}
          onClick={() => onMove(-1)}
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={`Descendre ${room.name}`}
          disabled={busy || last}
          onClick={() => onMove(1)}
        >
          <ArrowDown className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy || onlyActive}
          title={onlyActive ? "Le cabinet doit garder au moins une salle." : undefined}
          onClick={() =>
            void run(
              () => roomsService.remove(room.id),
              used ? `« ${room.name} » est archivée. Ses rendez-vous gardent leur salle.` : `« ${room.name} » est supprimée.`
            )
          }
        >
          {used ? <Archive className="size-4" /> : <Trash2 className="size-4" />}
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
    try {
      await action();
      await refreshRooms();
      announceRoomsChanged();
      if (done) toast.success(done);
    } catch (e) {
      setProblem(message(e));
    } finally {
      setBusy(false);
    }
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
      <p className="p-6 text-sm text-muted-foreground">
        Avec une seule salle, l'agenda ne vous demande rien. Dès la deuxième, chaque rendez-vous choisit la
        sienne et les conflits de salle sont signalés.
      </p>
      {!desktop ? (
        <p className="p-6 text-sm text-muted-foreground">
          Les salles se gèrent dans l'application de bureau.
        </p>
      ) : (
        <div className="space-y-6 p-6">
          {!loaded ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Chargement des salles…
            </p>
          ) : (
            <ul className="divide-y rounded-2xl border bg-background">
              {active.map((room, index) => (
                <RoomRow
                  key={`${room.id}:${room.name}`}
                  busy={busy}
                  first={index === 0}
                  last={index === active.length - 1}
                  onlyActive={active.length === 1}
                  room={room}
                  run={run}
                  onMove={(direction) => move(index, direction)}
                />
              ))}
            </ul>
          )}

          <form className="flex flex-wrap items-center gap-2" onSubmit={add}>
            <Input
              aria-label="Nom de la nouvelle salle"
              className="min-w-48 flex-1"
              maxLength={ROOM_NAME_MAX_LENGTH}
              placeholder="Nouvelle salle, par exemple « Box urgences »"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button type="submit" disabled={busy || !draft.trim()}>
              <Plus className="size-4" />
              Ajouter
            </Button>
          </form>

          {(problem || error) && (
            <p role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              {problem ?? error}
            </p>
          )}

          {archived.length > 0 && (
            <details className="rounded-2xl border">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                Salles archivées ({archived.length})
              </summary>
              <ul className="divide-y border-t">
                {archived.map((room) => (
                  <li key={room.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="min-w-48 flex-1 text-sm">{room.name}</span>
                    <span className="w-32 shrink-0 text-xs tabular-nums text-muted-foreground">
                      {bookings(room.appointmentCount)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void run(() => roomsService.restore(room.id), `« ${room.name} » est de nouveau active.`)}
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
      )}
    </SettingsSection>
  );
}
