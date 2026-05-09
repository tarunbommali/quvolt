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
                // Fetch the current item directly to get its path and metadata
                const response = await useQuizStore.getState().getQuizById(folderId);
                const matched = response;

                if (!active) return;

                if (!matched) {
                    showToast?.('Folder not found');
                    navigate('/workspace', { replace: true });
                    return;
                }

                setCurrentSubject(matched);
            } catch {
                if (!active) return;
                showToast?.('Failed to load folder');
                navigate('/workspace', { replace: true });
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
