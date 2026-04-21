/**
 * Centralized API error handler for descriptive user feedback.
 * Pro tip: Connect this to your toast or notification system.
 * 
 * @param {Error} error - The error object from axios/apiClient
 * @returns {string} - Human-readable error message
 */
export const handleApiError = (error) => {
    if (!error.response) {
        return "Network error. Please check your internet connection.";
    }

    const { status, data } = error.response;
    
    // Check for structured error messages from the backend
    if (data?.message) return data.message;
    if (data?.error?.message) return data.error.message;

    switch (status) {
        case 400: return "Invalid request. Please check your input.";
        case 401: return "Session expired. Please log in again.";
        case 403: return "You don't have permission to perform this action.";
        case 404: return "Requested resource not found.";
        case 429: return "Too many requests. Please slow down.";
        case 500: return "Internal server error. Our team has been notified.";
        default: return "Something went wrong. Please try again later.";
    }
};
