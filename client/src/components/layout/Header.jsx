import React from 'react';

/**
 * Header — top navigation bar.
 */
export default function Header({ sessionId }) {
  return (
    <header className="app-header" role="banner">
      <div className="header-inner">
        <div className="header-brand">
          <span className="brand-logo" aria-hidden="true">📈</span>
          <span className="brand-name">MarketPulse</span>
          <span className="brand-tagline">Smart Watchlist</span>
        </div>
        <div className="header-meta">
          <span className="header-delay-note" title="Alpha Vantage free tier provides ~15 min delayed US equity data">
            ⚡ ~15 min delayed data
          </span>
          {sessionId && (
            <span
              className="header-session"
              title={`Your session ID: ${sessionId}`}
              aria-label="Session active"
            >
              🔒 Session active
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
