import api from '@/lib/api';

export const apiClient = api;

export const { get, post, patch, delete: remove } = api;

export default api;
