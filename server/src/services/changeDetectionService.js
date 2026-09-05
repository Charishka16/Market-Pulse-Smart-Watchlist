/**
 * ChangeDetectionService
 *
 * Computes "What Changed?" by comparing current market data to a stored snapshot.
 *
 * Rules are explicit, simple, and explainable. Each rule produces a human-readable
 * trigger string that is shown directly in the UI.
 *
 * Thresholds:
 *   PRICE_HIGH    >= 5% change  → High severity
 *   PRICE_MEDIUM  >= 2% change  → Medium severity
 *   PRICE_LOW     >= 0.5% change → Low severity (informational)
 *   VOLUME_HIGH   >= 3x snapshot volume → High severity
 *   VOLUME_MEDIUM >= 2x snapshot volume → Medium severity
 *   DIRECTION_FLIP: was positive on last visit, now negative (or vice versa)
 */

const THRESHOLDS = {
  PRICE_HIGH: 5,
  PRICE_MEDIUM: 2,
  PRICE_LOW: 0.5,
  VOLUME_HIGH: 3,
  VOLUME_MEDIUM: 2,
};

/**
 * Compute the change diff for a single symbol.
 *
 * @param {Object} snapshot   - The stored snapshot row from DB
 * @param {Object} current    - The current MarketQuote from market data service
 * @returns {ChangeDiff}
 *
 * @typedef {Object} ChangeDiff
 * @property {string}   symbol
 * @property {number}   snapshotPrice
 * @property {number}   currentPrice
 * @property {number}   priceChangeSinceLastVisit   Absolute change
 * @property {number}   pctChangeSinceLastVisit     Percentage change
 * @property {number|null} volumeRatio              current/snapshot volume
 * @property {'high'|'medium'|'low'|'none'} severity
 * @property {string[]} triggers                    Human-readable reasons
 * @property {string}   snapshotAt                 ISO timestamp of snapshot
 * @property {boolean}  hasSnapshot                 Was there a prior snapshot?
 * @property {Object}   currentQuote                Full current quote
 */
