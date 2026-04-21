import { memo } from 'react';
import SocketStatusPill from '../../common/SocketStatusPill';

const WaitingLobby = ({ quizTitle, connectionState, waitingMessage, sessionCode }) => {
    return (
        <div className="qr-page flex items-center justify-center h-[80vh] animate-in fade-in duration-500">
            <div
                className="w-full max-w-lg rounded-2xl border p-8 text-center md:p-10 glass-surface border-white/10 bg-white/5"
            >
                <div className="mx-auto mb-3 h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />

                <h2 className="text-xl font-semibold text-white md:text-2xl">
                    Waiting for Host
                </h2>

                <p className="mt-2 text-sm md:text-base text-white/60">
                    {waitingMessage || 'The quiz will begin shortly...'}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-white/70">
                    {quizTitle ? (
                        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                            {quizTitle}
                        </span>
                    ) : null}

                    {sessionCode ? (
                        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 uppercase tracking-wide">
                            Code: {sessionCode}
                        </span>
                    ) : null}
                </div>

                <div className="flex justify-center">
                    <SocketStatusPill connectionState={connectionState} className="inline-flex!" />
                </div>
            </div>
        </div>
    );
};

export default memo(WaitingLobby);

