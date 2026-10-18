import { DatePicker, formatDateValue } from "@/components/ui/date-picker";
import { CareTimePicker } from "@/modules/care-tasks/care-time-picker";

/** Local "YYYY-MM-DDTHH:MM" value, same contract as the former datetime-local input. */
export function StayDateTimeField({ value, onChange, label, timeLabel }: {
  value: string; onChange: (value: string) => void; label: string; timeLabel: string;
}) {
  const day = value.slice(0, 10);
  const time = value.slice(11, 16);
  return (
    <div className="flex min-w-0 gap-2">
      <DatePicker
        aria-label={label}
        className="h-11 flex-1 rounded-xl text-[13px]"
        onChange={(next) => onChange(next ? `${next}T${time || "08:00"}` : "")}
        value={day}
      />
      <CareTimePicker label={timeLabel} onChange={(next) => onChange(`${day || formatDateValue(new Date())}T${next}`)} value={time} />
    </div>
  );
}
