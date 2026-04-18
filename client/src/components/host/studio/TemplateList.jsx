import React from 'react';
import QuizCard from './QuizCard';
import { motion, AnimatePresence } from 'framer-motion';

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
    viewMode
}) => {
    if (!quizzes || quizzes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-lg font-medium">No projects found</p>
                <p className="text-sm">Create your first quiz or template to get started.</p>
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
                        <QuizCard
                            quiz={quiz}
                            view={viewMode}
                            cloning={cloning && editingQuizId === quiz._id}
                            onEdit={() => onEditQuiz(quiz)}
                            onDelete={() => onDelete(quiz._id)}
                            onClone={() => onClone(quiz)}
                            onGoLive={() => onGoLive(quiz)}
                            onPrefetch={() => onPrefetch(quiz)}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default TemplateList;
