const env = require('../config/env');

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function errorHandler(err, req, res, next) {
  // Always log server-side for observability
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, {
    message: err.message,
    code: err.code,
    stack: err.stack,
    details: err.details
  });

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  if (statusCode >= 500) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred'
      }
    });
  }

  const responseBody = {
    error: {
      code,
      message: err.message || 'An error occurred'
    }
  };

  if (err.details) {
    responseBody.error.details = err.details;
  }

  return res.status(statusCode).json(responseBody);
}

module.exports = {
  errorHandler,
  AppError
};
