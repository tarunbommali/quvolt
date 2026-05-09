import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuizStore } from '../../../stores/useQuizStore';

/**
 * Domain hook for synchronizing folder/subject state and breadcrumbs based on URL.
 */
export const useFolderSync = (folderId, showToast) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [currentSubject, setCurrentSubject] = useState(location.state?.subject || null);
    const [isLoadingSubject, setIsLoadingSubject] = useState(false);

    useEffect(() => {
        let active = true;

        const syncCurrentFolder = async () => {
            if (active) {
                setIsLoadingSubject(Boolean(folderId));
            }

            if (!folderId) {
                if (active) {
                    setCurrentSubject(null);
                    setIsLoadingSubject(false);
                }
                return;
            }

            const subjectFromState = location.state?.subject;
            if (subjectFromState && String(subjectFromState._id) === String(folderId)) {
                if (active) {
                    setCurrentSubject(subjectFromState);
                    setIsLoadingSubject(false);
                }
                return;
            }

            try {
                let rootItems = await useQuizStore.getState().getQuizzesForParent('none');
                let matched = rootItems.find((item) => item.type === 'subject' && String(item._id) === String(folderId));

                if (!matched) {
                    rootItems = await useQuizStore.getState().getQuizzesForParent('none', { force: true });
                    matched = rootItems.find((item) => item.type === 'subject' && String(item._id) === String(folderId));
                }

                if (!active) return;

                if (!matched) {
                    showToast?.('Folder not found');
                    navigate('/studio', { replace: true });
                    return;
                }

                setCurrentSubject(matched);
            } catch {
                if (!active) return;
                showToast?.('Failed to load folder');
                navigate('/studio', { replace: true });
            } finally {
                if (active) setIsLoadingSubject(false);
            }
        };

        syncCurrentFolder();

        return () => {
            active = false;
        };
    }, [folderId, location.state?.subject, navigate, showToast]);

    return {
        currentSubject,
        isLoadingSubject,
        breadcrumbs: location.state?.breadcrumbs || []
    };
};

export default useFolderSync;
