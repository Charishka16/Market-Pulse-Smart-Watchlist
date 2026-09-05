/**
 * Global error handler middleware.
 * Converts known error types into appropriate HTTP responses.
 */

function errorHandler(err, req, res, next) {
  // Don't modify a response that has already started streaming
  if (res.headersSent) {
    return next(err);
  }

  const isDev = process.env.NODE_ENV === 'development';

  // Known application error codes
  if (err.code === 'RATE_LIMITED') {
    return res.status(429).json({
      error: 'Market data API rate limit reached. Please wait a few minutes and try again.',
      errorCode: 'RATE_LIMITED',
      retryAfterSeconds: 60,
    });
  }

  if (err.code === 'SYMBOL_NOT_FOUND') {
    return res.status(404).json({
      error: err.message,
      errorCode: 'SYMBOL_NOT_FOUND',
    });
  }

  if (err.code === '23505') {
    // PostgreSQL unique violation
    return res.status(409).json({
      error: 'This item already exists.',
      errorCode: 'DUPLICATE',
    });
  }

  if (err.code === '23503') {
    // PostgreSQL foreign key violation
    return res.status(400).json({
      error: 'Referenced resource does not exist.',
      errorCode: 'INVALID_REFERENCE',
    });
  }

  // Axios errors (API fetch failures)
  if (err.isAxiosError) {
    const status = err.response?.status;
    if (status === 429) {
      return res.status(429).json({
        error: 'Market data API rate limit reached.',
        errorCode: 'RATE_LIMITED',
      });
    }
    return res.status(502).json({
      error: 'Failed to reach market data provider. Please try again.',
      errorCode: 'UPSTREAM_ERROR',
    });
  }

  // Generic server error
  console.error('[Server Error]', err.message, isDev ? err.stack : '');
  return res.status(500).json({
    error: 'An internal server error occurred.',
    errorCode: 'INTERNAL_ERROR',
    ...(isDev && { details: err.message, stack: err.stack }),
  });
}

module.exports = errorHandler;
