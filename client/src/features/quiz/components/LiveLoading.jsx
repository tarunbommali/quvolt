import React from 'react';
import { typography, layout, cx } from '../../../styles/index';

const LiveLoading = () => {
    return (
        <div className={cx(layout.page, "min-h-[70vh] flex items-center justify-center")}>
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                <p className={cx(typography.micro, "animate-pulse")}>Initializing Secure Control Link...</p>
            </div>
        </div>
    );
};

export default LiveLoading;
