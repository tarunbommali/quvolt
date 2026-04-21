/**
 * useTemplateStore.js
 *
 * Zustand store for quiz template configuration management.
 * Acts as the single source of truth for the active session template.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import * as templateApi from '../services/template.api';

export const useTemplateStore = create()(devtools((set, get) => ({
    // ── State ──────────────────────────────────────────────────────────────
    templates: [],
    activeTemplate: null,    // The template to use for the next session
    loading: false,
    saving: false,
    error: null,

    // ── Fetch all templates for the host ───────────────────────────────────
    fetchTemplates: async () => {
        set({ loading: true, error: null });
        try {
            const templates = await templateApi.fetchTemplates();
            const active = templates.find(t => t.isDefault) ?? templates[0] ?? null;
            set({ templates, activeTemplate: active, loading: false });
        } catch (err) {
            set({ error: err?.response?.data?.message || 'Failed to load templates', loading: false });
        }
    },

    // ── Fetch and set the default template ────────────────────────────────
    fetchDefault: async () => {
        set({ loading: true, error: null });
        try {
            const template = await templateApi.fetchDefault();
            set({ activeTemplate: template, loading: false });
            return template;
        } catch (err) {
            set({ error: err?.response?.data?.message || 'Failed to load default template', loading: false });
            return null;
        }
    },

    // ── Set which template to use for the next session ─────────────────────
    selectTemplate: (template) => set({ activeTemplate: template }),

    // ── Create a new template ──────────────────────────────────────────────
    createTemplate: async (data) => {
        set({ saving: true, error: null });
        try {
            const template = await templateApi.createTemplate(data);
            set(s => ({ templates: [...s.templates, template], saving: false }));
            return template;
        } catch (err) {
            set({ error: err?.response?.data?.message || 'Failed to create template', saving: false });
            throw err;
        }
    },

    // ── Update a template ──────────────────────────────────────────────────
    updateTemplate: async (id, data) => {
        set({ saving: true, error: null });
        try {
            const updated = await templateApi.updateTemplate(id, data);
            set(s => ({
                templates: s.templates.map(t => (t._id === id ? updated : t)),
                activeTemplate: s.activeTemplate?._id === id ? updated : s.activeTemplate,
                saving: false,
            }));
            return updated;
        } catch (err) {
            set({ error: err?.response?.data?.message || 'Failed to update template', saving: false });
            throw err;
        }
    },

    // ── Set a template as default ──────────────────────────────────────────
    setDefault: async (id) => {
        set({ saving: true, error: null });
        try {
            const updated = await templateApi.setDefaultTemplate(id);
            set(s => ({
                templates: s.templates.map(t => ({ ...t, isDefault: t._id === id })),
                activeTemplate: updated,
                saving: false,
            }));
        } catch (err) {
            set({ error: err?.response?.data?.message || 'Failed to set default', saving: false });
        }
    },

    // ── Delete a template ──────────────────────────────────────────────────
    deleteTemplate: async (id) => {
        set({ saving: true, error: null });
        try {
            await templateApi.deleteTemplate(id);
            set(s => ({
                templates: s.templates.filter(t => t._id !== id),
                activeTemplate: s.activeTemplate?._id === id ? null : s.activeTemplate,
                saving: false,
            }));
        } catch (err) {
            set({ error: err?.response?.data?.message || 'Failed to delete template', saving: false });
        }
    },

    clearError: () => set({ error: null }),
}), { name: 'templateStore' }));
