import type { Appointment, Transaction } from '@/types/db';
import { addDays, parseDashboardDate, startOfDay } from './model';

export function buildDashboardInsights(appointments: Appointment[], transactions: Transaction[], referenceDate: Date, length: number) {
  const end = addDays(startOfDay(referenceDate), 1);
  const start = addDays(startOfDay(referenceDate), 1 - length);
  const types: Record<string, number> = {};
  const weekdays = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'].map(label => ({ label, count: 0 }));
  const hours = Array.from({ length: 12 }, (_, i) => ({ label: i === 0 ? 'Avant 8h' : i === 11 ? '18h et +' : `${i + 7}h`, counts: Array<number>(7).fill(0) }));
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 11 + i, 1);
    return { key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleDateString('fr-FR', { month: 'short' }), fullLabel: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), income: 0, expense: 0 };
  });
  const monthsByKey = new Map(months.map(month => [month.key, month]));
  for (const appointment of appointments) {
    const date = parseDashboardDate(appointment.startTime);
    if (!date || date < start || date >= end || ['cancelled', 'no_show'].includes(appointment.status)) continue;
    const weekday = (date.getDay() + 6) % 7;
    weekdays[weekday].count++;
    types[appointment.type || 'Non renseigné'] = (types[appointment.type || 'Non renseigné'] || 0) + 1;
    hours[Math.max(0, Math.min(11, date.getHours() - 7))].counts[weekday]++;
  }
  for (const transaction of transactions) {
    const date = parseDashboardDate(transaction.date);
    if (!date || date >= end || transaction.status !== 'paid') continue;
    const month = monthsByKey.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (month) month[transaction.type === 'income' ? 'income' : 'expense'] += transaction.amount / 100;
  }
  return { weekdays, hours, months, types: Object.entries(types).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count) };
}
