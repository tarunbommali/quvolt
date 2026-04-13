import { Loader2, Wifi, WifiOff } from 'lucide-react';

const SOCKET_STATE_COPY = {
    connected: {
        icon: Wifi,
        label: 'Live Sync',
        tone: 'theme-status-success',
    },
    reconnecting: {
        icon: Loader2,
        label: 'Reconnecting',
        tone: 'theme-status-warning',
        spinning: true,
    },
    connecting: {
        icon: Loader2,
        label: 'Connecting',
        tone: 'theme-status-info',
        spinning: true,
    },
    disconnected: {
        icon: WifiOff,
        label: 'Offline',
        tone: 'theme-status-danger',
    },
};

const SocketStatusPill = ({ connectionState = 'disconnected', className = '' }) => {
    const state = SOCKET_STATE_COPY[connectionState] || SOCKET_STATE_COPY.disconnected;
    const Icon = state.icon;

    return (
        <div className={`hidden lg:inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${state.tone} ${className}`.trim()}>
            <Icon size={12} className={state.spinning ? 'animate-spin' : ''} />
            <span>{state.label}</span>
        </div>
    );
};

export default SocketStatusPill;
