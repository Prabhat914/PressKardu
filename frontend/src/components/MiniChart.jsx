function MiniChart({ points = [], bars = [], variant = "line" }) {
  if (variant === "bars") {
    const maxValue = Math.max(...bars, 1);

    return (
      <div className="mini-chart mini-chart--bars" aria-hidden="true">
        {bars.map((value, index) => (
          <span
            key={index}
            className="mini-chart__bar"
            style={{ height: `${(value / maxValue) * 100}%` }}
          />
        ))}
      </div>
    );
  }

  const width = 220;
  const height = 92;
  const maxValue = Math.max(...points, 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const path = points
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / maxValue) * (height - 12) - 6;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg className="mini-chart" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id="miniChartStroke" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#17877d" />
          <stop offset="100%" stopColor="#e27a52" />
        </linearGradient>
      </defs>
      <path d={`M 0 ${height - 6} L ${width} ${height - 6}`} className="mini-chart__baseline" />
      <path d={path} className="mini-chart__path" />
      {points.map((value, index) => {
        const x = index * step;
        const y = height - (value / maxValue) * (height - 12) - 6;
        return <circle key={index} cx={x} cy={y} r="3.5" className="mini-chart__dot" />;
      })}
    </svg>
  );
}

export default MiniChart;
