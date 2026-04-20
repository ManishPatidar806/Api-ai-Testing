const styles = {
  primary: 'bg-blue-700 text-white hover:bg-blue-800 focus:ring-blue-300',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-300',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-300',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-300',
  accent: 'bg-amber-500 text-slate-900 hover:bg-amber-400 focus:ring-amber-300',
};

function Button({
  children,
  type = 'button',
  variant = 'primary',
  className,
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70 ${styles[variant] || styles.primary} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
