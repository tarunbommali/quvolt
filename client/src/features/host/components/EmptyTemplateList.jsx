import React from 'react';
import { Layers, Plus } from 'lucide-react';
import { motion as Motion } from 'framer-motion';

export const EmptyTemplateList = () => {
    return (
        <Motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
        >
            <div className="relative mb-6">
                <div className="absolute inset-0 scale-150 animate-pulse bg-primary/5 blur-3xl rounded-full" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border-2 border-dashed theme-border bg-white shadow-sm">
                    <Layers size={40} className="theme-text-muted opacity-20" />
                </div>
                <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-lg">
                    <Plus size={16} />
                </div>
            </div>
            
            <h3 className="mb-2 text-xl font-bold tracking-tight theme-text">Your Library is Empty</h3>
            <p className="max-w-xs text-sm leading-relaxed theme-text-muted opacity-80">
                Kickstart your collection by creating your first interactive quiz template or importing from JSON.
            </p>
        </Motion.div>
    );
};

export default EmptyTemplateList;