import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useQuizUIStore = create()(devtools((set) => ({
    view: 'loading',
    activeQuiz: null,
    selectedOption: null,

    setView: (view) => set({ view }),
    setActiveQuiz: (activeQuiz) => set({ activeQuiz }),
    setSelectedOption: (selectedOption) => set({ selectedOption }),
    
    resetUI: () => set({
        view: 'loading',
        activeQuiz: null,
        selectedOption: null
    }),
}), { name: 'quizUIStore' }));
