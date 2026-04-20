import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import RequestBuilder from '../../components/api-workspace/RequestBuilder';
import ResponseViewer from '../../components/api-workspace/ResponseViewer';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';
import ToastMessage from '../../components/common/ToastMessage';
import { apiRequestService } from '../../services/apiRequestService';

const DashboardPage = lazy(() => import('./DashboardPage'));
const TestCasesPage = lazy(() => import('./TestCasesPage'));
const AiErrorAnalyzerPage = lazy(() => import('./AiErrorAnalyzerPage'));
const AiChatPage = lazy(() => import('./AiChatPage'));
const SecurityTestingPage = lazy(() => import('./SecurityTestingPage'));

const initialRequest = {
  name: '',
  method: 'GET',
  url: '',
  queryParams: [{ key: '', value: '' }],
  headers: [{ key: '', value: '' }],
  bodyType: 'JSON',
  formBody: [{ key: '', value: '' }],
  multipartFields: [{ key: '', value: '', kind: 'TEXT', fileName: '', fileContent: '', fileType: '' }],
  body: '',
  authType: 'NONE',
  authBearerToken: '',
  authBasicUsername: '',
  authBasicPassword: '',
  authApiKeyName: '',
  authApiKeyValue: '',
  authApiKeyIn: 'HEADER',
  authHeader: '',
  description: '',
};

function ApiWorkspacePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo;
  const waitForFirstRequest = Boolean(location.state?.waitForFirstRequest);
  const [activeSection, setActiveSection] = useState(location.state?.workspaceSection || 'workspace');

  const [request, setRequest] = useState(initialRequest);
  const [savedRequests, setSavedRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [response, setResponse] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [hadRequestsOnLoad, setHadRequestsOnLoad] = useState(false);

  const workspaceSections = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'workspace', label: 'Request Builder' },
    { key: 'testcases', label: 'Test Cases' },
    { key: 'analyzer', label: 'Error Analyzer' },
    { key: 'chat', label: 'AI Chat' },
    { key: 'security', label: 'Security Checks' },
  ];

  useEffect(() => {
    if (location.state?.workspaceSection) {
      setActiveSection(location.state.workspaceSection);
    }
  }, [location.state]);

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const list = await apiRequestService.listMine();
      setSavedRequests(list);
      setHadRequestsOnLoad((prev) => (prev ? prev : list.length > 0));
    } catch (loadError) {
      setError(loadError.message || 'Failed to load API requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (!selectedRequestId) {
      return;
    }

    const selected = savedRequests.find((item) => String(item.id) === String(selectedRequestId));
    if (!selected) {
      return;
    }

    const authConfig = detectAuthConfig(selected.headers || {}, selected.url || '');

    setRequest({
      name: selected.name || '',
      method: selected.httpMethod || 'GET',
      url: selected.url || '',
      queryParams: extractQueryRows(selected.url),
      headers: selected.headers
        ? Object.entries(selected.headers).map(([key, value]) => ({ key, value }))
        : [{ key: '', value: '' }],
      bodyType: detectBodyType(selected.headers || {}, selected.requestBody || ''),
      formBody: parseFormUrlEncoded(selected.requestBody || ''),
      multipartFields: [{ key: '', value: '', kind: 'TEXT', fileName: '', fileContent: '', fileType: '' }],
      body: selected.requestBody || '',
      authType: authConfig.authType || 'NONE',
      authBearerToken: authConfig.authBearerToken || '',
      authBasicUsername: authConfig.authBasicUsername || '',
      authBasicPassword: authConfig.authBasicPassword || '',
      authApiKeyName: authConfig.authApiKeyName || '',
      authApiKeyValue: authConfig.authApiKeyValue || '',
      authApiKeyIn: authConfig.authApiKeyIn || 'HEADER',
      authHeader: authConfig.authHeader || selected.headers?.Authorization || '',
      description: selected.description || '',
    });
  }, [selectedRequestId, savedRequests]);

  const extractQueryRows = (urlValue) => {
    try {
      const parsed = new URL(urlValue);
      const rows = [];
      parsed.searchParams.forEach((value, key) => {
        rows.push({ key, value });
      });
      return rows.length ? rows : [{ key: '', value: '' }];
    } catch {
      return [{ key: '', value: '' }];
    }
  };

  const parseFormUrlEncoded = (body) => {
    if (!body) {
      return [{ key: '', value: '' }];
    }
    const rows = body
      .split('&')
      .map((part) => {
        const [key, value = ''] = part.split('=');
        return { key: decodeURIComponent(key || ''), value: decodeURIComponent(value || '') };
      })
      .filter((item) => item.key || item.value);
    return rows.length ? rows : [{ key: '', value: '' }];
  };

  const decodeBasicToken = (token) => {
    try {
      const decoded = atob(token);
      const [username, ...passwordParts] = decoded.split(':');
      return {
        username: username || '',
        password: passwordParts.join(':') || '',
      };
    } catch {
      return { username: '', password: '' };
    }
  };

  const detectAuthConfig = (headers = {}, url = '') => {
    const headerEntries = Object.entries(headers || {});
    const authEntry = headerEntries.find(([key]) => key.toLowerCase() === 'authorization');

    if (authEntry?.[1]) {
      const authValue = authEntry[1].trim();
      if (authValue.toLowerCase().startsWith('bearer ')) {
        return {
          authType: 'BEARER',
          authBearerToken: authValue.slice(7).trim(),
          authHeader: authValue,
        };
      }

      if (authValue.toLowerCase().startsWith('basic ')) {
        const creds = decodeBasicToken(authValue.slice(6).trim());
        return {
          authType: 'BASIC',
          authBasicUsername: creds.username,
          authBasicPassword: creds.password,
          authHeader: authValue,
        };
      }

      return {
        authType: 'CUSTOM',
        authHeader: authValue,
      };
    }

    const apiKeyHeader = headerEntries.find(([key]) => key.toLowerCase() === 'x-api-key' || key.toLowerCase() === 'api-key');
    if (apiKeyHeader?.[1]) {
      return {
        authType: 'API_KEY',
        authApiKeyName: apiKeyHeader[0],
        authApiKeyValue: apiKeyHeader[1],
        authApiKeyIn: 'HEADER',
      };
    }

    try {
      const parsed = new URL(url);
      const queryApiKey = parsed.searchParams.get('api_key') || parsed.searchParams.get('apikey');
      if (queryApiKey) {
        return {
          authType: 'API_KEY',
          authApiKeyName: parsed.searchParams.has('api_key') ? 'api_key' : 'apikey',
          authApiKeyValue: queryApiKey,
          authApiKeyIn: 'QUERY',
        };
      }
    } catch {
      // Ignore invalid URL in auth detection.
    }

    return { authType: 'NONE' };
  };

  const detectBodyType = (headers = {}, body = '') => {
    const contentTypeHeader = Object.entries(headers).find(([key]) => key.toLowerCase() === 'content-type');
    const contentType = (contentTypeHeader?.[1] || '').toLowerCase();
    if (!body) {
      return 'NONE';
    }
    if (contentType.includes('multipart/form-data')) {
      return 'MULTIPART_FORM_DATA';
    }
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return 'FORM_URLENCODED';
    }
    if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      return 'XML';
    }
    if (contentType.includes('text/plain')) {
      return 'TEXT';
    }
    return 'JSON';
  };

  const headersToMap = (headerRows) => {
    const headerMap = {};
    headerRows.forEach((row) => {
      if (row.key && row.key.trim()) {
        headerMap[row.key.trim()] = row.value || '';
      }
    });
    return headerMap;
  };

  const rowsToEncodedBody = (rows) => {
    return rows
      .filter((row) => row.key && row.key.trim())
      .map((row) => `${encodeURIComponent(row.key.trim())}=${encodeURIComponent(row.value || '')}`)
      .join('&');
  };

  const toBase64Auth = (value) => {
    try {
      return btoa(value);
    } catch {
      return btoa(unescape(encodeURIComponent(value)));
    }
  };

  const rowsToMultipartBody = (rows) => {
    const boundary = `----ApiAiBoundary${Date.now()}`;
    const validRows = (rows || []).filter((row) => row.key && row.key.trim());

    if (!validRows.length) {
      return {
        body: '',
        contentType: `multipart/form-data; boundary=${boundary}`,
      };
    }

    const parts = validRows.map((row) => {
      const fieldName = row.key.trim();
      if ((row.kind || 'TEXT') === 'FILE') {
        if (!row.fileContent || !row.fileName) {
          return `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"\r\n\r\n`;
        }
        return `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${row.fileName}"\r\nContent-Type: ${row.fileType || 'application/octet-stream'}\r\nContent-Transfer-Encoding: base64\r\n\r\n${row.fileContent}\r\n`;
      }

      return `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"\r\n\r\n${row.value || ''}\r\n`;
    });

    return {
      body: `${parts.join('')}--${boundary}--\r\n`,
      contentType: `multipart/form-data; boundary=${boundary}`,
    };
  };

  const buildUrlWithQuery = (url, queryParams) => {
    const filtered = queryParams.filter((row) => row.key && row.key.trim());
    if (!filtered.length) {
      return url;
    }

    try {
      const parsed = new URL(url);
      parsed.search = '';
      filtered.forEach((row) => parsed.searchParams.append(row.key.trim(), row.value || ''));
      return parsed.toString();
    } catch {
      const query = filtered
        .map((row) => `${encodeURIComponent(row.key.trim())}=${encodeURIComponent(row.value || '')}`)
        .join('&');
      return `${url.split('?')[0]}?${query}`;
    }
  };

  const buildPayload = () => {
    const headers = headersToMap(request.headers);
    const queryParams = [...(request.queryParams || [])];

    if (request.authType === 'BEARER' && request.authBearerToken?.trim()) {
      headers.Authorization = `Bearer ${request.authBearerToken.trim()}`;
    } else if (request.authType === 'BASIC') {
      const basicPayload = `${request.authBasicUsername || ''}:${request.authBasicPassword || ''}`;
      headers.Authorization = `Basic ${toBase64Auth(basicPayload)}`;
    } else if (request.authType === 'API_KEY' && request.authApiKeyName?.trim() && request.authApiKeyValue?.trim()) {
      if (request.authApiKeyIn === 'QUERY') {
        queryParams.push({ key: request.authApiKeyName.trim(), value: request.authApiKeyValue.trim() });
      } else {
        headers[request.authApiKeyName.trim()] = request.authApiKeyValue.trim();
      }
    } else if (request.authType === 'CUSTOM' && request.authHeader?.trim()) {
      headers.Authorization = request.authHeader.trim();
    }

    let requestBody = '';
    if (request.bodyType === 'FORM_URLENCODED') {
      requestBody = rowsToEncodedBody(request.formBody || []);
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (request.bodyType === 'MULTIPART_FORM_DATA') {
      const multipartPayload = rowsToMultipartBody(request.multipartFields || []);
      requestBody = multipartPayload.body || request.body || '';
      headers['Content-Type'] = multipartPayload.contentType;
    } else if (request.bodyType === 'TEXT') {
      requestBody = request.body || '';
      headers['Content-Type'] = 'text/plain';
    } else if (request.bodyType === 'XML') {
      requestBody = request.body || '';
      headers['Content-Type'] = 'application/xml';
    } else if (request.bodyType === 'JSON') {
      requestBody = request.body || '';
      headers['Content-Type'] = 'application/json';
    }

    return {
      name: request.name || `${request.method} ${request.url}`,
      url: buildUrlWithQuery(request.url, queryParams),
      httpMethod: request.method,
      headers,
      requestBody,
      description: request.description,
    };
  };

  const buildErrorResponse = (error) => {
    return {
      statusCode: 'ERROR',
      responseTimeMs: 0,
      success: false,
      responseBody: JSON.stringify({ message: error.message || 'Failed to execute request' }),
      responseHeaders: '{}',
      errorMessage: error.message || 'Failed to execute request',
      executedAt: new Date().toISOString(),
    };
  };

  const upsertRequest = async () => {
    const payload = buildPayload();

    let requestId = selectedRequestId;
    let createdNew = false;
    if (!requestId) {
      const created = await apiRequestService.create(payload);
      requestId = String(created.id);
      createdNew = true;
      setSelectedRequestId(requestId);
    } else {
      await apiRequestService.updateMine(requestId, payload);
    }

    await loadRequests();
    return { requestId, createdNew };
  };

  const onSend = async () => {
    setError('');
    setMessage('');

    if (!request.url.trim()) {
      setError('API URL is required');
      return;
    }

    setSending(true);
    try {
      const { requestId, createdNew } = await upsertRequest();

      const executed = await apiRequestService.executeMine(requestId);
      setResponse(executed.apiResponse);
      setMessage('Request saved and executed successfully.');

      if (createdNew && waitForFirstRequest && !hadRequestsOnLoad && returnTo) {
        navigate(returnTo, { replace: true });
      }
    } catch (sendError) {
      setResponse(buildErrorResponse(sendError));
      setError(sendError.message || 'Request execution failed');
    } finally {
      setSending(false);
    }
  };

  const onNewRequest = () => {
    setSelectedRequestId('');
    setRequest(initialRequest);
    setResponse(null);
    setError('');
    setMessage('');
  };

  if (loadingRequests) {
    return <LoadingState text="Loading API requests..." />;
  }

  return (
    <div className="space-y-4">
      <Card title="Your API Workspace" subtitle="Create requests, run tests, and review results in one place">
        <div className="flex flex-wrap gap-2">
          {workspaceSections.map((section) => (
            <button
              key={section.key}
              type="button"
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                activeSection === section.key
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => setActiveSection(section.key)}
            >
              {section.label}
            </button>
          ))}
        </div>
      </Card>

      {activeSection === 'dashboard' ? (
        <Suspense fallback={<LoadingState text="Loading dashboard..." />}>
          <DashboardPage />
        </Suspense>
      ) : null}

      {activeSection === 'workspace' ? (
        <>
          <Card title="Saved Requests" subtitle="Open a saved request or start a new one">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
              <div>
                <label className="field-label">Saved Request</label>
                <select
                  className="field-input"
                  value={selectedRequestId}
                  disabled={sending}
                  onChange={(event) => setSelectedRequestId(event.target.value)}
                >
                  <option value="">New request</option>
                  {savedRequests.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.httpMethod})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button variant="secondary" onClick={onNewRequest} disabled={sending}>
                  Reset Form
                </Button>
              </div>
            </div>
          </Card>

          <ToastMessage
            type={error ? 'error' : message ? 'success' : 'info'}
            text={error || message}
            onClose={() => {
              setError('');
              setMessage('');
            }}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <RequestBuilder
              request={request}
              setRequest={setRequest}
              onSend={onSend}
              sending={sending}
              disabled={sending}
            />
            {response ? (
              <ResponseViewer response={response} testResults={[]} />
            ) : (
              <EmptyState title="No response yet" description="Send a request to view the status and response." />
            )}
          </div>
        </>
      ) : null}

      {activeSection === 'testcases' ? (
        <Suspense fallback={<LoadingState text="Loading test cases..." />}>
          <TestCasesPage />
        </Suspense>
      ) : null}

      {activeSection === 'analyzer' ? (
        <Suspense fallback={<LoadingState text="Loading AI analyzer..." />}>
          <AiErrorAnalyzerPage />
        </Suspense>
      ) : null}
      {activeSection === 'chat' ? (
        <Suspense fallback={<LoadingState text="Loading AI chat..." />}>
          <AiChatPage />
        </Suspense>
      ) : null}
      {activeSection === 'security' ? (
        <Suspense fallback={<LoadingState text="Loading security testing..." />}>
          <SecurityTestingPage />
        </Suspense>
      ) : null}
    </div>
  );
}

export default ApiWorkspacePage;
