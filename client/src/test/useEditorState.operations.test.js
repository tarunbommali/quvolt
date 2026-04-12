import { useEditorState } from '../stores/useEditorState';

const resetStore = () =>
    useEditorState.setState({
        quizId: null,
        title: '',
        slides: [],
        order: [],
        activeSlideId: null,
        config: {
            shuffleQuestions: false,
            interQuestionDelay: 5,
            mode: 'auto',
        },
        dirty: false,
    });

const twoQuestionQuiz = {
    _id: 'quiz-ops',
    title: 'Ops Quiz',
    questions: [
        { _id: 'q1', text: 'Q1', options: ['A', 'B', 'C', 'D'], correctOption: 0, timeLimit: 15 },
        { _id: 'q2', text: 'Q2', options: ['E', 'F', 'G', 'H'], correctOption: 1, timeLimit: 20 },
    ],
};

beforeEach(resetStore);

// ── addSlide ──────────────────────────────────────────────────────────────────

describe('addSlide', () => {
    it('appends a new slide and marks the store dirty', () => {
        useEditorState.getState().initializeFromQuiz(twoQuestionQuiz);

        useEditorState.getState().addSlide();

        const { slides, order, activeSlideId, dirty } = useEditorState.getState();
        expect(slides).toHaveLength(3);
        expect(order).toHaveLength(3);
        expect(activeSlideId).toBe(order[2]);
        expect(dirty).toBe(true);
    });

    it('sets the new slide as the active slide', () => {
        useEditorState.getState().initializeFromQuiz(twoQuestionQuiz);
        useEditorState.getState().addSlide();

        const { slides, activeSlideId } = useEditorState.getState();
        const lastSlide = slides[slides.length - 1];
        expect(activeSlideId).toBe(lastSlide.clientId);
    });
});

// ── deleteSlide ───────────────────────────────────────────────────────────────

describe('deleteSlide', () => {
    it('removes the targeted slide and updates order', () => {
        useEditorState.getState().initializeFromQuiz(twoQuestionQuiz);
        const { slides } = useEditorState.getState();
        const idToDelete = slides[0].clientId;

        useEditorState.getState().deleteSlide(idToDelete);

        const state = useEditorState.getState();
        expect(state.slides).toHaveLength(1);
        expect(state.order).toHaveLength(1);
        expect(state.slides.find((s) => s.clientId === idToDelete)).toBeUndefined();
        expect(state.dirty).toBe(true);
    });

    it('moves activeSlideId to the first remaining slide when the active slide is deleted', () => {
        useEditorState.getState().initializeFromQuiz(twoQuestionQuiz);
        const { order } = useEditorState.getState();
        const firstId = order[0];

        useEditorState.getState().deleteSlide(firstId);

        const { activeSlideId, order: newOrder } = useEditorState.getState();
        expect(activeSlideId).toBe(newOrder[0]);
    });

    it('preserves activeSlideId when a different slide is deleted', () => {
        useEditorState.getState().initializeFromQuiz(twoQuestionQuiz);
        const { order } = useEditorState.getState();
        const [firstId, secondId] = order;

        useEditorState.getState().deleteSlide(secondId);

        expect(useEditorState.getState().activeSlideId).toBe(firstId);
    });
});

// ── updateConfig ──────────────────────────────────────────────────────────────

describe('updateConfig', () => {
    it('merges a partial config patch and marks the store dirty', () => {
        useEditorState.getState().initializeFromQuiz(twoQuestionQuiz);

        useEditorState.getState().updateConfig({ shuffleQuestions: true, interQuestionDelay: 10 });

        const { config, dirty } = useEditorState.getState();
        expect(config.shuffleQuestions).toBe(true);
        expect(config.interQuestionDelay).toBe(10);
        expect(config.mode).toBe('auto');
        expect(dirty).toBe(true);
    });

    it('overwrites only the specified keys', () => {
        useEditorState.getState().initializeFromQuiz(twoQuestionQuiz);
        useEditorState.getState().updateConfig({ mode: 'manual' });

        const { config } = useEditorState.getState();
        expect(config.mode).toBe('manual');
        expect(config.shuffleQuestions).toBe(false);
        expect(config.interQuestionDelay).toBe(5);
    });
});

// ── updateSlideById ───────────────────────────────────────────────────────────

