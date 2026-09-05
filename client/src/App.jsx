import React from 'react';
import { useSession } from './hooks/useSession';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBanner from './components/common/ErrorBanner';

export default function App() {
  const { sessionId, loading, error, retry } = useSession();

  if (loading) {
    return (
      <div className="app-init">
        <LoadingSpinner label="Initializing MarketPulse..." size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-init app-init--error">
        <ErrorBanner
          error={`Could not connect to server: ${error}`}
          onRetry={retry}
        />
        <p className="app-init__hint">
          Make sure the MarketPulse server is running on port 3001.
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <Header sessionId={sessionId} />
      <Dashboard sessionId={sessionId} />
      <footer className="app-footer">
        <p>
          MarketPulse · Data provided by{' '}
          <a
            href="https://www.alphavantage.co"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            Alpha Vantage
          </a>
          {' '}· ~15 min delayed US equities · Built for Groww Code 2026
        </p>
      </footer>
    </div>
  );
}
