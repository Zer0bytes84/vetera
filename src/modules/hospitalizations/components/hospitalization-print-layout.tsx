import { Hospital } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHospitalizationVitalsRepository } from "@/data/repositories";
import { cn } from "@/lib/utils";
import type { Hospitalization, Patient } from "@/types/db";

import {
  computeHospitalizationDurationMinutes,
  formatDuration,
} from "../lib/format";
import { HospitalizationStatusBadge } from "./hospitalization-status-badge";

/**
 * Layout imprimable A4 (window.print) d'une hospitalisation + constantes.
 * Visible uniquement à l'impression — les parents masquent l'UI au print.
 */
export function HospitalizationPrintLayout({
  hospitalization,
  patient,
  className,
}: {
  hospitalization: Hospitalization;
  patient: Patient;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const vitalsRepo = useHospitalizationVitalsRepository();
  const vitals = vitalsRepo.forHospitalization(hospitalization.id);
  const durationMin = computeHospitalizationDurationMinutes(
    hospitalization.admissionDate,
    hospitalization.dischargeDate
  );

  useEffect(() => {
    if (!ref.current) {
      return;
    }
  }, [hospitalization.id]);

  return (
    <div className={cn("hospitalization-print-root", className)}>
      <div className="mb-3 flex justify-end print:hidden">
        <Button onClick={() => window.print()} size="sm" variant="outline">
          Imprimer
        </Button>
      </div>
      <div
        className="hospitalization-print-page mx-auto max-w-[210mm] rounded-xl border border-border/40 bg-background p-8 text-foreground"
        ref={ref}
      >
        <header className="flex items-start justify-between border-border/40 border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-sky-500/10">
              <Hospital className="size-6 text-sky-600" weight="duotone" />
            </div>
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
                Fiche d'hospitalisation
              </p>
              <h1 className="font-semibold text-2xl tracking-tight">
                {patient.name}
              </h1>
              <p className="text-muted-foreground text-sm">
                {patient.species}
                {patient.breed ? ` · ${patient.breed}` : ""}
                {patient.dateOfBirth
                  ? ` · ${new Date(patient.dateOfBirth).toLocaleDateString("fr-FR")}`
                  : ""}
              </p>
            </div>
          </div>
          <HospitalizationStatusBadge status={hospitalization.status} />
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <Info label="Motif" value={hospitalization.reason} />
          {hospitalization.diagnosis ? (
            <Info label="Diagnostic" value={hospitalization.diagnosis} />
          ) : null}
          <Info
            label="Admis le"
            value={new Date(hospitalization.admissionDate).toLocaleString(
              "fr-FR"
            )}
          />
          {hospitalization.dischargeDate ? (
            <Info
              label="Sorti le"
              value={new Date(hospitalization.dischargeDate).toLocaleString(
                "fr-FR"
              )}
            />
          ) : null}
          <Info label="Durée" value={formatDuration(durationMin)} />
          {hospitalization.cage ? (
            <Info label="Box" value={hospitalization.cage} />
          ) : null}
        </section>

        {(hospitalization.weightKg ||
          hospitalization.temperatureC ||
          hospitalization.ivFluids) && (
          <section className="mt-6">
            <h2 className="mb-2 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
              Données initiales
            </h2>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {hospitalization.weightKg ? (
                <Info
                  compact
                  label="Poids"
                  value={`${hospitalization.weightKg} kg`}
                />
              ) : null}
              {hospitalization.temperatureC ? (
                <Info
                  compact
                  label="T°"
                  value={`${hospitalization.temperatureC} °C`}
                />
              ) : null}
              {hospitalization.ivFluids ? (
                <Info
                  compact
                  label="Fluides IV"
                  value={hospitalization.ivFluids}
                />
              ) : null}
            </div>
          </section>
        )}

        {hospitalization.feedingPlan || hospitalization.specialCare ? (
          <section className="mt-6 grid gap-3">
            {hospitalization.feedingPlan ? (
              <Info label="Alimentation" value={hospitalization.feedingPlan} />
            ) : null}
            {hospitalization.specialCare ? (
              <Info
                label="Soins particuliers"
                value={hospitalization.specialCare}
              />
            ) : null}
          </section>
        ) : null}

        {vitals.length > 0 ? (
          <section className="mt-6">
            <h2 className="mb-2 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
              Constantes — {vitals.length} mesure{vitals.length > 1 ? "s" : ""}
            </h2>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-border/40 border-b text-left">
                  <th className="py-1.5 pr-2 font-medium text-muted-foreground">
                    Heure
                  </th>
                  <th className="py-1.5 pr-2 font-medium text-muted-foreground">
                    T°
                  </th>
                  <th className="py-1.5 pr-2 font-medium text-muted-foreground">
                    FC
                  </th>
                  <th className="py-1.5 pr-2 font-medium text-muted-foreground">
                    FR
                  </th>
                  <th className="py-1.5 pr-2 font-medium text-muted-foreground">
                    SpO2
                  </th>
                  <th className="py-1.5 pr-2 font-medium text-muted-foreground">
                    PAS
                  </th>
                  <th className="py-1.5 pr-2 font-medium text-muted-foreground">
                    Douleur
                  </th>
                </tr>
              </thead>
              <tbody>
                {vitals.map((v) => (
                  <tr className="border-border/30 border-b" key={v.id}>
                    <td className="py-1.5 pr-2">
                      {new Date(v.recordedAt).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-1.5 pr-2">{v.temperatureC ?? "—"}</td>
                    <td className="py-1.5 pr-2">{v.heartRateBpm ?? "—"}</td>
                    <td className="py-1.5 pr-2">
                      {v.respiratoryRateBpm ?? "—"}
                    </td>
                    <td className="py-1.5 pr-2">{v.spo2Percent ?? "—"}</td>
                    <td className="py-1.5 pr-2">{v.bloodPressureSys ?? "—"}</td>
                    <td className="py-1.5 pr-2">{v.painScore ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {hospitalization.dischargeSummary ? (
          <section className="mt-6">
            <h2 className="mb-2 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
              Résumé de sortie
            </h2>
            <p className="whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/20 p-3 text-sm">
              {hospitalization.dischargeSummary}
            </p>
          </section>
        ) : null}

        <footer className="mt-8 flex items-end justify-between border-border/40 border-t pt-3 text-[10px] text-muted-foreground">
          <div>
            <p>
              Document généré par bAItari — logiciel local, données
              confidentielles.
            </p>
            <p>
              Imprimé le{" "}
              {new Date().toLocaleString("fr-FR", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          </div>
          <Badge className="border-border/40 bg-background" variant="outline">
            hospitalisation · {hospitalization.id.slice(0, 8)}
          </Badge>
        </footer>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          .hospitalization-print-root { background: white !important; }
          body * { visibility: hidden; }
          .hospitalization-print-page, .hospitalization-print-page * { visibility: visible; }
          .hospitalization-print-page { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

function Info({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="rounded-md border border-border/40 bg-muted/20 p-2">
        <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.08em]">
          {label}
        </p>
        <p className="font-medium text-sm">{value}</p>
      </div>
    );
  }
  return (
    <div>
      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
        {label}
      </p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
}
