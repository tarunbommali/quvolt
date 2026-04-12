jest.mock('../services/api', () => ({
  getAccessToken: jest.fn(() => 'token'),
  getSocketUrl: jest.fn(() => 'http://localhost:4000'),
}));

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn(),
    io: { on: jest.fn() },
  })),
}));

import { useSocketStore } from '../stores/useSocketStore';

describe('useSocketStore event dedupe', () => {
  beforeEach(() => {
    useSocketStore.setState({
      socket: null,
      connected: false,
      connectionState: 'disconnected',
      lastError: null,
      joinedRoomCode: null,
      joinedSessionId: null,
      lastEventByName: {},
    });
  });

  it('drops duplicate payloads inside dedupe window and accepts later events', () => {
    jest.useFakeTimers();

    const payload = { roomCode: 'ABC123', status: 'waiting' };
    const first = useSocketStore.getState().shouldProcessEvent('room_state', payload);
    const second = useSocketStore.getState().shouldProcessEvent('room_state', payload);

    expect(first).toBe(true);
    expect(second).toBe(false);

    jest.advanceTimersByTime(251);
    const third = useSocketStore.getState().shouldProcessEvent('room_state', payload);
    expect(third).toBe(true);

    jest.useRealTimers();
  });
});
