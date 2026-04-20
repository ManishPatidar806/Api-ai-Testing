function TrendLineChart({ points = [] }) {
  const max = Math.max(...points.map((item) => item.value), 1);

  return (
    <div className="grid grid-cols-6 items-end gap-2 pt-4">
      {points.map((point, index) => (
        <div key={point.label} className="flex flex-col items-center gap-2">
          <div
            className={`w-full rounded-t ${index % 2 === 0 ? 'bg-blue-700/90' : 'bg-cyan-700/85'}`}
            style={{ height: `${(point.value / max) * 120}px` }}
          />
          <span className="text-[10px] text-slate-500">{point.label}</span>
        </div>
      ))}
    </div>
  );
}

export default TrendLineChart;
