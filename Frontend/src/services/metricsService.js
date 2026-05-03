import apiClient from './apiClient';

export const metricsService = {
  async getAverageResponseTime(apiRequestId) {
    const response = await apiClient.get(`/api-requests/${apiRequestId}/performance/average-response-time`);
    return {
      averageResponseTimeMs: Number(response.data?.averageResponseTimeMs || 0),
      totalExecutions: Number(response.data?.totalExecutions || 0),
      apiRequestId: response.data?.apiRequestId ?? Number(apiRequestId),
    };
  },

  async getSuccessRate(apiRequestId) {
    const response = await apiClient.get(`/api-requests/${apiRequestId}/performance/success-rate`);
    return {
      totalExecutions: Number(response.data?.totalExecutions || 0),
      successfulExecutions: Number(response.data?.successfulExecutions || 0),
      successRatePercentage: Number(response.data?.successRatePercentage || 0),
      apiRequestId: response.data?.apiRequestId ?? Number(apiRequestId),
    };
  },

  async getFailureRate(apiRequestId) {
    const response = await apiClient.get(`/api-requests/${apiRequestId}/performance/failure-rate`);
    return {
      totalExecutions: Number(response.data?.totalExecutions || 0),
      failedExecutions: Number(response.data?.failedExecutions || 0),
      failureRatePercentage: Number(response.data?.failureRatePercentage || 0),
      apiRequestId: response.data?.apiRequestId ?? Number(apiRequestId),
    };
  },
};
