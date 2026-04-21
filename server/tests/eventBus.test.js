const EventBus = require('../modules/core/EventBus');
const socketManager = require('../modules/realtime/SocketManager');

// We need to use the singleton instance since that's what SocketManager uses
const bus = EventBus;

describe('EventBus (Observer Pattern)', () => {
    let mockHandler1;
    let mockHandler2;

    beforeEach(() => {
        // Clear all listeners from the singleton to ensure test isolation
        bus.listeners = new Map();
        mockHandler1 = jest.fn();
        mockHandler2 = jest.fn();
    });

    describe('Subscription System', () => {
        test('subscribe() adds handlers to an event', () => {
            bus.subscribe('TEST_EVENT', mockHandler1);
            bus.subscribe('TEST_EVENT', mockHandler2);
            
            expect(bus.listeners.get('TEST_EVENT')).toHaveLength(2);
            expect(bus.listeners.get('TEST_EVENT')).toContain(mockHandler1);
            expect(bus.listeners.get('TEST_EVENT')).toContain(mockHandler2);
        });

        test('on() is an alias for subscribe()', () => {
            bus.on('TEST_EVENT', mockHandler1);
            expect(bus.listeners.get('TEST_EVENT')).toContain(mockHandler1);
        });
    });

    describe('Emission', () => {
        test('emit() triggers all handlers with correct payload', () => {
            const payload = { foo: 'bar' };
            bus.subscribe('MSG', mockHandler1);
            bus.subscribe('MSG', mockHandler2);
            
            bus.emit('MSG', payload);
            
            expect(mockHandler1).toHaveBeenCalledWith(payload);
            expect(mockHandler2).toHaveBeenCalledWith(payload);
            expect(mockHandler1).toHaveBeenCalledTimes(1);
        });

        test('handlers are executed in order of registration', () => {
            const executionOrder = [];
            bus.subscribe('ORDER', () => executionOrder.push(1));
            bus.subscribe('ORDER', () => executionOrder.push(2));
            
            bus.emit('ORDER');
            expect(executionOrder).toEqual([1, 2]);
        });

        test('handler errors do not stop other handlers', () => {
            const errorLogger = jest.spyOn(console, 'error').mockImplementation(() => {});
            const badHandler = () => { throw new Error('Boom'); };
            
            bus.subscribe('FAIL', badHandler);
            bus.subscribe('FAIL', mockHandler1);
            
            bus.emit('FAIL');
            
            expect(mockHandler1).toHaveBeenCalled();
            expect(errorLogger).toHaveBeenCalled();
            errorLogger.mockRestore();
        });
    });

    describe('Unsubscribe', () => {
        test('unsubscribe() removes specific handler', () => {
            bus.subscribe('REMOVE', mockHandler1);
            bus.subscribe('REMOVE', mockHandler2);
            
            bus.unsubscribe('REMOVE', mockHandler1);
            bus.emit('REMOVE');
            
            expect(mockHandler1).not.toHaveBeenCalled();
            expect(mockHandler2).toHaveBeenCalled();
        });

        test('subscribe() returns an unsubscribe function', () => {
            const unsub = bus.subscribe('AUTO', mockHandler1);
            unsub();
            bus.emit('AUTO');
            expect(mockHandler1).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        test('emit event with no listeners should not throw', () => {
            expect(() => bus.emit('GHOST_EVENT', { data: 1 })).not.toThrow();
        });

        test('duplicate handler registration triggers multiple times (standard JS behavior)', () => {
            bus.subscribe('DUP', mockHandler1);
            bus.subscribe('DUP', mockHandler1);
            
            bus.emit('DUP');
            expect(mockHandler1).toHaveBeenCalledTimes(2);
        });
    });

    describe('Integration: EventBus → SocketManager', () => {
        test('emitting internal event should trigger socket broadcast', async () => {
            // Mock SocketManager.broadcast
            const broadcastSpy = jest.spyOn(socketManager, 'broadcast').mockResolvedValue(true);
            
            // Re-initialize SocketManager to ensure it subscribes to our fresh bus
            socketManager.io = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
            socketManager._setupEventSubscriptions();

            const payload = { roomCode: 'ROOM123', data: { question: 'Who?' } };
            bus.emit('QUESTION_START', payload);

            expect(broadcastSpy).toHaveBeenCalledWith('ROOM123', 'new_question', payload.data);
            broadcastSpy.mockRestore();
        });
    });
});
