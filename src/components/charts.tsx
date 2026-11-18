import { useMemo } from "react";
export function LineChart({
  values,
  height = 170,
  color = "var(--green)",
  fill = true,
  compact = false,
}: {
  values: number[];
  height?: number;
  color?: string;
  fill?: boolean;
  compact?: boolean;
}) {
  const points = useMemo(() => {
    const list = values.length ? values : [0, 0],
      min = Math.min(0, ...list),
      max = Math.max(1, ...list),
      range = max - min;
    return list
      .map(
        (v, i) =>
          `${20 + (i / Math.max(1, list.length - 1)) * 560},${height - 24 - ((v - min) / range) * (height - 48)}`,
      )
      .join(" ");
  }, [values, height]);
  return (
    <svg
      className="line-chart"
      viewBox={`0 0 600 ${height}`}
      role="img"
      aria-label={
        values.length
          ? `Cumulative result chart. Latest value ${values.at(-1)?.toFixed(2)}`
          : "No chart data"
      }
      style={{ height }}
      preserveAspectRatio="none"
    >
      {!compact &&
        [0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="20"
            x2="580"
            y1={24 + (i * (height - 48)) / 3}
            y2={24 + (i * (height - 48)) / 3}
            stroke="var(--border)"
            strokeDasharray="4 5"
          />
        ))}
      {fill && (
        <polygon
          points={`20,${height - 18} ${points} 580,${height - 18}`}
          fill={color}
          opacity="0.09"
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={compact ? 2.4 : 2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {!compact && (
        <>
          <text x="20" y={height - 2}>
            First trade
          </text>
          <text x="580" y={height - 2} textAnchor="end">
            Most recent
          </text>
        </>
      )}
    </svg>
  );
}
export function BarChart({
  values,
  labels,
  height = 150,
}: {
  values: number[];
  labels?: string[];
  height?: number;
}) {
  const max = Math.max(1, ...values.map(Math.abs));
  return (
    <div
      className="bar-chart"
      style={{ height }}
      role="img"
      aria-label="Performance bar chart"
    >
      {values.map((v, i) => (
        <div
          className="bar-column"
          key={i}
          title={`${labels?.[i] ?? i}: ${v.toFixed(2)}`}
        >
          <div
            className={`bar ${v < 0 ? "bar-negative" : ""}`}
            style={{ height: `${Math.max(2, (Math.abs(v) / max) * 100)}%` }}
          />
          <span>{labels?.[i] ?? ""}</span>
        </div>
      ))}
    </div>
  );
}
export function WinRing({ value }: { value: number }) {
  const c = 2 * Math.PI * 21;
  return (
    <svg className="win-ring" viewBox="0 0 52 52" aria-hidden="true">
      <circle
        cx="26"
        cy="26"
        r="21"
        fill="none"
        stroke="var(--surface-3)"
        strokeWidth="4"
      />
      <circle
        cx="26"
        cy="26"
        r="21"
        fill="none"
        stroke="var(--green)"
        strokeWidth="4"
        strokeDasharray={`${(c * value) / 100} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
      />
    </svg>
  );
}
export function CandleChart({
  seed = 1,
  height = 140,
}: {
  seed?: number;
  height?: number;
}) {
  const candles = useMemo(() => {
    let last = 60,
      state = seed + 29;
    const rand = () => {
      state = (state * 16807) % 2147483647;
      return state / 2147483647;
    };
    return Array.from({ length: 64 }, (_, i) => {
      const next = Math.max(14, Math.min(105, last + (rand() - 0.48) * 15)),
        open = last;
      last = next;
      return {
        x: 9 + i * 7.5,
        open,
        close: next,
        high: Math.min(open, next) - rand() * 7,
        low: Math.max(open, next) + rand() * 7,
      };
    });
  }, [seed]);
  return (
    <svg
      className="candle-chart"
      viewBox="0 0 500 130"
      preserveAspectRatio="none"
      style={{ height }}
      role="img"
      aria-label="Illustrative sample trade chart"
    >
      <rect width="500" height="130" fill="#08090c" />
      {[30, 60, 90].map((y) => (
        <line
          key={y}
          x1="0"
          x2="500"
          y1={y}
          y2={y}
          stroke="#202128"
          strokeDasharray="3 5"
        />
      ))}
      <rect
        x="355"
        y="33"
        width="110"
        height="26"
        fill="#a855f7"
        opacity=".12"
      />
      <rect
        x="355"
        y="59"
        width="110"
        height="40"
        fill="#2bdd9b"
        opacity=".09"
      />
      <line x1="210" x2="490" y1="59" y2="59" stroke="#a886ee" opacity=".65" />
      {candles.map((c, i) => (
        <g key={i} stroke={c.close < c.open ? "#69cfa0" : "#db7b85"}>
          <line x1={c.x} x2={c.x} y1={c.high} y2={c.low} strokeWidth=".8" />
          <rect
            x={c.x - 1.6}
            y={Math.min(c.open, c.close)}
            width="3.2"
            height={Math.max(1, Math.abs(c.open - c.close))}
            fill={c.close < c.open ? "#69cfa0" : "#db7b85"}
            strokeWidth="0"
          />
        </g>
      ))}
      <text x="10" y="122" fill="#6c6d7b" fontSize="7" fontFamily="monospace">
        SAMPLE CHART · FOR ILLUSTRATION
      </text>
    </svg>
  );
}
