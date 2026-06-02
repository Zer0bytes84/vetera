export type AgeParts = {
  years: number;
  months: number;
  days: number;
};

/**
 * Calcule l'âge détaillé d'un patient à partir de sa date de naissance (ISO).
 */
export function computeAge(dateOfBirth?: string | null): AgeParts | null {
  if (!dateOfBirth) {
    return null;
  }
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return null;
  }
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  let days = now.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
    const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += lastMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) {
    return { years: 0, months: 0, days: 0 };
  }
  return { years, months, days };
}

/**
 * Formate l'âge pour affichage : "3 ans 2 mois", "8 mois", "12 jours"
 */
export function formatAge(
  age: AgeParts | null,
  formatMessage: (key: string, options?: Record<string, unknown>) => string
): string {
  if (!age) {
    return formatMessage("patientDetail.header.ageUnknown");
  }
  if (age.years >= 1) {
    const yearsLabel = formatMessage("patientDetail.header.ageYears", {
      count: age.years,
    });
    if (age.months > 0) {
      return `${yearsLabel} ${formatMessage("patientDetail.header.ageMonths", {
        count: age.months,
      })}`;
    }
    return yearsLabel;
  }
  if (age.months >= 1) {
    return formatMessage("patientDetail.header.ageMonths", {
      count: age.months,
    });
  }
  return formatMessage("patientDetail.header.ageDays", { count: age.days });
}
