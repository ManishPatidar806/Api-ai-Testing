import { formatMilliseconds, formatPercentage } from '../../utils/format';
import Card from '../common/Card';

function MetricCard({ label, value, type = 'default', hint }) {
  const tone =
    type === 'percent' ? 'bg-emerald-500' : type === 'ms' ? 'bg-amber-500' : 'bg-blue-600';

  const formatValue = () => {
    if (type === 'ms') {
      return formatMilliseconds(value);
    }
    if (type === 'percent') {
      return formatPercentage(value);
    }
    return value;
  };

  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${tone}`} />
        <p className="text-sm text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{formatValue()}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}

export default MetricCard;
