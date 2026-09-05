import React from 'react';
import { formatPrice, formatPercent, formatRelativeTime, formatDateTime } from '../../utils/formatters';
import PriceDisplay from '../common/PriceDisplay';

/**
 * ChangeCard — displays a single stock's change since last visit.
 */
export default function ChangeCard({ diff }) {
  const severityClass = {
    high: 'change-card--high',
    medium: 'change-card--medium',
    low: 'change-card--low',
    none: 'change-card--none',
  }[diff.severity] || '';

  const priceDir = diff.pctChangeSinceLastVisit >= 0 ? 'positive' : 'negative';

  return (
    <div
      className={`change-card ${severityClass}`}
      id={`change-${diff.symbol}`}
      role="article"
      aria-label={`Change alert for ${diff.symbol}`}
    >
      <div className="change-card__header">
        <div className="change-card__identity">
          <span className="stock-symbol">{diff.symbol}</span>
          {diff.severity !== 'none' && (
            <span className={`severity-badge severity-badge--${diff.severity}`}>
              {diff.severity === 'high' && '🔴 High'}
              {diff.severity === 'medium' && '🟡 Medium'}
              {diff.severity === 'low' && '🔵 Low'}
            </span>
          )}
        </div>
        <PriceDisplay
          price={diff.currentPrice}
          change={diff.currentQuote?.change}
          changePercent={diff.currentQuote?.changePercent}
          size="md"
        />
      </div>

      {diff.hasSnapshot && diff.snapshotPrice != null && (
        <div className="change-card__since-visit">
          <div className="since-visit-label">Since your last visit:</div>
          <div className={`since-visit-change price-${priceDir}`}>
            {priceDir === 'positive' ? '▲' : '▼'}
            {' '}{formatPercent(diff.pctChangeSinceLastVisit)}
            <span className="since-visit-abs">
              ({diff.pctChangeSinceLastVisit >= 0 ? '+' : ''}{formatPrice(diff.priceChangeSinceLastVisit)})
            </span>
          </div>
          <div className="since-visit-from">
            from {formatPrice(diff.snapshotPrice)}
          </div>
        </div>
      )}

      {diff.triggers.length > 0 && (
        <ul className="change-triggers" aria-label="Reasons for this alert">
          {diff.triggers.map((trigger, i) => (
            <li key={i} className="change-trigger">
              {trigger}
            </li>
          ))}
        </ul>
      )}

      {diff.snapshotAt && (
        <div className="change-card__footer">
          <span className="snapshot-time" title={formatDateTime(diff.snapshotAt)}>
            Compared to snapshot from {formatRelativeTime(diff.snapshotAt)}
          </span>
        </div>
      )}
    </div>
  );
}
