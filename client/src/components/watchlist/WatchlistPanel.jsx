import React from 'react';
import StockCard from './StockCard';
import AddStockSearch from './AddStockSearch';
import { SkeletonList } from '../common/LoadingSpinner';
import ErrorBanner from '../common/ErrorBanner';

/**
 * WatchlistPanel — the main watchlist section.
 */
export default function WatchlistPanel({
  symbols,
  quotes,
  loading,
  error,
  onAdd,
  onRemove,
  onRefresh,
}) {
  const existingSymbols = symbols.map(s => s.symbol);

  return (
    <section className="panel watchlist-panel" aria-labelledby="watchlist-title">
      <div className="panel__header">
        <h2 id="watchlist-title" className="panel__title">
          My Watchlist
          {symbols.length > 0 && (
            <span className="panel__count">{symbols.length}</span>
          )}
        </h2>
        <button
          className="btn btn-icon"
          onClick={onRefresh}
          disabled={loading}
          id="refresh-watchlist-btn"
          aria-label="Refresh quotes"
          title="Refresh quotes"
        >
          {loading ? '⟳' : '↻'}
        </button>
      </div>

      <div className="watchlist-search-wrapper">
        <AddStockSearch onAdd={onAdd} existingSymbols={existingSymbols} />
      </div>

      <ErrorBanner error={error} onRetry={onRefresh} />

      {loading && symbols.length === 0 ? (
        <SkeletonList count={3} />
      ) : symbols.length === 0 ? (
        <EmptyWatchlist />
      ) : (
        <div className="watchlist-grid">
          {symbols.map((item) => (
            <StockCard
              key={item.symbol}
              item={item}
              quote={quotes[item.symbol]}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyWatchlist() {
  return (
    <div className="empty-state" id="empty-watchlist-state">
      <div className="empty-state__icon">📋</div>
      <h3 className="empty-state__title">Your watchlist is empty</h3>
      <p className="empty-state__text">
        Search for a stock above to add it. We'll track meaningful changes for you.
      </p>
    </div>
  );
}
