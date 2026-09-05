import React, { useCallback } from 'react';
import { useWatchlist } from '../hooks/useWatchlist';
import { useQuotes } from '../hooks/useQuotes';
import { useChanges } from '../hooks/useChanges';
import WatchlistPanel from '../components/watchlist/WatchlistPanel';
import ChangesPanel from '../components/changes/ChangesPanel';
import ErrorBanner from '../components/common/ErrorBanner';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Dashboard({ sessionId }) {
  const {
    symbols,
    loading: watchlistLoading,
    error: watchlistError,
    refresh: refreshWatchlist,
    addSymbol,
    removeSymbol,
  } = useWatchlist(sessionId);

  const {
    quotes,
    loading: quotesLoading,
    error: quotesError,
    refresh: refreshQuotes,
  } = useQuotes(sessionId, symbols);

  const {
    diff,
    loading: changesLoading,
    error: changesError,
    committing,
    refresh: refreshChanges,
    commitSnapshot,
  } = useChanges(sessionId, symbols);

  // Add a new symbol: add to watchlist, then refresh quotes and changes
  const handleAdd = useCallback(async (symbol, companyName) => {
    await addSymbol(symbol, companyName);
    // Small delay to let backend register, then refresh
    setTimeout(() => {
      refreshQuotes();
      refreshChanges();
    }, 500);
  }, [addSymbol, refreshQuotes, refreshChanges]);

  // Remove: remove from watchlist, refresh state
  const handleRemove = useCallback(async (symbol) => {
    await removeSymbol(symbol);
    refreshChanges();
  }, [removeSymbol, refreshChanges]);

  // Commit snapshot and refresh changes panel
  const handleCommit = useCallback(async () => {
    try {
      await commitSnapshot();
    } catch (err) {
      console.error('Commit failed:', err);
    }
  }, [commitSnapshot]);

  // Full refresh: quotes + changes
  const handleRefreshAll = useCallback(() => {
    refreshQuotes();
    refreshChanges();
  }, [refreshQuotes, refreshChanges]);

  if (watchlistLoading) {
    return (
      <main className="dashboard dashboard--loading">
        <LoadingSpinner label="Loading your watchlist..." size="lg" />
      </main>
    );
  }

  return (
    <main className="dashboard">
      {watchlistError && (
        <ErrorBanner
          error={watchlistError}
          onRetry={refreshWatchlist}
          className="dashboard-error"
        />
      )}

      <div className="dashboard-layout">
        {/* Left: Watchlist */}
        <WatchlistPanel
          symbols={symbols}
          quotes={quotes}
          loading={quotesLoading}
          error={quotesError}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onRefresh={handleRefreshAll}
        />

        {/* Right: What Changed */}
        <ChangesPanel
          diff={diff}
          loading={changesLoading}
          error={changesError}
          committing={committing}
          onCommit={handleCommit}
          onRefresh={refreshChanges}
          watchlistEmpty={symbols.length === 0}
        />
      </div>
    </main>
  );
}