describe('updateSlideById', () => {
    it('applies the mutator to the targeted slide and marks dirty', () => {
        useEditorState.getState().initializeFromQuiz(twoQuestionQuiz);
        const { slides } = useEditorState.getState();
        const targetId = slides[0].clientId;

        useEditorState.getState().updateSlideById(targetId, (slide) => ({
            ...slide,
            text: 'Updated text',
        }));

        const updated = useEditorState.getState().slides.find((s) => s.clientId === targetId);
        expect(updated.text).toBe('Updated text');
        expect(useEditorState.getState().dirty).toBe(true);
    });

    it('does not affect other slides', () => {
        useEditorState.getState().initializeFromQuiz(twoQuestionQuiz);
        const { slides } = useEditorState.getState();
        const [s0, s1] = slides;

        useEditorState.getState().updateSlideById(s0.clientId, (s) => ({ ...s, text: 'Changed' }));

        const unchanged = useEditorState.getState().slides.find((s) => s.clientId === s1.clientId);
        expect(unchanged.text).toBe('Q2');
    });
});

// ── updateActiveSlide ─────────────────────────────────────────────────────────

describe('updateActiveSlide', () => {
    it('applies the mutator to the current active slide', () => {
        useEditorState.getState().initializeFromQuiz(twoQuestionQuiz);
        const { activeSlideId } = useEditorState.getState();

        useEditorState.getState().updateActiveSlide((slide) => ({ ...slide, timeLimit: 30 }));

        const active = useEditorState.getState().slides.find((s) => s.clientId === activeSlideId);
        expect(active.timeLimit).toBe(30);
        expect(useEditorState.getState().dirty).toBe(true);
    });

    it('is a no-op when there is no active slide', () => {
        useEditorState.setState({ slides: [], order: [], activeSlideId: null, dirty: false });

        useEditorState.getState().updateActiveSlide((s) => ({ ...s, text: 'Ignored' }));

        expect(useEditorState.getState().dirty).toBe(false);
    });
});

// ── setActiveSlideByIndex ─────────────────────────────────────────────────────

describe('setActiveSlideByIndex', () => {
    it('sets the active slide to the slide at the given index', () => {
        useEditorState.getState().initializeFromQuiz(twoQuestionQuiz);
        const { order } = useEditorState.getState();

        useEditorState.getState().setActiveSlideByIndex(1);

        expect(useEditorState.getState().activeSlideId).toBe(order[1]);
    });

    it('sets activeSlideId to null for an out-of-range index', () => {
        useEditorState.getState().initializeFromQuiz(twoQuestionQuiz);

        useEditorState.getState().setActiveSlideByIndex(99);

        expect(useEditorState.getState().activeSlideId).toBeNull();
    });
});

// ── importSlides ──────────────────────────────────────────────────────────────

describe('importSlides', () => {
    it('appends imported slides to the existing slide list', () => {
        useEditorState.getState().initializeFromQuiz(twoQuestionQuiz);

        const imported = [
            { _id: 'qi1', clientId: 'qi1', text: 'Imported Q', options: ['W', 'X', 'Y', 'Z'], correctOption: 2, timeLimit: 15 },
        ];
        useEditorState.getState().importSlides(imported);

        const { slides, order } = useEditorState.getState();
        expect(slides).toHaveLength(3);
        expect(order).toHaveLength(3);
        expect(order[2]).toBe('qi1');
    });

    it('marks the store dirty after import', () => {
        useEditorState.getState().initializeFromQuiz(twoQuestionQuiz);
        useEditorState.getState().importSlides([{ _id: 'qi2', text: 'X', options: [], correctOption: 0, timeLimit: 10 }]);

        expect(useEditorState.getState().dirty).toBe(true);
    });

    it('sets the first imported slide as active when adding to an empty store', () => {
        useEditorState.getState().importSlides([
            { clientId: 'imp-a', text: 'A', options: [], correctOption: 0, timeLimit: 10 },
            { clientId: 'imp-b', text: 'B', options: [], correctOption: 0, timeLimit: 10 },
        ]);

        expect(useEditorState.getState().activeSlideId).toBe('imp-a');
    });
});

// ── markClean / markDirty ─────────────────────────────────────────────────────

describe('markClean and markDirty', () => {
    it('markClean resets dirty flag to false', () => {
        useEditorState.getState().initializeFromQuiz(twoQuestionQuiz);
        useEditorState.getState().updateConfig({ shuffleQuestions: true });
        expect(useEditorState.getState().dirty).toBe(true);

        useEditorState.getState().markClean();
        expect(useEditorState.getState().dirty).toBe(false);
    });

    it('markDirty sets dirty flag to true', () => {
        useEditorState.getState().initializeFromQuiz(twoQuestionQuiz);
        expect(useEditorState.getState().dirty).toBe(false);

        useEditorState.getState().markDirty();
        expect(useEditorState.getState().dirty).toBe(true);
    });
});
