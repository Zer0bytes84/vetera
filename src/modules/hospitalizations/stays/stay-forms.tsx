import { useState } from "react";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { COMPACT_CALENDAR_CLASS } from "@/components/ui/date-picker";
import { CalendarDays } from "@/lib/icons";
import { admissionDateTime } from "./admission-date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { usePatientsRepository } from "@/data/repositories";
import { staysService } from "./service";
import { announceStaysChanged } from "./use-stays";
import type { StayLocation } from "./store";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { guard } from "@/lib/guard";
export function AdmissionForm({
  locations,
  onSaved,
}: {
  locations: StayLocation[];
  onSaved: () => void;
}) {
  const { currentUser } = useAuth();
  const patients = usePatientsRepository();
  const [patient, setPatient] = useState(""),
    [location, setLocation] = useState(""),
    [reason, setReason] = useState("");
  const [date, setDate] = useState<Date | undefined>(() => new Date());
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const admittedAt = admissionDateTime(date, time);
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
        if (!admittedAt) {
          setError("Choisissez une date et une heure d’admission valides.");
          return;
        }
        setBusy(true);
        setError(null);
        await guard(
          async () => {
            await staysService.admit(
              {
                patientId: patient,
                locationId: location || undefined,
                admittedAt,
                reason,
              },
              currentUser.id
            );
            announceStaysChanged();
            toast.success("Admission enregistrée.");
            onSaved();
          },
          {
            recover: () => {
              setError(
                "L’admission n’a pas pu être enregistrée. Vérifiez les dates et la disponibilité du patient et de l’emplacement."
              );
            },
            cleanup: () => {
              setBusy(false);
            },
          }
        );
      }}
    >
      <div className="flex flex-col gap-2">
        <label
          className="t-13 flex items-center justify-between"
          htmlFor="admission-patient"
        >
          Patient <span className="modal-required">requis</span>
        </label>
        <SearchableSelect
          disabled={busy}
          id="admission-patient"
          label="Patient à admettre"
          onValueChange={setPatient}
          options={patients.data.map((p) => ({
            value: p.id,
            label: p.name,
            keywords: `${p.species} ${p.breed || ""}`,
          }))}
          placeholder="Rechercher un patient…"
          value={patient}
        />
      </div>
      <label className="t-13 block space-y-2">
        Emplacement
        <select
          className="h-11 w-full rounded-xl border bg-background px-3"
          onChange={(event) => setLocation(event.target.value)}
          value={location}
        >
          <option value="">Sans emplacement</option>
          {locations
            .filter((place) => place.active)
            .map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
        </select>
      </label>
      <div className="t-13 space-y-2">
        <span className="flex items-center justify-between">
          Date et heure d’admission{" "}
          <span className="modal-required">requis</span>
        </span>
        <div className="flex gap-2">
          <Popover onOpenChange={setCalendarOpen} open={calendarOpen}>
            <PopoverTrigger
              aria-label="Choisir la date d’admission"
              render={
                <Button
                  className="h-11 min-w-0 flex-1 justify-start gap-2 px-3"
                  data-field="date"
                  type="button"
                  variant="outline"
                />
              }
            >
              <CalendarDays className="size-4 text-muted-foreground" />
              <span>
                {date ? date.toLocaleDateString("fr-FR") : "Choisir la date"}
              </span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-2">
              <Calendar
                className={COMPACT_CALENDAR_CLASS}
                defaultMonth={date}
                locale={fr}
                mode="single"
                onSelect={(selected) => {
                  setDate(selected);
                  setCalendarOpen(false);
                }}
                required
                selected={date}
              />
            </PopoverContent>
          </Popover>
          <label className="sr-only" htmlFor="admission-time">
            Heure d’admission
          </label>
          <Input
            aria-invalid={!admittedAt}
            autoComplete="off"
            className="h-11 w-28 tabular-nums"
            id="admission-time"
            inputMode="numeric"
            onChange={(event) => setTime(event.target.value)}
            placeholder="Ex. 14:30"
            type="text"
            value={time}
          />
        </div>
        {!admittedAt && (
          <p className="text-destructive" role="alert">
            Indiquez une heure valide au format 24 h, par exemple 14:30.
          </p>
        )}
      </div>
      <label className="t-13 block space-y-2">
        <span className="flex items-center justify-between">
          Motif <span className="modal-required">requis</span>
        </span>
        <Input
          className="h-11"
          onChange={(event) => setReason(event.target.value)}
          placeholder="Ex. surveillance post-opératoire"
          required
          value={reason}
        />
      </label>
      {error && (
        <p className="t-13 text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        className="h-11 w-full"
        disabled={
          busy || !currentUser || !patient || !reason.trim() || !admittedAt
        }
        type="submit"
      >
        {busy ? "Enregistrement…" : "Confirmer l’admission"}
      </Button>
    </form>
  );
}
export function LocationForm({ onSaved }: { onSaved: () => void }) {
  const { currentUser } = useAuth();
  const [name, setName] = useState(""),
    [type, setType] = useState<StayLocation["type"]>("cage"),
    [error, setError] = useState<string | null>(null),
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
            await staysService.createLocation(name, type, currentUser.id);
            announceStaysChanged();
            toast.success("Emplacement créé.");
            onSaved();
          },
          {
            recover: () => {
              setError(
                "L’emplacement n’a pas pu être créé. Vérifiez que son nom est unique."
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
        <span className="flex items-center justify-between">
          Nom <span className="modal-required">requis</span>
        </span>
        <Input
          className="h-11"
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex. Cage 3, Box chirurgie"
          required
          value={name}
        />
      </label>
      <label className="t-13 block space-y-2">
        Type
        <select
          className="h-11 w-full rounded-xl border bg-background px-3"
          onChange={(event) =>
            setType(event.target.value as StayLocation["type"])
          }
          value={type}
        >
          <option value="cage">Cage</option>
          <option value="box">Box</option>
          <option value="chenil">Chenil</option>
        </select>
      </label>
      {error && (
        <p className="t-13 text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        className="h-11 w-full"
        disabled={busy || !name.trim() || !currentUser}
        type="submit"
      >
        {busy ? "Enregistrement…" : "Créer l’emplacement"}
      </Button>
    </form>
  );
}
