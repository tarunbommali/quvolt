const { execSync } = require('child_process');

const PORTS = [5000, 5001, 5173];

const run = (command) => execSync(command, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();

const freeWindowsPorts = () => {
    let output = '';
    try {
        output = run('netstat -ano -p tcp');
    } catch {
        return;
    }

    const lines = output.split(/\r?\n/);
    const pidSet = new Set();

    for (const line of lines) {
        if (!/LISTENING/i.test(line)) continue;

        const tokens = line.trim().split(/\s+/);
        if (tokens.length < 5) continue;

        const localAddress = tokens[1] || '';
        const pid = tokens[tokens.length - 1];
        const port = Number(localAddress.split(':').pop());

        if (PORTS.includes(port) && Number.isFinite(Number(pid))) {
            pidSet.add(pid);
        }
    }

    for (const pid of pidSet) {
        try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
            process.stdout.write(`[predev] killed PID ${pid}\n`);
        } catch {
            // Ignore processes that exit between detection and kill.
        }
    }
};

const freeUnixPorts = () => {
    for (const port of PORTS) {
        try {
            const pids = run(`lsof -ti tcp:${port}`)
                .split(/\r?\n/)
                .map((value) => value.trim())
                .filter(Boolean);

            for (const pid of pids) {
                try {
                    execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
                    process.stdout.write(`[predev] killed PID ${pid} on port ${port}\n`);
                } catch {
                    // Ignore if process already exited.
                }
            }
        } catch {
            // No listener on this port.
        }
    }
};

if (process.platform === 'win32') {
    freeWindowsPorts();
} else {
    freeUnixPorts();
}
