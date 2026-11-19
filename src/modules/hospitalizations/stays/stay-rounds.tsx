import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/surface";
import CarePage from "@/modules/care-tasks/care-page";
import type { Stay, StayLocation } from "./store";
import { VitalsForm } from "./vitals-form";

/**
 * The round: one card per hospitalised patient on the Tournée band, then the chosen patient's care and vitals in a panel
 * below. Presentation at the standard of the other views since 19 November (cards on the band, no hairline); the actions
 * are unchanged.
 */
export function StayRounds({
  stays,
  locations,
  patientName,
  onOpen,
}: {
  stays: Stay[];
  locations: StayLocation[];
  patientName: (id: string) => string;
  onOpen: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [measure, setMeasure] = useState(false);
  const stay = stays.find((item) => item.id === selected);
  return (
    <div className="space-y-1.5">
      {stays.length > 0 && (
        <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {stays.map((item) => (
            <Panel
              className="stay-round-card p-5"
              data-selected={selected === item.id || undefined}
              key={item.id}
            >
              <h2 className="t-18 font-medium">
                {patientName(item.patient_id)}
              </h2>
              <p className="mt-1 t-13 text-muted-foreground">
                {locations.find((location) => location.id === item.location_id)
                  ?.name || "Sans emplacement"}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  className="h-11"
                  onClick={() => {
                    setSelected(item.id);
                    setMeasure(false);
                  }}
                  variant={selected === item.id ? "default" : "outline"}
                >
                  Soins et constantes
                </Button>
                <Button
                  className="h-11"
                  onClick={() => onOpen(item.id)}
                  variant="ghost"
                >
                  Détail
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}
      {!stays.length && (
        <Panel className="p-8 text-center t-14 text-muted-foreground">
          Aucun patient hospitalisé à visiter.
        </Panel>
      )}
      {stay && (
        <Panel className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="t-18 font-medium">{patientName(stay.patient_id)}</h2>
            <Button
              className="h-11"
              onClick={() => setMeasure(!measure)}
              variant="outline"
            >
              {measure ? "Fermer le relevé" : "Relever les constantes"}
            </Button>
          </div>
          {measure && (
            <div className="max-w-xl">
              <VitalsForm
                key={stay.id}
                onSaved={() => setMeasure(false)}
                stayId={stay.id}
              />
            </div>
          )}
          <CarePage key={stay.patient_id} patientId={stay.patient_id} />
        </Panel>
      )}
    </div>
  );
}
