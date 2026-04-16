import ViewportPrefetch from '../common/ViewportPrefetch';
import SubjectProjectCard from './SubjectProjectCard';
import QuizCard from './QuizCard';
import Card from '../ui/Card';
import { panelStyles } from '../../styles/commonStyles';
import { layoutStyles } from '../../styles/layoutStyles';

const ProjectGrid = ({
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
    onOpenSubject,
    onEditQuiz,
    onGoLive,
    onPrefetch,
    viewMode = 'grid',
}) => {
    if (quizzes.length === 0) {
        return (
            <Card className={panelStyles.emptyStateCard}>
                <h3 className={panelStyles.emptyStateTitle}>Nothing Here Yet</h3>
                <p className={panelStyles.emptyStateBody}>
                    Start by creating a live quiz template or a multi-quiz subject folder. Your new templates will appear here instantly.
                </p>
            </Card>
        );
    }

    const listMode = viewMode === 'list';
    const layoutClass = listMode ? layoutStyles.cardList : layoutStyles.cardGrid;

    return (
        <div className={layoutClass}>
            {quizzes.map((quiz) => (
                <ViewportPrefetch key={quiz._id} onPrefetch={() => onPrefetch(quiz)}>
                    {quiz.type === 'subject' ? (
                        <SubjectProjectCard
                            quiz={quiz}
                            editingQuizId={editingQuizId}
                            editingTitle={editingTitle}
                            onStartEdit={onStartEdit}
                            onEditingTitleChange={onEditingTitleChange}
                            onRename={onRename}
                            onCancelEdit={onCancelEdit}
                            onDelete={onDelete}
                            onClone={() => onClone(quiz)}
                            onOpen={() => onOpenSubject(quiz)}
                            onPrefetch={() => onPrefetch(quiz)}
                            view={listMode ? 'list' : 'grid'}
                            cloning={cloning}
                        />
                    ) : (
                        <QuizCard
                            quiz={quiz}
                            view={listMode ? 'list' : 'grid'}
                            onDelete={onDelete}
                            onClone={() => onClone(quiz)}
                            onEdit={() => onEditQuiz(quiz)}
                            onGoLive={() => onGoLive(quiz)}
                            onPrefetch={() => onPrefetch(quiz)}
                            cloning={cloning}
                        />
                    )}
                </ViewportPrefetch>
            ))}
        </div>
    );
};

export default ProjectGrid;
