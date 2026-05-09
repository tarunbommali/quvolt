import React from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import TemplateCard from './TemplateCard';
import { layout, cx } from '../../../styles/index';
import { EmptyTemplateList } from './EmptyTemplateList';

const TemplateCardSkeleton = ({ viewMode }) => (
    <div className={cx(
        "animate-pulse rounded-3xl border theme-border theme-surface p-6 shadow-sm",
        viewMode === 'list' ? "flex items-center gap-6" : "h-64"
    )}>
        <div className="h-16 w-16 rounded-2xl bg-gray-200 dark:bg-white/5" />
        <div className="flex-1 space-y-3">
            <div className="h-5 w-1/3 rounded bg-gray-200 dark:bg-white/5" />
            <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-white/5" />
        </div>
    </div>
);

const TemplateList = ({
    templates,
    isLoading,
    cloning,
    editingQuizId,
    onDelete,
    onClone,
    onOpenSubject,
    onEditQuiz,
    onGoLive,
    onPrefetch,
    onSessionSettings,
    onViewAnalytics,
    onStartEdit,
    onRename,
    onCancelEdit,
    onEditingTitleChange,
    editingTitle,
    viewMode,
    parentGroupBy = 'default'
}) => {
    if (isLoading && (!templates || templates.length === 0)) {
        return (
            <div className={viewMode === 'list' ? "flex flex-col gap-6" : cx(layout.grid, "!gap-10 md:grid-cols-2 lg:grid-cols-3")}>
                {[...Array(6)].map((_, i) => <TemplateCardSkeleton key={i} viewMode={viewMode} />)}
            </div>
        );
    }

    if (!templates || templates.length === 0) {
        return (
            <EmptyTemplateList />
        );
    }

    return (
        <div className={cx(
            "relative",
            viewMode === 'list' ? "flex flex-col gap-2" : cx(layout.grid, "!gap-2 md:grid-cols-3 lg:grid-cols-4")
        )}>
            {isLoading && templates.length > 0 && (
                <div className="absolute inset-0 z-10 bg-white/20 backdrop-blur-[1px] dark:bg-black/20" />
            )}
            <AnimatePresence mode="popLayout">
                {templates.map((t, index) => (
                    <Motion.div
                        key={t._id}
                        layout
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4, delay: index * 0.04, ease: "circOut" }}
                    >
                        <TemplateCard
                            template={t}
                            view={viewMode}
                            cloning={cloning && editingQuizId === t._id}
                            onEdit={() => onEditQuiz(t)}
                            onDelete={() => onDelete(t._id)}
                            onClone={() => onClone(t)}
                            onOpenSubject={() => onOpenSubject?.(t)}
                            onGoLive={() => onGoLive(t)}
                            onPrefetch={() => onPrefetch(t)}
                            onSessionSettings={() => onSessionSettings?.(t)}
                            onViewHistory={() => onViewHistory?.(t)}
                            onViewAnalytics={() => onViewAnalytics?.(t)}
                            isEditing={editingQuizId === t._id}
                            editingTitle={editingTitle}
                            onStartEdit={() => onStartEdit(t)}
                            onRename={() => onRename(t._id)}
                            onCancelEdit={onCancelEdit}
                            onEditingTitleChange={onEditingTitleChange}
                            parentGroupBy={parentGroupBy}
                        />
                    </Motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default TemplateList;
