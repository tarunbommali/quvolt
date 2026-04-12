import { useEditorState } from '../stores/useEditorState';

describe('useEditorState reorder persistence', () => {
  beforeEach(() => {
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
  });

  it('preserves moved order in snapshot payload', () => {
    useEditorState.getState().initializeFromQuiz({
      _id: 'quiz-1',
      title: 'Sample',
      questions: [
        { _id: 'q1', text: 'Q1', options: ['A', 'B'], correctOption: 0, timeLimit: 15 },
        { _id: 'q2', text: 'Q2', options: ['A', 'B'], correctOption: 1, timeLimit: 15 },
      ],
    });

    useEditorState.getState().moveSlide(0, 1);
    const snapshot = useEditorState.getState().getSnapshot();

    expect(snapshot.order).toEqual(['q2', 'q1']);
    expect(snapshot.slides.map((s) => s._id)).toEqual(['q2', 'q1']);
    expect(useEditorState.getState().dirty).toBe(true);
  });
});
