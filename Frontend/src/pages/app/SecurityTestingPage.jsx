import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';
import ToastMessage from '../../components/common/ToastMessage';
import { aiService, getAiProviderWarning } from '../../services/aiService';
import { apiRequestService } from '../../services/apiRequestService';
import { testCaseService } from '../../services/testCaseService';

const defaultSqliTemplates = [
  "' OR '1'='1",
  "admin' --",
  "' UNION SELECT null, null --",
  "' OR 1=1 LIMIT 1 --",
  "' OR ''='",
];

const defaultXssTemplates = [
  '<script>alert(1)</script>',
  '" onmouseover="alert(1)',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  '<iframe src=javascript:alert(1)>',
];

const defaultJsonPayloadTemplates = [
  {
    name: 'Deeply Nested Object',
    body: JSON.stringify({ data: { profile: { metadata: { notes: 'A'.repeat(1200) } } } }),
  },
  {
    name: 'Type Mismatch Payload',
    body: JSON.stringify({ username: 12345, isActive: 'yes', roles: 'admin' }),
  },
  {
    name: 'Oversized Array Payload',
    body: JSON.stringify({ ids: Array.from({ length: 200 }, (_, index) => index + 1) }),
  },
  {
    name: 'Unexpected Operator Payload',
    body: JSON.stringify({ username: { $ne: null }, password: { $gt: '' } }),
  },
];

