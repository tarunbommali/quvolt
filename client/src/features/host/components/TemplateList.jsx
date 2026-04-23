import React from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import TemplateCard from './TemplateCard';
import { Layout, Plus, Sparkles } from 'lucide-react';
import { textStyles, panelStyles, components, layout, typography, cx } from '../../../styles/index';

const TemplateList = ({
    quizzes,
    cloning,
    editingQuizId,
    onDelete,
    onClone,
    onOpenSubject,
    onEditQuiz,
    onGoLive,
    onPrefetch,
    onSessionSettings,
    onViewHistory,
    viewMode
}) => {
    if (!quizzes || quizzes.length === 0) {
        return (
            <Motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cx(
                    panelStyles.emptyStateCard,
                    "!py-24 !rounded-[3rem] !border-2 !border-dashed bg-gradient-to-br from-gray-50/50 to-transparent dark:from-white/5"
                )}
            >
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute -inset-4 bg-indigo-500/10 blur-2xl rounded-full animate-pulse" />
                    <div className="relative w-full h-full rounded-[2rem] bg-white dark:bg-white/10 flex items-center justify-center shadow-sm text-indigo-500">
                        <Layout size={44} />
                    </div>
                </div>
                <h3 className={cx(typography.pageTitle, "!text-3xl !font-black tracking-tighter uppercase mb-4")}>
                    Intelligence Repository Empty
                </h3>
                <p className={cx(typography.body, "max-w-sm mx-auto text-base font-bold opacity-60 leading-relaxed")}>
                    Your creative journey starts here. Create your first high-engagement logic unit to begin synchronizing audience data.
                </p>
                <div className="mt-10 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] theme-text-muted opacity-40">
                    <Sparkles size={14} /> Global Edge Deployment Ready
                </div>
            </Motion.div>
        );
    }

    return (
        <div className={viewMode === 'list'
            ? "flex flex-col gap-6"
            : cx(layout.grid, "!gap-10 md:grid-cols-2 lg:grid-cols-3")
        }>
            <AnimatePresence mode="popLayout">
                {quizzes.map((quiz, index) => (
                    <Motion.div
                        key={quiz._id}
                        layout
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4, delay: index * 0.04, ease: "circOut" }}
                    >
                        <TemplateCard
                            template={quiz}
                            view={viewMode}
                            cloning={cloning && editingQuizId === quiz._id}
                            onEdit={() => onEditQuiz(quiz)}
                            onDelete={() => onDelete(quiz._id)}
                            onClone={() => onClone(quiz)}
                            onOpenSubject={() => onOpenSubject?.(quiz)}
                            onGoLive={() => onGoLive(quiz)}
                            onPrefetch={() => onPrefetch(quiz)}
                            onSessionSettings={() => onSessionSettings?.(quiz)}
                            onViewHistory={() => onViewHistory?.(quiz)}
                        />
                    </Motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default TemplateList;
