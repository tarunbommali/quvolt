import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { socketEventBus } from '../../sockets/socketEventBus';
import { SOCKET_EVENTS } from '../../sockets/socketEvents';

export const useParticipantStore = create()(devtools((set) => ({
    participants: [],
    invitedCount: 0,
    joinedCount: 0,

    setParticipants: (data) => {
        const participants = Array.isArray(data) ? data : (data?.participants || data?.items || []);
        set({ 
            participants,
            joinedCount: participants.length
        });
    },
    
    setInvitedCount: (count) => set({ invitedCount: count }),
    
    resetParticipants: () => set({
        participants: [],
        invitedCount: 0,
        joinedCount: 0
    }),
}), { name: 'participantStore' }));

socketEventBus.on(SOCKET_EVENTS.PARTICIPANTS_UPDATE, (payload) => {
    const participants = Array.isArray(payload) ? payload : (payload?.participants || []);
    useParticipantStore.getState().setParticipants(participants);
});