function computeChanges(snapshot, current) {
  // No snapshot exists yet → first visit
  if (!snapshot) {
    return {
      symbol: current.symbol,
      snapshotPrice: null,
      currentPrice: current.price,
      priceChangeSinceLastVisit: null,
      pctChangeSinceLastVisit: null,
      volumeRatio: null,
      severity: 'none',
      triggers: [],
      snapshotAt: null,
      hasSnapshot: false,
      currentQuote: current,
    };
  }

  const snapshotPrice = parseFloat(snapshot.price) || 0;
  const currentPrice = current.price || 0;
  const snapshotVolume = parseInt(snapshot.volume) || 0;
  const currentVolume = current.volume || 0;
  const snapshotChangePct = parseFloat(snapshot.change_pct) || 0;
  const currentChangePct = current.changePercent || 0;

  const priceChangeSinceLastVisit = currentPrice - snapshotPrice;
  const pctChangeSinceLastVisit =
    snapshotPrice !== 0
      ? ((currentPrice - snapshotPrice) / snapshotPrice) * 100
      : 0;

  const absPct = Math.abs(pctChangeSinceLastVisit);
  const volumeRatio =
    snapshotVolume > 0 ? currentVolume / snapshotVolume : null;

  const triggers = [];
  let severity = 'none';

  // ── Rule 1: Price movement ──────────────────────────────────────────────
  if (absPct >= THRESHOLDS.PRICE_HIGH) {
    severity = _maxSeverity(severity, 'high');
    const dir = pctChangeSinceLastVisit >= 0 ? '↑' : '↓';
    triggers.push(`${dir} Big move: ${_fmtPct(pctChangeSinceLastVisit)} since your last visit`);
  } else if (absPct >= THRESHOLDS.PRICE_MEDIUM) {
    severity = _maxSeverity(severity, 'medium');
    const dir = pctChangeSinceLastVisit >= 0 ? '↑' : '↓';
    triggers.push(`${dir} Notable move: ${_fmtPct(pctChangeSinceLastVisit)} since your last visit`);
  } else if (absPct >= THRESHOLDS.PRICE_LOW) {
    severity = _maxSeverity(severity, 'low');
    const dir = pctChangeSinceLastVisit >= 0 ? '↑' : '↓';
    triggers.push(`${dir} Small move: ${_fmtPct(pctChangeSinceLastVisit)} since your last visit`);
  }

  // ── Rule 2: Volume spike ────────────────────────────────────────────────
  if (volumeRatio !== null) {
    if (volumeRatio >= THRESHOLDS.VOLUME_HIGH) {
      severity = _maxSeverity(severity, 'high');
      triggers.push(`📊 Volume spike: ${volumeRatio.toFixed(1)}× your last visit`);
    } else if (volumeRatio >= THRESHOLDS.VOLUME_MEDIUM) {
      severity = _maxSeverity(severity, 'medium');
      triggers.push(`📊 Elevated volume: ${volumeRatio.toFixed(1)}× your last visit`);
    }
  }

  // ── Rule 3: Direction flip ──────────────────────────────────────────────
  const wasPositive = snapshotChangePct >= 0;
  const isPositive = currentChangePct >= 0;
  if (
    snapshot.price !== null &&
    Math.abs(pctChangeSinceLastVisit) >= THRESHOLDS.PRICE_LOW && // Only flag if there's also movement
    wasPositive !== isPositive
  ) {
    severity = _maxSeverity(severity, 'medium');
    triggers.push(
      `🔄 Direction flipped: was ${wasPositive ? 'positive' : 'negative'} on your last visit`
    );
  }

  // ── Rule 4: Crossed key thresholds relative to previous close ───────────
  if (snapshot.previous_close && current.previousClose) {
    const prevClose = parseFloat(snapshot.previous_close);
    if (prevClose > 0) {
      const dayChangePct = ((currentPrice - prevClose) / prevClose) * 100;
      if (Math.abs(dayChangePct) >= 10) {
        severity = _maxSeverity(severity, 'high');
        triggers.push(`⚡ Crossed ±10% from previous close (${_fmtPct(dayChangePct)})`);
      }
    }
  }

  return {
    symbol: current.symbol,
    snapshotPrice,
    currentPrice,
    priceChangeSinceLastVisit,
    pctChangeSinceLastVisit,
    volumeRatio,
    severity,
    triggers,
    snapshotAt: snapshot.snapshotted_at,
    hasSnapshot: true,
    currentQuote: current,
  };
}

/**
 * Process a full watchlist: returns only items with meaningful changes (severity != 'none')
 * plus items that have no snapshot yet.
 *
 * @param {Object[]} snapshots   - Array of snapshot rows from DB
 * @param {Object}   quotesMap   - Map of symbol → MarketQuote
 * @returns {{ changed: ChangeDiff[], unchanged: ChangeDiff[], errors: Object[] }}
 */
function processWatchlist(snapshots, quotesMap) {
  const snapshotMap = {};
  snapshots.forEach(s => { snapshotMap[s.symbol] = s; });

  const changed = [];
  const unchanged = [];
  const errors = [];

  for (const [symbol, quote] of Object.entries(quotesMap)) {
    if (quote.dataStatus === 'error' || quote.error) {
      errors.push({ symbol, error: quote.error || 'Fetch failed', errorCode: quote.errorCode });
      continue;
    }

    const diff = computeChanges(snapshotMap[symbol] || null, quote);

    if (diff.severity !== 'none' || !diff.hasSnapshot) {
      changed.push(diff);
    } else {
      unchanged.push(diff);
    }
  }

  // Sort changed items by severity (high → medium → low → none)
  const severityOrder = { high: 0, medium: 1, low: 2, none: 3 };
  changed.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return { changed, unchanged, errors };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function _fmtPct(value) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function _maxSeverity(current, candidate) {
  const order = { none: 0, low: 1, medium: 2, high: 3 };
  return order[candidate] > order[current] ? candidate : current;
}

module.exports = { computeChanges, processWatchlist };
