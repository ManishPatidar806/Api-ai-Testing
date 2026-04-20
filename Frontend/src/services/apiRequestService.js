import apiClient from './apiClient';

export const apiRequestService = {
  async create(payload) {
    const response = await apiClient.post('/api-requests', payload);
    return response.data;
  },

  async listMine() {
    const response = await apiClient.get('/api-requests');
    return Array.isArray(response.data) ? response.data : [];
  },

  async updateMine(requestId, payload) {
    const response = await apiClient.put(`/api-requests/${requestId}`, payload);
    return response.data;
  },

  async deleteMine(requestId) {
    await apiClient.delete(`/api-requests/${requestId}`);
  },

  async executeMine(requestId) {
    const response = await apiClient.post(`/api-requests/${requestId}/execute`);
    return response.data;
  },

  async listRecentResponses(requestId) {
    const response = await apiClient.get(`/api-requests/${requestId}/responses`);
    return Array.isArray(response.data) ? response.data : [];
  },

  async getMine(requestId) {
    const response = await apiClient.get(`/api-requests/${requestId}`);
    return response.data;
  },
};
