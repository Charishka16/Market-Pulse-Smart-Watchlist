import React from 'react';

export default function LoadingSpinner({ size = 'md', label = 'Loading...' }) {
  return (
    <div className={`spinner-wrapper spinner--${size}`} role="status" aria-label={label}>
      <div className="spinner" />
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
}

/**
 * SkeletonCard — placeholder shimmer while data loads.
 */
export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-line skeleton-line--wide" />
      <div className="skeleton-line skeleton-line--narrow" />
      <div className="skeleton-line skeleton-line--medium" />
    </div>
  );
}

/**
 * SkeletonList — N skeleton cards in a column.
 */
export function SkeletonList({ count = 3 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
