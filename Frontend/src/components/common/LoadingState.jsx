function LoadingState({ text = 'Loading data...' }) {
  return (
    <div className="surface-card flex min-h-40 items-center justify-center p-6 text-sm text-slate-500">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-700">{text}</p>
          <p className="text-xs text-slate-500">If the backend is waking up on Render, this can take up to 2-3 minutes.</p>
        </div>
      </div>
    </div>
  );
}

export default LoadingState;
