import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  ArrowLeft,
  Heartbeat,
  Pill,
  Play,
  Printer,
  Stop,
  Syringe,
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
  useAnesthesiaDrugLogRepository,
  useAnesthesiaMonitoringRepository,
  useAnesthesiaSheetsRepository,
} from "@/data/repositories";
import { cn } from "@/lib/utils";
import type { AnesthesiaSheet, AnesthesiaStatus, Patient } from "@/types/db";

import { formatDuration } from "@/modules/hospitalizations/lib/format";

import {
  ANESTHESIA_PHASE_LABELS,
  ANESTHESIA_ROUTE_LABELS,
  computeAnesthesiaDurationMinutes,
} from "../lib/format";
import { AnesthesiaDrugLogEntryDialog } from "./anesthesia-drug-log-entry-dialog";
import { AnesthesiaMonitoringEntryDialog } from "./anesthesia-monitoring-entry-dialog";
import { AnesthesiaStatusBadge } from "./anesthesia-status-badge";

export function AnesthesiaDetail({
  sheet,
  patient,
  onBack,
  onPrint,
  className,
}: {
  sheet: AnesthesiaSheet;
  patient: Patient;
  onBack?: () => void;
  onPrint?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const repo = useAnesthesiaSheetsRepository();
  const drugRepo = useAnesthesiaDrugLogRepository();
  const monRepo = useAnesthesiaMonitoringRepository();
  const [drugOpen, setDrugOpen] = useState(false);
  const [monOpen, setMonOpen] = useState(false);

  const drugs = drugRepo.forSheet(sheet.id);
  const monitoring = monRepo.forSheet(sheet.id);

  const durationMin = computeAnesthesiaDurationMinutes(
    sheet.startedAt,
    sheet.endedAt
  );

  const handleStatusChange = async (next: AnesthesiaStatus) => {
    const now = new Date().toISOString();
    const updates: Partial<AnesthesiaSheet> = { status: next };
    if (next === "in_progress" && !sheet.startedAt) updates.startedAt = now;
    if (
      (next === "completed" || next === "cancelled") &&
      !sheet.endedAt
    )
      updates.endedAt = now;
    await repo.update(sheet.id, updates);
  };

  const drugCounts = useMemo(() => {
    const counts: Record<string, number> = {
      premed: 0,
      induction: 0,
      maintenance: 0,
      recovery: 0,
    };
    for (const d of drugs) counts[d.phase] = (counts[d.phase] ?? 0) + 1;
    return counts;
  }, [drugs]);

  return (
    <div className={cn("grid gap-6", className)}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden h-fit">
          <CardHeader className="border-border/40 border-b bg-gradient-to-b from-violet-500/[0.04] to-transparent">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10">
                <Syringe weight="duotone" className="size-5 text-violet-600" />
              </div>
              <div className="grid flex-1 gap-0.5">
                <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
                  {patient.name} · {patient.species}
                </CardDescription>
                <CardTitle className="text-lg tracking-tight">
                  {sheet.procedureName}
                </CardTitle>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <AnesthesiaStatusBadge status={sheet.status} />
                  {sheet.asaStatus ? (
                    <Badge className="border-border/40 bg-background" variant="outline">
                      ASA {sheet.asaStatus}
                    </Badge>
                  ) : null}
                  {sheet.emergency ? (
                    <Badge className="border-rose-500/40 bg-rose-500/10 text-rose-700" variant="outline">
                      Urgence
                    </Badge>
                  ) : null}
                  {sheet.startedAt ? (
                    <Badge className="border-border/40 bg-background" variant="outline">
                      {formatDuration(durationMin)}
                    </Badge>
                  ) : null}
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
                    aria-label={t("modules.anesthesia.print", "Imprimer A4")}
                    onClick={onPrint}
                    size="icon"
                    variant="ghost"
                  >
                    <Printer className="size-4" weight="duotone" />
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-6">
            {sheet.premedication || sheet.induction || sheet.maintenance ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {sheet.premedication ? (
                  <InfoBlock
                    label={t("modules.anesthesia.fields.premedication", "Prémédication")}
                    value={sheet.premedication}
                  />
                ) : null}
                {sheet.induction ? (
                  <InfoBlock
                    label={t("modules.anesthesia.fields.induction", "Induction")}
                    value={sheet.induction}
                  />
                ) : null}
                {sheet.maintenance ? (
                  <InfoBlock
                    label={t("modules.anesthesia.fields.maintenance", "Maintenance")}
                    value={sheet.maintenance}
                  />
                ) : null}
                {sheet.monitoringPlan ? (
                  <InfoBlock
                    label={t("modules.anesthesia.fields.monitoringPlan", "Plan de monitoring")}
                    value={sheet.monitoringPlan}
                  />
                ) : null}
              </div>
            ) : null}

            <Separator />

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                {t("modules.anesthesia.fields.changeStatus", "Statut")}
              </span>
              {(["planned", "in_progress", "completed", "cancelled"] as AnesthesiaStatus[]).map(
                (s) => (
                  <button
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all",
                      sheet.status === s
                        ? "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-200"
                        : "border-border/50 bg-background text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                    key={s}
                    onClick={() => void handleStatusChange(s)}
                    type="button"
                  >
                    {s === "in_progress" ? (
                      <Play className="mr-1 inline-block size-3" weight="fill" />
                    ) : s === "completed" ? (
                      <Stop className="mr-1 inline-block size-3" weight="fill" />
                    ) : null}
                    {t(`modules.anesthesia.status.${s}`, s)}
                  </button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
        <CardHeader className="flex-row items-center justify-between border-border/40 border-b">
          <div className="grid gap-0.5">
            <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
              {t("modules.anesthesia.drugLog.title", "Log médicaments")}
            </CardDescription>
            <CardTitle className="text-base">
              {drugs.length} médicament{drugs.length > 1 ? "s" : ""}
            </CardTitle>
          </div>
          <Button
            className="gap-1.5"
            onClick={() => setDrugOpen(true)}
            size="sm"
            variant="outline"
          >
            <Pill className="size-3.5" weight="duotone" />
            {t("modules.anesthesia.drugLog.addEntry", "Ajouter")}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {drugs.length === 0 ? (
            <Empty className="m-6 border border-dashed">
              <EmptyHeader>
                <EmptyTitle>
                  {t("modules.anesthesia.drugLog.noEntries", "Aucun médicament enregistré")}
                </EmptyTitle>
                <EmptyDescription>
                  {t(
                    "modules.anesthesia.drugLog.addEntryDescription",
                    "Ajoutez la première administration pour démarrer la traçabilité."
                  )}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border/40">
              {drugs.map((d) => (
                <li
                  className="grid gap-1.5 px-6 py-3 sm:grid-cols-[1fr_auto]"
                  key={d.id}
                >
                  <div className="grid gap-0.5">
                    <p className="font-medium text-foreground text-sm">
                      {d.drugName}
                      {d.dose ? (
                        <span className="ml-2 font-normal text-muted-foreground">
                          {d.dose}
                        </span>
                      ) : null}
                      {d.route ? (
                        <Badge
                          className="ml-2 border-border/40 bg-background"
                          variant="outline"
                        >
                          {ANESTHESIA_ROUTE_LABELS[d.route]}
                        </Badge>
                      ) : null}
                    </p>
                    {d.notes ? (
                      <p className="text-muted-foreground text-xs">{d.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 text-right">
                    <Badge
                      className="border-violet-500/30 bg-violet-500/10 text-violet-700"
                      variant="outline"
                    >
                      {ANESTHESIA_PHASE_LABELS[d.phase]}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(d.administeredAt).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2 border-border/40 border-t bg-muted/20 px-6 py-2 text-[11px] text-muted-foreground">
            <span className="font-mono uppercase tracking-[0.06em]">
              Par phase :
            </span>
            {(["premed", "induction", "maintenance", "recovery"] as const).map(
              (p) => (
                <Badge
                  className="border-border/40 bg-background"
                  key={p}
                  variant="outline"
                >
                  {ANESTHESIA_PHASE_LABELS[p]} · {drugCounts[p] ?? 0}
                </Badge>
              )
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between border-border/40 border-b">
          <div className="grid gap-0.5">
            <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
              {t("modules.anesthesia.monitoring.title", "Monitoring perop")}
            </CardDescription>
            <CardTitle className="text-base">
              {monitoring.length} point{monitoring.length > 1 ? "s" : ""}
            </CardTitle>
          </div>
          <Button
            className="gap-1.5"
            onClick={() => setMonOpen(true)}
            size="sm"
            variant="outline"
          >
            <Heartbeat className="size-3.5" weight="duotone" />
            {t("modules.anesthesia.monitoring.addEntry", "Ajouter")}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {monitoring.length === 0 ? (
            <Empty className="m-6 border border-dashed">
              <EmptyHeader>
                <EmptyTitle>
                  {t("modules.anesthesia.monitoring.noEntries", "Aucun point de monitoring")}
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-left text-muted-foreground">
                    <th className="px-6 py-2 font-medium">Heure</th>
                    <th className="px-2 py-2 font-medium">Phase</th>
                    <th className="px-2 py-2 font-medium">FC</th>
                    <th className="px-2 py-2 font-medium">FR</th>
                    <th className="px-2 py-2 font-medium">SpO2</th>
                    <th className="px-2 py-2 font-medium">ETCO2</th>
                    <th className="px-2 py-2 font-medium">PAM</th>
                    <th className="px-2 py-2 font-medium">T°</th>
                    <th className="px-2 py-2 font-medium">Iso</th>
                    <th className="px-2 py-2 font-medium">O2</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoring.map((m) => (
                    <tr className="border-b border-border/30" key={m.id}>
                      <td className="px-6 py-1.5">
                        {new Date(m.recordedAt).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-2 py-1.5">
                        <Badge
                          className="border-violet-500/30 bg-violet-500/10 text-violet-700"
                          variant="outline"
                        >
                          {ANESTHESIA_PHASE_LABELS[m.phase]}
                        </Badge>
                      </td>
                      <td className="px-2 py-1.5">{m.heartRateBpm ?? "—"}</td>
                      <td className="px-2 py-1.5">{m.respiratoryRateBpm ?? "—"}</td>
                      <td className="px-2 py-1.5">{m.spo2Percent ?? "—"}</td>
                      <td className="px-2 py-1.5">{m.etco2Mmhg ?? "—"}</td>
                      <td className="px-2 py-1.5">{m.mapMmhg ?? "—"}</td>
                      <td className="px-2 py-1.5">{m.temperatureC ?? "—"}</td>
                      <td className="px-2 py-1.5">{m.isofluranePct ?? "—"}</td>
                      <td className="px-2 py-1.5">{m.oxygenFlowLMin ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AnesthesiaDrugLogEntryDialog
        onOpenChange={setDrugOpen}
        open={drugOpen}
        sheet={sheet}
      />
      <AnesthesiaMonitoringEntryDialog
        onOpenChange={setMonOpen}
        open={monOpen}
        sheet={sheet}
      />
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{value}</p>
    </div>
  );
}
