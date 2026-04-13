import { create } from 'zustand';

const toSlideId = (slide, index) => String(slide?._id || slide?.clientId || `slide-${index + 1}`);

const buildSlides = (questions = []) => questions.map((question, index) => ({
    ...question,
    clientId: toSlideId(question, index),
}));

const createNewSlide = (count = 0) => ({
    clientId: `tmp-${Date.now()}-${count}`,
    text: 'New Question: Enter your inquiry here...',
    options: ['Classic Option A', 'Vibrant Option B', 'Clear Option C', 'Sharp Option D'],
    correctOption: 0,
    timeLimit: 15,
    shuffleOptions: false,
    questionType: 'multiple-choice',
    mediaUrl: null,
});

const duplicateSlide = (slide, index = 0) => ({
    ...slide,
    _id: undefined,
    clientId: `tmp-copy-${Date.now()}-${index}`,
    text: slide?.text ? `${slide.text} (Copy)` : 'Untitled question (Copy)',
});

const getOrderedSlides = (slides, order) => {
    const byId = new Map(slides.map((slide) => [slide.clientId, slide]));
    const ordered = [];
    for (const key of order) {
        const match = byId.get(key);
        if (match) ordered.push(match);
    }

    for (const slide of slides) {
        if (!ordered.includes(slide)) ordered.push(slide);
    }

    return ordered;
};

export const useEditorState = create((set, get) => ({
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

    initializeFromQuiz: (quiz) => {
        const slides = buildSlides(quiz?.questions || []);
        const order = slides.map((slide) => slide.clientId);
        set({
            quizId: quiz?._id || null,
            title: quiz?.title || '',
            slides,
            order,
            activeSlideId: order[0] || null,
            config: {
                shuffleQuestions: Boolean(quiz?.shuffleQuestions),
                interQuestionDelay: Number(quiz?.interQuestionDelay || 5),
                mode: quiz?.mode || 'auto',
            },
            dirty: false,
        });
    },

    markClean: () => set({ dirty: false }),
    markDirty: () => set({ dirty: true }),

    setActiveSlideByIndex: (index) => {
        const { order } = get();
        const nextId = order[index] || null;
        set({ activeSlideId: nextId });
    },

    setActiveSlideById: (activeSlideId) => set({ activeSlideId }),

    updateActiveSlide: (mutator) => {
        const state = get();
        const { activeSlideId } = state;
        if (!activeSlideId) return;

        const slides = state.slides.map((slide) => (
            slide.clientId === activeSlideId ? mutator(slide) : slide
        ));
        set({ slides, dirty: true });
    },

    updateSlideById: (slideId, mutator) => {
        const slides = get().slides.map((slide) => (
            slide.clientId === slideId ? mutator(slide) : slide
        ));
        set({ slides, dirty: true });
    },

    updateConfig: (configPatch) => {
        set((state) => ({
            config: { ...state.config, ...configPatch },
            dirty: true,
        }));
    },

    addSlide: () => {
        const state = get();
        const next = createNewSlide(state.slides.length);
        const slides = [...state.slides, next];
        const order = [...state.order, next.clientId];
        set({ slides, order, activeSlideId: next.clientId, dirty: true });
    },

    duplicateSlideAtIndex: (index) => {
        const state = get();
        const sourceId = state.order[index];
        if (!sourceId) return;

        const sourceSlide = state.slides.find((slide) => slide.clientId === sourceId);
        if (!sourceSlide) return;

        const nextSlide = duplicateSlide(sourceSlide, state.slides.length);
        const slides = [...state.slides, nextSlide];
        const order = [...state.order];
        order.splice(index + 1, 0, nextSlide.clientId);

        set({ slides, order, activeSlideId: nextSlide.clientId, dirty: true });
    },

    deleteSlide: (slideId) => {
        const state = get();
        const slides = state.slides.filter((slide) => slide.clientId !== slideId);
        const order = state.order.filter((id) => id !== slideId);
        const nextActive = state.activeSlideId === slideId
            ? (order[0] || null)
            : state.activeSlideId;
        set({ slides, order, activeSlideId: nextActive, dirty: true });
    },

    moveSlide: (fromIndex, toIndex) => {
        if (fromIndex === toIndex) return;
        const state = get();
        const order = [...state.order];
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= order.length || toIndex >= order.length) return;
        const [moved] = order.splice(fromIndex, 1);
        order.splice(toIndex, 0, moved);
        set({ order, activeSlideId: moved, dirty: true });
    },

    importSlides: (incomingSlides) => {
        const state = get();
        const normalized = incomingSlides.map((slide, index) => ({
            ...slide,
            clientId: slide?.clientId || slide?._id || `tmp-import-${Date.now()}-${index}`,
        }));
        const slides = [...state.slides, ...normalized];
        const order = [...state.order, ...normalized.map((slide) => slide.clientId)];
        set({ slides, order, activeSlideId: normalized[0]?.clientId || state.activeSlideId, dirty: true });
    },

    replaceFromServerQuiz: (quiz) => {
        get().initializeFromQuiz(quiz);
    },

    restoreSnapshot: (snapshot) => {
        if (!snapshot || !Array.isArray(snapshot.slides) || !Array.isArray(snapshot.order)) return;

        const slides = snapshot.slides.map((slide, index) => ({
            ...slide,
            clientId: slide.clientId || slide._id || `tmp-restore-${Date.now()}-${index}`,
        }));
        const order = snapshot.order.map((id) => String(id)).filter(Boolean);

        set({
            slides,
            order,
            activeSlideId: snapshot.activeSlideId || order[0] || null,
            config: {
                shuffleQuestions: Boolean(snapshot.config?.shuffleQuestions),
                interQuestionDelay: Number(snapshot.config?.interQuestionDelay || 5),
                mode: snapshot.config?.mode || 'auto',
            },
            dirty: true,
        });
    },

    getSnapshot: () => {
        const state = get();
        const orderedSlides = getOrderedSlides(state.slides, state.order);
        return {
            slides: orderedSlides.map((slide) => ({
                _id: slide._id,
                clientId: slide.clientId,
                text: slide.text,
                options: slide.options,
                correctOption: slide.correctOption,
                timeLimit: slide.timeLimit,
                shuffleOptions: Boolean(slide.shuffleOptions),
                questionType: slide.questionType || 'multiple-choice',
                mediaUrl: slide.mediaUrl || null,
            })),
            order: [...state.order],
            activeSlideId: state.activeSlideId,
            config: { ...state.config },
        };
    },
}));
