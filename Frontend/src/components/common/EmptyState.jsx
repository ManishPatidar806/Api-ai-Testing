function EmptyState({ title = 'No data yet', description = 'Run an action to see results here.' }) {
  return (
    <div className="surface-card flex min-h-40 flex-col items-center justify-center p-6 text-center">
      <h4 className="text-base font-semibold text-slate-800">{title}</h4>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default EmptyState;
