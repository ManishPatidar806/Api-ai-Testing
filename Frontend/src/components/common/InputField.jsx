import { cn } from '../../utils/cn';

function InputField({ label, error, className, ...props }) {
  return (
    <div className={className}>
      {label ? <label className="field-label">{label}</label> : null}
      <input className={cn('field-input', error && 'border-rose-400 focus:ring-rose-200')} {...props} />
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

export default InputField;
