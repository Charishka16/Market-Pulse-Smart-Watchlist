import React from 'react';
import { formatPrice, formatPercent, getPriceDirection } from '../../utils/formatters';

/**
 * PriceDisplay — shows a price with directional color and optional change indicator.
 */
export default function PriceDisplay({
  price,
  change,
  changePercent,
  size = 'md',
  showChange = true,
}) {
  const direction = getPriceDirection(change);

  return (
    <div className={`price-display price-display--${size}`}>
      <span className={`price-value price-${direction}`}>
        {formatPrice(price)}
      </span>
      {showChange && (
        <span className={`price-change price-${direction}`}>
          {direction === 'positive' && '▲'}
          {direction === 'negative' && '▼'}
          {' '}{formatPercent(changePercent)}
        </span>
      )}
    </div>
  );
}
