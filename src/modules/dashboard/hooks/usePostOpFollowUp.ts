import { useEffect, useState } from "react";
import type Database from "@tauri-apps/plugin-sql";
import { runDbOperation } from "@/services/sqlite/database";
import { evaluateVitals, type ClinicalAlert, type Species } from "@/lib/clinical-alerts";

export interface PostOpPatient {
  patientId: string;
  patientName: string;
  species: Species | null;
  ownerName: string | null;
  procedure: string | null;
  endedAt: Date;
  daysPostOp: number;
  hasVitals: boolean;
  vitals: {
    temperatureC: number | null;
    heartRateBpm: number | null;
    respiratoryRate: number | null;
    spo2Percent: number | null;
    painScore: number | null;
    recordedAt: Date | null;
  };
  alerts: ClinicalAlert[];
  hasCritical: boolean;
  hasWarn: boolean;
  hasTasks: boolean;
  tasksOpen: number;
  tasksTotal: number;
}

export type PostOpFilter = "all" | "critical" | "warn" | "ok" | "tasks";

const REFRESH_INTERVAL_MS = 60_000;

export function usePostOpFollowUp() {
  const [patients, setPatients] = useState<PostOpPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadPatients = async () => {
    try {
      setIsLoading(true);
      const data = await runDbOperation(async (db) => {
        const rows = await db.select<PostOpPatientRaw[]>(
          `SELECT
            p.id AS patientId,
            p.name AS patientName,
            p.species AS species,
            o.full_name AS ownerName,
            a.procedure AS procedure,
            a.ended_at AS endedAt,
            a.id AS anesthesiaId,
            (SELECT temperature_c FROM hospitalization_vitals
             WHERE patient_id = p.id
             ORDER BY recorded_at DESC LIMIT 1) AS temperatureC,
            (SELECT heart_rate_bpm FROM hospitalization_vitals
             WHERE patient_id = p.id
             ORDER BY recorded_at DESC LIMIT 1) AS heartRateBpm,
            (SELECT respiratory_rate FROM hospitalization_vitals
             WHERE patient_id = p.id
             ORDER BY recorded_at DESC LIMIT 1) AS respiratoryRate,
            (SELECT spo2_percent FROM hospitalization_vitals
             WHERE patient_id = p.id
             ORDER BY recorded_at DESC LIMIT 1) AS spo2Percent,
            (SELECT pain_score FROM hospitalization_vitals
             WHERE patient_id = p.id
             ORDER BY recorded_at DESC LIMIT 1) AS painScore,
            (SELECT recorded_at FROM hospitalization_vitals
             WHERE patient_id = p.id
             ORDER BY recorded_at DESC LIMIT 1) AS vitalsRecordedAt
          FROM anesthesia_sheets a
          JOIN patients p ON p.id = a.patient_id
          LEFT JOIN owners o ON o.id = p.owner_id
          WHERE a.status = 'completed'
            AND a.ended_at IS NOT NULL
            AND a.ended_at >= datetime('now', '-30 days')
          ORDER BY a.ended_at DESC
          LIMIT 50`
        );
        return rows;
      });
      const computed: PostOpPatient[] = data.map((row) =>
        computePatient(row)
      );
      setPatients(computed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
    const id = setInterval(loadPatients, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return {
    patients,
    isLoading,
    error,
    refresh: loadPatients,
  };
}

interface PostOpPatientRaw {
  patientId: string;
  patientName: string;
  species: string | null;
  ownerName: string | null;
  procedure: string | null;
  endedAt: string;
  anesthesiaId: string;
  temperatureC: number | null;
  heartRateBpm: number | null;
  respiratoryRate: number | null;
  spo2Percent: number | null;
  painScore: number | null;
  vitalsRecordedAt: string | null;
}

function computePatient(row: PostOpPatientRaw): PostOpPatient {
  const endedAt = new Date(row.endedAt);
  const now = new Date();
  const daysPostOp = Math.max(
    0,
    Math.floor((now.getTime() - endedAt.getTime()) / 86_400_000)
  );
  const species = (row.species ?? null) as Species | null;
  const recordedAt = row.vitalsRecordedAt ? new Date(row.vitalsRecordedAt) : null;
  const alerts = evaluateVitals({
    species,
    recordedAt: recordedAt ?? new Date(0),
    temperatureC: row.temperatureC,
    heartRateBpm: row.heartRateBpm,
    respiratoryRate: row.respiratoryRate,
    spo2Percent: row.spo2Percent,
    painScore: row.painScore,
    weightKg: null,
  });
  return {
    patientId: row.patientId,
    patientName: row.patientName,
    species,
    ownerName: row.ownerName,
    procedure: row.procedure,
    endedAt,
    daysPostOp,
    hasVitals: recordedAt !== null,
    vitals: {
      temperatureC: row.temperatureC,
      heartRateBpm: row.heartRateBpm,
      respiratoryRate: row.respiratoryRate,
      spo2Percent: row.spo2Percent,
      painScore: row.painScore,
      recordedAt,
    },
    alerts,
    hasCritical: alerts.some((a) => a.severity === "critical"),
    hasWarn: alerts.some((a) => a.severity === "warn"),
    hasTasks: false,
    tasksOpen: 0,
    tasksTotal: 0,
  };
}
