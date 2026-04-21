import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { socketEventBus } from '../../sockets/socketEventBus';
import { SOCKET_EVENTS } from '../../sockets/socketEvents';

export const useLeaderboardStore = create()(devtools((set) => ({
    leaderboard: [],
    subjectLeaderboard: [],

    setLeaderboard: (data) => {
        const leaderboard = Array.isArray(data) ? data : (data?.leaderboard || data?.items || []);
        set({ leaderboard });
    },
    setSubjectLeaderboard: (data) => set({ subjectLeaderboard: data }),
    
    resetLeaderboard: () => set({
        leaderboard: [],
        subjectLeaderboard: []
    }),
}), { name: 'leaderboardStore' }));

socketEventBus.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, (l) => {
    const leaderboard = Array.isArray(l) ? l : (l?.leaderboard || l?.items || []);
    useLeaderboardStore.getState().setLeaderboard(leaderboard);
});

socketEventBus.on(SOCKET_EVENTS.QUIZ_FINISHED, (data) => {
    const leaderboard = Array.isArray(data) ? data : (data?.leaderboard || data?.topWinners || data?.items || []);
    if (leaderboard.length > 0) {
        useLeaderboardStore.getState().setLeaderboard(leaderboard);
    }
});

socketEventBus.on(SOCKET_EVENTS.REJOIN_SUCCESS, (data) => {
    const leaderboard = data?.leaderboard || (data?.userStats ? [data.userStats] : []);
    if (leaderboard.length > 0) {
        useLeaderboardStore.getState().setLeaderboard(leaderboard);
    }
});
