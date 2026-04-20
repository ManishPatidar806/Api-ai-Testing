import { useEffect, useState } from 'react';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';
import MetricCard from '../../components/dashboard/MetricCard';
import MiniBarChart from '../../components/charts/MiniBarChart';
import TrendLineChart from '../../components/charts/TrendLineChart';
import { apiRequestService } from '../../services/apiRequestService';
import { metricsService } from '../../services/metricsService';

function PerformanceMetricsPage() {
  const [apiRequests, setApiRequests] = useState([]);
  const [selectedApiRequestId, setSelectedApiRequestId] = useState('');
  const [cards, setCards] = useState({
    averageResponse: 0,
    successRate: 0,
    failures: 0,
  });
  const [successFailureData, setSuccessFailureData] = useState([]);
  const [responseTrend, setResponseTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await apiRequestService.listMine();
        setApiRequests(list);
        if (list.length) {
          setSelectedApiRequestId(String(list[0].id));
        }
      } catch (loadError) {
        setError(loadError.message || 'Failed to load API requests');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!selectedApiRequestId) {
      return;
    }

    const loadMetrics = async () => {
      setLoading(true);
      setError('');
      try {
        const [average, success, failure, responses] = await Promise.all([
          metricsService.getAverageResponseTime(selectedApiRequestId),
          metricsService.getSuccessRate(selectedApiRequestId),
          metricsService.getFailureRate(selectedApiRequestId),
          apiRequestService.listRecentResponses(selectedApiRequestId),
        ]);

        setCards({
          averageResponse: average.averageResponseTimeMs,
          successRate: success.successRatePercentage,
          failures: failure.failedExecutions,
        });

        setSuccessFailureData([
          { label: 'Success', value: success.successfulExecutions },
          { label: 'Failure', value: failure.failedExecutions },
        ]);

        const trend = [...responses].slice(0, 6).reverse().map((item, index) => ({
          label: `R${index + 1}`,
          value: item.responseTimeMs || 0,
        }));
        setResponseTrend(trend.length ? trend : [{ label: 'N/A', value: 0 }]);
      } catch (loadError) {
        setError(loadError.message || 'Failed to load performance metrics');
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [selectedApiRequestId]);

  if (loading && !apiRequests.length) {
    return <LoadingState text="Loading performance metrics..." />;
  }

  if (!apiRequests.length) {
    return (
      <EmptyState
        title="No API requests found"
        description="Create and execute API requests first to view performance analytics."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold text-slate-900">Performance Metrics</h2>
        <p className="mt-1 text-sm text-slate-500">Track latency patterns and reliability across your APIs.</p>
      </section>

      <Card title="Select API Request" subtitle="Performance analytics are scoped to one API request">
        <select
          className="field-input"
          value={selectedApiRequestId}
          onChange={(event) => setSelectedApiRequestId(event.target.value)}
        >
          {apiRequests.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.httpMethod})
            </option>
          ))}
        </select>
      </Card>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Average Response Time" value={cards.averageResponse} type="ms" />
        <MetricCard label="Success Rate" value={cards.successRate} type="percent" />
        <MetricCard label="Recent Failures" value={cards.failures} hint="From recorded executions" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Success vs Failure" subtitle="Request outcomes in latest evaluation window">
          <MiniBarChart data={successFailureData} />
        </Card>
        <Card title="Response Time Trend" subtitle="Latest response time samples for selected request">
          <TrendLineChart points={responseTrend} />
        </Card>
      </section>
    </div>
  );
}

export default PerformanceMetricsPage;
