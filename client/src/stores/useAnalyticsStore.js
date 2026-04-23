import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
    fetchRecentSessions,
    fetchFullAnalytics,
} from '../features/analytics/services/analytics.service';

/**
 * Module-level state for request tracking & real-time integrity.
 */
let _analyticsRequestSeq = 0;
let _lastSequence = 0;
let _lastFetchTime = 0;
let _pendingRefetch = false;

// UI Batch Buffer to prevent jitter
let _uiBuffer = null;
let _uiBufferTimer = null;

/**
 * useAnalyticsStore
 *
 * Design:
 * - Single unified API call (fetchFullAnalytics) replaces 3 separate calls.
 * - Race condition guard via request sequence number.
 * - `subscribeToRealtimeUpdates` wires the socket analytics:update event for live sync.
 * - `applyLiveUpdate` patches state incrementally from socket payloads without a full refetch.
 */
const useAnalyticsStore = create()(
    devtools(
        (set, get) => ({
            // ── Active session ─────────────────────────────────────────────────
            activeSessionId: null,

            // ── Session list (picker) ──────────────────────────────────────────
            recentSessions:  [],
            sessionsLoading: false,
            sessionsError:   null,

            // ── Unified analytics payload ──────────────────────────────────────
            analyticsLoading: false,
            analyticsError:   null,

            // Per-domain data (populated from the unified response)
            sessionAnalytics: null,   // { avgScore, completionRate, totalParticipants, … }
            questionInsights: null,   // { questions[], summary }
            audienceInsights: null,   // { deviceBreakdown, participationTimeline, … }
            activePlan:       'FREE', // plan returned from backend for this session

            // ── Live updates ───────────────────────────────────────────────────
            liveParticipantCount: 0,

            // ─────────────────────────────────────────────────────────────────
            // Actions
            // ─────────────────────────────────────────────────────────────────

            /**
             * Load recent sessions and auto-select the most recent one.
             * Guards against concurrent calls.
             */
            fetchRecentSessions: async (limit = 10) => {
                if (get().sessionsLoading) return;
                set({ sessionsLoading: true, sessionsError: null });
                try {
                    const raw  = await fetchRecentSessions(limit);
                    const list = Array.isArray(raw) ? raw : [];
                    set({ recentSessions: list, sessionsLoading: false });
                    // Auto-select most recent if none active yet
                    if (list.length > 0 && !get().activeSessionId) {
                        get().setActiveSession(list[0].sessionId);
                    }
                } catch (err) {
                    set({
                        sessionsError:   err?.response?.data?.message || err.message || 'Failed to load sessions',
                        sessionsLoading: false,
                    });
                }
            },

            /**
             * Switch active session.
             * Clears stale analytics data and cancels any in-flight request
             * by incrementing the global sequence counter.
             */
            setActiveSession: (sessionId) => {
                if (get().activeSessionId === sessionId) return;
                _analyticsRequestSeq++; // cancel any in-flight response for old session
                _lastSequence = 0;      // reset sequence tracker for new session
                _lastFetchTime = 0;
                _pendingRefetch = false;
                
                if (_uiBufferTimer) {
                    clearTimeout(_uiBufferTimer);
                    _uiBufferTimer = null;
                }
                _uiBuffer = null;
                
                set({
                    activeSessionId:  sessionId,
                    analyticsLoading: false,
                    analyticsError:   null,
                    sessionAnalytics: null,
                    questionInsights: null,
                    audienceInsights: null,
                    activePlan:       'FREE',
                    liveParticipantCount: 0,
                });
            },

            /**
             * Fetch the unified analytics payload for the active session.
             * Race-condition-safe: stale responses are discarded via seqId.
             *
             * @param {string} sessionId
             */
            fetchFullAnalytics: async (sessionId) => {
                const seq = ++_analyticsRequestSeq;
                set({ analyticsLoading: true, analyticsError: null });
                try {
                    const data = await fetchFullAnalytics(sessionId);

                    // Discard if user switched session while this was in-flight
                    if (seq !== _analyticsRequestSeq) return;

                    set({
                        sessionAnalytics: data.session   || null,
                        questionInsights: data.questions || null,
                        audienceInsights: data.audience  || null,
                        activePlan:       data.plan      || 'FREE',
                        analyticsLoading: false,
                        analyticsError:   null,
                    });
                } catch (err) {
                    if (seq !== _analyticsRequestSeq) return;
                    set({
                        analyticsError:   err?.response?.data?.message || err.message || 'Failed to load analytics',
                        analyticsLoading: false,
                    });
                }
            },

            /**
             * Apply an incremental live update from a socket event.
             * Called by the socket handler to avoid a full re-fetch for small updates.
             *
             * @param {{ liveCount?, avgScore?, totalParticipants?, completionRate? }} patch
             */
            applyLiveUpdate: (patch = {}) => {
                if (patch.liveCount !== undefined) {
                    set({ liveParticipantCount: patch.liveCount });
                }
                if (patch.avgScore !== undefined || patch.totalParticipants !== undefined) {
                    set((state) => ({
                        sessionAnalytics: state.sessionAnalytics
                            ? {
                                ...state.sessionAnalytics,
                                ...(patch.avgScore           !== undefined && { avgScore:          patch.avgScore }),
                                ...(patch.totalParticipants  !== undefined && { totalParticipants: patch.totalParticipants }),
                                ...(patch.completionRate     !== undefined && { completionRate:    patch.completionRate }),
                                ...(patch.totalResponses     !== undefined && { totalResponses:    patch.totalResponses }),
                              }
                            : state.sessionAnalytics,
                    }));
                }
            },

            /**
             * Subscribe to socket analytics:update events.
             * Returns a cleanup function — call it in useEffect's return.
             *
             * Strategy:
             *   ANSWER_SUBMITTED → patch live count, trigger lightweight re-fetch
             *   SESSION_ENDED    → full re-fetch of unified payload
             *
             * @param {import('socket.io-client').Socket} socket
             * @returns {() => void}
             */
            subscribeToRealtimeUpdates: (socket) => {
                if (!socket) return () => {};

                const handler = ({ sessionId, event, liveCount, avgScore, totalParticipants, completionRate, totalResponses, sequenceNumber }) => {
                    const { activeSessionId, applyLiveUpdate, fetchFullAnalytics: doFetch } = get();

                    // Sequence guard: prevent out-of-order and duplicate packets
                    if (sequenceNumber !== undefined) {
                        if (sequenceNumber <= _lastSequence) return;
                        _lastSequence = sequenceNumber;
                    }

                    // UI Buffer for overpatching jitter protection (flush every 300ms)
                    const bufferUpdate = (patch) => {
                        _uiBuffer = { ..._uiBuffer, ...patch };
                        if (!_uiBufferTimer) {
                            _uiBufferTimer = setTimeout(() => {
                                applyLiveUpdate(_uiBuffer);
                                _uiBuffer = null;
                                _uiBufferTimer = null;
                            }, 300);
                        }
                    };

                    // Always apply live count
                    if (liveCount !== undefined) {
                        bufferUpdate({ liveCount });
                    }

                    // Only act if this event concerns the session the dashboard is showing
                    if (!sessionId || !activeSessionId || sessionId !== activeSessionId) return;

                    if (event === 'ANSWER_SUBMITTED') {
                        // Patch known fields to buffer
                        bufferUpdate({ avgScore, totalParticipants, completionRate, totalResponses, liveCount });
                        
                        // Throttle + Batch strategy: Max 1 fetch per 5 seconds
                        const now = Date.now();
                        if (now - _lastFetchTime > 5000) {
                            _lastFetchTime = now;
                            _pendingRefetch = false;
                            clearTimeout(socket._analyticsRefetchTimer);
                            doFetch(sessionId);
                        } else if (!_pendingRefetch) {
                            _pendingRefetch = true;
                            // Schedule a catch-up fetch once the throttle window passes
                            const delay = 5000 - (now - _lastFetchTime);
                            socket._analyticsRefetchTimer = setTimeout(() => {
                                _lastFetchTime = Date.now();
                                _pendingRefetch = false;
                                doFetch(sessionId);
                            }, delay);
                        }
                    } else if (event === 'SESSION_ENDED') {
                        // Session finalized — fetch the now-complete analytics
                        clearTimeout(socket._analyticsRefetchTimer);
                        _lastFetchTime = Date.now();
                        _pendingRefetch = false;
                        doFetch(sessionId);
                    }
                };

                socket.on('analytics:update', handler);
                return () => {
                    socket.off('analytics:update', handler);
                    clearTimeout(socket._analyticsRefetchTimer);
                };
            },

            /** Full reset */
            reset: () => {
                _analyticsRequestSeq++;
                
                if (_uiBufferTimer) {
                    clearTimeout(_uiBufferTimer);
                    _uiBufferTimer = null;
                }
                _uiBuffer = null;
                
                set({
                    activeSessionId:     null,
                    recentSessions:      [],
                    sessionsLoading:     false,
                    sessionsError:       null,
                    analyticsLoading:    false,
                    analyticsError:      null,
                    sessionAnalytics:    null,
                    questionInsights:    null,
                    audienceInsights:    null,
                    activePlan:          'FREE',
                    liveParticipantCount: 0,
                });
            },
        }),
        { name: 'qb_analytics_store' },
    ),
);

export default useAnalyticsStore;
