const INR_SYMBOL = '\u20B9';

const CreateTemplatePanel = ({
    showCreate,
    currentSubject,
    quizType,
    onQuizTypeChange,
    accessType,
    onAccessTypeChange,
    allowedEmailsText,
    onAllowedEmailsTextChange,
    quizMode,
    onQuizModeChange,
    newQuizTitle,
    onTitleChange,
    onCreate,
    isPaid,
    onPaidToggle,
    quizPrice,
    onPriceChange,
}) => {
    if (!showCreate) return null;

    return (
        <div className="bg-white p-8 space-y-6 mt-12 animate-in slide-in-from-bottom duration-300 border border-gray-100 rounded-4xl shadow-sm">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-900 uppercase">
                    {currentSubject ? `New Template in ${currentSubject.title}` : 'New Template Configuration'}
                </h3>
                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                    <button
                        onClick={() => onQuizTypeChange('quiz')}
                        className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${quizType === 'quiz' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Quiz File
                    </button>
                    <button
                        onClick={() => onQuizTypeChange('subject')}
                        className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${quizType === 'subject' ? 'bg-yellow-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Folder
                    </button>
                </div>
            </div>
            <div className="flex gap-4">
                <input
                    className="w-full flex-1 bg-gray-50 border border-gray-200 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-400"
                    placeholder={quizType === 'quiz' ? 'e.g. JavaScript Core Deep Dive' : "e.g. Master's in Web Development Subject"}
                    value={newQuizTitle}
                    onChange={(event) => onTitleChange(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && onCreate()}
                />
                <button onClick={onCreate} className="btn-premium px-12">Initialize</button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Template Access</label>
                    <select
                        value={accessType}
                        onChange={(event) => onAccessTypeChange(event.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                    </select>
                </div>

                {quizType === 'quiz' && (
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Quiz Flow</label>
                        <select
                            value={quizMode}
                            onChange={(event) => onQuizModeChange(event.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                        >
                            <option value="auto">AutoTime</option>
                            <option value="tutor">Tutor</option>
                        </select>
                    </div>
                )}
            </div>

            {accessType === 'private' && (
                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Allowed Emails (comma or new line)</label>
                    <textarea
                        rows={3}
                        value={allowedEmailsText}
                        onChange={(event) => onAllowedEmailsTextChange(event.target.value)}
                        placeholder="student1@example.com, student2@example.com"
                        className="w-full bg-gray-50 border border-gray-200 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-400"
                    />
                    <p className="mt-2 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Only these emails can join private quizzes from this template.</p>
                </div>
            )}

            {quizType === 'quiz' && (
                <div className="flex items-center gap-6">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div
                            onClick={onPaidToggle}
                            className={`relative w-12 h-6 rounded-full transition-colors border ${isPaid ? 'bg-emerald-500 border-emerald-500' : 'bg-gray-200 border-gray-300'}`}
                        >
                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isPaid ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Paid Quiz</span>
                    </label>
                    {isPaid && (
                        <div className="flex items-center gap-2">
                            <span className="text-primary font-black text-lg">{INR_SYMBOL}</span>
                            <input
                                type="number"
                                min="1"
                                className="w-32 bg-gray-50 border border-gray-200 text-slate-900 text-center py-2 px-4 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
                                placeholder="Price"
                                value={quizPrice}
                                onChange={(event) => onPriceChange(event.target.value)}
                            />
                        </div>
                    )}
                </div>
            )}

            <p className="text-xs font-bold text-slate-500 uppercase">
                {quizType === 'quiz'
                    ? 'Creates a standalone high-speed competitive template with autotime or tutor flow.'
                    : 'Creates a collaborative folder template to group multiple quizzes with a cumulative leaderboard.'}
            </p>
        </div>
    );
};

export default CreateTemplatePanel;
