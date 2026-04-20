import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import DataTable from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import InputField from '../../components/common/InputField';
import LoadingState from '../../components/common/LoadingState';
import ToastMessage from '../../components/common/ToastMessage';
import { apiRequestService } from '../../services/apiRequestService';
import { testCaseService } from '../../services/testCaseService';

function TestCasesPage() {
  const navigate = useNavigate();
  const [apiRequests, setApiRequests] = useState([]);
  const [selectedApiRequestId, setSelectedApiRequestId] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    expectedStatusCode: 200,
    maxResponseTimeMs: 500,
    expectedKeyword: '',
    requiredResponseTokens: '',
    forbiddenResponseTokens: '',
    requiredJsonPaths: '',
    expectedJsonPathValues: '',
    forbiddenJsonPathValues: '',
    setupApiRequestId: '',
    setupExtractJsonPath: 'id',
    setupVariableName: 'setupValue',
    testMode: 'FUNCTIONAL',
    bruteForceAttempts: 10,
    bruteForceBlockStatusCode: 429,
    bruteForceStartBlockingAfter: 5,
    bruteForceDelayMs: 0,
    active: true,
  });
  const [testCases, setTestCases] = useState([]);
  const [latestResultsByCase, setLatestResultsByCase] = useState({});
  const [latestRunSummary, setLatestRunSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState('');

  const formatSyncedAt = (value) => {
    if (!value) {
      return '--';
    }
    return new Date(value).toLocaleString();
  };

  const loadApiRequests = async () => {
    const requests = await apiRequestService.listMine();
    setApiRequests(requests);
    if (requests.length && !selectedApiRequestId) {
      setSelectedApiRequestId(String(requests[0].id));
    }
  };

  const loadTestCases = async (apiRequestId) => {
    if (!apiRequestId) {
      setTestCases([]);
      return;
    }

    const list = await testCaseService.getAll(apiRequestId);
    setTestCases(list);

    const recentResults = await testCaseService.listRecentResults(apiRequestId);
    const mapped = {};
    recentResults.forEach((result) => {
      if (!mapped[result.testCaseId]) {
        mapped[result.testCaseId] = result;
      }
    });
    setLatestResultsByCase(mapped);
    setLastSyncedAt(new Date().toISOString());
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        await loadApiRequests();
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

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        await loadTestCases(selectedApiRequestId);
      } catch (loadError) {
        setError(loadError.message || 'Failed to load test cases');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedApiRequestId]);

  const createTestCase = async (event) => {
    event.preventDefault();
    if (!selectedApiRequestId) {
      setError('Please select an API request first');
      return;
    }

    setError('');
    setActionLoading(true);
    try {
      const payload = {
        ...form,
        setupApiRequestId: form.setupApiRequestId ? Number(form.setupApiRequestId) : null,
      };
      await testCaseService.create(selectedApiRequestId, payload);
      await loadTestCases(selectedApiRequestId);
      setForm({
        name: '',
        description: '',
        expectedStatusCode: 200,
        maxResponseTimeMs: 500,
        expectedKeyword: '',
        requiredResponseTokens: '',
        forbiddenResponseTokens: '',
        requiredJsonPaths: '',
        expectedJsonPathValues: '',
        forbiddenJsonPathValues: '',
        setupApiRequestId: '',
        setupExtractJsonPath: 'id',
        setupVariableName: 'setupValue',
        testMode: 'FUNCTIONAL',
        bruteForceAttempts: 10,
        bruteForceBlockStatusCode: 429,
        bruteForceStartBlockingAfter: 5,
        bruteForceDelayMs: 0,
        active: true,
      });
    } catch (submitError) {
      setError(submitError.message || 'Failed to create test case');
    } finally {
      setActionLoading(false);
    }
  };

  const runOne = async (id) => {
    if (!selectedApiRequestId) {
      return;
    }

    setError('');
    setActionLoading(true);
    try {
      const result = await testCaseService.runOne(selectedApiRequestId, id);
      setLatestRunSummary(
        `Last run: ${result.testResult.status} | Expected ${result.testCase.expectedStatusCode ?? '--'} vs Actual ${result.testResult.actualStatusCode ?? '--'} | ${result.testResult.assertionMessage || ''}`,
      );
      await loadTestCases(selectedApiRequestId);
    } catch (runError) {
      setError(runError.message || 'Failed to run test case');
    } finally {
      setActionLoading(false);
    }
  };

  const runAll = async () => {
    if (!selectedApiRequestId) {
      return;
    }

    setError('');
    setActionLoading(true);
    try {
      const result = await testCaseService.runAll(selectedApiRequestId);
      setLatestRunSummary(
        `Run all completed | Total: ${result.total}, Passed: ${result.passed}, Failed: ${result.failed}`,
      );
      await loadTestCases(selectedApiRequestId);
    } catch (runError) {
      setError(runError.message || 'Failed to run all tests');
    } finally {
      setActionLoading(false);
    }
  };

  const onDelete = async (id) => {
    if (!selectedApiRequestId) {
      return;
    }

    setError('');
    setActionLoading(true);
    try {
      await testCaseService.delete(selectedApiRequestId, id);
      await loadTestCases(selectedApiRequestId);
      setLatestRunSummary('Test case deactivated successfully');
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete test case');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    { key: 'name', header: 'Test Name' },
    { key: 'testMode', header: 'Mode' },
    { key: 'description', header: 'Description' },
    { key: 'expectedStatusCode', header: 'Expected Status' },
    { key: 'maxResponseTimeMs', header: 'Max Time (ms)' },
    {
      key: 'actualStatusCode',
      header: 'Actual Status',
      render: (row) => latestResultsByCase[row.id]?.actualStatusCode ?? '--',
    },
    {
      key: 'actualResponseTimeMs',
      header: 'Actual Time (ms)',
      render: (row) => latestResultsByCase[row.id]?.actualResponseTimeMs ?? '--',
    },
    { key: 'bruteForceAttempts', header: 'Brute Attempts' },
    { key: 'bruteForceBlockStatusCode', header: 'Block Status' },
    { key: 'expectedKeyword', header: 'Keyword' },
    { key: 'requiredResponseTokens', header: 'Required Tokens' },
    { key: 'forbiddenResponseTokens', header: 'Forbidden Tokens' },
    { key: 'requiredJsonPaths', header: 'Required JSON Paths' },
    { key: 'expectedJsonPathValues', header: 'Expected JSON Values' },
    { key: 'forbiddenJsonPathValues', header: 'Forbidden JSON Values' },
    { key: 'setupApiRequestId', header: 'Setup Request ID' },
    { key: 'setupExtractJsonPath', header: 'Setup Extract Path' },
    { key: 'setupVariableName', header: 'Setup Variable' },
    {
      key: 'result',
      header: 'Result',
      render: (row) => {
        const status = latestResultsByCase[row.id]?.status || 'NOT_RUN';
        const className =
          status === 'PASS'
            ? 'status-chip-success'
            : status === 'FAIL'
              ? 'status-chip-danger'
              : 'status-chip-pending';
        return <span className={className}>{status}</span>;
      },
    },
    {
      key: 'reason',
      header: 'Failure Reason',
      render: (row) => {
        const latest = latestResultsByCase[row.id];
        if (!latest || !latest.assertionMessage) {
          return <span className="text-xs text-slate-500">--</span>;
        }

        const isFailure = latest.status === 'FAIL';
        return (
          <span
            className={`block max-w-xs text-xs ${isFailure ? 'text-rose-700' : 'text-slate-600'}`}
            title={latest.assertionMessage}
          >
            {latest.assertionMessage}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => runOne(row.id)} disabled={actionLoading}>
            Run
          </Button>
          <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => onDelete(row.id)} disabled={actionLoading}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <LoadingState text="Loading test cases..." />;
  }

  if (!apiRequests.length) {
    return (
      <div>
        <EmptyState title="No API requests found" description="Create and save an API request in Workspace first, then create test cases." />
        <div className="mt-3 flex justify-center">
          <Button onClick={() => navigate('/workspace', { state: { returnTo: '/test-cases', waitForFirstRequest: true } })}>Go To API Workspace</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastMessage
        type={error ? 'error' : latestRunSummary ? 'success' : 'info'}
        text={error || latestRunSummary}
        onClose={() => {
          setError('');
          setLatestRunSummary('');
        }}
      />

      <Card title="Select API Request" subtitle="Test cases are linked to one API request">
        <p className="mb-1 text-xs text-slate-500">Last synced: {formatSyncedAt(lastSyncedAt)}</p>
        <p className="mb-2 text-xs text-slate-500">
          Tip: keep one smoke test + one failure-path test per endpoint for reliable coverage.
        </p>
        <select
          className="field-input"
          value={selectedApiRequestId}
          disabled={actionLoading}
          onChange={(event) => setSelectedApiRequestId(event.target.value)}
        >
          {apiRequests.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.httpMethod})
            </option>
          ))}
        </select>
      </Card>

      <Card title="Create Test Case" subtitle="Define validation rules for endpoint behavior">
        <form onSubmit={createTestCase} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <InputField
            label="Test Name"
            value={form.name}
            required
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <InputField
            label="Description"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          <InputField
            label="Expected Status"
            type="number"
            value={form.expectedStatusCode}
            required
            onChange={(event) => setForm((prev) => ({ ...prev, expectedStatusCode: Number(event.target.value) }))}
          />
          <InputField
            label="Max Response Time (ms)"
            type="number"
            value={form.maxResponseTimeMs}
            required
            onChange={(event) => setForm((prev) => ({ ...prev, maxResponseTimeMs: Number(event.target.value) }))}
          />
          <InputField
            label="Expected Keyword"
            value={form.expectedKeyword}
            onChange={(event) => setForm((prev) => ({ ...prev, expectedKeyword: event.target.value }))}
          />
          <InputField
            label="Required Response Tokens"
            value={form.requiredResponseTokens}
            onChange={(event) => setForm((prev) => ({ ...prev, requiredResponseTokens: event.target.value }))}
            placeholder="id,status,data"
          />
          <InputField
            label="Forbidden Response Tokens"
            value={form.forbiddenResponseTokens}
            onChange={(event) => setForm((prev) => ({ ...prev, forbiddenResponseTokens: event.target.value }))}
            placeholder="password,stacktrace,secret"
          />
          <InputField
            label="Required JSON Paths"
            value={form.requiredJsonPaths}
            onChange={(event) => setForm((prev) => ({ ...prev, requiredJsonPaths: event.target.value }))}
            placeholder="data.id,data.status"
          />
          <InputField
            label="Expected JSON Path Values"
            value={form.expectedJsonPathValues}
            onChange={(event) => setForm((prev) => ({ ...prev, expectedJsonPathValues: event.target.value }))}
            placeholder="data.status=SUCCESS"
          />
          <InputField
            label="Forbidden JSON Path Values"
            value={form.forbiddenJsonPathValues}
            onChange={(event) => setForm((prev) => ({ ...prev, forbiddenJsonPathValues: event.target.value }))}
            placeholder="error.code=INTERNAL"
          />
          <div>
            <label className="field-label">Setup Request (Optional)</label>
            <select
              className="field-input"
              value={form.setupApiRequestId}
              onChange={(event) => setForm((prev) => ({ ...prev, setupApiRequestId: event.target.value }))}
            >
              <option value="">None</option>
              {apiRequests
                .filter((item) => String(item.id) !== String(selectedApiRequestId))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.httpMethod})
                  </option>
                ))}
            </select>
          </div>
          <InputField
            label="Setup Extract JSON Path"
            value={form.setupExtractJsonPath}
            onChange={(event) => setForm((prev) => ({ ...prev, setupExtractJsonPath: event.target.value }))}
            placeholder="data.id"
          />
          <InputField
            label="Setup Variable Name"
            value={form.setupVariableName}
            onChange={(event) => setForm((prev) => ({ ...prev, setupVariableName: event.target.value }))}
            placeholder="setupValue"
          />
          <div>
            <label className="field-label">Test Mode</label>
            <select
              className="field-input"
              value={form.testMode}
              onChange={(event) => setForm((prev) => ({ ...prev, testMode: event.target.value }))}
            >
              <option value="FUNCTIONAL">Functional</option>
              <option value="BRUTE_FORCE">Brute Force Attack</option>
            </select>
          </div>
          {form.testMode === 'BRUTE_FORCE' ? (
            <>
              <InputField
                label="Brute Force Attempts"
                type="number"
                value={form.bruteForceAttempts}
                required
                onChange={(event) => setForm((prev) => ({ ...prev, bruteForceAttempts: Number(event.target.value) }))}
              />
              <InputField
                label="Expected Block Status"
                type="number"
                value={form.bruteForceBlockStatusCode}
                required
                onChange={(event) => setForm((prev) => ({ ...prev, bruteForceBlockStatusCode: Number(event.target.value) }))}
              />
              <InputField
                label="Start Blocking By Attempt"
                type="number"
                value={form.bruteForceStartBlockingAfter}
                required
                onChange={(event) => setForm((prev) => ({ ...prev, bruteForceStartBlockingAfter: Number(event.target.value) }))}
              />
              <InputField
                label="Delay Between Attempts (ms)"
                type="number"
                value={form.bruteForceDelayMs}
                required
                onChange={(event) => setForm((prev) => ({ ...prev, bruteForceDelayMs: Number(event.target.value) }))}
              />
            </>
          ) : null}
          <div className="flex items-end gap-2">
            <Button type="submit" variant="accent" className="w-full" disabled={actionLoading}>
              {actionLoading ? 'Processing...' : 'Add Test Case'}
            </Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-slate-500">
          Use setup variables in request URL/body/headers with placeholders like {'{{setupValue}}'} or {'{{yourVarName}}'}.
        </p>
      </Card>

      <Card
        title="Test Case Library"
        subtitle="Run single or bulk test suites"
        action={<Button variant="success" onClick={runAll} disabled={actionLoading}>{actionLoading ? 'Running...' : 'Run All Tests'}</Button>}
      >
        <DataTable columns={columns} rows={testCases} emptyMessage="No test cases configured yet." />
      </Card>
    </div>
  );
}

export default TestCasesPage;
