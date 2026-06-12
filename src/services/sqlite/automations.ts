/* eslint-disable @typescript-eslint/no-explicit-any */
import type Database from "@tauri-apps/plugin-sql";
import type { AutomationItem } from "@/modules/dashboard/hooks/useAutomations";
import { runDbOperation } from "./database";

export interface PatientAutomation {
  automation_id: string;
  id: string;
  is_active: boolean;
  last_run_date: string | null;
  next_run_iso: string | null;
  owner_name: string;
  patient_id: string;
  patient_name: string;
}

/**
 * Métriques temps réel pour une automation donnée.
 * Calculées depuis les tables métier — aucune valeur hardcodée.
 */
export interface AutomationMetrics {
  chartData: number[];
  count: number;
  prevCount: number;
  trendPercent: number;
  trendUp: boolean;
}

export interface AutomationDrilldownRow {
  contextDate: string;
  contextLabel: string;
  id: string;
  ownerName?: string;
  patientId: string;
  patientName: string;
  severity: "info" | "warn" | "critical";
  species?: string;
}

function diffPercent(
  count: number,
  prevCount: number
): { trendPercent: number; trendUp: boolean } {
  if (prevCount > 0) {
    const pct = Math.round(((count - prevCount) / prevCount) * 100);
    return { trendPercent: pct, trendUp: count >= prevCount };
  }
  return { trendPercent: count > 0 ? 100 : 0, trendUp: count > 0 };
}

export async function getGlobalAutomations(): Promise<AutomationItem[]> {
  return runDbOperation(async (db) => {
    const results = await db.select<any[]>(`
      SELECT
        id, title, description, icon_name as iconName, icon_color as iconColor,
        is_active as active, schedule, time, last_run_date as lastRunDate,
        last_run_status as lastRunStatus, next_run_date as nextRunDate,
        next_run_iso as nextRunISO, next_run_relative as nextRunRelative,
        metric_label as metricLabel, metric_icon_name as metricIconName,
        metric_value as metricValue, metric_trend as metricTrend,
        metric_trend_up as metricTrendUp, chart_type as chartType,
        chart_color as chartColor, chart_data as chartData
      FROM automations
    `);

    return results.map((row) => ({
      ...row,
      active: Boolean(row.active),
      metricTrendUp: Boolean(row.metricTrendUp),
      chartData: JSON.parse(row.chartData),
    })) as AutomationItem[];
  });
}

export async function updateGlobalAutomation(
  id: string,
  data: Partial<AutomationItem>
): Promise<void> {
  return runDbOperation(async (db) => {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.active !== undefined) {
      updates.push("is_active = ?");
      values.push(data.active ? 1 : 0);
    }
    if (data.nextRunISO !== undefined) {
      updates.push("next_run_iso = ?");
      values.push(data.nextRunISO);
    }
    if (data.nextRunDate !== undefined) {
      updates.push("next_run_date = ?");
      values.push(data.nextRunDate);
    }
    if (data.nextRunRelative !== undefined) {
      updates.push("next_run_relative = ?");
      values.push(data.nextRunRelative);
    }
    if (data.lastRunStatus !== undefined) {
      updates.push("last_run_status = ?");
      values.push(data.lastRunStatus);
    }
    if (data.lastRunDate !== undefined) {
      updates.push("last_run_date = ?");
      values.push(data.lastRunDate);
    }
    if (data.metricValue !== undefined) {
      updates.push("metric_value = ?");
      values.push(data.metricValue);
    }
    if (data.metricTrend !== undefined) {
      updates.push("metric_trend = ?");
      values.push(data.metricTrend);
    }
    if (data.metricTrendUp !== undefined) {
      updates.push("metric_trend_up = ?");
      values.push(data.metricTrendUp ? 1 : 0);
    }
    if (data.chartData !== undefined) {
      updates.push("chart_data = ?");
      values.push(JSON.stringify(data.chartData));
    }

    if (updates.length === 0) {
      return;
    }

    values.push(id);
    const query = `UPDATE automations SET ${updates.join(", ")} WHERE id = ?`;
    await db.execute(query, values);
  });
}

/**
 * Calcule les métriques temps réel d'une automation depuis les tables métier.
 * Chaque automation (auto-001 → 003) a sa propre requête métier.
 */
