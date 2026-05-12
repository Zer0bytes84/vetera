import i18n from "@/i18n/config";
import type { Appointment, Owner, Task, Transaction } from "@/types/db";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function safeDate(value?: string) {
  if (!value) {
    return null;
  }
  const sqliteLike = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
  const normalized = sqliteLike ? `${value.replace(" ", "T")}Z` : value;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime()) && sqliteLike) {
    const localDate = new Date(value.replace(" ", "T"));
    return Number.isFinite(localDate.getTime()) ? localDate : null;
  }
  return Number.isFinite(date.getTime()) ? date : null;
}

export function percentageDelta(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export function getCurrentLocale(language = i18n.language) {
  if (language.startsWith("ar")) {
    return "ar";
  }
  if (language.startsWith("en")) {
    return "en-US";
  }
  if (language.startsWith("es")) {
    return "es-ES";
  }
  if (language.startsWith("pt")) {
    return "pt-PT";
  }
  if (language.startsWith("de")) {
    return "de-DE";
  }
  return "fr-FR";
}

export function formatCompactInteger(value: number, locale?: string) {
  return new Intl.NumberFormat(getCurrentLocale(locale)).format(
    Math.round(value)
  );
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function findLastIndexBy<T>(items: T[], predicate: (item: T) => boolean) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) {
      return index;
    }
  }
  return -1;
}

function getReferenceDate(
  appointments: Appointment[],
  transactions: Transaction[]
) {
  const latestDataDate = [
    ...appointments.map((item) => item.startTime),
    ...transactions.map((item) => item.date),
  ]
    .map((value) => safeDate(value))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return latestDataDate ?? new Date();
}

export type DashboardMetrics = ReturnType<typeof buildDashboardMetrics>;

