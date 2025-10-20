/**
 * Response helper utilities for consistent API REST responses
 */

// HTTP Status codes for Google Sheets operations
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Error types for better error categorization
export const ERROR_TYPES = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  NETWORK: 'NETWORK_ERROR',
  GOOGLE_API: 'GOOGLE_API_ERROR',
  INTERNAL: 'INTERNAL_ERROR'
};

/**
 * Creates a standardized success response
 * @param {any} data - The response data
 * @param {number} status - HTTP status code
 * @param {string} message - Optional success message
 * @returns {Object} Standardized response object
 */
export const createSuccessResponse = (data = null, status = HTTP_STATUS.OK, message = 'Success') => {
  return {
    success: true,
    status,
    message,
    data,
    error: null,
    timestamp: new Date().toISOString()
  };
};

/**
 * Creates a standardized error response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {string} type - Error type
 * @param {any} details - Additional error details
 * @returns {Object} Standardized error response object
 */
export const createErrorResponse = (
  message = 'An error occurred',
  status = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  type = ERROR_TYPES.INTERNAL,
  details = null
) => {
  return {
    success: false,
    status,
    message: 'Error',
    data: null,
    error: {
      type,
      message,
      details,
      code: status
    },
    timestamp: new Date().toISOString()
  };
};

/**
 * Maps Google API errors to standardized error responses
 * @param {Object} error - Google API error object
 * @param {string} operation - The operation that failed
 * @param {Object} additionalContext - Additional context for error reporting
 * @returns {Object} Standardized error response
 */
export const mapGoogleApiError = (error, operation = 'Operation', additionalContext = {}) => {
  let status, type, message;

  if (error?.result?.error) {
    const googleError = error.result.error;
    
    switch (googleError.code) {
      case 400:
        status = HTTP_STATUS.BAD_REQUEST;
        type = ERROR_TYPES.VALIDATION;
        message = `Invalid request: ${googleError.message}`;
        break;
      case 401:
        status = HTTP_STATUS.UNAUTHORIZED;
        type = ERROR_TYPES.AUTHENTICATION;
        message = 'Authentication required. Please login again.';
        break;
      case 403:
        status = HTTP_STATUS.FORBIDDEN;
        type = ERROR_TYPES.PERMISSION;
        message = 'Permission denied. Check sheet permissions.';
        break;
      case 404:
        status = HTTP_STATUS.NOT_FOUND;
        type = ERROR_TYPES.NOT_FOUND;
        message = 'Sheet or range not found.';
        break;
      case 429:
        status = HTTP_STATUS.SERVICE_UNAVAILABLE;
        type = ERROR_TYPES.GOOGLE_API;
        message = 'Rate limit exceeded. Please try again later.';
        break;
      default:
        status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        type = ERROR_TYPES.GOOGLE_API;
        message = `Google API error: ${googleError.message}`;
    }
  } else {
    status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    type = ERROR_TYPES.NETWORK;
    message = `Network error during ${operation}`;
  }

  return createErrorResponse(message, status, type, {
    operation,
    originalError: error,
    ...additionalContext  // Include fileName, sheetName, sheetId, etc.
  });
};

/**
 * Validates required fields in data object
 * @param {Object} data - Data to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object|null} Error response if validation fails, null if valid
 */
export const validateRequiredFields = (data, requiredFields) => {
  const missingFields = requiredFields.filter(field => 
    data[field] === undefined || data[field] === null || data[field] === ''
  );

  if (missingFields.length > 0) {
    return createErrorResponse(
      `Missing required fields: ${missingFields.join(', ')}`,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_TYPES.VALIDATION,
      { missingFields }
    );
  }

  return null;
};

/**
 * Wraps async operations with error handling
 * @param {Function} operation - Async function to execute
 * @param {string} operationName - Name of the operation for error context
 * @param {Object} additionalContext - Additional context for error reporting (optional)
 * @returns {Function} Wrapped function with error handling
 */
export const withErrorHandling = (operation, operationName, additionalContext = {}) => {
  return async (...args) => {
    try {
      return await operation(...args);
    } catch (error) {
      console.error(`Error in ${operationName}:`, error);
      
      if (error.result?.error) {
        return mapGoogleApiError(error, operationName, additionalContext);
      }
      
      return createErrorResponse(
        error.message || `Error in ${operationName}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_TYPES.INTERNAL,
        { operation: operationName, stack: error.stack, ...additionalContext }
      );
    }
  };
};