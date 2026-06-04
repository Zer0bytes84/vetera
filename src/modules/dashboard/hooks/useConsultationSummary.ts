import { useEffect, useState, useCallback } from "react";
import type Database from "@tauri-apps/plugin-sql";
import { runDbOperation } from "@/services/sqlite/database";

export interface ConsultationSummary {
  /** SOAPs créés sur les 7 derniers jours */
  total7d: number;
  /** SOAPs créés sur les 7 jours d'avant (pour trend) */
  totalPrev7d: number;
  /** SOAPs où les 4 sections S/O/A/P sont remplies */
  completed7d: number;
  /** SOAPs créés >24h sans update (à compléter) */
  backlog: number;
  /** Délai moyen en heures entre createdAt et dernière update (pour complétés) */
  avgCompletionHours: number;
  /** SOAPs générés par IA (ai_draft non null) sur 7j */
  aiGenerated: number;
  /** Confiance IA moyenne (ai_confidence) sur 7j */
  avgAiConfidence: number;
  /** Série journalière des SOAPs créés sur 7 jours */
  dailySeries: number[];
  /** Top 5 diagnostics (assessment non-vide) sur 7j */
  topDiagnostics: Array<{ label: string; count: number }>;
  /** Répartition par type d'appointment associé */
  typeBreakdown: Array<{ type: string; count: number }>;
  /** Dernière mise à jour des données (pour le cache busting) */
  fetchedAt: string;
}

export interface ConsultationSoap {
  id: string;
  patientId: string;
  patientName: string;
  species?: string;
  ownerName?: string;
  filledSections: number;
  isComplete: boolean;
  lastUpdateIso: string;
  hoursIdle: number;
}

const REFRESH_INTERVAL_MS = 60_000;
const BACKLOG_THRESHOLD_HOURS = 24;

function diffPercent(current: number, previous: number): { trendPercent: number; trendUp: boolean } {
  if (previous > 0) {
    const pct = Math.round(((current - previous) / previous) * 100);
    return { trendPercent: pct, trendUp: current >= previous };
  }
  return { trendPercent: current > 0 ? 100 : 0, trendUp: current > 0 };
}

