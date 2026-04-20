function MiniBarChart({ data = [] }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const tones = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-500', 'bg-cyan-600', 'bg-rose-500', 'bg-indigo-600'];

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full transition-all ${tones[index % tones.length]}`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default MiniBarChart;
