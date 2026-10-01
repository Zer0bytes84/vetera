import { describe, expect, it } from 'vitest';
import { buildDashboardInsights } from '../../src/modules/dashboard/v2/insights-model';
import type { Appointment, Transaction } from '../../src/types/db';
const reference = new Date(2026, 8, 30, 12);
const appointment = (startTime: string, status = 'completed') => ({ startTime, status } as Appointment);
const transaction = (date: string, amount: number, type = 'income', status = 'paid') => ({ date, amount, type, status } as Transaction);
describe('Dashboard insights', () => {
  it('counts valid visits in local weekday/hour bins, including outside opening hours', () => {
    const data = buildDashboardInsights([
      appointment('2026-09-28T09:00:00'), appointment('2026-09-28T07:00:00'), appointment('2026-09-28T20:00:00'),
      appointment('2026-09-28T09:00:00', 'cancelled'), appointment('2026-09-28T09:00:00', 'no_show'),
      appointment('2026-10-01T09:00:00'), appointment('2025-09-28T09:00:00'), appointment('invalid'),
    ], [], reference, 84);
    expect(data.weekdays[0].count).toBe(3);
    expect(data.hours[0].counts[0]).toBe(1);
    expect(data.hours[2].counts[0]).toBe(1);
    expect(data.hours[11].counts[0]).toBe(1);
  });
  it('converts centimes once and excludes pending/future/out-of-range transactions', () => {
    const data = buildDashboardInsights([], [
      transaction('2026-09-30T09:00:00', 120050), transaction('2026-09-10T09:00:00', 45000, 'expense'),
      transaction('2026-09-10T09:00:00', 99900, 'income', 'pending'), transaction('2026-10-01T09:00:00', 99900),
      transaction('2025-09-30T09:00:00', 99900),
    ], reference, 84);
    expect(data.months).toHaveLength(12);
    expect(data.months[11].income).toBe(1200.5);
    expect(data.months[11].expense).toBe(450);
    expect(data.months[0].key).toBe('2025-9');
  });
});
