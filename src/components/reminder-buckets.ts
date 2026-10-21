/** When an open reminder falls, relative to today. */
export type ReminderBucket = "overdue" | "today" | "tomorrow" | "later" | "undated";

export const BUCKET_LABELS: Record<ReminderBucket, string> = {
  overdue: "En retard",
  today: "Aujourd’hui",
  tomorrow: "Demain",
  later: "Plus tard",
  undated: "Sans date",
};
export const BUCKET_ORDER: readonly ReminderBucket[] = ["overdue", "today", "tomorrow", "later", "undated"];

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function reminderBucket(date: Date | null, now: Date): ReminderBucket {
  if (!date) return "undated";
  const key = dayKey(date);
  const today = dayKey(now);
  if (key < today) return "overdue";
  if (key === today) return "today";
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return key === dayKey(tomorrow) ? "tomorrow" : "later";
}

/** Items in display order, cut into labelled groups that keep their count. */
export function groupReminders<T>(items: T[], dateOf: (item: T) => Date | null, now: Date) {
  const groups = new Map<ReminderBucket, T[]>();
  for (const item of items) {
    const bucket = reminderBucket(dateOf(item), now);
    groups.set(bucket, [...(groups.get(bucket) ?? []), item]);
  }
  return BUCKET_ORDER.filter((bucket) => groups.has(bucket)).map((bucket) => ({
    bucket,
    label: BUCKET_LABELS[bucket],
    items: groups.get(bucket) as T[],
  }));
}

type Source = "manual" | "medical" | "automatic";
const SOURCE_WORDS: Record<Source, [string, string]> = {
  manual: ["manuel", "manuels"],
  medical: ["médical", "médicaux"],
  automatic: ["du planning", "du planning"],
};

/** "2 médicaux · 1 manuel": what a count is made of, empty sources left out. */
export function sourceBreakdown(items: { kind: Source }[]) {
  return (["medical", "manual", "automatic"] as const)
    .map((kind) => {
      const count = items.filter((item) => item.kind === kind).length;
      return count ? `${count} ${SOURCE_WORDS[kind][count > 1 ? 1 : 0]}` : "";
    })
    .filter(Boolean)
    .join(" · ");
}
