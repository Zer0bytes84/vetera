import { ErrorState } from "@/design-system/patterns/error-state";
import "./hospitalisation.css";
import {
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  MapPinIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from "@heroicons/react/20/solid";
import { type ReactNode, useState } from "react";
import { SectionCards } from "@/components/section-cards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Panel } from "@/components/ui/surface";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePatientsRepository } from "@/data/repositories";
import { PageHeader } from "@/design-system/patterns/page-header";
import { ACTIVE_STAY_STATUSES, type StayStatus, stayDays } from "./domain";
import { OccupancyUnits } from "./occupancy-units";
import { StayDetail } from "./stay-detail";
import { AdmissionForm, LocationForm } from "./stay-forms";
import { LocationAvailability } from "./stay-location-controls";
import { StayRounds } from "./stay-rounds";
import { StaySection } from "./stay-section";
import { useStays } from "./use-stays";

const labels: Record<StayStatus, string> = {
  admis: "Admis",
  en_cours: "En cours",
  sortie_prevue: "Sortie prévue",
  sorti: "Sorti",
  annule: "Annulé",
};
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;
const shortDate = (value: string) =>
  new Date(value).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Hospitalisation, at the standard of the other views since 19 November: the « Chiffres clés » band with the page's main
 * action, the four views, and each block in its grey band. Presentation only: the stays, locations, views, forms and
 * actions are the same as before.
 */
export default function StaysPage({
  patientId,
  initialStayId,
}: {
  patientId?: string;
  initialStayId?: string;
}) {
  const { stays, locations, error, loading, refresh } = useStays(patientId);
  const patients = usePatientsRepository();
  const [view, setView] = useState("sejours");
  const [form, setForm] = useState<"admission" | "location" | null>(null);
  const [selected, setSelected] = useState<string | null>(
    initialStayId || null
  );
  const active = stays.filter((stay) =>
    ACTIVE_STAY_STATUSES.includes(stay.status)
  );
  const patientName = (id: string) =>
    patients.data.find((patient) => patient.id === id)?.name || "Patient";
  const selectedStay = stays.find((stay) => stay.id === selected);
  if (selectedStay) {
    return (
      <section className="hospitalisation-view p-4 lg:p-6">
        <StayDetail
          onBack={() => setSelected(null)}
          patientName={patientName(selectedStay.patient_id)}
          species={
            patients.data.find(
              (patient) => patient.id === selectedStay.patient_id
            )?.species || ""
          }
          stay={selectedStay}
        />
      </section>
    );
  }

  // The key figures read the same stays and locations as the page; nothing new is fetched.
  const openLocations = locations.filter((location) => location.active);
  const freeLocations = openLocations.filter(
    (location) => !active.some((stay) => stay.location_id === location.id)
  );
  const discharges = active
    .filter((stay) => stay.status === "sortie_prevue")
    .sort((a, b) =>
      (a.planned_discharge_at || "").localeCompare(b.planned_discharge_at || "")
    );
  const nextDischarge = discharges[0];
  const admitted = active.filter((stay) => stay.status === "admis").length;
  const underway = active.filter((stay) => stay.status === "en_cours").length;

  const occupant = (locationId: string) =>
    active.find((stay) => stay.location_id === locationId);
  const locationCards = locations.length ? (
    <div className="stay-location-grid grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
      {locations.map((location) => {
        const stay = occupant(location.id);
        return (
          <Panel className="stay-location-card p-5" key={location.id}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="t-16 font-medium">{location.name}</h2>
              <span className="t-12 text-muted-foreground">
                {location.type === "box"
                  ? "Box"
                  : location.type === "cage"
                    ? "Cage"
                    : "Chenil"}
              </span>
            </div>
            <p className="mt-4 t-14">
              {stay
                ? patientName(stay.patient_id)
                : location.active
                  ? "Disponible"
                  : "Désactivé"}
            </p>
            <p className="mt-1 t-12 text-muted-foreground">
              {stay
                ? labels[stay.status]
                : location.species || "Toutes espèces"}
            </p>
            {stay && (
              <Button
                className="mt-4 h-11"
                onClick={() => setSelected(stay.id)}
                type="button"
                variant="outline"
              >
                Ouvrir le séjour
              </Button>
            )}
            {view === "emplacements" && (
              <LocationAvailability location={location} occupied={!!stay} />
            )}
          </Panel>
        );
      })}
    </div>
  ) : (
    <Panel className="p-5">
      <p className="t-14 text-muted-foreground">Aucun emplacement configuré.</p>
    </Panel>
  );

  let content: ReactNode;
  if (error) {
    content = <ErrorState message={error} onRetry={() => void refresh()} />;
  } else if (loading) {
    content = (
      <p className="t-13 text-muted-foreground" role="status">
        Chargement des séjours…
      </p>
    );
  } else if (view === "tournee") {
    content = (
      <StaySection
        bare
        icon={UserGroupIcon}
        subtitle={`${plural(active.length, "patient")} à visiter`}
        title="Tournée"
      >
        <StayRounds
          locations={locations}
          onOpen={setSelected}
          patientName={patientName}
          stays={active}
        />
      </StaySection>
    );
  } else if (view === "sejours") {
    content = (
      <StaySection
        icon={ClipboardDocumentListIcon}
        panelClassName="stay-list space-y-0 divide-y divide-border/70 p-0"
        subtitle={plural(stays.length, "séjour")}
        title="Séjours"
      >
        {stays.length ? (
          stays.map((stay) => (
            <article
              className="stay-summary-card flex flex-wrap items-center justify-between gap-4 p-5"
              key={stay.id}
            >
              <div>
                <h2 className="t-16 font-medium">
                  {patientName(stay.patient_id)}
                </h2>
                <p className="mt-1 t-13 text-muted-foreground">{stay.reason}</p>
                <p className="mt-2 t-12 text-muted-foreground">
                  Admis le {shortDate(stay.admitted_at)}
                  {ACTIVE_STAY_STATUSES.includes(stay.status) &&
                    (() => {
                      const days = stayDays(
                        new Date(stay.admitted_at),
                        new Date(
                          Math.max(
                            Date.now(),
                            new Date(stay.admitted_at).getTime()
                          )
                        )
                      );
                      return ` · ${days} journée${days > 1 ? "s" : ""} occupée${days > 1 ? "s" : ""}`;
                    })()}
                </p>
              </div>
              <div className="text-right">
                <p className="t-13 font-medium">{labels[stay.status]}</p>
                <Button
                  className="mt-2 h-11"
                  onClick={() => setSelected(stay.id)}
                  variant="ghost"
                >
                  Ouvrir le séjour
                </Button>
                <p className="mt-1 t-12 text-muted-foreground">
                  {locations.find(
                    (location) => location.id === stay.location_id
                  )?.name || "Sans emplacement"}
                </p>
              </div>
            </article>
          ))
        ) : (
          <p className="p-8 text-center t-14 text-muted-foreground">
            Aucun séjour enregistré.
          </p>
        )}
      </StaySection>
    );
  } else {
    content = (
      <>
        {view === "occupation" && (
          <StaySection
            icon={Squares2X2Icon}
            subtitle="Places occupées et sorties prévues"
            title="Occupation"
          >
            <OccupancyUnits locations={locations} stays={stays} />
          </StaySection>
        )}
        <StaySection
          bare
          icon={MapPinIcon}
          subtitle={plural(locations.length, "emplacement")}
          title="Emplacements"
        >
          {locationCards}
        </StaySection>
      </>
    );
  }

  return (
    <section className="hospitalisation-view space-y-6 p-4 lg:p-6">
      <PageHeader
        subtitle={`${active.length} séjour${active.length > 1 ? "s" : ""} actif${active.length > 1 ? "s" : ""}`}
        title="Hospitalisation"
      />
      <SectionCards
        actions={
          <Button
            className="h-9 rounded-full px-4"
            onClick={() =>
              setForm(view === "emplacements" ? "location" : "admission")
            }
          >
            {view === "emplacements"
              ? "Créer un emplacement"
              : "Admettre un patient"}
          </Button>
        }
        icon={BuildingOffice2Icon}
        items={[
          {
            title: "Séjours actifs",
            value: active.length,
            detailRow: active.length
              ? [
                  admitted ? `${admitted} admis` : "",
                  underway ? `${underway} en cours` : "",
                  discharges.length
                    ? `${discharges.length} sortie${discharges.length > 1 ? "s" : ""} prévue${discharges.length > 1 ? "s" : ""}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Aucun patient hospitalisé",
          },
          {
            title: "Places libres",
            value: freeLocations.length,
            detailRow: openLocations.length
              ? `Sur ${plural(openLocations.length, "emplacement")} en service`
              : "Aucun emplacement en service",
          },
          {
            title: "Sorties prévues",
            value: discharges.length,
            detailRow: nextDischarge
              ? `${nextDischarge.planned_discharge_at ? `Prochaine le ${shortDate(nextDischarge.planned_discharge_at)}` : "Prochaine"} · ${patientName(nextDischarge.patient_id)}`
              : "Aucune sortie préparée",
          },
        ]}
        subtitle="Séjours et emplacements"
      />
      <Tabs onValueChange={setView} value={view}>
        <TabsList aria-label="Vues de l’hospitalisation" tabsStyle="segmented">
          <TabsTrigger value="sejours">Séjours</TabsTrigger>
          <TabsTrigger value="occupation">Occupation</TabsTrigger>
          <TabsTrigger value="tournee">Tournée</TabsTrigger>
          <TabsTrigger value="emplacements">Emplacements</TabsTrigger>
        </TabsList>
      </Tabs>
      {content}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setForm(null);
          }
        }}
        open={form !== null}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {form === "location"
                ? "Nouvel emplacement"
                : "Admission d’un patient"}
            </DialogTitle>
            <DialogDescription>
              {form === "location"
                ? "Configurez une cage, un box ou un chenil."
                : "Vérifiez le patient et son emplacement avant confirmation."}
            </DialogDescription>
          </DialogHeader>
          {form === "location" ? (
            <LocationForm onSaved={() => setForm(null)} />
          ) : (
            <AdmissionForm
              locations={locations.filter(
                (place) => !active.some((stay) => stay.location_id === place.id)
              )}
              onSaved={() => setForm(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
