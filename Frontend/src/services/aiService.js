import apiClient from './apiClient';

const providerIssuePattern = /(AI provider error|AI provider call failed|AI_API_KEY is missing|policy does not allow|safety|blocked)/i;

export function getAiProviderWarning(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  if (providerIssuePattern.test(rawText)) {
    return 'AI provider returned a restricted/safety response. The app will use safer prompting or fallback templates.';
  }

  return '';
}

export const aiService = {
  async analyzeError(payload) {
    const response = await apiClient.post('/ai/error-analyzer', payload);
    const data = response.data || {};
    return {
      rootCause: data.rootCause || data.root_cause || '',
      fixSuggestion: data.fixSuggestion || data.fix_suggestion || '',
      optimizationRecommendation: data.optimizationRecommendation || data.optimization_recommendation || '',
      rawModelResponse: data.rawModelResponse || data.raw_model_response || JSON.stringify(data),
    };
  },

  async generateTestCases(payload) {
    const response = await apiClient.post('/ai/test-case-generator', payload);
    return {
      testCases: Array.isArray(response.data?.testCases) ? response.data.testCases : [],
      rawModelResponse: response.data?.rawModelResponse || '',
    };
  },

  async chat(payload) {
    const response = await apiClient.post('/ai/chat', payload);
    return response.data;
  },
};
