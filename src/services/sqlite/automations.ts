import { runDbOperation } from "./database";
import type { AutomationItem } from "@/modules/dashboard/hooks/useAutomations";

export interface PatientAutomation {
  id: string;
  patient_id: string;
  patient_name: string;
  owner_name: string;
  automation_id: string;
  is_active: boolean;
  last_run_date: string | null;
  next_run_iso: string | null;
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

    return results.map(row => ({
      ...row,
      active: Boolean(row.active),
      metricTrendUp: Boolean(row.metricTrendUp),
      chartData: JSON.parse(row.chartData)
    })) as AutomationItem[];
  });
}

export async function updateGlobalAutomation(id: string, data: Partial<AutomationItem>): Promise<void> {
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
    if (data.chartData !== undefined) {
      updates.push("chart_data = ?");
      values.push(JSON.stringify(data.chartData));
    }

    if (updates.length === 0) return;

    values.push(id);
    const query = `UPDATE automations SET ${updates.join(", ")} WHERE id = ?`;
    await db.execute(query, values);
  });
}

export async function getPatientsForAutomation(automationId: string): Promise<PatientAutomation[]> {
  return runDbOperation(async (db) => {
    const results = await db.select<any[]>(`
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
    `, [automationId]);

    return results.map(row => ({
      ...row,
      is_active: Boolean(row.is_active)
    })) as PatientAutomation[];
  });
}

export async function updatePatientAutomationStatus(id: string, isActive: boolean): Promise<void> {
  return runDbOperation(async (db) => {
    await db.execute(`
      UPDATE patient_automations 
      SET is_active = ? 
      WHERE id = ?
    `, [isActive ? 1 : 0, id]);
  });
}
