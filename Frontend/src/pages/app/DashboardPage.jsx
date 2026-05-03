import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';
import ToastMessage from '../../components/common/ToastMessage';
import TrendLineChart from '../../components/charts/TrendLineChart';
import MetricCard from '../../components/dashboard/MetricCard';
import MiniBarChart from '../../components/charts/MiniBarChart';
import { apiRequestService } from '../../services/apiRequestService';
import { metricsService } from '../../services/metricsService';
import { testCaseService } from '../../services/testCaseService';

const ALL_REQUESTS_VALUE = 'ALL';

function DashboardPage() {
  const navigate = useNavigate();
  const [apiRequests, setApiRequests] = useState([]);
  const [selectedApiRequestId, setSelectedApiRequestId] = useState('');
  const [summary, setSummary] = useState({
    totalRequests: 0,
    passedTests: 0,
    failedTests: 0,
    avgResponseTime: 0,
    successRate: 0,
  });
  const [barData, setBarData] = useState([]);
  const [lineData, setLineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState('');

  const formatSyncedAt = (value) => {
    if (!value) {
      return '--';
    }
    return new Date(value).toLocaleString();
  };

  const getRequestIdsForMode = () => {
    if (selectedApiRequestId === ALL_REQUESTS_VALUE) {
      return apiRequests.map((item) => item.id);
    }
    return [Number(selectedApiRequestId)];
  };

  useEffect(() => {
    const loadApiRequests = async () => {
      setLoading(true);
      try {
        const requests = await apiRequestService.listMine();
        setApiRequests(requests);
        if (requests.length) {
          setSelectedApiRequestId(ALL_REQUESTS_VALUE);
        }
        setSummary((prev) => ({ ...prev, totalRequests: requests.length }));
        setLastSyncedAt(new Date().toISOString());
      } catch (loadError) {
        setError(loadError.message || 'Failed to load performance data');
      } finally {
        setLoading(false);
      }
    };

    loadApiRequests();
  }, []);

  useEffect(() => {
    if (!selectedApiRequestId) {
      return;
    }

    const loadMetrics = async () => {
      setLoading(true);
      setError('');
      try {
        const requestIds = getRequestIdsForMode();

        const perRequestData = await Promise.all(
          requestIds.map(async (requestId) => {
            const [avg, success, failure, testResults, responses] = await Promise.all([
              metricsService.getAverageResponseTime(requestId),
              metricsService.getSuccessRate(requestId),
              metricsService.getFailureRate(requestId),
              testCaseService.listRecentResults(requestId),
              apiRequestService.listRecentResponses(requestId),
            ]);

            return { avg, success, failure, testResults, responses };
          }),
        );

        const allTestResults = perRequestData.flatMap((item) => item.testResults);
        const allResponses = perRequestData.flatMap((item) => item.responses);

        const passed = allTestResults.filter((item) => item.status === 'PASSED').length;
        const failed = allTestResults.filter((item) => item.status === 'FAILED').length;
        const totalExecutions = perRequestData.reduce((sum, item) => sum + item.success.totalExecutions, 0);
        const totalSuccess = perRequestData.reduce((sum, item) => sum + item.success.successfulExecutions, 0);
        const totalFailure = perRequestData.reduce((sum, item) => sum + item.failure.failedExecutions, 0);
        const averageResponseTime =
          perRequestData.reduce((sum, item) => sum + item.avg.averageResponseTimeMs, 0) /
          Math.max(perRequestData.length, 1);
        const successRate = totalExecutions ? (totalSuccess / totalExecutions) * 100 : 0;

        setSummary((prev) => ({
          ...prev,
          passedTests: passed,
          failedTests: failed,
          avgResponseTime: averageResponseTime,
          successRate,
          totalRequests: apiRequests.length,
        }));

        setBarData([
          { label: 'Success', value: totalSuccess },
          { label: 'Failure', value: totalFailure },
          { label: 'Executions', value: totalExecutions },
        ]);

        const latestResponses = [...allResponses]
          .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
          .slice(0, 6)
          .reverse();
        setLineData(
          latestResponses.map((item, index) => ({
            label: `R${index + 1}`,
            value: item.responseTimeMs || 0,
          })),
        );
        setLastSyncedAt(new Date().toISOString());
      } catch (loadError) {
        setError(loadError.message || 'Failed to load performance metrics');
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [selectedApiRequestId, apiRequests.length]);

  if (loading && !apiRequests.length) {
    return <LoadingState text="Loading performance insights..." />;
  }

  if (!apiRequests.length) {
    return (
      <div>
        <EmptyState
          title="No API requests found"
          description="Create and run a request first to see performance insights."
        />
        <div className="mt-3 flex justify-center">
          <Button onClick={() => navigate('/workspace', { state: { returnTo: '/performance', waitForFirstRequest: true } })}>Go to Request Builder</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold text-slate-900">Performance</h2>
        <p className="mt-1 text-sm text-slate-500">A quick summary of your requests, test results, and response speed.</p>
        <p className="mt-1 text-xs text-slate-500">Last synced: {formatSyncedAt(lastSyncedAt)}</p>
      </section>

      <Card title="Select Request" subtitle="Show performance numbers for one request or all requests">
        <p className="mb-2 text-xs text-slate-500">
          Tip: choose All Requests for the full picture, or select one request for details.
        </p>
        <select
          className="field-input"
          value={selectedApiRequestId}
          onChange={(event) => setSelectedApiRequestId(event.target.value)}
        >
          <option value={ALL_REQUESTS_VALUE}>All Requests</option>
          {apiRequests.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.httpMethod})
            </option>
          ))}
        </select>
      </Card>

      <ToastMessage type="error" text={error} onClose={() => setError('')} />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total API Requests" value={summary.totalRequests} />
        <MetricCard label="Passed Tests" value={summary.passedTests} hint="From recent runs" />
        <MetricCard label="Failed Tests" value={summary.failedTests} hint="From recent runs" />
        <MetricCard label="Avg Response" value={summary.avgResponseTime} type="ms" />
        <MetricCard label="Success Rate" value={summary.successRate} type="percent" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Run Summary" subtitle="Passed and failed runs">
          <MiniBarChart data={barData} />
        </Card>
        <Card title="Recent Response Trend" subtitle="Response speed over recent runs">
          <TrendLineChart points={lineData.length ? lineData : [{ label: 'N/A', value: 0 }]} />
        </Card>
      </section>
    </div>
  );
}

export default DashboardPage;
