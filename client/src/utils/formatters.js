/**
 * Formatting utilities for the MarketPulse UI.
 */

/**
 * Format a price value as USD currency string.
 * @param {number} value
 * @returns {string}  e.g. "$182.50"
 */
export function formatPrice(value) {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a percentage change with sign.
 * @param {number} value
 * @returns {string}  e.g. "+2.34%" or "-1.50%"
 */
export function formatPercent(value) {
  if (value == null || isNaN(value)) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format a large volume number compactly.
 * @param {number} value
 * @returns {string}  e.g. "12.3M" or "450K"
 */
export function formatVolume(value) {
  if (value == null || isNaN(value)) return '—';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

/**
 * Format a timestamp as a relative time string.
 * @param {string|Date} timestamp
 * @returns {string}  e.g. "2 hours ago", "just now"
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'yesterday';
  return `${diffDay} days ago`;
}

/**
 * Format a timestamp as an absolute local datetime.
 * @param {string|Date} timestamp
 * @returns {string}  e.g. "Sep 3, 2026, 8:42 AM"
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(timestamp));
}

/**
 * Return CSS color class based on a positive/negative numeric value.
 * @param {number} value
 * @returns {'positive'|'negative'|'neutral'}
 */
export function getPriceDirection(value) {
  if (value == null || isNaN(value)) return 'neutral';
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

/**
 * Map change severity to a color label.
 * @param {'high'|'medium'|'low'|'none'} severity
 * @returns {string}  CSS class suffix
 */
export function severityToColor(severity) {
  switch (severity) {
    case 'high': return 'red';
    case 'medium': return 'amber';
    case 'low': return 'blue';
    default: return 'gray';
  }
}
