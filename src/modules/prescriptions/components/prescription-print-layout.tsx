import { Pill, Stethoscope } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { Patient, User } from "@/types/db";

import { formatNumber } from "../lib/dose-calculator";
import type { PreviewItem } from "./prescription-preview";

export interface PrescriptionPrintLayoutProps {
  className?: string;
  diagnosis: string;
  generalInstructions: string;
  items: PreviewItem[];
  patient: Patient;
  vet: User | null;
}

/**
 * Mise en page A4 d'une ordonnance vétérinaire. Sérigraphie (Lora) pour le
 * bloc entête, sans (Inter) pour le reste, format médical classique.
 *
 * Cette vue est partagée entre l'aperçu écran (PreviewDialog) et l'impression
 * (`@media print` dans `index.css` qui ne laisse visible que `.prescription-print`).
 */
export function PrescriptionPrintLayout({
  className,
  diagnosis,
  generalInstructions,
  items,
  patient,
  vet,
}: PrescriptionPrintLayoutProps) {
  const { t } = useTranslation();
  const today = new Date();
  const dateStr = today.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className={className}>
      {/* Header clinique */}
      <header className="rx-header flex items-start justify-between border-foreground/90 border-b-2 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex size-12 items-center justify-center rounded-full border-2 border-foreground/80 text-foreground">
            <Stethoscope className="size-6" weight="duotone" />
          </div>
          <div>
            <h1
              className="font-semibold text-xl tracking-tight"
              style={{
                fontFamily:
                  "var(--font-serif, Georgia, 'Times New Roman', serif)",
              }}
            >
              {t("prescriptions.preview.clinicName")}
            </h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
              {vet?.displayName ?? vet?.email ?? "—"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {vet?.specialty ?? "Vétérinaire"}
              {vet?.phone ? ` · ${vet.phone}` : ""}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {t("prescriptions.preview.date")}
          </p>
          <p className="font-semibold text-sm">{dateStr}</p>
        </div>
      </header>

      {/* Bloc patient */}
      <section className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <InfoCell
          label={t("prescriptions.preview.patient")}
          value={
            <span className="font-semibold text-foreground">
              {patient.name}
              <span className="ml-1 text-muted-foreground">
                ({patient.species}
                {patient.breed ? `, ${patient.breed}` : ""})
              </span>
            </span>
          }
        />
        <InfoCell
          label={t("prescriptions.preview.weight")}
          value={
            <span className="font-semibold">
              {items[0]?.weightKgSnapshot
                ? `${formatNumber(items[0].weightKgSnapshot)} kg`
                : "—"}
            </span>
          }
        />
        <InfoCell
          label="Sexe"
          value={
            <span className="font-semibold">
              {patient.sex === "F" ? "Femelle" : "Mâle"}
            </span>
          }
        />
      </section>

      {diagnosis.trim() ? (
        <section className="mt-3 rounded-md border border-foreground/10 bg-muted/30 px-3 py-2 text-xs">
          <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
            {t("prescriptions.preview.diagnosis")}
          </p>
          <p className="mt-0.5">{diagnosis}</p>
        </section>
      ) : null}

      {/* Tableau médicaments */}
      <section className="mt-4">
        <h2 className="mb-2 flex items-center gap-2 font-semibold text-foreground/80 text-sm uppercase tracking-wider">
          <Pill className="size-4" weight="duotone" />
          {t("prescriptions.title")}
        </h2>
        <ol className="space-y-2.5">
          {items.map((it) => (
            <li
              className="rx-item rounded-md border border-foreground/10 px-3 py-2.5"
              key={it.id}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold text-sm">
                  <span className="mr-1.5 inline-flex size-5 items-center justify-center rounded-full bg-foreground font-semibold text-[11px] text-background">
                    {it.sortOrder + 1}
                  </span>
                  {it.medicationName}
                </p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  {it.form ? it.form : ""}
                  {it.route ? ` · ${it.route}` : ""}
                </p>
              </div>
              {it.medicationClass ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {it.medicationClass}
                </p>
              ) : null}
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
                <span className="font-medium">
                  {it.dosagePerKg} {it.dosageUnit}
                  {it.dosageMax != null && it.dosageMax !== it.dosagePerKg
                    ? ` (${it.dosageMin ?? it.dosagePerKg}–${it.dosageMax})`
                    : ""}
                </span>
                {it.computedDoseMg == null ? null : (
                  <Badge
                    className="bg-foreground/5 text-[10px] text-foreground"
                    variant="secondary"
                  >
                    {formatNumber(it.computedDoseMg)} mg
                  </Badge>
                )}
                {it.computedVolumeMl == null ? null : (
                  <Badge
                    className="bg-foreground/5 text-[10px] text-foreground"
                    variant="secondary"
                  >
                    {formatNumber(it.computedVolumeMl)} mL
                  </Badge>
                )}
                <span>· {it.frequency}</span>
                <span>· {it.duration}</span>
              </div>
              {it.instructions ? (
                <p className="mt-1 text-[11px] text-foreground/80 leading-relaxed">
                  {it.instructions}
                </p>
              ) : null}
              {it.warnings ? (
                <p className="mt-1 text-[10px] text-muted-foreground italic">
                  ⚠ {it.warnings}
                </p>
              ) : null}
              {it.quantity ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("prescriptions.item.quantity")} :{" "}
                  <span className="font-medium text-foreground/80">
                    {it.quantity}
                  </span>
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {generalInstructions.trim() ? (
        <section className="mt-4 rounded-md border border-foreground/10 bg-muted/30 px-3 py-2 text-xs">
          <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
            {t("prescriptions.preview.instructions")}
          </p>
          <p className="mt-0.5 whitespace-pre-line">{generalInstructions}</p>
        </section>
      ) : null}

      {/* Footer + signature */}
      <footer className="mt-6 grid grid-cols-2 gap-6 border-foreground/10 border-t pt-4 text-[10px] text-muted-foreground">
        <p className="italic">{t("prescriptions.preview.notes")}</p>
        <div className="text-right">
          <p className="font-semibold text-[10px] text-foreground/80 uppercase tracking-widest">
            {t("prescriptions.preview.vetSignature")}
          </p>
          <div className="mt-6 border-foreground/40 border-b" />
          <p className="mt-1 font-medium text-foreground/80">
            {vet?.displayName ?? "—"}
          </p>
        </div>
      </footer>
    </article>
  );
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-foreground/10 bg-muted/20 px-3 py-2">
      <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <div className="mt-0.5 text-foreground/90">{value}</div>
    </div>
  );
}