export async function getAutomationMetrics(
  automationId: string,
  referenceDate: Date = new Date()
): Promise<AutomationMetrics> {
  return runDbOperation(async (db) => {
    if (automationId === "auto-001") {
      return vaccinationMetrics(db, referenceDate);
    }
    if (automationId === "auto-002") {
      return soapMetrics(db, referenceDate);
    }
    if (automationId === "auto-003") {
      return postOpMetrics(db, referenceDate);
    }
    return {
      count: 0,
      prevCount: 0,
      trendPercent: 0,
      trendUp: false,
      chartData: [],
    };
  });
}

async function vaccinationMetrics(
  db: Database,
  ref: Date
): Promise<AutomationMetrics> {
  const nowIso = ref.toISOString();
  const in30Iso = new Date(ref.getTime() + 30 * 86_400_000).toISOString();
  const in60Iso = new Date(ref.getTime() + 60 * 86_400_000).toISOString();
  const start8w = new Date(ref.getTime() - 56 * 86_400_000).toISOString();

  const current = await db.select<any[]>(
    `SELECT COUNT(DISTINCT patient_id) as cnt
     FROM vaccinations
     WHERE next_due_at IS NOT NULL
       AND next_due_at >= ? AND next_due_at <= ?`,
    [nowIso, in30Iso]
  );
  const prev = await db.select<any[]>(
    `SELECT COUNT(DISTINCT patient_id) as cnt
     FROM vaccinations
     WHERE next_due_at IS NOT NULL
       AND next_due_at > ? AND next_due_at <= ?`,
    [in30Iso, in60Iso]
  );

  // Série glissante 8 semaines (1 point par semaine)
  const series = await db.select<any[]>(
    `SELECT strftime('%Y-%W', next_due_at) as bucket,
            COUNT(DISTINCT patient_id) as cnt
     FROM vaccinations
     WHERE next_due_at IS NOT NULL AND next_due_at >= ?
     GROUP BY bucket
     ORDER BY bucket ASC`,
    [start8w]
  );
  const chartData = bucketizeWeekly(series, 8, ref);

  const count = Number(current[0]?.cnt ?? 0);
  const prevCount = Number(prev[0]?.cnt ?? 0);
  return { count, prevCount, ...diffPercent(count, prevCount), chartData };
}

async function soapMetrics(
  db: Database,
  ref: Date
): Promise<AutomationMetrics> {
  const nowIso = ref.toISOString();
  const in7Iso = new Date(ref.getTime() - 7 * 86_400_000).toISOString();
  const in14Iso = new Date(ref.getTime() - 14 * 86_400_000).toISOString();
  const start8d = new Date(ref.getTime() - 8 * 86_400_000).toISOString();

  const current = await db.select<any[]>(
    `SELECT COUNT(*) as cnt FROM consultation_soaps
     WHERE created_at >= ? AND created_at < ?`,
    [in7Iso, nowIso]
  );
  const prev = await db.select<any[]>(
    `SELECT COUNT(*) as cnt FROM consultation_soaps
     WHERE created_at >= ? AND created_at < ?`,
    [in14Iso, in7Iso]
  );

  const series = await db.select<any[]>(
    `SELECT date(created_at) as day, COUNT(*) as cnt
     FROM consultation_soaps
     WHERE created_at >= ?
     GROUP BY day
     ORDER BY day ASC`,
    [start8d]
  );
  const chartData = bucketizeDaily(series, 8, ref);

  const count = Number(current[0]?.cnt ?? 0);
  const prevCount = Number(prev[0]?.cnt ?? 0);
  return { count, prevCount, ...diffPercent(count, prevCount), chartData };
}

