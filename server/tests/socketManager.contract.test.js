const socketManager = require('../modules/realtime/SocketManager');
const { addSequenceNumber } = require('../services/session/session.realtime.service');
const sessionStore = require('../services/session/session.service');

// Mock dependencies
jest.mock('../services/session/session.realtime.service');
jest.mock('../services/session/session.service');
jest.mock('../utils/logger');

describe('SocketManager Contract & Sequencing', () => {
    let mockIo;
    let mockTo;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockTo = { emit: jest.fn() };
        mockIo = { to: jest.fn().mockReturnValue(mockTo) };
        
        socketManager.initialize(mockIo);
    });

    describe('Contract Validation', () => {
        test('broadcasted events must include sequenceNumber and serverTime', async () => {
            const roomCode = 'ROOM1';
            const payload = { score: 100 };
            
            // Mock addSequenceNumber to return sequenced data
            addSequenceNumber.mockResolvedValue({
                ...payload,
                sequenceNumber: 1,
                timestamp: Date.now()
            });

            await socketManager.broadcast(roomCode, 'test_event', payload);

            expect(mockIo.to).toHaveBeenCalledWith(roomCode);
            expect(mockTo.emit).toHaveBeenCalledWith('test_event', expect.objectContaining({
                sequenceNumber: 1,
                serverTime: expect.any(Number)
            }));
        });

        test('serverTime should be within 100ms of current time', async () => {
            addSequenceNumber.mockResolvedValue({ sequenceNumber: 1 });
            
            await socketManager.broadcast('R1', 'ev', {});
            const emittedData = mockTo.emit.mock.calls[0][1];
            
            expect(Math.abs(Date.now() - emittedData.serverTime)).toBeLessThan(100);
        });
    });

    describe('Sequence Integrity (Simulated Client Logic)', () => {
        test('sequentially increasing numbers are generated', async () => {
            addSequenceNumber
                .mockResolvedValueOnce({ sequenceNumber: 1 })
                .mockResolvedValueOnce({ sequenceNumber: 2 })
                .mockResolvedValueOnce({ sequenceNumber: 3 });

            await socketManager.broadcast('R1', 'e1', {});
            await socketManager.broadcast('R1', 'e2', {});
            await socketManager.broadcast('R1', 'e3', {});

            expect(mockTo.emit).toHaveBeenNthCalledWith(1, 'e1', expect.objectContaining({ sequenceNumber: 1 }));
            expect(mockTo.emit).toHaveBeenNthCalledWith(2, 'e2', expect.objectContaining({ sequenceNumber: 2 }));
            expect(mockTo.emit).toHaveBeenNthCalledWith(3, 'e3', expect.objectContaining({ sequenceNumber: 3 }));
        });
    });

    describe('Error Resilience', () => {
        test('falls back to raw emit if sequencing service fails', async () => {
            addSequenceNumber.mockRejectedValue(new Error('Redis Down'));
            const rawPayload = { important: 'data' };

            await socketManager.broadcast('R1', 'critical_event', rawPayload);

            // Should still emit the raw data even if sequence fails (Availability > Ordering in fallback)
            expect(mockTo.emit).toHaveBeenCalledWith('critical_event', rawPayload);
        });
    });

    describe('Mapping', () => {
        test('all required bus events are bridged to socket events', () => {
            const eventBus = require('../modules/core/EventBus');
            const emitSpy = jest.spyOn(socketManager, 'broadcast').mockResolvedValue(true);

            // Trigger a few internal events
            eventBus.emit('QUESTION_START', { roomCode: 'R1', data: {} });
            eventBus.emit('QUIZ_PAUSED', { roomCode: 'R1', data: {} });
            eventBus.emit('QUIZ_ENDED', { roomCode: 'R1', data: {} });

            expect(emitSpy).toHaveBeenCalledWith('R1', 'new_question', expect.any(Object));
            expect(emitSpy).toHaveBeenCalledWith('R1', 'quiz_paused', expect.any(Object));
            expect(emitSpy).toHaveBeenCalledWith('R1', 'quiz_finished', expect.any(Object));
            
            emitSpy.mockRestore();
        });
    });
});
