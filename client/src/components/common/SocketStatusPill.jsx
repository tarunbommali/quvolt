import { Loader2, Wifi, WifiOff } from 'lucide-react';

const SOCKET_STATE_COPY = {
    connected: {
        icon: Wifi,
        label: 'Live Sync',
        tone: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    },
    reconnecting: {
        icon: Loader2,
        label: 'Reconnecting',
        tone: 'text-amber-700 bg-amber-50 border-amber-100',
        spinning: true,
    },
    connecting: {
        icon: Loader2,
        label: 'Connecting',
        tone: 'text-indigo-700 bg-indigo-50 border-indigo-100',
        spinning: true,
    },
    disconnected: {
        icon: WifiOff,
        label: 'Offline',
        tone: 'text-red-700 bg-red-50 border-red-100',
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
