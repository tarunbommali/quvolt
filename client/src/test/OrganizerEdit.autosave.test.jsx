import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockNavigate = jest.fn();
const mockSaveQuizFullState = jest.fn();

const mockQuizStoreState = {
  getQuizzesForParent: jest.fn(),
};

const mockEditorState = {
  initializeFromQuiz: jest.fn(),
  replaceFromServerQuiz: jest.fn(),
  getSnapshot: jest.fn(() => ({
    slides: [
      {
        clientId: 's1',
        text: 'Question',
        options: ['A', 'B'],
        correctOption: 0,
        timeLimit: 15,
        shuffleOptions: false,
        questionType: 'multiple-choice',
        mediaUrl: null,
      },
    ],
    order: ['s1'],
    config: { shuffleQuestions: false, interQuestionDelay: 5, mode: 'auto' },
  })),
  dirty: true,
  markClean: jest.fn(),
  slides: [{ clientId: 's1', text: 'Question', options: ['A', 'B'], correctOption: 0 }],
  order: ['s1'],
  activeSlideId: 's1',
  setActiveSlideByIndex: jest.fn(),
  updateActiveSlide: jest.fn(),
  updateSlideById: jest.fn(),
  updateConfig: jest.fn(),
  addSlide: jest.fn(),
  deleteSlide: jest.fn(),
  moveSlide: jest.fn(),
  importSlides: jest.fn(),
  config: { shuffleQuestions: false, interQuestionDelay: 5, mode: 'auto' },
};

jest.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'quiz-1' }),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: { quiz: { _id: 'quiz-1', title: 'Quiz Title' } } }),
}));

jest.mock('../services/api', () => ({
  generateAIQuiz: jest.fn(),
  saveQuizFullState: (...args) => mockSaveQuizFullState(...args),
}));

jest.mock('../stores/useQuizStore', () => ({
  useQuizStore: (selector) => selector(mockQuizStoreState),
}));

jest.mock('../stores/useEditorState', () => ({
  useEditorState: (selector) => selector(mockEditorState),
}));

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }) => children,
}));

jest.mock('../components/common/ConfirmationDialog', () => () => null);
jest.mock('../components/common/Toast', () => () => null);
jest.mock('../components/hostEdit/ImportSlidesModal', () => () => null);
jest.mock('../components/hostEdit/AIGeneratorModal', () => () => null);
jest.mock('../components/hostEdit/SlidePanel', () => () => null);
jest.mock('../components/hostEdit/CanvasView', () => () => null);
jest.mock('../components/hostEdit/ConfigSidebar', () => () => null);
jest.mock('../components/hostEdit/EditorLayout', () => ({ header }) => <div>{header}</div>);

import QuizEditorPage from '../pages/studio/QuizEditorPage';

describe('QuizEditorPage autosave behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEditorState.dirty = true;
  });

  it('debounces autosave and persists full state once after 800ms', async () => {
    jest.useFakeTimers();
    mockSaveQuizFullState.mockResolvedValue({ _id: 'quiz-1', title: 'Quiz Title', questions: [] });

    render(<QuizEditorPage />);

    expect(mockSaveQuizFullState).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(799);
    });
    expect(mockSaveQuizFullState).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => {
      expect(mockSaveQuizFullState).toHaveBeenCalledTimes(1);
    });

    expect(mockSaveQuizFullState).toHaveBeenCalledWith('quiz-1', expect.objectContaining({ order: ['s1'] }));

    jest.useRealTimers();
  });

  it('shows validation save error and allows retry action', async () => {
    jest.useFakeTimers();
    mockSaveQuizFullState.mockRejectedValue({
      response: {
        status: 422,
        data: { message: 'Invalid editor data' },
      },
    });

    render(<QuizEditorPage />);

    await act(async () => {
      jest.advanceTimersByTime(800);
    });

    await screen.findByRole('alert');
    expect(screen.getByText('Validation error')).toBeInTheDocument();
    expect(screen.getByText('Invalid editor data')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(mockSaveQuizFullState).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });
});
