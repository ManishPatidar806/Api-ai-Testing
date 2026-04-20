import apiClient from './apiClient';

export const testCaseService = {
  async getAll(apiRequestId) {
    const response = await apiClient.get(`/api-requests/${apiRequestId}/test-cases`);
    return Array.isArray(response.data) ? response.data : [];
  },

  async create(apiRequestId, payload) {
    const response = await apiClient.post(`/api-requests/${apiRequestId}/test-cases`, payload);
    return response.data;
  },

  async runOne(apiRequestId, testCaseId) {
    const response = await apiClient.post(`/api-requests/${apiRequestId}/test-cases/${testCaseId}/run`);
    return response.data;
  },

  async runAll(apiRequestId) {
    const response = await apiClient.post(`/api-requests/${apiRequestId}/test-cases/run-all`);
    return response.data;
  },

  async delete(apiRequestId, testCaseId) {
    await apiClient.delete(`/api-requests/${apiRequestId}/test-cases/${testCaseId}`);
  },

  async listRecentResults(apiRequestId) {
    const response = await apiClient.get(`/api-requests/${apiRequestId}/test-results`);
    return Array.isArray(response.data) ? response.data : [];
  },
};
