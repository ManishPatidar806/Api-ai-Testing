import { useMemo, useState } from 'react';
import Card from '../common/Card';
import { useLocalStorage } from '../../hooks/useLocalStorage';

function formatBody(body) {
  if (!body) {
    return 'No response body';
  }
  return body;
}

function formatPrettyBody(body) {
  if (!body) {
    return 'No response body';
  }

  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function parseHeaders(headersJson) {
  if (!headersJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(headersJson);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function ResponseViewer({ response, testResults = [] }) {
  const [activeTab, setActiveTab] = useState('body');
  const [bodyViewMode, setBodyViewMode] = useLocalStorage('apiWorkspace.responseBodyViewMode', 'raw');
  const statusText = response?.statusCode || '--';
  const responseTime = response?.responseTimeMs || '--';
  const responseHeaders = useMemo(() => parseHeaders(response?.responseHeaders), [response?.responseHeaders]);
  const headerRows = Object.entries(responseHeaders);

  const tabs = [
    { key: 'body', label: 'Body' },
    { key: 'headers', label: `Headers (${headerRows.length})` },
    { key: 'tests', label: `Test Results (${testResults.length})` },
  ];

  return (
    <Card title="Response" subtitle="Live output from API execution">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
          <p className="mt-1 text-lg font-semibold text-slate-800">{statusText}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Response Time</p>
          <p className="mt-1 text-lg font-semibold text-slate-800">{responseTime} ms</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Success</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{response?.success ? 'Yes' : 'No'}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 p-2">
        <div className="mb-3 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activeTab === tab.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'body' ? (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">Response Body</p>
              <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-[11px] font-medium ${bodyViewMode === 'raw' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  onClick={() => setBodyViewMode('raw')}
                >
                  Raw
                </button>
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-[11px] font-medium ${bodyViewMode === 'pretty' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  onClick={() => setBodyViewMode('pretty')}
                >
                  Pretty
                </button>
              </div>
            </div>
            <pre className="max-h-80 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs text-slate-200">
              {bodyViewMode === 'raw'
                ? formatBody(response?.responseBody)
                : formatPrettyBody(response?.responseBody)}
            </pre>
            <p className="mt-3 mb-2 text-sm font-semibold text-slate-700">Execution Info</p>
            <pre className="max-h-60 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
              {JSON.stringify(
                {
                  errorMessage: response?.errorMessage || null,
                  executedAt: response?.executedAt || null,
                },
                null,
                2,
              )}
            </pre>
          </div>
        ) : null}

        {activeTab === 'headers' ? (
          <div className="space-y-2">
            {headerRows.length ? (
              headerRows.map(([key, value]) => (
                <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                  <p className="font-semibold text-slate-700">{key}</p>
                  <p className="mt-1 break-all text-slate-600">{String(value)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No response headers captured for this request.</p>
            )}
          </div>
        ) : null}

        {activeTab === 'tests' ? (
          <div className="space-y-2">
            {testResults.length ? (
              testResults.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-700">{item.name}</p>
                    <span className={item.status === 'PASS' ? 'status-chip-success' : item.status === 'FAIL' ? 'status-chip-danger' : 'status-chip-pending'}>
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-1 grid grid-cols-1 gap-1 text-xs text-slate-600 md:grid-cols-2">
                    <p>Expected Status: {item.expectedStatusCode ?? '--'}</p>
                    <p>Actual Status: {item.actualStatusCode ?? '--'}</p>
                    <p>Expected Max Time: {item.maxResponseTimeMs ?? '--'} ms</p>
                    <p>Actual Time: {item.actualResponseTimeMs ?? '--'} ms</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{item.assertionMessage || '--'}</p>
                  <p className="mt-1 text-xs text-slate-500">Executed At: {item.executedAt ? new Date(item.executedAt).toLocaleString() : '--'}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No test results yet for this request.</p>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export default ResponseViewer;
