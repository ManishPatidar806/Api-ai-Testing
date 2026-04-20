import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';
import ToastMessage from '../../components/common/ToastMessage';
import { aiService, getAiProviderWarning } from '../../services/aiService';
import { apiRequestService } from '../../services/apiRequestService';

function parseRawModelSections(rawText) {
  const fallback = {
    rootCause: '',
    fixSuggestion: '',
    optimizationRecommendation: '',
  };

  if (!rawText || !String(rawText).trim()) {
    return fallback;
  }

  const text = String(rawText).replace(/\r\n/g, '\n').trim();
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] || text).trim();

  const normalizeSection = (value) => {
    return String(value || '')
      .replace(/^[-*\s]+/, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const splitFallbackBlocks = (value) => {
    const blocks = value
      .split(/\n\s*\n|\n(?=\d+\.|[-*]\s)/g)
      .map((item) => normalizeSection(item))
      .filter(Boolean);

    if (blocks.length >= 3) {
      return {
        rootCause: blocks[0],
        fixSuggestion: blocks[1],
        optimizationRecommendation: blocks[2],
      };
    }

    const sentences = value
      .replace(/\n+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map((item) => normalizeSection(item))
      .filter(Boolean);

    return {
      rootCause: sentences[0] || blocks[0] || normalizeSection(value),
      fixSuggestion: sentences[1] || blocks[1] || '',
      optimizationRecommendation: sentences[2] || blocks[2] || '',
    };
  };

  const parseJsonLike = (value) => {
    const variants = [value];
    const first = value.indexOf('{');
    const last = value.lastIndexOf('}');
    if (first >= 0 && last > first) {
      variants.push(value.slice(first, last + 1));
    }

    for (const variant of variants) {
      try {
        const parsed = JSON.parse(variant);
        return {
          rootCause: normalizeSection(parsed.rootCause || parsed.root_cause || parsed['Root Cause'] || ''),
          fixSuggestion: normalizeSection(parsed.fixSuggestion || parsed.fix_suggestion || parsed['Fix Suggestion'] || parsed.fix || ''),
          optimizationRecommendation: normalizeSection(parsed.optimizationRecommendation || parsed.optimization_recommendation || parsed.optimization || parsed['Optimization'] || ''),
        };
      } catch {
        // Continue trying other JSON variants.
      }
    }

    return null;
  };

  const parseKeyedSections = (value) => {
    const readSection = (keys) => {
      for (const key of keys) {
        const pattern = new RegExp(`${key}\\s*[:\\-]\\s*([\\s\\S]*?)(?=\\n(?:[A-Z_ ]+|Root Cause|Fix|Fix Suggestion|Optimization(?: Recommendation)?)\\s*[:\\-]|$)`, 'i');
        const match = value.match(pattern);
        if (match?.[1]?.trim()) {
          return normalizeSection(match[1]);
        }
      }
      return '';
    };

    return {
      rootCause: readSection(['ROOT_CAUSE', 'Root Cause', 'Cause', 'Problem']),
      fixSuggestion: readSection(['FIX', 'Fix Suggestion', 'Suggestion', 'Resolution', 'Action']),
      optimizationRecommendation: readSection(['OPTIMIZATION', 'Optimization Recommendation', 'Optimization', 'Improvement']),
    };
  };

  const jsonParsed = parseJsonLike(candidate);
  if (jsonParsed && (jsonParsed.rootCause || jsonParsed.fixSuggestion || jsonParsed.optimizationRecommendation)) {
    return jsonParsed;
  }

  const keyed = parseKeyedSections(text);
  if (keyed.rootCause || keyed.fixSuggestion || keyed.optimizationRecommendation) {
    return keyed;
  }

  return splitFallbackBlocks(text);
}

function isGenericFallbackText(value) {
  if (!value) {
    return true;
  }

  const normalized = String(value).trim().toLowerCase();
  return [
    'unable to determine exact root cause.',
    'validate endpoint, payload, auth, and upstream dependency state.',
    'use tighter timeouts, retries, and structured logging for diagnostics.',
    'no root cause generated yet.',
    'no fix suggestion generated yet.',
    'no optimization recommendation generated yet.',
  ].includes(normalized);
}

function pickAnalysisValue(primaryValue, rawValue, fallbackText) {
  const primary = (primaryValue || '').trim();
  const raw = (rawValue || '').trim();

  if (primary && !isGenericFallbackText(primary)) {
    return primary;
  }
  if (raw) {
    return raw;
  }
  if (primary) {
    return primary;
  }
  return fallbackText;
}

function pickAnalysisWithSource(primaryValue, rawValue, fallbackText) {
  const primary = (primaryValue || '').trim();
  const raw = (rawValue || '').trim();

  if (primary && !isGenericFallbackText(primary)) {
    return { value: primary, fromRaw: false };
  }
  if (raw) {
    return { value: raw, fromRaw: true };
  }
  if (primary) {
    return { value: primary, fromRaw: false };
  }
  return { value: fallbackText, fromRaw: false };
}

function AiErrorAnalyzerPage() {
  const navigate = useNavigate();
  const [apiRequests, setApiRequests] = useState([]);
  const [selectedApiRequestId, setSelectedApiRequestId] = useState('');
  const [requestDetails, setRequestDetails] = useState('');
  const [responseDetails, setResponseDetails] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [providerWarning, setProviderWarning] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState('');

  const formatSyncedAt = (value) => {
    if (!value) {
      return '--';
    }
    return new Date(value).toLocaleString();
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const allRequests = await apiRequestService.listMine();
        const failedOnly = (await Promise.all(
          allRequests.map(async (item) => {
            try {
              const responses = await apiRequestService.listRecentResponses(item.id);
              const failed = responses.find((res) => !res.success || res.errorMessage || Number(res.statusCode) >= 400);
              if (!failed) {
                return null;
              }
              return {
                ...item,
                failedResponse: failed,
              };
            } catch {
              return null;
            }
          }),
        )).filter(Boolean);

        setApiRequests(failedOnly);
        if (failedOnly.length) {
          setSelectedApiRequestId(String(failedOnly[0].id));
        }
        setLastSyncedAt(new Date().toISOString());
      } catch (loadError) {
        setError(loadError.message || 'Failed to load failed API requests');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!selectedApiRequestId) {
      setSelectedRequestDetails(null);
      setRequestDetails('');
      setResponseDetails('');
      return;
    }

    const selected = apiRequests.find((item) => String(item.id) === String(selectedApiRequestId));
    if (!selected) {
      return;
    }

    setSelectedRequestDetails(selected);

    const requestBodyPreview = selected.requestBody || '{}';
    setRequestDetails(`${selected.httpMethod} ${selected.url}\nBody: ${requestBodyPreview}`);

    const failed = selected.failedResponse;
    if (failed) {
      const summary = [
        `Status: ${failed.statusCode ?? 'N/A'}`,
        `Error: ${failed.errorMessage || 'N/A'}`,
        `Response: ${failed.responseBody || ''}`,
      ].join('\n');
      setResponseDetails(summary);
    } else {
      setResponseDetails('No failed response summary found for this endpoint.');
    }
    setLastSyncedAt(new Date().toISOString());
  }, [selectedApiRequestId, apiRequests]);

  const onRequestDetailsChange = (event) => {
    setRequestDetails(event.target.value);
  };

  const onResponseDetailsChange = (event) => {
    setResponseDetails(event.target.value);
  };

  const runAnalysis = async () => {
    if (!selectedApiRequestId) {
      setError('Please select an API request');
      return;
    }

    setError('');
    setProviderWarning('');
    setHasAnalyzed(true);
    setAnalyzing(true);
    try {
      const data = await aiService.analyzeError({
        apiRequestId: Number(selectedApiRequestId),
        errorMessage: responseDetails || requestDetails,
      });
      setAnalysis({
        rootCause: (data.rootCause || '').trim(),
        fixSuggestion: (data.fixSuggestion || '').trim(),
        optimizationRecommendation: (data.optimizationRecommendation || '').trim(),
        rawModelResponse: data.rawModelResponse || '',
      });
      setProviderWarning(getAiProviderWarning(data.rawModelResponse));
      setLastSyncedAt(new Date().toISOString());
    } catch (analysisError) {
      setError(analysisError.message || 'Failed to analyze error');
      setAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return <LoadingState text="Loading AI analyzer context..." />;
  }

  if (!apiRequests.length) {
    return (
      <div>
        <EmptyState
          title="No failed API requests found"
          description="Run API requests first and trigger at least one failed response to use AI Error Analyzer."
        />
        <div className="mt-3 flex justify-center">
          <Button onClick={() => navigate('/workspace', { state: { returnTo: '/ai-error-analyzer', waitForFirstRequest: true } })}>Go To API Workspace</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="AI Error Analyzer" subtitle="Paste failed request and response details to get root-cause insights">
        <p className="mb-1 text-xs text-slate-500">Last synced: {formatSyncedAt(lastSyncedAt)}</p>
        <p className="mb-2 text-xs text-slate-500">
          Tip: only endpoints with failed responses are listed here.
        </p>
        <div className="mb-4">
          <label className="field-label">API Request</label>
          <select
            className="field-input"
            value={selectedApiRequestId}
            disabled={analyzing}
            onChange={(event) => setSelectedApiRequestId(event.target.value)}
          >
            {apiRequests.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.httpMethod})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div>
            <label className="field-label">Request Details</label>
            <textarea
              className="field-input min-h-[180px]"
              value={requestDetails}
              onChange={onRequestDetailsChange}
              disabled={analyzing}
            />
          </div>
          <div>
            <label className="field-label">Response Summary</label>
            <textarea
              className="field-input min-h-[180px]"
              value={responseDetails}
              onChange={onResponseDetailsChange}
              disabled={analyzing}
            />
          </div>
        </div>

        {selectedRequestDetails ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p>
              <span className="font-semibold">Selected Endpoint:</span> {selectedRequestDetails.httpMethod} {selectedRequestDetails.url}
            </p>
            <p className="mt-1">
              <span className="font-semibold">Request Name:</span> {selectedRequestDetails.name}
            </p>
          </div>
        ) : null}

        <ToastMessage type="error" text={error} onClose={() => setError('')} />
        <ToastMessage type="info" text={providerWarning} onClose={() => setProviderWarning('')} />
        <Button variant="danger" className="mt-4" onClick={runAnalysis} disabled={analyzing}>
          {analyzing ? 'Analyzing...' : 'Analyze Failure'}
        </Button>
      </Card>

      {hasAnalyzed ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(() => {
            const rawSections = parseRawModelSections(analysis?.rawModelResponse);
            const rootCauseData = pickAnalysisWithSource(
              analysis?.rootCause,
              rawSections.rootCause,
              'No root cause generated yet.',
            );
            const fixSuggestionData = pickAnalysisWithSource(
              analysis?.fixSuggestion,
              rawSections.fixSuggestion,
              'No fix suggestion generated yet.',
            );
            const optimizationData = pickAnalysisWithSource(
              analysis?.optimizationRecommendation,
              rawSections.optimizationRecommendation,
              'No optimization recommendation generated yet.',
            );

            return (
              <>
          <Card title="Root Cause">
            {rootCauseData.fromRaw ? <p className="mb-2 text-xs font-medium text-blue-600">Parsed from raw output</p> : null}
            <p className="text-sm leading-6 text-slate-600">{rootCauseData.value}</p>
          </Card>
          <Card title="Fix Suggestion">
            {fixSuggestionData.fromRaw ? <p className="mb-2 text-xs font-medium text-blue-600">Parsed from raw output</p> : null}
            <p className="text-sm leading-6 text-slate-600">{fixSuggestionData.value}</p>
          </Card>
          <Card title="Optimization">
            {optimizationData.fromRaw ? <p className="mb-2 text-xs font-medium text-blue-600">Parsed from raw output</p> : null}
            <p className="text-sm leading-6 text-slate-600">{optimizationData.value}</p>
          </Card>
              </>
            );
          })()}
        </section>
      ) : null}
    </div>
  );
}

export default AiErrorAnalyzerPage;
