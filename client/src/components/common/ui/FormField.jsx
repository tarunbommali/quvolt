/**
 * Reusable form field component with label, input, and error display
 * ✅ Consistent styling across all forms
 * ✅ Built-in error handling
 * ✅ Support for all input types
 */
const FormField = ({
    label = '',
    name = '',
    type = 'text',
    value = '',
    placeholder = '',
    error = '',
    disabled = false,
    required = false,
    onChange = () => {},
    onBlur = () => {},
    children = null,
    helperText = '',
    rows = null,
}) => {
    const label_ = 'text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500';
    const input = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500';
    const error_ = 'mt-1 text-xs text-red-600 dark:text-red-400';
    const helper = 'mt-1 text-xs text-gray-500 dark:text-gray-400';
    const errorInput = 'border-red-500 focus-visible:ring-red-500';

    return (
        <div className="space-y-1">
            {label && (
                <label className={label_}>
                    {label}
                    {required && <span className="text-red-500"> *</span>}
                </label>
            )}

            {children ? (
                children
            ) : type === 'textarea' ? (
                <textarea
                    name={name}
                    value={value}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={rows || 4}
                    onChange={onChange}
                    onBlur={onBlur}
                    className={`${input} ${error ? errorInput : ''}`}
                />
            ) : (
                <input
                    type={type}
                    name={name}
                    value={value}
                    placeholder={placeholder}
                    disabled={disabled}
                    onChange={onChange}
                    onBlur={onBlur}
                    className={`${input} ${error ? errorInput : ''}`}
                />
            )}

            {error && <div className={error_}>{error}</div>}
            {helperText && !error && <div className={helper}>{helperText}</div>}
        </div>
    );
};

export default FormField;
