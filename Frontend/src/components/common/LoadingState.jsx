function LoadingState({ text = 'Loading data...' }) {
  return (
    <div className="surface-card flex min-h-32 items-center justify-center p-6 text-sm text-slate-500">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-500" />
        <span>{text}</span>
      </div>
    </div>
  );
}

export default LoadingState;
