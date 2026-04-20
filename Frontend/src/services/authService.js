import apiClient from './apiClient';

export const authService = {
  async googleLogin(googleToken) {
    const response = await apiClient.post(
      '/auth/google',
      {},
      {
        headers: {
          Authorization: `Bearer ${googleToken}`,
        },
      },
    );
    return response.data;
  },
};
