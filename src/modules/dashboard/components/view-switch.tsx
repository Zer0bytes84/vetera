/** The views of a widget, as the key figures' own switch: segmented, one pressed at a time. */
export function ViewSwitch<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div aria-label={label} className="filter-segments" data-tabs-style="segmented" role="group">
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className="filter"
          data-active={value === option.value}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
