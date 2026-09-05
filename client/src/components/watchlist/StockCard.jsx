import React, { useState } from 'react';
import { formatPrice, formatPercent, formatVolume, formatRelativeTime } from '../../utils/formatters';
import DataStatusBadge from '../common/DataStatusBadge';
import PriceDisplay from '../common/PriceDisplay';

/**
 * StockCard — a single stock row in the watchlist with all market data.
 */
export default function StockCard({ item, quote, onRemove }) {
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const handleRemove = async () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    try {
      setRemoving(true);
      await onRemove(item.symbol);
    } catch {
      setRemoving(false);
      setConfirmRemove(false);
    }
  };

  const hasQuote = quote && quote.dataStatus !== 'error';
  const hasError = quote?.dataStatus === 'error' || quote?.error;

  return (
    <div className={`stock-card ${hasError ? 'stock-card--error' : ''}`} id={`stock-${item.symbol}`}>
      <div className="stock-card__header">
        <div className="stock-card__identity">
          <span className="stock-symbol">{item.symbol}</span>
          <span className="stock-name">{item.company_name || item.symbol}</span>
        </div>
        <div className="stock-card__status">
          {quote && <DataStatusBadge status={quote.dataStatus} note={quote.dataNote} />}
        </div>
      </div>

      <div className="stock-card__body">
        {hasError ? (
          <div className="stock-card__error-state">
            <span className="error-icon">⚠</span>
            <span className="error-text">
              {quote?.error || 'Failed to load quote'}
            </span>
          </div>
        ) : !quote ? (
          <div className="stock-card__loading">
            <div className="skeleton-line skeleton-line--price" />
            <div className="skeleton-line skeleton-line--change" />
          </div>
        ) : (
          <>
            <PriceDisplay
              price={quote.price}
              change={quote.change}
              changePercent={quote.changePercent}
              size="lg"
            />
            <div className="stock-card__metrics">
              <div className="metric">
                <span className="metric-label">Open</span>
                <span className="metric-value">{formatPrice(quote.open)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">High</span>
                <span className="metric-value positive">{formatPrice(quote.high)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Low</span>
                <span className="metric-value negative">{formatPrice(quote.low)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Volume</span>
                <span className="metric-value">{formatVolume(quote.volume)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Prev Close</span>
                <span className="metric-value">{formatPrice(quote.previousClose)}</span>
              </div>
            </div>
            {quote.latestTradingDay && (
              <div className="stock-card__trading-day">
                Trading day: {quote.latestTradingDay}
              </div>
            )}
          </>
        )}
      </div>

      <div className="stock-card__footer">
        {quote?.fetchedAt && (
          <span className="stock-card__age">
            Updated {formatRelativeTime(quote.fetchedAt)}
          </span>
        )}
        <button
          className={`btn btn-remove ${confirmRemove ? 'btn-remove--confirm' : ''}`}
          onClick={handleRemove}
          disabled={removing}
          id={`remove-${item.symbol}`}
          aria-label={confirmRemove ? `Confirm remove ${item.symbol}` : `Remove ${item.symbol} from watchlist`}
        >
          {removing ? '...' : confirmRemove ? 'Confirm?' : '✕'}
        </button>
        {confirmRemove && (
          <button
            className="btn btn-cancel-remove"
            onClick={() => setConfirmRemove(false)}
            aria-label="Cancel remove"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
