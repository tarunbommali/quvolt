import { memo } from 'react';
import { Users } from 'lucide-react';
import SocketStatusPill from '../common/SocketStatusPill';

const WaitingLobby = ({ quizTitle, participants, connectionState, waitingMessage }) => {
    return (
        <div className="qr-page flex flex-col items-center justify-center min-h-[70vh] space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-6">
                <div className="qr-badge bg-indigo-100 text-indigo-700 border border-indigo-200 animate-pulse">
                    Waiting for host
                </div>
                <div className="flex justify-center">
                    <SocketStatusPill connectionState={connectionState} className="inline-flex!" />
                </div>
                <h1 className="page-title text-3xl md:text-4xl font-medium leading-tight">
                    {quizTitle || 'Joining Session...'}
                </h1>
                <p className="qr-subtle text-base md:text-lg">
                    {waitingMessage || 'The quiz session is being prepared. Please wait for the host to begin.'}
                </p>
            </div>

            <div className="qr-card rounded-xl p-8 w-full max-w-md">
                <div className="flex items-center gap-3 mb-6 text-indigo-600 border-b border-gray-100 pb-4">
                    <Users size={24} />
                    <h3 className="qr-panel-title text-slate-900 font-medium">
                        Invite Room
                    </h3>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                    {participants.map((p, i) => (
                        <div
                            key={p._id || i}
                            className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-100 text-center font-medium text-slate-800"
                        >
                            {p.name}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default memo(WaitingLobby);
