import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuizStore } from '../../../../stores/useQuizStore';
import { useEditorState } from '../../../../stores/useEditorState';

/**
 * Domain hook for loading and initializing quiz data in the editor.
 */
export const useEditorData = (routeQuizId) => {
    const location = useLocation();
    const navigate = useNavigate();
    const getQuizzesForParent = useQuizStore((state) => state.getQuizzesForParent);
    const initializeFromQuiz = useEditorState((state) => state.initializeFromQuiz);

    const [activeQuiz, setActiveQuiz] = useState(location.state?.quiz || null);
    const [loading, setLoading] = useState(!location.state?.quiz);

    useEffect(() => {
        if (!activeQuiz) {
            const fetchQuiz = async () => {
                try {
                    const quizzes = await getQuizzesForParent('none', { force: true });
                    const found = quizzes.find((quiz) => String(quiz._id) === String(routeQuizId));
                    if (!found) {
                        navigate('/workspace');
                        return;
                    }
                    setActiveQuiz(found);
                } catch {
                    navigate('/workspace');
                } finally {
                    setLoading(false);
                }
            };
            fetchQuiz();
            return;
        }

        initializeFromQuiz(activeQuiz);
        setLoading(false);
    }, [activeQuiz, getQuizzesForParent, routeQuizId, initializeFromQuiz, navigate]);

    return {
        activeQuiz,
        setActiveQuiz,
        loading,
        setLoading
    };
};

export default useEditorData;
