import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  ArrowLeft,
  Heartbeat,
  Hospital,
  IdentificationBadge,
  Notebook,
  Pill,
  Printer,
  Thermometer,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import {
  useHospitalizationsRepository,
  useHospitalizationVitalsRepository,
} from "@/data/repositories";
import { cn } from "@/lib/utils";
import type { Hospitalization, HospitalizationStatus, Patient } from "@/types/db";

import {
  computeHospitalizationDurationMinutes,
  formatDuration,
  formatTimeAgo,
  painScoreTone,
} from "../lib/format";
import { HospitalizationStatusBadge } from "./hospitalization-status-badge";
import { VitalsChart } from "./vitals-chart";
import { VitalsEntryDialog } from "./vitals-entry-dialog";

export function HospitalizationDetail({
  hospitalization,
  patient,
  onBack,
  onPrint,
  className,
}: {
  hospitalization: Hospitalization;
  patient: Patient;
  onBack?: () => void;
  onPrint?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const repo = useHospitalizationsRepository();
  const vitalsRepo = useHospitalizationVitalsRepository();
  const [vitalsOpen, setVitalsOpen] = useState(false);

  const vitals = vitalsRepo.forHospitalization(hospitalization.id);
  const latest = useMemo(() => {
    if (vitals.length === 0) return null;
    return [...vitals].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
  }, [vitals]);

  const durationMin = computeHospitalizationDurationMinutes(
    hospitalization.admissionDate,
    hospitalization.dischargeDate
  );

  const handleStatusChange = async (next: HospitalizationStatus) => {
    const now = new Date().toISOString();
    await repo.update(hospitalization.id, {
      status: next,
      dischargeDate:
        next === "discharged" || next === "transferred" || next === "deceased"
          ? hospitalization.dischargeDate ?? now
          : null,
    });
  };

  return (
    <div className={cn("grid gap-4", className)}>
      <Card className="overflow-hidden">
        <CardHeader className="border-border/40 border-b bg-gradient-to-b from-sky-500/[0.04] to-transparent">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10">
              <Hospital weight="duotone" className="size-5 text-sky-600" />
            </div>
            <div className="grid flex-1 gap-0.5">
              <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
                {patient.name} · {patient.species}
              </CardDescription>
              <CardTitle className="text-lg tracking-tight">
                {hospitalization.reason}
              </CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <HospitalizationStatusBadge status={hospitalization.status} />
                <Badge className="border-border/40 bg-background" variant="outline">
                  <IdentificationBadge className="mr-1 size-3" />
                  {t("modules.hospitalizations.fields.cage", "Box")}{" "}
                  {hospitalization.cage ?? "—"}
                </Badge>
                <Badge className="border-border/40 bg-background" variant="outline">
                  {formatDuration(durationMin)}
                </Badge>
                <Badge className="border-border/40 bg-background" variant="outline">
                  {t(
                    "modules.hospitalizations.fields.admittedAt",
                    "Admis"
                  )}: {formatTimeAgo(hospitalization.admissionDate)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {onBack ? (
                <Button onClick={onBack} size="icon" variant="ghost">
                  <ArrowLeft className="size-4" weight="duotone" />
                </Button>
              ) : null}
              {onPrint ? (
                <Button
                  onClick={onPrint}
                  size="icon"
                  variant="ghost"
                  aria-label={t("modules.hospitalizations.print", "Imprimer")}
                >
                  <Printer className="size-4" weight="duotone" />
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-6">
          {hospitalization.diagnosis ? (
            <div className="grid gap-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                {t("modules.hospitalizations.fields.diagnosis", "Diagnostic")}
              </p>
              <p className="text-sm">{hospitalization.diagnosis}</p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            {hospitalization.weightKg ? (
              <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                  {t("modules.hospitalizations.fields.weightKg", "Poids")}
                </p>
                <p className="font-semibold text-base">{hospitalization.weightKg} kg</p>
              </div>
            ) : null}
            {hospitalization.temperatureC ? (
              <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                  {t("modules.hospitalizations.fields.temperatureC", "T° initiale")}
                </p>
                <p className="font-semibold text-base">
                  {hospitalization.temperatureC} °C
                </p>
              </div>
            ) : null}
            {hospitalization.ivFluids ? (
              <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                  {t("modules.hospitalizations.fields.ivFluids", "Fluides IV")}
                </p>
                <p className="font-medium text-sm">{hospitalization.ivFluids}</p>
              </div>
            ) : null}
          </div>

          {(hospitalization.feedingPlan || hospitalization.specialCare) ? (
            <Separator />
          ) : null}
          {hospitalization.feedingPlan ? (
            <div className="grid gap-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                {t("modules.hospitalizations.fields.feedingPlan", "Alimentation")}
              </p>
              <p className="text-sm">{hospitalization.feedingPlan}</p>
            </div>
          ) : null}
          {hospitalization.specialCare ? (
            <div className="grid gap-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                {t("modules.hospitalizations.fields.specialCare", "Soins")}
              </p>
              <p className="text-sm whitespace-pre-wrap">{hospitalization.specialCare}</p>
            </div>
          ) : null}

          <Separator />

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
              {t("modules.hospitalizations.fields.changeStatus", "Statut")}
            </span>
            {(
              ["admitted", "monitoring", "critical", "discharged"] as HospitalizationStatus[]
            ).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void handleStatusChange(s)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all",
                  hospitalization.status === s
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-200"
                    : "border-border/50 bg-background text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {t(`modules.hospitalizations.status.${s}`, s)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between border-border/40 border-b">
          <div className="grid gap-0.5">
            <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
              {t("modules.hospitalizations.vitals.title", "Constantes")}
            </CardDescription>
            <CardTitle className="text-base">
              {t("modules.hospitalizations.vitals.subtitle", "Suivi 24h")}
            </CardTitle>
          </div>
          <Button
            className="gap-1.5"
            onClick={() => setVitalsOpen(true)}
            size="sm"
            variant="outline"
          >
            <Pill className="size-3.5" weight="duotone" />
            {t("modules.hospitalizations.vitals.addEntry", "Ajouter")}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 p-6">
          {latest ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              <VitalCell
                icon={<Thermometer className="size-3.5" weight="duotone" />}
                label={t("modules.hospitalizations.vitals.temperature", "T°")}
                value={latest.temperatureC != null ? `${latest.temperatureC}°C` : "—"}
                critical={latest.temperatureC != null && (latest.temperatureC < 37 || latest.temperatureC > 40)}
              />
              <VitalCell
                icon={<Heartbeat className="size-3.5" weight="duotone" />}
                label={t("modules.hospitalizations.vitals.heartRate", "FC")}
                value={latest.heartRateBpm != null ? `${latest.heartRateBpm} bpm` : "—"}
                critical={latest.heartRateBpm != null && (latest.heartRateBpm < 50 || latest.heartRateBpm > 180)}
              />
              <VitalCell
                icon={<Heartbeat className="size-3.5" weight="duotone" />}
                label={t("modules.hospitalizations.vitals.respiratoryRate", "FR")}
                value={latest.respiratoryRateBpm != null ? `${latest.respiratoryRateBpm} /min` : "—"}
                critical={latest.respiratoryRateBpm != null && (latest.respiratoryRateBpm < 8 || latest.respiratoryRateBpm > 60)}
              />
              <VitalCell
                icon={<Heartbeat className="size-3.5" weight="duotone" />}
                label={t("modules.hospitalizations.vitals.spo2", "SpO2")}
                value={latest.spo2Percent != null ? `${latest.spo2Percent}%` : "—"}
                critical={latest.spo2Percent != null && latest.spo2Percent < 92}
              />
              <VitalCell
                icon={<Notebook className="size-3.5" weight="duotone" />}
                label={t("modules.hospitalizations.vitals.bp", "PAS")}
                value={latest.bloodPressureSys != null ? `${latest.bloodPressureSys} mmHg` : "—"}
              />
              <VitalCell
                icon={<Notebook className="size-3.5" weight="duotone" />}
                label={t("modules.hospitalizations.vitals.bp", "PAD")}
                value={latest.bloodPressureDia != null ? `${latest.bloodPressureDia} mmHg` : "—"}
              />
              <VitalCell
                icon={<Notebook className="size-3.5" weight="duotone" />}
                label={t("modules.hospitalizations.vitals.painScore", "Douleur")}
                value={latest.painScore != null ? `${latest.painScore}/10` : "—"}
                tone={painScoreTone(latest.painScore)}
              />
            </div>
          ) : (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyTitle>{t("modules.hospitalizations.vitals.empty", "Aucune constante")}</EmptyTitle>
                <EmptyDescription>
                  {t(
                    "modules.hospitalizations.vitals.emptyDescription",
                    "Ajoutez la première mesure pour démarrer le suivi."
                  )}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {vitals.length > 1 ? <VitalsChart vitals={vitals} /> : null}
        </CardContent>
      </Card>

      <VitalsEntryDialog
        hospitalization={hospitalization}
        onOpenChange={setVitalsOpen}
        open={vitalsOpen}
      />
    </div>
  );
}

function VitalCell({
  icon,
  label,
  value,
  critical,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  critical?: boolean;
  tone?: "success" | "warning" | "destructive" | "neutral";
}) {
  const colorTone =
    tone ??
    (critical ? "destructive" : "neutral");
  const bgClass =
    colorTone === "destructive"
      ? "border-rose-500/40 bg-rose-500/5"
      : colorTone === "warning"
      ? "border-amber-500/40 bg-amber-500/5"
      : colorTone === "success"
      ? "border-emerald-500/40 bg-emerald-500/5"
      : "border-border/40 bg-muted/20";
  return (
    <div className={cn("rounded-lg border p-3", bgClass)}>
      <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-semibold text-base">{value}</p>
    </div>
  );
}
