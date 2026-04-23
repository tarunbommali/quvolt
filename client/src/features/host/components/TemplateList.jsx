import { motion, AnimatePresence } from 'framer-motion';
import TemplateCard from './TemplateCard';

const TemplateList = ({
    quizzes,
    cloning,
    editingQuizId,
    editingTitle,
    onStartEdit,
    onEditingTitleChange,
    onRename,
    onCancelEdit,
    onDelete,
    onClone,
    onEditQuiz,
    onGoLive,
    onPrefetch,
    onSessionSettings,
    onViewHistory,
    viewMode
}) => {
    if (!quizzes || quizzes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-lg font-medium">No templates found</p>
                <p className="text-sm">Create your first template to get started.</p>
            </div>
        );
    }

    return (
        <div className={viewMode === 'list'
            ? "flex flex-col gap-3"
            : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        }>
            <AnimatePresence mode="popLayout">
                {quizzes.map((quiz) => (
                    <motion.div
                        key={quiz._id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        <TemplateCard
                            template={quiz}
                            view={viewMode}
                            cloning={cloning && editingQuizId === quiz._id}
                            onEdit={() => onEditQuiz(quiz)}
                            onDelete={() => onDelete(quiz._id)}
                            onClone={() => onClone(quiz)}
                            onGoLive={() => onGoLive(quiz)}
                            onPrefetch={() => onPrefetch(quiz)}
                            onSessionSettings={() => onSessionSettings?.(quiz)}
                            onViewHistory={() => onViewHistory?.(quiz)}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default TemplateList;

