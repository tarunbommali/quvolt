import ErrorToast from './ErrorToast';
import QuestionHeader from './QuestionHeader';
import OptionsGrid from './OptionsGrid';
import ResultFeedback from './ResultFeedback';
import SocketStatusPill from '../common/SocketStatusPill';

const PlayingScreen = ({
    currentQuestion,
    timeLeft,
    selectedOption,
    myResult,
    errorMessage,
    connectionState,
    onSubmitAnswer,
}) => {
    return (
        <>
            <ErrorToast message={errorMessage} />
            <div className="qr-page space-y-6 mt-4">
                <div className="flex justify-end">
                    <SocketStatusPill connectionState={connectionState} className="inline-flex!" />
                </div>

                <div className="mx-auto w-full max-w-5xl space-y-6">
                    <div className="space-y-6">
                        <QuestionHeader currentQuestion={currentQuestion} timeLeft={timeLeft} />

                        {currentQuestion?.mediaUrl && (
                            <div className="qr-card flex h-75 items-center justify-center overflow-hidden">
                                <img
                                    src={currentQuestion.mediaUrl}
                                    alt="Question Media"
                                    className="h-full w-full object-contain"
                                />
                            </div>
                        )}

                        <OptionsGrid
                            options={currentQuestion?.options || []}
                            selectedOption={selectedOption}
                            timeLeft={timeLeft}
                            onSubmitAnswer={onSubmitAnswer}
                            myResult={myResult}
                        />

                        <ResultFeedback myResult={myResult} />
                    </div>
                </div>
            </div>
        </>
    );
};

export default PlayingScreen;
