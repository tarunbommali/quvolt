import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import LiveLoading from './hostLive/LiveLoading';
import { useQuizStore } from '../../stores/useQuizStore';
import { resolveSessionRoute } from '../../utils/sessionRouteResolver';

const RouteGuard = ({ children }) => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const activeQuiz = useQuizStore((state) => state.activeQuiz);
    const getQuizzesForParent = useQuizStore((state) => state.getQuizzesForParent);
    const setActiveQuiz = useQuizStore((state) => state.setActiveQuiz);

    const [ready, setReady] = useState(false);

    const routeQuiz = useMemo(() => location.state?.quiz || null, [location.state]);
    const forceLaunch = Boolean(location.state?.forceLaunch);
    const isLaunchPath = location.pathname.startsWith('/launch/');

    useEffect(() => {
        let mounted = true;

        const loadQuiz = async () => {
            if (!id) {
                setReady(true);
                return;
            }

            try {
                let resolvedQuiz = routeQuiz;

                if (!resolvedQuiz && activeQuiz && String(activeQuiz._id) === String(id)) {
                    resolvedQuiz = activeQuiz;
                }

                if (!resolvedQuiz) {
                    let quizzes = await getQuizzesForParent('none');
                    resolvedQuiz = quizzes.find((item) => String(item._id) === String(id));

                    if (!resolvedQuiz) {
                        quizzes = await getQuizzesForParent('none', { force: true });
                        resolvedQuiz = quizzes.find((item) => String(item._id) === String(id));
                    }
                }

                if (!mounted) return;

                if (!resolvedQuiz) {
                    navigate('/studio', { replace: true });
                    return;
                }

                setActiveQuiz(resolvedQuiz);
                const expected = resolveSessionRoute(resolvedQuiz);
                const shouldBypassRedirect = forceLaunch && isLaunchPath;

                if (!shouldBypassRedirect && location.pathname !== expected) {
                    navigate(expected, { replace: true, state: { quiz: resolvedQuiz } });
                    return;
                }

                setReady(true);
            } catch {
                if (!mounted) return;
                navigate('/studio', { replace: true });
            }
        };

        loadQuiz();

        return () => {
            mounted = false;
        };
    }, [id, location.pathname, routeQuiz, forceLaunch, isLaunchPath, activeQuiz, getQuizzesForParent, navigate, setActiveQuiz]);

    if (!ready) return <LiveLoading />;

    return children;
};

export default RouteGuard;