function SecurityTestingPage() {
  const navigate = useNavigate();
  const [apiRequests, setApiRequests] = useState([]);
  const [selectedApiRequestId, setSelectedApiRequestId] = useState('');
  const [attackApiRequestId, setAttackApiRequestId] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [lastCreatedCaseId, setLastCreatedCaseId] = useState(null);
  const [selectedBruteForceCaseId, setSelectedBruteForceCaseId] = useState('');
  const [bruteForceCases, setBruteForceCases] = useState([]);
  const [lastBruteForceRun, setLastBruteForceRun] = useState(null);
  const [recentBruteForceResults, setRecentBruteForceResults] = useState([]);
  const [attackScope, setAttackScope] = useState({
    query: true,
    body: false,
  });
  const [sqliRunResults, setSqliRunResults] = useState([]);
  const [xssRunResults, setXssRunResults] = useState([]);
  const [jsonRunResults, setJsonRunResults] = useState([]);
  const [runningSqliSuite, setRunningSqliSuite] = useState(false);
  const [runningXssSuite, setRunningXssSuite] = useState(false);
  const [runningJsonSuite, setRunningJsonSuite] = useState(false);
  const [generatingTemplates, setGeneratingTemplates] = useState(false);
  const [providerWarning, setProviderWarning] = useState('');
  const [sqliTemplates, setSqliTemplates] = useState(defaultSqliTemplates);
  const [xssTemplates, setXssTemplates] = useState(defaultXssTemplates);
  const [jsonPayloadTemplates, setJsonPayloadTemplates] = useState(defaultJsonPayloadTemplates);
  const [bruteForceConfig, setBruteForceConfig] = useState({
    attempts: 10,
    blockStatusCode: 429,
    startBlockingAfter: 5,
    delayMs: 0,
  });

  const [templateState, setTemplateState] = useState({
    parameterName: 'username',
    sampleJsonField: 'username',
    autoDetectParams: true,
  });

  const selectedRequest = useMemo(
    () => apiRequests.find((item) => String(item.id) === String(selectedApiRequestId)) || null,
    [apiRequests, selectedApiRequestId],
  );

  const selectedAttackRequest = useMemo(
    () => apiRequests.find((item) => String(item.id) === String(attackApiRequestId)) || null,
    [apiRequests, attackApiRequestId],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const list = await apiRequestService.listMine();
        setApiRequests(list);
        if (list.length) {
          setSelectedApiRequestId(String(list[0].id));
          setAttackApiRequestId(String(list[0].id));
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
      setBruteForceCases([]);
      setRecentBruteForceResults([]);
      setLastBruteForceRun(null);
      setLastCreatedCaseId(null);
      setSelectedBruteForceCaseId('');
      return;
    }

    const loadBruteForceResults = async () => {
      try {
        const [cases, results] = await Promise.all([
          testCaseService.getAll(selectedApiRequestId),
          testCaseService.listRecentResults(selectedApiRequestId),
        ]);

        const bruteCaseList = cases.filter((item) => item.testMode === 'BRUTE_FORCE');
        setBruteForceCases(bruteCaseList);

        const bruteCaseIds = new Set(bruteCaseList.map((item) => item.id));

        const bruteResults = results.filter((item) => bruteCaseIds.has(item.testCaseId));
        setRecentBruteForceResults(bruteResults.slice(0, 8));
        setLastBruteForceRun(bruteResults[0] || null);

        if (bruteCaseList.length) {
          const fallbackCaseId = bruteCaseList[0].id;
          setLastCreatedCaseId((prev) => prev || fallbackCaseId);
          setSelectedBruteForceCaseId((prev) => {
            if (!prev) {
              return String(fallbackCaseId);
            }
            const exists = bruteCaseList.some((item) => String(item.id) === String(prev));
            return exists ? prev : String(fallbackCaseId);
          });
        }
      } catch {
        setBruteForceCases([]);
        setRecentBruteForceResults([]);
      }
    };

    loadBruteForceResults();
  }, [selectedApiRequestId]);

  const createBruteForceCase = async () => {
    if (!selectedApiRequestId) {
      setError('Please select an API request first');
      return;
    }

    setActionLoading(true);
    setError('');
    setMessage('');

    try {
      const created = await testCaseService.create(selectedApiRequestId, {
        name: `Brute Force Guard - ${selectedRequest?.name || 'Endpoint'}`,
        description: 'Security test: simulate repeated requests and verify rate-limit/lockout behavior.',
        expectedStatusCode: null,
        maxResponseTimeMs: 2500,
        expectedKeyword: '',
        testMode: 'BRUTE_FORCE',
        bruteForceAttempts: Number(bruteForceConfig.attempts),
        bruteForceBlockStatusCode: Number(bruteForceConfig.blockStatusCode),
        bruteForceStartBlockingAfter: Number(bruteForceConfig.startBlockingAfter),
        bruteForceDelayMs: Number(bruteForceConfig.delayMs),
        active: true,
      });

      setLastCreatedCaseId(created.id);
  setSelectedBruteForceCaseId(String(created.id));
  setBruteForceCases((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      setMessage(`Brute-force test case created successfully (ID: ${created.id})`);
    } catch (createError) {
      setError(createError.message || 'Failed to create brute-force test case');
    } finally {
      setActionLoading(false);
    }
  };

  const runLastCreatedCase = async () => {
    if (!selectedApiRequestId || !lastCreatedCaseId) {
      setError('Create a brute-force test case first');
      return;
    }

    setActionLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await testCaseService.runOne(selectedApiRequestId, lastCreatedCaseId);
      setLastBruteForceRun(result.testResult);
      setRecentBruteForceResults((prev) => [result.testResult, ...prev].slice(0, 8));
      setMessage(
        `Brute-force run completed: ${result.testResult.status} | ${result.testResult.assertionMessage || 'No message'}`,
      );
    } catch (runError) {
      setError(runError.message || 'Failed to run brute-force test case');
    } finally {
      setActionLoading(false);
    }
  };

  const runParticularBruteForceCase = async (testCaseId) => {
    if (!selectedApiRequestId || !testCaseId) {
      setError('Please select a brute-force test case first');
      return;
    }

    setActionLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await testCaseService.runOne(selectedApiRequestId, testCaseId);
      setLastCreatedCaseId(testCaseId);
      setSelectedBruteForceCaseId(String(testCaseId));
      setLastBruteForceRun(result.testResult);
      setRecentBruteForceResults((prev) => [result.testResult, ...prev].slice(0, 8));
      setMessage(`Brute-force case #${testCaseId} completed: ${result.testResult.status}`);
    } catch (runError) {
      setError(runError.message || 'Failed to run selected brute-force test case');
    } finally {
      setActionLoading(false);
    }
  };

  const parseQueryParamNames = (url) => {
    if (!url) {
      return [];
    }

    try {
      const parsed = new URL(url);
      const names = [];
      parsed.searchParams.forEach((_, key) => names.push(key));
      return Array.from(new Set(names));
    } catch {
      const raw = (url.split('?')[1] || '').split('&').filter(Boolean);
      return Array.from(new Set(raw.map((item) => decodeURIComponent((item.split('=')[0] || '').trim())).filter(Boolean)));
    }
  };

  const parsePathParamNames = (url) => {
    if (!url) {
      return [];
    }

    const fromBraces = Array.from(url.matchAll(/\{([a-zA-Z0-9_]+)\}/g)).map((item) => item[1]);
    const fromColon = Array.from(url.matchAll(/:([a-zA-Z0-9_]+)/g)).map((item) => item[1]);
    return Array.from(new Set([...fromBraces, ...fromColon]));
  };

  const parseBodyFieldNames = (requestBody) => {
    if (!requestBody || !requestBody.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(requestBody);
      const collectPaths = (value, prefix = '', depth = 0) => {
        if (depth > 2 || !value || typeof value !== 'object' || Array.isArray(value)) {
          return [];
        }

        return Object.entries(value).flatMap(([key, nested]) => {
          const path = prefix ? `${prefix}.${key}` : key;
          return [path, ...collectPaths(nested, path, depth + 1)];
        });
      };

      return Array.from(new Set(collectPaths(parsed))).slice(0, 10);
    } catch {
      return [];
    }
  };

  const deriveParameterTargets = (endpoint) => {
    const detectedQueryParams = parseQueryParamNames(endpoint?.url);
    const detectedPathParams = parsePathParamNames(endpoint?.url);
    const detectedBodyFields = parseBodyFieldNames(endpoint?.requestBody);

    const fallbackQuery = (templateState.parameterName || 'q').trim() || 'q';
    const fallbackBody = (templateState.sampleJsonField || 'input').trim() || 'input';

    const queryParams = templateState.autoDetectParams
      ? (detectedQueryParams.length ? detectedQueryParams : detectedPathParams.length ? detectedPathParams : [fallbackQuery])
      : [fallbackQuery];
    const bodyFields = templateState.autoDetectParams
      ? (detectedBodyFields.length ? detectedBodyFields : [fallbackBody])
      : [fallbackBody];

    return {
      queryParams,
      bodyFields,
      detectedQueryParams,
      detectedPathParams,
      detectedBodyFields,
    };
  };

  const attackTargets = useMemo(
    () => deriveParameterTargets(selectedAttackRequest),
    [selectedAttackRequest, templateState.autoDetectParams, templateState.parameterName, templateState.sampleJsonField],
  );

  const setValueAtPath = (target, path, value) => {
    if (!target || typeof target !== 'object') {
      return;
    }

    const parts = (path || '').split('.').filter(Boolean);
    if (!parts.length) {
      return;
    }

    let cursor = target;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const part = parts[index];
      if (typeof cursor[part] !== 'object' || cursor[part] === null || Array.isArray(cursor[part])) {
        cursor[part] = {};
      }
      cursor = cursor[part];
    }

    cursor[parts[parts.length - 1]] = value;
  };

  const buildQueryTemplate = (payload, paramName = templateState.parameterName) => {
    const key = (paramName || templateState.parameterName || 'q').trim() || 'q';
    return `${key}=${encodeURIComponent(payload)}`;
  };

  const deriveBruteForceVerdicts = (result) => {
    if (!result) {
      return {
        rateLimitVerdict: '--',
        assertionVerdict: '--',
        rateLimitReason: '--',
        assertionReason: '--',
      };
    }

    const message = (result.assertionMessage || '').toLowerCase();
    const failedByRateLimit = message.includes('expected rate-limit status');

    if (failedByRateLimit) {
      return {
        rateLimitVerdict: 'FAIL',
        assertionVerdict: '--',
        rateLimitReason: result.assertionMessage || 'Rate-limit block was not detected as expected.',
        assertionReason: 'Rate-limit condition failed first, so assertion verdict is not evaluated separately.',
      };
    }

    if (result.status === 'PASS') {
      return {
        rateLimitVerdict: 'PASS',
        assertionVerdict: 'PASS',
        rateLimitReason: 'Expected blocking behavior was observed within configured attempts.',
        assertionReason: 'Response assertions (status/time/token/path checks) also passed.',
      };
    }

    return {
      rateLimitVerdict: 'PASS',
      assertionVerdict: 'FAIL',
      rateLimitReason: 'Expected blocking behavior was observed within configured attempts.',
      assertionReason: result.assertionMessage || 'At least one additional response assertion failed.',
    };
  };

  const buildJsonTemplate = (payload, fieldPath = templateState.sampleJsonField) => {
    const key = (fieldPath || templateState.sampleJsonField || 'input').trim() || 'input';
    const root = {};
    setValueAtPath(root, key, payload);
    return JSON.stringify(root, null, 2);
  };

  const appendQueryPayload = (baseUrl, payload, paramName) => {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${buildQueryTemplate(payload, paramName)}`;
  };

  const withInjectedBody = (existingBody, payload, fieldPath) => {
    const fallbackBody = buildJsonTemplate(payload, fieldPath);
    if (!existingBody || !existingBody.trim()) {
      return fallbackBody;
    }

    try {
      const parsed = JSON.parse(existingBody);
      if (typeof parsed === 'object' && parsed !== null) {
        setValueAtPath(parsed, fieldPath || templateState.sampleJsonField, payload);
        return JSON.stringify(parsed);
      }
      return fallbackBody;
    } catch {
      return fallbackBody;
    }
  };

  const extractJsonObject = (text) => {
    if (!text || typeof text !== 'string') {
      return null;
    }

    const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
    const raw = fencedMatch?.[1] || text;
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  };

  const normalizeStringTemplates = (value, fallback) => {
    if (!Array.isArray(value)) {
      return fallback;
    }

    const normalized = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);

    return normalized.length ? normalized : fallback;
  };

  const normalizeJsonTemplates = (value, fallback) => {
    if (!Array.isArray(value)) {
      return fallback;
    }

    const normalized = value
      .map((item, index) => {
        if (typeof item === 'string') {
          return {
            name: `AI JSON Template ${index + 1}`,
            body: item,
          };
        }

        if (typeof item === 'object' && item !== null) {
          const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `AI JSON Template ${index + 1}`;
          if (typeof item.body === 'string') {
            return { name, body: item.body };
          }

          return {
            name,
            body: JSON.stringify(item.body ?? item.payload ?? item, null, 2),
          };
        }

        return null;
      })
      .filter(Boolean);

    return normalized.length ? normalized : fallback;
  };

  const collectFieldNames = (value, prefix = '', depth = 0) => {
    if (depth > 2 || !value || typeof value !== 'object' || Array.isArray(value)) {
      return [];
    }

    return Object.entries(value).flatMap(([key, nested]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return [path, ...collectFieldNames(nested, path, depth + 1)];
    });
  };

  const looksLikePolicyRefusal = (text) => {
    if (!text) {
      return false;
    }
    return /policy|cannot assist|can't assist|refuse|safety|not allowed|harmful/i.test(text);
  };

  const buildEndpointAwareFallbackTemplates = (endpoint) => {
    const requestBody = endpoint?.requestBody || '';
    const parsedBody = (() => {
      try {
        return requestBody ? JSON.parse(requestBody) : null;
      } catch {
        return null;
      }
    })();

    const fieldHints = Array.from(new Set([
      ...(collectFieldNames(parsedBody) || []),
      templateState.sampleJsonField || 'input',
      templateState.parameterName || 'q',
    ]))
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6);

    const safeFields = fieldHints.length ? fieldHints : ['input'];

    const sqli = safeFields.flatMap((field) => [
      `' OR '1'='1 -- ${field}`,
      `${field}' OR '1'='1`,
      `${field}' UNION SELECT NULL --`,
    ]).slice(0, 10);

    const xss = safeFields.flatMap((field) => [
      `<script>console.log('${field}')</script>`,
      `\"><img src=x onerror=console.log('${field}')>`,
      `<svg onload=console.log('${field}')>`,
    ]).slice(0, 10);

    const jsonPayloads = safeFields.flatMap((field) => [
      {
        name: `${field} Type Mismatch`,
        body: JSON.stringify({ [field]: 98765 }, null, 2),
      },
      {
        name: `${field} Oversized String`,
        body: JSON.stringify({ [field]: 'A'.repeat(3000) }, null, 2),
      },
      {
        name: `${field} Operator-like Object`,
        body: JSON.stringify({ [field]: { $ne: null } }, null, 2),
      },
    ]).slice(0, 10);

    return {
      sqliTemplates: sqli.length ? sqli : defaultSqliTemplates,
      xssTemplates: xss.length ? xss : defaultXssTemplates,
      jsonPayloadTemplates: jsonPayloads.length ? jsonPayloads : defaultJsonPayloadTemplates,
    };
  };

  const runAttackSuite = async ({ templates, suiteName, failEvaluator, setResults }) => {
    if (!attackApiRequestId) {
      setError('Please select an API request first');
      return;
    }

    setActionLoading(true);
    setError('');
    setMessage('');
    setResults([]);

    try {
      const baseRequest = await apiRequestService.getMine(attackApiRequestId);
      const targets = deriveParameterTargets(baseRequest);
      const outputs = [];

      for (const payload of templates) {
        const mutationModes = [];
        if (attackScope.query) {
          mutationModes.push('QUERY');
        }
        if (attackScope.body) {
          mutationModes.push('BODY');
        }
        if (!mutationModes.length) {
          mutationModes.push('QUERY');
        }

        for (const mutationMode of mutationModes) {
          const mutationTargets = mutationMode === 'QUERY' ? targets.queryParams : targets.bodyFields;

          for (const targetField of mutationTargets) {
            const mutatedUrl = mutationMode === 'QUERY'
              ? appendQueryPayload(baseRequest.url, payload, targetField)
              : baseRequest.url;
            const mutatedBody = mutationMode === 'BODY'
              ? withInjectedBody(baseRequest.requestBody, payload, targetField)
              : baseRequest.requestBody;

            let tempRequestId = null;

            try {
              const temp = await apiRequestService.create({
                name: `[Security ${suiteName} ${mutationMode}] ${baseRequest.name}`,
                url: mutatedUrl,
                httpMethod: baseRequest.httpMethod,
                headers: baseRequest.headers || {},
                requestBody: mutatedBody,
                description: `Temporary ${suiteName} security run for payload: ${payload} | target: ${targetField}`,
              });

              tempRequestId = temp.id;
              const executed = await apiRequestService.executeMine(tempRequestId);
              const response = executed.apiResponse;

              const evaluation = failEvaluator(payload, response);

              outputs.push({
                payload,
                mode: mutationMode,
                target: targetField,
                status: evaluation.status,
                statusCode: response?.statusCode,
                responseTimeMs: response?.responseTimeMs,
                executedAt: response?.executedAt,
                note: evaluation.note,
              });
            } catch (suiteError) {
              outputs.push({
                payload,
                mode: mutationMode,
                target: targetField,
                status: 'FAIL',
                statusCode: 'ERROR',
                responseTimeMs: 0,
                executedAt: new Date().toISOString(),
                note: suiteError.message || `${suiteName} execution failed`,
              });
            } finally {
              if (tempRequestId) {
                try {
                  await apiRequestService.deleteMine(tempRequestId);
                } catch {
                  // ignore cleanup failures for temporary requests
                }
              }
            }
          }
        }
      }

      setResults(outputs);
      const failed = outputs.filter((item) => item.status === 'FAIL').length;
      setMessage(`${suiteName} suite completed. Total: ${outputs.length}, Passed: ${outputs.length - failed}, Failed: ${failed}`);
    } catch (suiteError) {
      setError(suiteError.message || `Failed to run ${suiteName} attack suite`);
    } finally {
      setActionLoading(false);
    }
  };

  const runSqliAttackSuite = async () => {
    setRunningSqliSuite(true);
    try {
      await runAttackSuite({
        templates: sqliTemplates,
        suiteName: 'SQLi',
        setResults: setSqliRunResults,
        failEvaluator: (payload, response) => {
          const responseText = response?.responseBody || response?.errorMessage || '';
          const hasServerError = Number(response?.statusCode || 0) >= 500;
          const hasLeak = /exception|stack trace|sql syntax|postgres|mysql|syntax error/i.test(responseText);
          const status = hasServerError || hasLeak ? 'FAIL' : 'PASS';
          return {
            status,
            note: status === 'PASS'
              ? 'No server-error/leakage signal detected'
              : 'Potential SQLi weakness: 5xx or error leakage detected',
          };
        },
      });
    } finally {
      setRunningSqliSuite(false);
    }
  };

  const runXssAttackSuite = async () => {
    setRunningXssSuite(true);
    try {
      await runAttackSuite({
        templates: xssTemplates,
        suiteName: 'XSS',
        setResults: setXssRunResults,
        failEvaluator: (payload, response) => {
          const responseText = response?.responseBody || response?.errorMessage || '';
          const hasServerError = Number(response?.statusCode || 0) >= 500;
          const reflectedPayload = responseText.includes(payload);
          const reflectedScriptLike = /<script|onerror=|onload=|javascript:/i.test(responseText);
          const status = hasServerError || reflectedPayload || reflectedScriptLike ? 'FAIL' : 'PASS';
          return {
            status,
            note: status === 'PASS'
              ? 'No reflection or script-like response signal detected'
              : 'Potential XSS weakness: reflection/script-like response detected',
          };
        },
      });
    } finally {
      setRunningXssSuite(false);
    }
  };

  const runJsonAttackSuite = async () => {
    if (!attackApiRequestId) {
      setError('Please select an API request first');
      return;
    }

    setRunningJsonSuite(true);
    setActionLoading(true);
    setError('');
    setMessage('');
    setJsonRunResults([]);

    try {
      const baseRequest = await apiRequestService.getMine(attackApiRequestId);
      const outputs = [];

      for (const template of jsonPayloadTemplates) {
        let tempRequestId = null;
        try {
          const temp = await apiRequestService.create({
            name: `[Security JSON] ${baseRequest.name} - ${template.name}`,
            url: baseRequest.url,
            httpMethod: baseRequest.httpMethod,
            headers: {
              ...(baseRequest.headers || {}),
              'Content-Type': 'application/json',
            },
            requestBody: template.body,
            description: `Temporary JSON payload run: ${template.name}`,
          });

          tempRequestId = temp.id;
          const executed = await apiRequestService.executeMine(tempRequestId);
          const apiResponse = executed.apiResponse;
          const responseText = apiResponse?.responseBody || apiResponse?.errorMessage || '';
          const hasServerError = Number(apiResponse?.statusCode || 0) >= 500;
          const hasLeak = /exception|stack trace|internal server error|sql syntax|postgres|mysql/i.test(responseText);
          const status = hasServerError || hasLeak ? 'FAIL' : 'PASS';

          outputs.push({
            payload: template.name,
            mode: 'BODY',
            status,
            statusCode: apiResponse?.statusCode,
            responseTimeMs: apiResponse?.responseTimeMs,
            executedAt: apiResponse?.executedAt,
            note: status === 'PASS'
              ? 'No server-error/leakage signal detected for JSON payload'
              : 'Potential JSON handling weakness: 5xx or leakage detected',
          });
        } catch (suiteError) {
          outputs.push({
            payload: template.name,
            mode: 'BODY',
            status: 'FAIL',
            statusCode: 'ERROR',
            responseTimeMs: 0,
            executedAt: new Date().toISOString(),
            note: suiteError.message || 'JSON payload suite execution failed',
          });
        } finally {
          if (tempRequestId) {
            try {
              await apiRequestService.deleteMine(tempRequestId);
            } catch {
              // ignore cleanup failures for temporary requests
            }
          }
        }
      }

      setJsonRunResults(outputs);
      const failed = outputs.filter((item) => item.status === 'FAIL').length;
      setMessage(`JSON payload suite completed. Total: ${outputs.length}, Passed: ${outputs.length - failed}, Failed: ${failed}`);
    } catch (suiteError) {
      setError(suiteError.message || 'Failed to run JSON payload suite');
    } finally {
      setRunningJsonSuite(false);
      setActionLoading(false);
    }
  };

  const generateAiAttackTemplates = async () => {
    if (!attackApiRequestId) {
      setError('Please select an API request first');
      return;
    }

    setGeneratingTemplates(true);
    setError('');
    setProviderWarning('');

    try {
      const selectedEndpoint = await apiRequestService.getMine(attackApiRequestId);
      const fallbackTemplates = buildEndpointAwareFallbackTemplates(selectedEndpoint);
      const parameterTargets = deriveParameterTargets(selectedEndpoint);
      const prompt = [
        'You are helping with defensive API validation and secure input handling tests.',
        'Generate endpoint-aware negative test payload templates for validation, sanitization and encoding checks.',
        'Do not provide exploitation instructions.',
        'Return ONLY valid JSON. No markdown, no explanation.',
        'JSON schema:',
        '{',
        '  "sqliTemplates": ["..."],',
        '  "xssTemplates": ["..."],',
        '  "jsonPayloadTemplates": [',
        '    { "name": "...", "body": {"field":"value"} }',
        '  ]',
        '}',
        `Endpoint method: ${selectedEndpoint.httpMethod}`,
        `Endpoint URL: ${selectedEndpoint.url}`,
        `Endpoint headers: ${JSON.stringify(selectedEndpoint.headers || {}, null, 2)}`,
        `Endpoint request body template: ${selectedEndpoint.requestBody || '{}'}`,
        `Detected query/path params: ${parameterTargets.queryParams.join(', ')}`,
        `Detected body fields: ${parameterTargets.bodyFields.join(', ')}`,
        'Generate at least 8 SQL-like templates, 8 script-injection templates, and 8 JSON body edge-case templates tailored to this endpoint.',
        'Keep payloads short, realistic, and useful for defensive automated testing.',
      ].join('\n');

      const response = await aiService.chat({
        apiRequestId: Number(attackApiRequestId),
        message: prompt,
      });

      const rawText = response.rawModelResponse || response.answer || '';
      setProviderWarning(getAiProviderWarning(rawText));

      const parsed = extractJsonObject(rawText);
      if (!parsed) {
        setSqliTemplates(fallbackTemplates.sqliTemplates);
        setXssTemplates(fallbackTemplates.xssTemplates);
        setJsonPayloadTemplates(fallbackTemplates.jsonPayloadTemplates);
        setMessage('AI format was unparseable. Endpoint-aware fallback templates were generated locally.');
        if (looksLikePolicyRefusal(rawText)) {
          setProviderWarning('AI safety policy blocked direct payload generation. Using endpoint-aware fallback templates.');
        }
        return;
      }

      setSqliTemplates(normalizeStringTemplates(parsed.sqliTemplates, fallbackTemplates.sqliTemplates));
      setXssTemplates(normalizeStringTemplates(parsed.xssTemplates, fallbackTemplates.xssTemplates));
      setJsonPayloadTemplates(normalizeJsonTemplates(parsed.jsonPayloadTemplates, fallbackTemplates.jsonPayloadTemplates));
      setMessage('AI templates generated for selected endpoint.');
    } catch (templateError) {
      try {
        const selectedEndpoint = await apiRequestService.getMine(attackApiRequestId);
        const fallbackTemplates = buildEndpointAwareFallbackTemplates(selectedEndpoint);
        setSqliTemplates(fallbackTemplates.sqliTemplates);
        setXssTemplates(fallbackTemplates.xssTemplates);
        setJsonPayloadTemplates(fallbackTemplates.jsonPayloadTemplates);
        setMessage('AI template generation failed. Endpoint-aware fallback templates were generated locally.');
      } catch {
        setError(templateError.message || 'Failed to generate AI security templates');
      }
    } finally {
      setGeneratingTemplates(false);
    }
  };

  if (loading) {
    return <LoadingState text="Loading security checks..." />;
  }

  if (!apiRequests.length) {
    return (
      <div>
        <EmptyState
          title="No API requests found"
          description="Create a request first, then run security checks."
        />
        <div className="mt-3 flex justify-center">
          <Button onClick={() => navigate('/workspace', { state: { returnTo: '/security-testing', waitForFirstRequest: true } })}>
            Go to Request Builder
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastMessage
        type={error ? 'error' : message ? 'success' : 'info'}
        text={error || message}
        onClose={() => {
          setError('');
          setMessage('');
        }}
      />
      <ToastMessage type="info" text={providerWarning} onClose={() => setProviderWarning('')} />

      <Card title="Repeated Attempt Test" subtitle="Check if your API blocks too many repeated requests">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-3">
            <label className="field-label">API Request</label>
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
          </div>

          <div>
            <label className="field-label">Attempts</label>
            <input
              className="field-input"
              type="number"
              min="1"
              max="500"
              value={bruteForceConfig.attempts}
              onChange={(event) => setBruteForceConfig((prev) => ({ ...prev, attempts: Number(event.target.value) }))}
            />
          </div>

          <div>
            <label className="field-label">Expected Block Status</label>
            <input
              className="field-input"
              type="number"
              min="100"
              max="599"
              value={bruteForceConfig.blockStatusCode}
              onChange={(event) =>
                setBruteForceConfig((prev) => ({
                  ...prev,
                  blockStatusCode: Number(event.target.value),
                }))
              }
            />
          </div>

          <div>
            <label className="field-label">Expected Blocking By Attempt</label>
            <input
              className="field-input"
              type="number"
              min="1"
              max="500"
              value={bruteForceConfig.startBlockingAfter}
              onChange={(event) =>
                setBruteForceConfig((prev) => ({
                  ...prev,
                  startBlockingAfter: Number(event.target.value),
                }))
              }
            />
          </div>

          <div>
            <label className="field-label">Delay Between Attempts (ms)</label>
            <input
              className="field-input"
              type="number"
              min="0"
              value={bruteForceConfig.delayMs}
              onChange={(event) => setBruteForceConfig((prev) => ({ ...prev, delayMs: Number(event.target.value) }))}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="danger" onClick={createBruteForceCase} disabled={actionLoading}>
            {actionLoading ? 'Working...' : 'Create repeated attempt test'}
          </Button>
          <Button variant="success" onClick={runLastCreatedCase} disabled={actionLoading || !lastCreatedCaseId}>
            {actionLoading ? 'Running...' : 'Run latest test'}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <label className="field-label">Run a Saved Repeated Attempt Test</label>
            <select
              className="field-input"
              value={selectedBruteForceCaseId}
              disabled={actionLoading || !bruteForceCases.length}
              onChange={(event) => setSelectedBruteForceCaseId(event.target.value)}
            >
              {bruteForceCases.length ? null : <option value="">No brute-force case found</option>}
              {bruteForceCases.map((item) => (
                <option key={item.id} value={item.id}>
                  #{item.id} - {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              variant="success"
              disabled={actionLoading || !selectedBruteForceCaseId}
              onClick={() => runParticularBruteForceCase(Number(selectedBruteForceCaseId))}
            >
              Run Selected Test
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Repeated Attempt Result" subtitle="Latest result and recent history">
        {lastBruteForceRun ? (
          <div className="space-y-3">
            {(() => {
              const verdicts = deriveBruteForceVerdicts(lastBruteForceRun);
              return (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Rate-limit Verdict</p>
                    <p className={`mt-1 text-sm font-semibold ${verdicts.rateLimitVerdict === 'PASS' ? 'text-emerald-700' : verdicts.rateLimitVerdict === 'FAIL' ? 'text-rose-700' : 'text-slate-600'}`}>
                      {verdicts.rateLimitVerdict}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">Reason: {verdicts.rateLimitReason}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Additional Assertions Verdict</p>
                    <p className={`mt-1 text-sm font-semibold ${verdicts.assertionVerdict === 'PASS' ? 'text-emerald-700' : verdicts.assertionVerdict === 'FAIL' ? 'text-rose-700' : 'text-slate-600'}`}>
                      {verdicts.assertionVerdict}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">Reason: {verdicts.assertionReason}</p>
                  </div>
                </div>
              );
            })()}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Status:</span>{' '}
                <span className={lastBruteForceRun.status === 'PASS' ? 'text-emerald-700' : 'text-rose-700'}>
                  {lastBruteForceRun.status}
                </span>
              </p>
              <p className="mt-1 text-sm text-slate-700">
                <span className="font-semibold">Message:</span> {lastBruteForceRun.assertionMessage || '--'}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Code: {lastBruteForceRun.actualStatusCode ?? '--'} | Time: {lastBruteForceRun.actualResponseTimeMs ?? '--'} ms
              </p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Time (ms)</th>
                    <th className="px-3 py-2">Executed</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBruteForceResults.map((row) => (
                    <tr key={row.id} className="border-t border-slate-200">
                      <td className="px-3 py-2">
                        <span className={row.status === 'PASS' ? 'text-emerald-700' : 'text-rose-700'}>{row.status}</span>
                      </td>
                      <td className="px-3 py-2">{row.actualStatusCode ?? '--'}</td>
                      <td className="px-3 py-2">{row.actualResponseTimeMs ?? '--'}</td>
                      <td className="px-3 py-2">{row.executedAt ? new Date(row.executedAt).toLocaleString() : '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">No repeated-attempt run found yet for this request.</p>
        )}

        {bruteForceCases.length ? (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Case ID</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Attempts</th>
                  <th className="px-3 py-2">Block Status</th>
                  <th className="px-3 py-2">Block By Attempt</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {bruteForceCases.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{item.id}</td>
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2">{item.bruteForceAttempts ?? '--'}</td>
                    <td className="px-3 py-2">{item.bruteForceBlockStatusCode ?? '--'}</td>
                    <td className="px-3 py-2">{item.bruteForceStartBlockingAfter ?? '--'}</td>
                    <td className="px-3 py-2">
                      <Button
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        disabled={actionLoading}
                        onClick={() => runParticularBruteForceCase(item.id)}
                      >
                        Run test
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Card title="Input Safety Templates" subtitle="Use these samples to check how your API handles risky input">
        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <div>
          <label className="field-label">Target Request</label>
          <select
            className="field-input"
            value={attackApiRequestId}
            disabled={actionLoading || generatingTemplates}
            onChange={(event) => setAttackApiRequestId(event.target.value)}
          >
            {apiRequests.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.httpMethod})
              </option>
            ))}
          </select>
          </div>
          <div className="flex items-end">
            <Button variant="accent" disabled={actionLoading || generatingTemplates} onClick={generateAiAttackTemplates}>
              {generatingTemplates ? 'Generating...' : 'Generate with AI'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={templateState.autoDetectParams}
                onChange={(event) => setTemplateState((prev) => ({ ...prev, autoDetectParams: event.target.checked }))}
              />
              Auto-detect fields from URL/body (or use manual fields below)
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Detected query/path params: {attackTargets.detectedQueryParams.length || attackTargets.detectedPathParams.length
                ? [...attackTargets.detectedQueryParams, ...attackTargets.detectedPathParams].join(', ')
                : '--'}
            </p>
            <p className="text-xs text-slate-500">
              Detected body fields: {attackTargets.detectedBodyFields.length ? attackTargets.detectedBodyFields.join(', ') : '--'}
            </p>
          </div>

          <div>
            <label className="field-label">Fallback Query Parameter Name</label>
            <input
              className="field-input"
              value={templateState.parameterName}
              onChange={(event) => setTemplateState((prev) => ({ ...prev, parameterName: event.target.value || 'q' }))}
            />
          </div>
          <div>
            <label className="field-label">Fallback JSON Body Field Name</label>
            <input
              className="field-input"
              value={templateState.sampleJsonField}
              onChange={(event) => setTemplateState((prev) => ({ ...prev, sampleJsonField: event.target.value || 'input' }))}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
            <h4 className="text-sm font-semibold text-rose-800">SQL Injection Payloads</h4>
            <ul className="mt-2 space-y-2 text-sm text-rose-900">
              {sqliTemplates.map((payload) => (
                <li key={payload} className="rounded bg-white/80 p-2">
                  <p className="font-mono text-xs">Payload: {payload}</p>
                  <p className="mt-1 font-mono text-xs">Query: ?{buildQueryTemplate(payload, attackTargets.queryParams[0])}</p>
                  <pre className="mt-1 overflow-x-auto rounded bg-slate-900 p-2 text-[11px] text-slate-100">{buildJsonTemplate(payload, attackTargets.bodyFields[0])}</pre>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <h4 className="text-sm font-semibold text-amber-900">XSS Payloads</h4>
            <ul className="mt-2 space-y-2 text-sm text-amber-950">
              {xssTemplates.map((payload) => (
                <li key={payload} className="rounded bg-white/80 p-2">
                  <p className="font-mono text-xs">Payload: {payload}</p>
                  <p className="mt-1 font-mono text-xs">Query: ?{buildQueryTemplate(payload, attackTargets.queryParams[0])}</p>
                  <pre className="mt-1 overflow-x-auto rounded bg-slate-900 p-2 text-[11px] text-slate-100">{buildJsonTemplate(payload, attackTargets.bodyFields[0])}</pre>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
            <h4 className="text-sm font-semibold text-sky-900">JSON Payload Templates</h4>
            <ul className="mt-2 space-y-2 text-sm text-sky-950">
              {jsonPayloadTemplates.map((template, index) => (
                <li key={`${template.name}-${index}`} className="rounded bg-white/80 p-2">
                  <p className="text-xs font-semibold">{template.name}</p>
                  <pre className="mt-1 overflow-x-auto rounded bg-slate-900 p-2 text-[11px] text-slate-100">{template.body}</pre>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-700">Run SQL-like Input Checks</p>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={attackScope.query}
                onChange={(event) => setAttackScope((prev) => ({ ...prev, query: event.target.checked }))}
              />
              Test URL query fields
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={attackScope.body}
                onChange={(event) => setAttackScope((prev) => ({ ...prev, body: event.target.checked }))}
              />
              Test JSON body fields
            </label>
          </div>
          <div className="mt-3">
            <Button variant="danger" onClick={runSqliAttackSuite} disabled={runningSqliSuite || actionLoading}>
              {runningSqliSuite ? 'Running SQL Check...' : 'Run SQL Check'}
            </Button>
          </div>
        </div>

        {sqliRunResults.length ? (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Payload</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">HTTP</th>
                  <th className="px-3 py-2">Time (ms)</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {sqliRunResults.map((row, index) => (
                  <tr key={`${row.payload}-${row.mode}-${index}`} className="border-t border-slate-200">
                    <td className="px-3 py-2 font-mono text-xs">{row.payload}</td>
                    <td className="px-3 py-2">{row.mode}</td>
                    <td className="px-3 py-2">{row.target || '--'}</td>
                    <td className="px-3 py-2">
                      <span className={row.status === 'PASS' ? 'text-emerald-700' : 'text-rose-700'}>{row.status}</span>
                    </td>
                    <td className="px-3 py-2">{row.statusCode ?? '--'}</td>
                    <td className="px-3 py-2">{row.responseTimeMs ?? '--'}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-700">Run Script Injection Checks</p>
          <div className="mt-2">
            <Button variant="danger" onClick={runXssAttackSuite} disabled={runningXssSuite || actionLoading}>
              {runningXssSuite ? 'Running Script Check...' : 'Run Script Check'}
            </Button>
          </div>
        </div>

        {xssRunResults.length ? (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Payload</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">HTTP</th>
                  <th className="px-3 py-2">Time (ms)</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {xssRunResults.map((row, index) => (
                  <tr key={`${row.payload}-${row.mode}-${index}`} className="border-t border-slate-200">
                    <td className="px-3 py-2 font-mono text-xs">{row.payload}</td>
                    <td className="px-3 py-2">{row.mode}</td>
                    <td className="px-3 py-2">{row.target || '--'}</td>
                    <td className="px-3 py-2">
                      <span className={row.status === 'PASS' ? 'text-emerald-700' : 'text-rose-700'}>{row.status}</span>
                    </td>
                    <td className="px-3 py-2">{row.statusCode ?? '--'}</td>
                    <td className="px-3 py-2">{row.responseTimeMs ?? '--'}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-700">Run JSON Input Checks</p>
          <div className="mt-2">
            <Button variant="danger" onClick={runJsonAttackSuite} disabled={runningJsonSuite || actionLoading}>
              {runningJsonSuite ? 'Running JSON Check...' : 'Run JSON Check'}
            </Button>
          </div>
        </div>

        {jsonRunResults.length ? (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Payload</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">HTTP</th>
                  <th className="px-3 py-2">Time (ms)</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {jsonRunResults.map((row, index) => (
                  <tr key={`${row.payload}-${row.mode}-${index}`} className="border-t border-slate-200">
                    <td className="px-3 py-2 font-mono text-xs">{row.payload}</td>
                    <td className="px-3 py-2">{row.mode}</td>
                    <td className="px-3 py-2">
                      <span className={row.status === 'PASS' ? 'text-emerald-700' : 'text-rose-700'}>{row.status}</span>
                    </td>
                    <td className="px-3 py-2">{row.statusCode ?? '--'}</td>
                    <td className="px-3 py-2">{row.responseTimeMs ?? '--'}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <p className="mt-3 text-xs text-slate-600">
          Recommended checks: return 4xx for invalid input, avoid stack-trace leaks, and do not echo unsafe input in responses.
        </p>
      </Card>
    </div>
  );
}

export default SecurityTestingPage;
