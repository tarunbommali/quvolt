const ErrorState = ({ title, message, actionLabel = 'Retry', onAction }) => (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
        <p className="font-semibold">{title}</p>
        {message ? <p className="mt-1 text-rose-700">{message}</p> : null}
        {onAction ? (
            <button
                type="button"
                onClick={onAction}
                className="mt-3 inline-flex rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
                {actionLabel}
            </button>
        ) : null}
    </div>
);

export default ErrorState;