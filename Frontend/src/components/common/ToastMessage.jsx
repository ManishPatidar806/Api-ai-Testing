function ToastMessage({ type = 'info', text = '', onClose }) {
  if (!text) {
    return null;
  }

  const styles = {
    info: 'border-blue-200 bg-blue-50 text-blue-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  return (
    <div className={`mb-3 flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${styles[type] || styles.info}`}>
      <p>{text}</p>
      {onClose ? (
        <button className="rounded px-2 py-0.5 text-xs hover:bg-white/40" onClick={onClose}>
          Close
        </button>
      ) : null}
    </div>
  );
}

export default ToastMessage;
