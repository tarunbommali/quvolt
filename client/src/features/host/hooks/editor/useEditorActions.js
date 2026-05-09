import { useCallback } from 'react';
import { useEditorState } from '../../../../stores/useEditorState';

/**
 * Domain hook for managing editor actions like slide mutations, movement, and bulk updates.
 */
export const useEditorActions = ({ showToast, executeCommand }) => {
    const updateActiveSlide = useEditorState((state) => state.updateActiveSlide);
    const updateConfig = useEditorState((state) => state.updateConfig);
    const duplicateSlideAtIndex = useEditorState((state) => state.duplicateSlideAtIndex);
    const deleteSlide = useEditorState((state) => state.deleteSlide);
    const moveSlide = useEditorState((state) => state.moveSlide);
    const order = useEditorState((state) => state.order);
    const config = useEditorState((state) => state.config);

    const handleQuestionTextChange = useCallback((value) => {
        executeCommand(() => {
            const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
            updateActiveSlide((slide) => ({ ...slide, text: capitalized }));
        }, { type: 'UPDATE_TEXT', history: true, save: true });
    }, [updateActiveSlide, executeCommand]);

    const handleOptionChange = useCallback((optionIndex, value) => {
        executeCommand(() => {
            updateActiveSlide((slide) => {
                const isMCQ = slide.questionType === 'multiple-choice' || !slide.questionType;
                let options = [...(slide.options || [])];
                while (options.length <= optionIndex) options.push('');
                const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                options[optionIndex] = capitalized;
                if (isMCQ && options.length < 4) {
                    while (options.length < 4) options.push('');
                }
                return { ...slide, options };
            });
        }, { type: 'UPDATE_OPTION', history: true, save: true });
    }, [updateActiveSlide, executeCommand]);

    const handleTimeLimitChange = useCallback((value) => {
        executeCommand(() => {
            updateActiveSlide((slide) => ({ ...slide, timeLimit: Number(value) }));
        }, { type: 'UPDATE_TIME', history: true, save: true });
    }, [updateActiveSlide, executeCommand]);

    const handleQuestionTypeChange = useCallback((value) => {
        executeCommand(() => {
            updateActiveSlide((slide) => {
                let options = [...(slide.options || [])];
                if (value === 'multiple-choice' && options.length < 4) {
                    while (options.length < 4) options.push('');
                }
                return { ...slide, questionType: value, options };
            });
        }, { type: 'UPDATE_TYPE', history: true, save: true });
    }, [updateActiveSlide, executeCommand]);

    const handleCorrectOptionChange = useCallback((value) => {
        executeCommand(() => {
            updateActiveSlide((slide) => ({ ...slide, correctOption: Number(value) }));
        }, { type: 'UPDATE_CORRECT', history: true, save: true });
    }, [updateActiveSlide, executeCommand]);

    const handleToggleShuffleOptions = useCallback(() => {
        executeCommand(() => {
            updateActiveSlide((slide) => ({ ...slide, shuffleOptions: !slide.shuffleOptions }));
        }, { type: 'TOGGLE_SHUFFLE_OPTS', history: true, save: true });
    }, [updateActiveSlide, executeCommand]);

    const handleToggleShuffleQuestions = useCallback(() => {
        executeCommand(() => {
            updateConfig({ shuffleQuestions: !config.shuffleQuestions });
        }, { type: 'TOGGLE_SHUFFLE_QUES', history: true, save: true });
    }, [updateConfig, config.shuffleQuestions, executeCommand]);

    const handleMoveQuestionUp = useCallback((index) => {
        executeCommand(() => {
            moveSlide(index, Math.max(index - 1, 0));
        }, { type: 'MOVE_UP', history: true, save: true });
    }, [moveSlide, executeCommand]);

    const handleMoveQuestionDown = useCallback((index) => {
        executeCommand(() => {
            moveSlide(index, Math.min(index + 1, order.length - 1));
        }, { type: 'MOVE_DOWN', history: true, save: true });
    }, [moveSlide, order.length, executeCommand]);

    const handleMoveSlide = useCallback((fromIndex, toIndex) => {
        executeCommand(() => {
            moveSlide(fromIndex, toIndex);
        }, { type: 'MOVE_SLIDE', history: true, save: true });
    }, [moveSlide, executeCommand]);

    const handleDuplicateSlide = useCallback((index) => {
        executeCommand(() => {
            duplicateSlideAtIndex(index);
        }, { type: 'DUPLICATE_SLIDE', history: true, save: true });
    }, [duplicateSlideAtIndex, executeCommand]);

    const handleApplyToAllSlides = useCallback((activeQuestion) => {
        if (!activeQuestion) return;
        
        executeCommand(() => {
            useEditorState.setState((state) => {
                const newSlides = state.slides.map(slide => {
                    if (!state.order.includes(slide.clientId)) return slide;
                    return {
                        ...slide,
                        questionType: activeQuestion.questionType || 'multiple-choice',
                        timeLimit: Number(activeQuestion.timeLimit) || 15,
                        correctOption: Number(activeQuestion.correctOption) >= 0
                            && Number(activeQuestion.correctOption) < (slide.options?.length || 0)
                            ? Number(activeQuestion.correctOption)
                            : slide.correctOption,
                    };
                });
                return { slides: newSlides, dirty: true };
            });
            showToast('Applied to all slides', 'success');
        }, { type: 'APPLY_ALL', history: true, save: true });
    }, [showToast, executeCommand]);

    return {
        handleQuestionTextChange,
        handleOptionChange,
        handleTimeLimitChange,
        handleQuestionTypeChange,
        handleCorrectOptionChange,
        handleToggleShuffleOptions,
        handleToggleShuffleQuestions,
        handleMoveQuestionUp,
        handleMoveQuestionDown,
        handleMoveSlide,
        handleDuplicateSlide,
        handleApplyToAllSlides,
        deleteSlide: (id) => executeCommand(() => deleteSlide(id), { type: 'DELETE_SLIDE', history: true, save: true })
    };
};

export default useEditorActions;