async function postOpMetrics(
  db: Database,
  ref: Date
): Promise<AutomationMetrics> {
  const nowIso = ref.toISOString();
  const in14Iso = new Date(ref.getTime() - 14 * 86_400_000).toISOString();
  const in28Iso = new Date(ref.getTime() - 28 * 86_400_000).toISOString();
  const start56d = new Date(ref.getTime() - 56 * 86_400_000).toISOString();

  const current = await db.select<any[]>(
    `SELECT COUNT(*) as cnt FROM anesthesia_sheets
     WHERE status = 'completed' AND ended_at IS NOT NULL
       AND ended_at >= ? AND ended_at < ?`,
    [in14Iso, nowIso]
  );
  const prev = await db.select<any[]>(
    `SELECT COUNT(*) as cnt FROM anesthesia_sheets
     WHERE status = 'completed' AND ended_at IS NOT NULL
       AND ended_at >= ? AND ended_at < ?`,
    [in28Iso, in14Iso]
  );

  // 1 point / 2 jours sur 16 jours
  const series = await db.select<any[]>(
    `SELECT date(ended_at) as day, COUNT(*) as cnt
     FROM anesthesia_sheets
     WHERE status = 'completed' AND ended_at IS NOT NULL
       AND ended_at >= ?
     GROUP BY day
     ORDER BY day ASC`,
    [start56d]
  );
  const chartData = bucketizeDaily(series, 8, ref);

  const count = Number(current[0]?.cnt ?? 0);
  const prevCount = Number(prev[0]?.cnt ?? 0);
  return { count, prevCount, ...diffPercent(count, prevCount), chartData };
}

function bucketizeDaily(
  rows: Array<{ day: string; cnt: number }>,
  points: number,
  ref: Date
): number[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.day, Number(r.cnt));
  }
  const out: number[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(ref.getTime() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    out.push(map.get(key) ?? 0);
  }
  return out;
}

function bucketizeWeekly(
  rows: Array<{ bucket: string; cnt: number }>,
  points: number,
  ref: Date
): number[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.bucket, Number(r.cnt));
  }
  const out: number[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(ref.getTime() - i * 7 * 86_400_000);
    const year = d.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const week = Math.floor(
      (d.getTime() - startOfYear.getTime()) / (7 * 86_400_000)
    );
    const key = `${year}-${String(week).padStart(2, "0")}`;
    out.push(map.get(key) ?? 0);
  }
  return out;
}

/**
 * Drilldown par automation — retourne la liste concrète des patients
 * concernés par la métrique, avec contexte clinique.
 */
export async function getAutomationDrilldown(
  automationId: string,
  referenceDate: Date = new Date()
): Promise<AutomationDrilldownRow[]> {
  return runDbOperation(async (db) => {
    if (automationId === "auto-001") {
      return vaccinationDrilldown(db, referenceDate);
    }
    if (automationId === "auto-002") {
      return soapDrilldown(db, referenceDate);
    }
    if (automationId === "auto-003") {
      return postOpDrilldown(db, referenceDate);
    }
    return [];
  });
}

async function vaccinationDrilldown(
  db: Database,
  ref: Date
): Promise<AutomationDrilldownRow[]> {
  const nowIso = ref.toISOString();
  const in30Iso = new Date(ref.getTime() + 30 * 86_400_000).toISOString();
  const rows = await db.select<any[]>(
    `SELECT v.id, v.patient_id, v.vaccine_name, v.next_due_at,
            p.name as patient_name, p.species,
            (o.first_name || ' ' || o.last_name) as owner_name
     FROM vaccinations v
     JOIN patients p ON p.id = v.patient_id
     JOIN owners o ON o.id = p.owner_id
     WHERE v.next_due_at IS NOT NULL
       AND v.next_due_at >= ? AND v.next_due_at <= ?
     ORDER BY v.next_due_at ASC
     LIMIT 20`,
    [nowIso, in30Iso]
  );
  return rows.map((r) => {
    const due = new Date(r.next_due_at);
    const daysUntil = Math.floor((due.getTime() - ref.getTime()) / 86_400_000);
    return {
      id: r.id,
      patientId: r.patient_id,
      patientName: r.patient_name,
      species: r.species,
      ownerName: r.owner_name,
      contextLabel: `${r.vaccine_name} · ${daysUntil <= 0 ? "aujourd'hui" : `dans ${daysUntil}j`}`,
      contextDate: r.next_due_at,
      severity:
        daysUntil <= 3
          ? ("critical" as const)
          : daysUntil <= 14
            ? ("warn" as const)
            : ("info" as const),
    };
  });
}

