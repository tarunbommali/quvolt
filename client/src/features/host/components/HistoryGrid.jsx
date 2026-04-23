import React from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import ViewportPrefetch from '../../../components/common/ViewportPrefetch';
import HistoryRecordCard from './HistoryRecordCard';

const HistoryGrid = ({ records, userRole, onNavigate, onOpenLeaderboard, onPrefetch }) => (
    <div className="flex flex-col gap-5">
        <AnimatePresence mode="popLayout">
            {records.map((record, i) => (
                <Motion.div
                    key={record.roomCode || record._id || i}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                    <ViewportPrefetch onPrefetch={() => onPrefetch(record)}>
                        <HistoryRecordCard
                            record={record}
                            userRole={userRole}
                            onNavigate={onNavigate}
                            onOpenLeaderboard={onOpenLeaderboard}
                            onPrefetch={onPrefetch}
                        />
                    </ViewportPrefetch>
                </Motion.div>
            ))}
        </AnimatePresence>
    </div>
);

export default HistoryGrid;