export function useConsultationSummary(referenceDate: Date = new Date()) {
  const [summary, setSummary] = useState<ConsultationSummary | null>(null);
  const [backlogRows, setBacklogRows] = useState<ConsultationSoap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await runDbOperation(async (db) => computeSummary(db, referenceDate));
      setSummary(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch consultation summary", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [referenceDate]);

  const fetchBacklog = useCallback(async () => {
    try {
      const rows = await runDbOperation(async (db) => computeBacklog(db, referenceDate));
      setBacklogRows(rows);
    } catch (err) {
      console.error("Failed to fetch SOAP backlog", err);
    }
  }, [referenceDate]);

  useEffect(() => {
    void fetchSummary();
    void fetchBacklog();
    const id = setInterval(() => {
      void fetchSummary();
      void fetchBacklog();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchSummary, fetchBacklog]);

  const trendPercent = summary
    ? diffPercent(summary.total7d, summary.totalPrev7d).trendPercent
    : 0;
  const trendUp = summary
    ? diffPercent(summary.total7d, summary.totalPrev7d).trendUp
    : false;
  const completionRate = summary && summary.total7d > 0
    ? Math.round((summary.completed7d / summary.total7d) * 100)
    : 0;

  return {
    summary,
    backlogRows,
    trendPercent,
    trendUp,
    completionRate,
    isLoading,
    error,
    refresh: () => {
      void fetchSummary();
      void fetchBacklog();
    },
  };
}

async function computeSummary(
  db: Database,
  ref: Date
): Promise<ConsultationSummary> {
  const nowIso = ref.toISOString();
  const in7Iso = new Date(ref.getTime() - 7 * 86400_000).toISOString();
  const in14Iso = new Date(ref.getTime() - 14 * 86400_000).toISOString();
  const in8dIso = new Date(ref.getTime() - 8 * 86400_000).toISOString();
  const backlogIso = new Date(ref.getTime() - BACKLOG_THRESHOLD_HOURS * 3600_000).toISOString();

  const counts = await db.select<any[]>(
    `SELECT
       SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as current_count,
       SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) as prev_count,
       SUM(CASE WHEN created_at >= ?
                AND subjective != '' AND objective != ''
                AND assessment != '' AND plan != '' THEN 1 ELSE 0 END) as completed_count,
       SUM(CASE WHEN created_at >= ? AND ai_draft IS NOT NULL THEN 1 ELSE 0 END) as ai_count,
       AVG(CASE WHEN created_at >= ? AND ai_confidence IS NOT NULL THEN ai_confidence END) as avg_ai_conf
     FROM consultation_soaps`,
    [in7Iso, in14Iso, in7Iso, in7Iso, in7Iso, in7Iso]
  );
  const row = counts[0] ?? {};
  const total7d = Number(row.current_count ?? 0);
  const totalPrev7d = Number(row.prev_count ?? 0);
  const completed7d = Number(row.completed_count ?? 0);
  const aiGenerated = Number(row.ai_count ?? 0);
  const avgAiConfidence = Number(row.avg_ai_conf ?? 0);

  const backlogCount = await db.select<any[]>(
    `SELECT COUNT(*) as cnt FROM consultation_soaps
     WHERE updated_at < ?
       AND (subjective = '' OR objective = '' OR assessment = '' OR plan = '')`,
    [backlogIso]
  );
  const backlog = Number(backlogCount[0]?.cnt ?? 0);

  const avgRow = await db.select<any[]>(
    `SELECT AVG(
       (julianday(updated_at) - julianday(created_at)) * 24.0
     ) as avg_hours
     FROM consultation_soaps
     WHERE created_at >= ?
       AND subjective != '' AND objective != ''
       AND assessment != '' AND plan != ''`,
    [in7Iso]
  );
  const avgCompletionHours = Math.max(0, Number(avgRow[0]?.avg_hours ?? 0));

  const dailySeries = await db.select<any[]>(
    `SELECT date(created_at) as day, COUNT(*) as cnt
     FROM consultation_soaps
     WHERE created_at >= ?
     GROUP BY day
     ORDER BY day ASC`,
    [in8dIso]
  );

  const topDiag = await db.select<any[]>(
    `SELECT assessment, COUNT(*) as cnt
     FROM consultation_soaps
     WHERE created_at >= ? AND length(trim(assessment)) > 0
     GROUP BY lower(trim(assessment))
     ORDER BY cnt DESC
     LIMIT 5`,
    [in7Iso]
  );

  const types = await db.select<any[]>(
    `SELECT a.type as type, COUNT(*) as cnt
     FROM consultation_soaps s
     JOIN appointments a ON a.id = s.appointment_id
     WHERE s.created_at >= ?
     GROUP BY a.type
     ORDER BY cnt DESC`,
    [in7Iso]
  );

  return {
    total7d,
    totalPrev7d,
    completed7d,
    backlog,
    avgCompletionHours,
    aiGenerated,
    avgAiConfidence,
    dailySeries: bucketizeDaily(dailySeries, 7, ref),
    topDiagnostics: topDiag.map((d) => ({
      label: truncateAssessment(d.assessment),
      count: Number(d.cnt),
    })),
    typeBreakdown: types.map((t) => ({
      type: t.type || "Autre",
      count: Number(t.cnt),
    })),
    fetchedAt: new Date().toISOString(),
  };
}

async function computeBacklog(db: Database, ref: Date): Promise<ConsultationSoap[]> {
  const backlogIso = new Date(ref.getTime() - BACKLOG_THRESHOLD_HOURS * 3600_000).toISOString();
  const rows = await db.select<any[]>(
    `SELECT s.id, s.patient_id, s.subjective, s.objective, s.assessment, s.plan,
            s.updated_at,
            p.name as patient_name, p.species,
            (o.first_name || ' ' || o.last_name) as owner_name
     FROM consultation_soaps s
     JOIN patients p ON p.id = s.patient_id
     JOIN owners o ON o.id = p.owner_id
     WHERE s.updated_at < ?
       AND (s.subjective = '' OR s.objective = '' OR s.assessment = '' OR s.plan = '')
     ORDER BY s.updated_at ASC
     LIMIT 8`,
    [backlogIso]
  );
  return rows.map((r) => {
    const filled = [r.subjective, r.objective, r.assessment, r.plan].filter(
      (s) => s && s.trim().length > 0
    ).length;
    const lastUpdate = new Date(r.updated_at);
    const hoursIdle = Math.floor((ref.getTime() - lastUpdate.getTime()) / 3600_000);
    return {
      id: r.id,
      patientId: r.patient_id,
      patientName: r.patient_name,
      species: r.species,
      ownerName: r.owner_name,
      filledSections: filled,
      isComplete: filled === 4,
      lastUpdateIso: r.updated_at,
      hoursIdle,
    };
  });
}

function bucketizeDaily(
  rows: Array<{ day: string; cnt: number }>,
  points: number,
  ref: Date
): number[] {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.day, Number(r.cnt));
  const out: number[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(ref.getTime() - i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    out.push(map.get(key) ?? 0);
  }
  return out;
}

function truncateAssessment(value: string | null | undefined): string {
  if (!value) return "—";
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 40) return cleaned;
  return `${cleaned.slice(0, 37)}…`;
}
