import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { ModalBandActions } from "@/components/ui/modal-chrome";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePatientsRepository,
  useProductsRepository,
} from "@/data/repositories";
import { parseStockQuantityInput } from "@/domain/stock";
import { guard } from "@/lib/guard";
import { TIME_HH_MM } from "@/lib/patterns";
import { ProductStockFields } from "@/modules/stock/components/product-stock-fields";
import { ChevronDown } from "./care-icons";
import { CareTimePicker } from "./care-time-picker";
import { CARE_TYPES, type CareSuggestion, type CareType } from "./domain";
import { careErrorMessage } from "./feedback";
import { careTasksService } from "./service";
import { announceCareTasksChanged } from "./use-care-tasks";
export const careTypeLabels: Record<CareType, string> = {
  medicament: "Médicament",
  perfusion: "Perfusion",
  controle: "Contrôle",
  sortie: "Sortie",
  autre: "Autre",
};
const field =
  "h-11 min-h-11 appearance-none w-full rounded-xl border border-border bg-background px-3 t-13 focus-visible:outline-2 focus-visible:outline-primary";
export function CareTaskForm({
  patientId,
  suggestion,
  onSaved,
  onCancel,
}: {
  patientId?: string;
  suggestion?: CareSuggestion;
  onSaved: (scheduledAt?: string) => void;
  onCancel: () => void;
}) {
  const { currentUser } = useAuth();
  const patients = usePatientsRepository();
  const products = useProductsRepository();
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patient, setPatient] = useState(patientId ?? "");
  const [label, setLabel] = useState(suggestion?.label ?? "");
  const [type, setType] = useState<CareType>(suggestion?.type ?? "controle");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const scheduled =
    scheduledDate && TIME_HH_MM.test(scheduledTime.trim())
      ? `${scheduledDate}T${scheduledTime.trim()}`
      : "";
  const [product, setProduct] = useState("");
  const [productQuantity, setProductQuantity] = useState("1");
  const [note, setNote] = useState(suggestion?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) {
          return;
        }
        if (!label.trim()) {
          setError("Indiquez le soin à planifier.");
          return;
        }
        if (
          scheduledDate &&
          scheduledTime &&
          !TIME_HH_MM.test(scheduledTime.trim())
        ) {
          setError(
            "Saisissez une heure au format 24 heures, par exemple 12:30."
          );
          return;
        }
        if (!(patient && scheduled)) {
          setError(
            "Choisissez un patient, une date et une heure avant de confirmer le soin."
          );
          return;
        }
        if (!currentUser) {
          setError(
            "Votre session n’est pas disponible. Reconnectez-vous avant de confirmer le soin."
          );
          return;
        }
        setBusy(true);
        setError(null);
        await guard(
          async () => {
            await careTasksService.create(
              {
                patientId: patient,
                label,
                type,
                scheduledAt: scheduled,
                productId: product || null,
                productQuantity:
                  products.data.find((p) => p.id === product)?.stockTracked ===
                  false
                    ? 1
                    : parseStockQuantityInput(productQuantity),
                note,
              },
              currentUser?.id ?? ""
            );
            announceCareTasksChanged();
            onSaved(scheduled);
          },
          {
            recover: (e) => {
              setError(careErrorMessage(e, "create"));
            },
            cleanup: () => {
              setBusy(false);
            },
          }
        );
      }}
    >
      <div className="t-13 space-y-1.5">
        <span className="flex items-center justify-between">
          Patient <span className="modal-required">requis</span>
        </span>
        <Popover onOpenChange={setPatientPickerOpen} open={patientPickerOpen}>
          <PopoverTrigger
            aria-label="Choisir un patient"
            disabled={!!patientId}
            render={
              <Button
                className="t-13 h-11 w-full justify-between rounded-xl px-3"
                data-field="picker"
                type="button"
                variant="outline"
              />
            }
          >
            <span className="truncate">
              {patients.data.find((p) => p.id === patient)?.name ??
                "Rechercher un patient"}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[var(--anchor-width)] p-0">
            <Command shouldFilter={false}>
              <CommandInput
                aria-label="Rechercher un patient"
                onValueChange={setPatientSearch}
                placeholder="Nom du patient ou espèce…"
                value={patientSearch}
              />
              <CommandList>
                <CommandEmpty>Aucun patient trouvé.</CommandEmpty>
                {patients.data
                  .filter((p) =>
                    `${p.name} ${p.species}`
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .toLocaleLowerCase("fr")
                      .includes(
                        patientSearch
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .toLocaleLowerCase("fr")
                      )
                  )
                  .slice(0, 50)
                  .map((p) => (
                    <CommandItem
                      key={p.id}
                      onSelect={() => {
                        setPatient(p.id);
                        setPatientPickerOpen(false);
                        setPatientSearch("");
                      }}
                      value={p.id}
                    >
                      <span>{p.name}</span>
                      <span className="ml-auto text-muted-foreground">
                        {p.species}
                      </span>
                    </CommandItem>
                  ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <label className="t-13 block space-y-1.5">
        <span className="flex items-center justify-between">
          Soin <span className="modal-required">requis</span>
        </span>
        <Input
          className="t-13 h-11 w-full rounded-xl"
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex. pansement, injection, contrôle de plaie"
          required
          value={label}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-[minmax(170px,0.8fr)_minmax(0,1.2fr)]">
        <label className="t-13 block min-w-0 space-y-1.5">
          Type
          <select
            aria-label="Type de soin"
            className={field}
            onChange={(e) => setType(e.target.value as CareType)}
            value={type}
          >
            {CARE_TYPES.map((t) => (
              <option key={t} value={t}>
                {careTypeLabels[t]}
              </option>
            ))}
          </select>
        </label>
        <div className="t-13 min-w-0 space-y-1.5">
          <span className="flex items-center justify-between">
            Date et heure prévues <span className="modal-required">requis</span>
          </span>
          <div className="flex gap-2">
            <DatePicker
              aria-label="Choisir la date du soin"
              className="t-13 h-11 flex-1 rounded-xl"
              onChange={setScheduledDate}
              placeholder="Choisir la date"
              value={scheduledDate}
            />
            <CareTimePicker onChange={setScheduledTime} value={scheduledTime} />
          </div>
        </div>
      </div>
      <ProductStockFields
        disabled={busy}
        onProductChange={(id) => {
          setProduct(id);
          setProductQuantity("1");
        }}
        onQuantityChange={setProductQuantity}
        optional
        productId={product}
        products={products.data}
        quantity={productQuantity}
      />
      <label className="t-13 block space-y-1.5">
        Note
        <textarea
          className={`${field} h-auto min-h-24 resize-y py-3`}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Consigne utile pour l’équipe"
          value={note}
        />
      </label>
      <p className="t-12 text-muted-foreground">
        Une seule occurrence. Vérifiez le soin et son horaire avant
        confirmation.
      </p>
      {error && (
        <p className="t-13 text-destructive" role="alert">
          {error}
        </p>
      )}
      <ModalBandActions>
        <Button
          className="t-13 h-11 w-full rounded-xl"
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          Annuler
        </Button>
        <Button
          className="t-13 h-11 w-full rounded-xl"
          disabled={
            busy || !currentUser || !patient || !label.trim() || !scheduled
          }
          type="submit"
        >
          {busy ? "Enregistrement…" : "Confirmer le soin"}
        </Button>
      </ModalBandActions>
    </form>
  );
}