async function soapDrilldown(
  db: Database,
  ref: Date
): Promise<AutomationDrilldownRow[]> {
  const in7Iso = new Date(ref.getTime() - 7 * 86_400_000).toISOString();
  const rows = await db.select<any[]>(
    `SELECT s.id, s.patient_id, s.created_at, s.updated_at,
            s.subjective, s.objective, s.assessment, s.plan,
            p.name as patient_name, p.species,
            (o.first_name || ' ' || o.last_name) as owner_name
     FROM consultation_soaps s
     JOIN patients p ON p.id = s.patient_id
     JOIN owners o ON o.id = p.owner_id
     WHERE s.created_at >= ?
     ORDER BY s.updated_at DESC
     LIMIT 15`,
    [in7Iso]
  );
  return rows.map((r) => {
    const sections = [r.subjective, r.objective, r.assessment, r.plan];
    const filled = sections.filter((s) => s && s.trim().length > 0).length;
    const isComplete = filled === 4;
    const lastUpdate = new Date(r.updated_at);
    const hoursIdle = Math.floor(
      (ref.getTime() - lastUpdate.getTime()) / 3_600_000
    );
    return {
      id: r.id,
      patientId: r.patient_id,
      patientName: r.patient_name,
      species: r.species,
      ownerName: r.owner_name,
      contextLabel: isComplete
        ? `SOAP complet · ${filled}/4 sections`
        : `SOAP partiel · ${filled}/4 sections${hoursIdle > 0 ? ` · inactif ${hoursIdle}h` : ""}`,
      contextDate: r.updated_at,
      severity: isComplete
        ? ("info" as const)
        : hoursIdle > 24
          ? ("critical" as const)
          : ("warn" as const),
    };
  });
}

async function postOpDrilldown(
  db: Database,
  ref: Date
): Promise<AutomationDrilldownRow[]> {
  const in14Iso = new Date(ref.getTime() - 14 * 86_400_000).toISOString();
  const rows = await db.select<any[]>(
    `SELECT a.id, a.patient_id, a.procedure_name, a.ended_at,
            p.name as patient_name, p.species,
            (o.first_name || ' ' || o.last_name) as owner_name
     FROM anesthesia_sheets a
     JOIN patients p ON p.id = a.patient_id
     JOIN owners o ON o.id = p.owner_id
     WHERE a.status = 'completed' AND a.ended_at IS NOT NULL
       AND a.ended_at >= ?
     ORDER BY a.ended_at DESC
     LIMIT 20`,
    [in14Iso]
  );
  return rows.map((r) => {
    const ended = new Date(r.ended_at);
    const daysPostOp = Math.floor(
      (ref.getTime() - ended.getTime()) / 86_400_000
    );
    return {
      id: r.id,
      patientId: r.patient_id,
      patientName: r.patient_name,
      species: r.species,
      ownerName: r.owner_name,
      contextLabel: `${r.procedure_name} · J+${daysPostOp}`,
      contextDate: r.ended_at,
      severity:
        daysPostOp <= 1
          ? ("critical" as const)
          : daysPostOp <= 3
            ? ("warn" as const)
            : ("info" as const),
    };
  });
}

export async function getPatientsForAutomation(
  automationId: string
): Promise<PatientAutomation[]> {
  return runDbOperation(async (db) => {
    const results = await db.select<any[]>(
      `
      SELECT
        pa.id, pa.patient_id, p.name as patient_name,
        (o.first_name || ' ' || o.last_name) as owner_name,
        pa.automation_id, pa.is_active as is_active,
        pa.last_run_date, pa.next_run_iso
      FROM patient_automations pa
      JOIN patients p ON p.id = pa.patient_id
      JOIN owners o ON o.id = p.owner_id
      WHERE pa.automation_id = ?
      ORDER BY owner_name ASC
    `,
      [automationId]
    );

    return results.map((row) => ({
      ...row,
      is_active: Boolean(row.is_active),
    })) as PatientAutomation[];
  });
}

export async function updatePatientAutomationStatus(
  id: string,
  isActive: boolean
): Promise<void> {
  return runDbOperation(async (db) => {
    await db.execute(
      `
      UPDATE patient_automations
      SET is_active = ?
      WHERE id = ?
    `,
      [isActive ? 1 : 0, id]
    );
  });
}
