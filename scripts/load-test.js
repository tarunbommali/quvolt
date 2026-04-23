const path = require('path');
const root = path.resolve(__dirname, '..');
const { io } = require(path.join(root, 'client', 'node_modules', 'socket.io-client'));

const BASE = process.env.QUIZ_API_BASE_URL || 'http://localhost:5000';
const CONCURRENCY = 100;
const ROOM_CODE = process.argv[2] || 'DEMO123';

async function simulateParticipant(id) {
    return new Promise((resolve) => {
        const socket = io(BASE, {
            transports: ['websocket'],
            reconnection: true,
            query: { guestName: `LoadUser_${id}` }
        });

        const start = Date.now();
        socket.on('connect', () => {
            const latency = Date.now() - start;
            socket.emit('join_room', { roomCode: ROOM_CODE });
            resolve({ id, latency, socket });
        });

        socket.on('connect_error', (err) => {
            resolve({ id, error: err.message });
        });
    });
}

(async () => {
    console.log(`Starting load test for ${CONCURRENCY} participants on room ${ROOM_CODE}...`);
    const startTime = Date.now();
    
    const tasks = [];
    for (let i = 0; i < CONCURRENCY; i++) {
        tasks.push(simulateParticipant(i));
        if (i % 20 === 0) await new Promise(r => setTimeout(r, 100)); // Throttling connect requests
    }

    const results = await Promise.all(tasks);
    const successful = results.filter(r => !r.error);
    const failed = results.filter(r => r.error);
    
    const totalTime = Date.now() - startTime;
    const avgLatency = successful.reduce((acc, r) => acc + r.latency, 0) / (successful.length || 1);

    console.log('\n--- Load Test Results ---');
    console.log(`Target: ${CONCURRENCY}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Avg Connect Latency: ${avgLatency.toFixed(2)}ms`);

    // Keep connections open for 5 seconds to monitor server stability
    await new Promise(r => setTimeout(r, 5000));
    
    successful.forEach(r => r.socket.close());
    console.log('Test complete.');
})();
