/**
 * Standardized Response Helpers
 * Ensures consistent JSON structure across all API endpoints
 */

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {any} data - Data to send
 * @param {String} message - Optional message
 * @param {Number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        data,
        message
    });
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Number} statusCode - HTTP status code (default: 500)
 * @param {any} error - Optional error details
 */
const sendError = (res, message = 'Internal Server Error', statusCode = 500, error = null) => {
    return res.status(statusCode).json({
        success: false,
        data: null,
        message,
        error: process.env.NODE_ENV === 'development' ? error : undefined
    });
};

module.exports = {
    sendSuccess,
    sendError
};
