/**
 * template.api.js
 * Axios wrappers for the /api/templates REST endpoints.
 *
 * NOTE: apiClient interceptor already unwraps { success, data } → r.data
 * so we access r.data directly (not r.data?.data).
 */
import api from './apiClient';

const BASE = '/templates';

export const fetchTemplates     = ()         => api.get(BASE).then(r => r.data ?? []);
export const fetchDefault       = ()         => api.get(`${BASE}/default`).then(r => r.data);
export const fetchTemplateById  = (id)       => api.get(`${BASE}/${id}`).then(r => r.data);
export const createTemplate     = (data)     => api.post(BASE, data).then(r => r.data);
export const updateTemplate     = (id, data) => api.put(`${BASE}/${id}`, data).then(r => r.data);
export const setDefaultTemplate = (id)       => api.patch(`${BASE}/${id}/default`).then(r => r.data);
export const deleteTemplate     = (id)       => api.delete(`${BASE}/${id}`).then(r => r.data);
