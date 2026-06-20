/** Lightweight SVG radar for a player's attribute profile (no chart lib). */
export function Radar({
  data,
  size = 220,
  color = "#E21833",
}: {
  data: { label: string; value: number }[];
  size?: number;
  color?: string;
}) {
  const n = data.length;
  const cx = size / 2;
  const cy = size / 2;
  const rMax = size / 2 - 34;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, frac: number): [number, number] => [
    cx + rMax * frac * Math.cos(angle(i)),
    cy + rMax * frac * Math.sin(angle(i)),
  ];

  const rings = [0.25, 0.5, 0.75, 1];
  const dataPath =
    data
      .map((d, i) => {
        const [x, y] = pt(i, Math.max(0.04, d.value / 100));
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + " Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((r) => (
        <polygon
          key={r}
          points={data.map((_, i) => pt(i, r).join(",")).join(" ")}
          fill="none"
          stroke="#23262D"
          strokeWidth={1}
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#23262D" strokeWidth={1} />;
      })}
      <path d={dataPath} fill={`${color}33`} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {data.map((d, i) => {
        const [x, y] = pt(i, 1.16);
        return (
          <text
            key={d.label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fill="#7C828C"
            className="uppercase"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
