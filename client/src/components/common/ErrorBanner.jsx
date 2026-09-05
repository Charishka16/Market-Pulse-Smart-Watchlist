import React from 'react';

/**
 * ErrorBanner — displays an error with a retry button.
 * Supports different severity levels and error codes.
 */
export default function ErrorBanner({ error, errorCode, onRetry, className = '' }) {
  if (!error) return null;

  const isRateLimit = errorCode === 'RATE_LIMITED';
  const isNetworkError = errorCode === 'NETWORK_ERROR' || error.toLowerCase().includes('network');

  return (
    <div
      className={`error-banner ${isRateLimit ? 'error-banner--warning' : 'error-banner--error'} ${className}`}
      role="alert"
    >
      <div className="error-banner__icon">
        {isRateLimit ? '⏳' : isNetworkError ? '📡' : '⚠️'}
      </div>
      <div className="error-banner__content">
        <p className="error-banner__message">{error}</p>
        {isRateLimit && (
          <p className="error-banner__hint">
            Alpha Vantage free tier limit reached. Wait ~1 minute and retry.
          </p>
        )}
      </div>
      {onRetry && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={onRetry}
          id="error-retry-btn"
        >
          Retry
        </button>
      )}
    </div>
  );
}
