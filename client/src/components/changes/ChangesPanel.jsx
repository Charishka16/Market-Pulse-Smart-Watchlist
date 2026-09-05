import React from 'react';
import ChangeCard from './ChangeCard';
import { SkeletonList } from '../common/LoadingSpinner';
import ErrorBanner from '../common/ErrorBanner';
import { formatRelativeTime, formatDateTime } from '../../utils/formatters';

/**
 * ChangesPanel — the "What Changed?" section.
 * Shows meaningful changes since the user's last snapshot.
 */
export default function ChangesPanel({
  diff,
  loading,
  error,
  committing,
  onCommit,
  onRefresh,
  watchlistEmpty,
}) {
  if (watchlistEmpty) {
    return null; // Don't show section if watchlist is empty
  }

  return (
    <section className="panel changes-panel" aria-labelledby="changes-title">
      <div className="panel__header">
        <div className="panel__header-left">
          <h2 id="changes-title" className="panel__title">
            What Changed?
          </h2>
          {diff?.lastSnapshotAt && (
            <span
              className="last-checked-time"
              title={formatDateTime(diff.lastSnapshotAt)}
            >
              Last checked {formatRelativeTime(diff.lastSnapshotAt)}
            </span>
          )}
        </div>
        <div className="panel__header-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            disabled={loading || committing}
            id="refresh-changes-btn"
            aria-label="Refresh change data"
          >
            ↻ Refresh
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={onCommit}
            disabled={committing || loading || !diff}
            id="mark-reviewed-btn"
            title="Save current prices as your new baseline for future change detection"
          >
            {committing ? 'Saving...' : '✓ Mark as Reviewed'}
          </button>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={onRefresh} className="changes-error" />

      {loading ? (
        <SkeletonList count={2} />
      ) : !diff ? null : !diff.hasSnapshot ? (
        <FirstVisitState />
      ) : diff.changed.length === 0 ? (
        <AllCaughtUpState lastSnapshotAt={diff.lastSnapshotAt} />
      ) : (
        <>
          <div className="changes-summary">
            <span className="changes-count">
              {diff.changed.length} stock{diff.changed.length !== 1 ? 's' : ''} with meaningful changes
            </span>
            {diff.unchanged.length > 0 && (
              <span className="unchanged-count">
                · {diff.unchanged.length} unchanged
              </span>
            )}
          </div>

          <div className="changes-list">
            {diff.changed.map(d => (
              <ChangeCard key={d.symbol} diff={d} />
            ))}
          </div>

          {diff.errors.length > 0 && (
            <div className="changes-errors">
              <p className="changes-errors__label">
                Could not check {diff.errors.length} stock{diff.errors.length !== 1 ? 's' : ''}:
              </p>
              <ul className="changes-errors__list">
                {diff.errors.map(e => (
                  <li key={e.symbol}>{e.symbol}: {e.error}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="changes-tip">
            💡 Click <strong>Mark as Reviewed</strong> to save these prices as your new baseline.
            Next time you visit, you'll see what changed from here.
          </p>
        </>
      )}
    </section>
  );
}

function FirstVisitState() {
  return (
    <div className="empty-state" id="first-visit-state">
      <div className="empty-state__icon">👋</div>
      <h3 className="empty-state__title">Welcome to MarketPulse!</h3>
      <p className="empty-state__text">
        No previous snapshot found. Click <strong>Mark as Reviewed</strong> after
        reviewing your watchlist. When you return, we'll show you exactly what changed.
      </p>
    </div>
  );
}

function AllCaughtUpState({ lastSnapshotAt }) {
  return (
    <div className="empty-state empty-state--success" id="all-caught-up-state">
      <div className="empty-state__icon">✅</div>
      <h3 className="empty-state__title">You're all caught up!</h3>
      <p className="empty-state__text">
        No meaningful changes since{' '}
        {lastSnapshotAt ? formatDateTime(lastSnapshotAt) : 'your last visit'}.
        Prices are relatively stable.
      </p>
    </div>
  );
}
