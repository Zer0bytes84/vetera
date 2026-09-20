import { describe, expect, it } from 'vitest';
import { financialPeriodRange } from './financial-period-filter';
describe('financial calendar periods', () => {
  it('starts weeks on Monday and includes Sunday across years', () => {
    expect(financialPeriodRange('week', new Date(2023, 0, 1))).toEqual({ from: '2022-12-26', to: '2023-01-01' });
  });
  it('includes leap day and exact year boundaries', () => {
    expect(financialPeriodRange('month', new Date(2024, 1, 14))).toEqual({ from: '2024-02-01', to: '2024-02-29' });
    expect(financialPeriodRange('year', new Date(2024, 1, 14))).toEqual({ from: '2024-01-01', to: '2024-12-31' });
  });
  it('uses the local calendar day', () => {
    expect(financialPeriodRange('day', new Date(2026, 8, 17, 23, 59))).toEqual({ from: '2026-09-17', to: '2026-09-17' });
  });
});
