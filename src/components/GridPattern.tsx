import { useId } from "react";

interface GridPatternProps extends React.ComponentPropsWithoutRef<"svg"> {
  height: number;
  squares?: Array<[x: number, y: number]>;
  width: number;
  x: string | number;
  y: string | number;
}

export function GridPattern({
  width,
  height,
  x,
  y,
  squares,
  ...props
}: GridPatternProps) {
  const patternId = useId();

  return (
    <svg aria-hidden="true" {...props}>
      <defs>
        <pattern
          height={height}
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={width}
          x={x}
          y={y}
        >
          <path d={`M.5 ${height}V.5H${width}`} fill="none" />
        </pattern>
      </defs>
      <rect
        fill={`url(#${patternId})`}
        height="100%"
        strokeWidth={0}
        width="100%"
      />
      {squares && (
        <svg className="overflow-visible" x={x} y={y}>
          {squares.map(([sx, sy]) => (
            <rect
              height={height + 1}
              key={`${sx}-${sy}`}
              strokeWidth="0"
              width={width + 1}
              x={sx * width}
              y={sy * height}
            />
          ))}
        </svg>
      )}
    </svg>
  );
}