export function buildDashboardMetrics({
  appointments,
  owners,
  patients,
  tasks,
  transactions,
  locale = getCurrentLocale(),
}: {
  appointments: Appointment[];
  owners: Owner[];
  patients: Array<{ lastVisit?: string; createdAt: string; status: string }>;
  tasks: Task[];
  transactions: Transaction[];
  locale?: string;
}) {
  const referenceDate = getReferenceDate(appointments, transactions);
  const todayStart = startOfDay(referenceDate);
  const todayEnd = endOfDay(referenceDate);
  const yesterdayStart = startOfDay(addDays(referenceDate, -1));
  const yesterdayEnd = endOfDay(addDays(referenceDate, -1));
  const last30Start = startOfDay(addDays(referenceDate, -29));
  const previous30Start = startOfDay(addDays(referenceDate, -59));
  const previous30End = endOfDay(addDays(referenceDate, -30));
  const last90Start = startOfDay(addDays(referenceDate, -89));
  const previous90Start = startOfDay(addDays(referenceDate, -179));
  const previous90End = endOfDay(addDays(referenceDate, -90));

  const paidTransactions = transactions.filter(
    (item) => item.status === "paid"
  );
  const paidIncome = paidTransactions.filter((item) => item.type === "income");
  const paidExpense = paidTransactions.filter(
    (item) => item.type === "expense"
  );

  const income30 =
    paidIncome
      .filter((item) => {
        const date = safeDate(item.date);
        return date && date >= last30Start && date <= todayEnd;
      })
      .reduce((sum, item) => sum + item.amount, 0) / 100;

  const previousIncome30 =
    paidIncome
      .filter((item) => {
        const date = safeDate(item.date);
        return date && date >= previous30Start && date <= previous30End;
      })
      .reduce((sum, item) => sum + item.amount, 0) / 100;

  const incomeToday =
    paidIncome
      .filter((item) => {
        const date = safeDate(item.date);
        return date && date >= todayStart && date <= todayEnd;
      })
      .reduce((sum, item) => sum + item.amount, 0) / 100;

  const incomeYesterday =
    paidIncome
      .filter((item) => {
        const date = safeDate(item.date);
        return date && date >= yesterdayStart && date <= yesterdayEnd;
      })
      .reduce((sum, item) => sum + item.amount, 0) / 100;

  const averageBasket = paidIncome.length
    ? paidIncome.reduce((sum, item) => sum + item.amount, 0) /
      paidIncome.length /
      100
    : 0;

  const currentQualified = appointments.filter((item) => {
    const date = safeDate(item.startTime);
    return (
      date &&
      date >= last30Start &&
      date <= todayEnd &&
      item.status === "completed"
    );
  }).length;

  const previousQualified = appointments.filter((item) => {
    const date = safeDate(item.startTime);
    return (
      date &&
      date >= previous30Start &&
      date <= previous30End &&
      item.status === "completed"
    );
  }).length;

  const todayAppointments = appointments.filter((item) => {
    const date = safeDate(item.startTime);
    const isToday = date && date >= todayStart && date <= todayEnd;
    const isValidStatus = !["cancelled", "no_show"].includes(item.status);
    return isToday && isValidStatus;
  });

  const yesterdayAppointments = appointments.filter((item) => {
    const date = safeDate(item.startTime);
    return (
      date &&
      date >= yesterdayStart &&
      date <= yesterdayEnd &&
      !["cancelled", "no_show"].includes(item.status)
    );
  });

  const openTasks = tasks.filter((task) => task.status !== "done");
  const completedTasks = tasks.filter((task) => task.status === "done");
  const taskCompletionRate = tasks.length
    ? (completedTasks.length / tasks.length) * 100
    : 0;
  const dueTasks = openTasks.filter((task) => {
    const dueDate = safeDate(task.dueDate);
    return dueDate && dueDate <= endOfDay(addDays(referenceDate, 7));
  }).length;

  const currentActivePatients = patients.filter((patient) => {
    const lastVisit = safeDate(patient.lastVisit);
    return lastVisit && lastVisit >= last90Start && patient.status !== "decede";
  }).length;

  const previousActivePatients = patients.filter((patient) => {
    const lastVisit = safeDate(patient.lastVisit);
    return (
      lastVisit &&
      lastVisit >= previous90Start &&
      lastVisit <= previous90End &&
      patient.status !== "decede"
    );
  }).length;

  const ownerCityMap = new Map(
    owners.map((owner) => [
      owner.id,
      owner.city || i18n.t("dashboardV2.fallbacks.unknownCity"),
    ])
  );
  const cityCounts = appointments.reduce<Map<string, number>>(
    (acc, appointment) => {
      if (["cancelled", "no_show"].includes(appointment.status)) {
        return acc;
      }
      const city =
        ownerCityMap.get(appointment.ownerId) ||
        i18n.t("dashboardV2.fallbacks.unknownCity");
      acc.set(city, (acc.get(city) || 0) + 1);
      return acc;
    },
    new Map()
  );

  const topCities = Array.from(cityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([city, count]) => ({ city, count }));

  const currentYear = referenceDate.getFullYear();
  const monthNames = [
    "JANV",
    "FÉVR",
    "MARS",
    "AVR",
    "MAI",
    "JUIN",
    "JUIL",
    "AOÛT",
    "SEPT",
    "OCT",
    "NOV",
    "DÉC",
  ];

  const monthlyRevenue = Array.from({ length: 12 }, (_, index) => {
    const monthStart = startOfDay(new Date(currentYear, index, 1));
    const monthEnd = endOfDay(new Date(currentYear, index + 1, 0));
    const total = paidIncome
      .filter((item) => {
        const date = safeDate(item.date);
        return date && date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      month: monthNames[index],
      value: total / 100,
      active: index === referenceDate.getMonth() ? total / 100 : 0,
      hasData: total > 0,
    };
  });

  const revenueTrend = Array.from({ length: 10 }, (_, index) => {
    const day = addDays(referenceDate, -9 + index);
    const start = startOfDay(day);
    const end = endOfDay(day);
    const value = paidIncome
      .filter((item) => {
        const date = safeDate(item.date);
        return date && date >= start && date <= end;
      })
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      name: day.toLocaleDateString(locale, { day: "numeric", month: "short" }),
      value: value / 100,
    };
  });

  const categoryTotals = paidIncome.reduce<Map<string, number>>((acc, item) => {
    const category = item.category || i18n.t("dashboardV2.fallbacks.other");
    acc.set(category, (acc.get(category) || 0) + item.amount);
    return acc;
  }, new Map());

  const topCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, value], index) => ({
      label,
      value: Math.round(value / 100),
      color: ["#21aceb", "#ff7a1a", "#f6c21d", "#23c7b7"][index] ?? "#a1a1aa",
    }));

  const appointmentTypeTotals = appointments.reduce<Map<string, number>>(
    (acc, item) => {
      if (["cancelled", "no_show"].includes(item.status)) {
        return acc;
      }
      acc.set(item.type, (acc.get(item.type) || 0) + 1);
      return acc;
    },
    new Map()
  );

  const topAppointmentTypes = Array.from(appointmentTypeTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, demand]) => ({ name, demand }));

  if (!topAppointmentTypes.length) {
    topAppointmentTypes.push({
      name: i18n.t("dashboardV2.fallbacks.noProcedure"),
      demand: 0,
    });
  }

  const cashflowSeries = Array.from({ length: 14 }, (_, index) => {
    const day = addDays(referenceDate, -13 + index);
    const start = startOfDay(day);
    const end = endOfDay(day);
    const income = paidIncome
      .filter((item) => {
        const date = safeDate(item.date);
        return date && date >= start && date <= end;
      })
      .reduce((sum, item) => sum + item.amount, 0);
    const expense = paidExpense
      .filter((item) => {
        const date = safeDate(item.date);
        return date && date >= start && date <= end;
      })
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      name: day.toLocaleDateString(locale, { day: "numeric", month: "short" }),
      value: (income - expense) / 100,
    };
  });

  const activityDays = Array.from({ length: 84 }, (_, index) => {
    const day = addDays(referenceDate, -83 + index);
    const total = appointments.filter((item) => {
      const date = safeDate(item.startTime);
      return (
        date &&
        isSameDay(date, day) &&
        !["cancelled", "no_show"].includes(item.status)
      );
    }).length;

    return {
      date: day,
      value: total,
    };
  });

  const taskCadenceSeries = Array.from({ length: 24 }, (_, index) => {
    const day = addDays(referenceDate, -23 + index);
    const start = startOfDay(day);
    const end = endOfDay(day);

    const tasksForDay = tasks.filter((task) => {
      const anchorDate = safeDate(task.dueDate || task.createdAt);
      return anchorDate && anchorDate >= start && anchorDate <= end;
    });

    const completed = tasksForDay.filter(
      (task) => task.status === "done"
    ).length;

    return {
      label: day.toLocaleDateString(locale, { day: "numeric" }),
      total: tasksForDay.length,
      completed,
      pending: Math.max(tasksForDay.length - completed, 0),
      isCurrent: index === 23,
    };
  });

  const taskCadenceRate = taskCadenceSeries.length
    ? (taskCadenceSeries.reduce((sum, item) => {
        if (item.total === 0) {
          return sum;
        }
        return sum + item.completed / item.total;
      }, 0) /
        taskCadenceSeries.length) *
      100
    : taskCompletionRate;

  const currentReturningPatients = Array.from(
    appointments
      .reduce<Map<string, number>>((acc, item) => {
        const date = safeDate(item.startTime);
        if (
          !date ||
          date < last90Start ||
          date > todayEnd ||
          ["cancelled", "no_show"].includes(item.status)
        ) {
          return acc;
        }
        acc.set(item.patientId, (acc.get(item.patientId) || 0) + 1);
        return acc;
      }, new Map())
      .values()
  ).filter((count) => count > 1).length;

  const previousReturningPatients = Array.from(
    appointments
      .reduce<Map<string, number>>((acc, item) => {
        const date = safeDate(item.startTime);
        if (
          !date ||
          date < previous90Start ||
          date > previous90End ||
          ["cancelled", "no_show"].includes(item.status)
        ) {
          return acc;
        }
        acc.set(item.patientId, (acc.get(item.patientId) || 0) + 1);
        return acc;
      }, new Map())
      .values()
  ).filter((count) => count > 1).length;

  const inProgressAppointments = appointments.filter((item) => {
    if (item.status !== "in_progress") {
      return false;
    }
    const date = safeDate(item.startTime);
    if (!date) {
      return false;
    }
    const sevenDaysAgo = new Date(referenceDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return date >= sevenDaysAgo;
  });

  const pipelineRows = [
    {
      label: i18n.t("dashboardV2.pipeline.new"),
      value: appointments.filter((item) => item.status === "scheduled").length,
      color: "#21aceb",
    },
    {
      label: i18n.t("dashboardV2.pipeline.inProgress"),
      value: inProgressAppointments.length,
      color: "#ff7a1a",
    },
    {
      label: i18n.t("dashboardV2.pipeline.completed"),
      value: appointments.filter((item) => item.status === "completed").length,
      color: "#f6c21d",
    },
    {
      label: i18n.t("dashboardV2.pipeline.followUp"),
      value: appointments.filter((item) => item.status === "no_show").length,
      color: "#23c7b7",
    },
  ];
  const pipelineMax = Math.max(...pipelineRows.map((row) => row.value), 1);

  const monthlyAppointments = Array.from({ length: 12 }, (_, index) => {
    const monthStart = startOfDay(new Date(currentYear, index, 1));
    const monthEnd = endOfDay(new Date(currentYear, index + 1, 0));
    const count = appointments.filter((item) => {
      const date = safeDate(item.startTime);
      return (
        date &&
        date >= monthStart &&
        date <= monthEnd &&
        !["cancelled", "no_show"].includes(item.status)
      );
    }).length;

    return {
      month: monthNames[index],
      value: count,
      hasData: count > 0,
    };
  });

  return {
    referenceDate,
    summary: {
      income30,
      previousIncome30,
      incomeToday,
      incomeYesterday,
      averageBasket,
      currentQualified,
      previousQualified,
      todayAppointments: todayAppointments.length,
      yesterdayAppointments: yesterdayAppointments.length,
      taskCompletionRate,
      taskCadenceRate,
      dueTasks,
      currentActivePatients,
      previousActivePatients,
      currentReturningPatients,
      previousReturningPatients,
      topCity: topCities[0] ?? {
        city: i18n.t("dashboardV2.cities.algiers"),
        count: 0,
      },
    },
    monthlyRevenue,
    revenueTrend,
    topCategories,
    topAppointmentTypes,
    cashflowSeries,
    activityDays,
    taskCadenceSeries,
    pipelineRows: pipelineRows.map((row) => ({
      ...row,
      ratio: row.value / pipelineMax,
    })),
    topCities,
    monthlyAppointments,
  };
}
