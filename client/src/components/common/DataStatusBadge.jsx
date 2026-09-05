import React from 'react';

/**
 * DataStatusBadge — shows whether data is fresh, cached, stale, or errored.
 * Always tells the user the truth about their data quality.
 */
export default function DataStatusBadge({ status, note, fetchedAt }) {
  const configs = {
    fresh: {
      label: '● Live',
      className: 'badge-fresh',
      title: note || 'Data is from the latest market session (~15 min delay)',
    },
    cached: {
      label: '◌ Cached',
      className: 'badge-cached',
      title: note || 'Showing cached data. Will refresh automatically.',
    },
    stale: {
      label: '⚠ Stale',
      className: 'badge-stale',
      title: note || 'Data may be outdated. Consider refreshing.',
    },
    error: {
      label: '✕ Error',
      className: 'badge-error',
      title: note || 'Could not fetch fresh data.',
    },
  };

  const config = configs[status] || configs.stale;

  return (
    <span
      className={`data-status-badge ${config.className}`}
      title={config.title}
      aria-label={`Data status: ${status}`}
    >
      {config.label}
    </span>
  );
}
