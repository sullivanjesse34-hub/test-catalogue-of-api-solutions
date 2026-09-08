export function Sparkline({
  values,
  width = 76,
  height = 24,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values
    .map(
      (v, i) =>
        `${(i * stepX).toFixed(1)},${(
          height -
          ((v - min) / range) * (height - 2) -
          1
        ).toFixed(1)}`,
    )
    .join(' ');
  const up = values[values.length - 1] >= values[0];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={up ? 'var(--green)' : 'var(--rose)'}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
