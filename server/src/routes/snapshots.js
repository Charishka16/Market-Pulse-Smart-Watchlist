/**
 * Snapshots Routes
 * POST /api/snapshots/commit — Save current prices as "last seen" snapshot
 * GET  /api/snapshots/diff   — Compute "What Changed?" vs last snapshot
 * GET  /api/snapshots        — List current snapshots (for debugging)
 */

const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const sessionMiddleware = require('../middleware/session');
const marketDataService = require('../services/marketDataService');
const { processWatchlist } = require('../services/changeDetectionService');

router.use(sessionMiddleware);

/**
 * POST /api/snapshots/commit
 * Saves the current market prices as the user's "last seen" snapshot.
 * Call this when the user acknowledges they've reviewed their watchlist.
 */
router.post('/commit', async (req, res, next) => {
  try {
    // Get watchlist for this session
    const watchlistResult = await db.query(
      'SELECT symbol FROM watchlist WHERE session_id = $1',
      [req.sessionId]
    );
    const symbols = watchlistResult.rows.map(r => r.symbol);

    if (symbols.length === 0) {
      return res.json({ committed: 0, message: 'Watchlist is empty, nothing to snapshot.' });
    }

    // Fetch current quotes
    const quotesMap = await marketDataService.getQuotes(symbols);

    // Upsert snapshots for each symbol with valid data
    let committed = 0;
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      for (const symbol of symbols) {
        const quote = quotesMap[symbol];
        if (!quote || quote.dataStatus === 'error') continue;

        await client.query(
          `INSERT INTO snapshots (session_id, symbol, price, volume, change_pct, previous_close, snapshotted_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (session_id, symbol)
           DO UPDATE SET
             price = EXCLUDED.price,
             volume = EXCLUDED.volume,
             change_pct = EXCLUDED.change_pct,
             previous_close = EXCLUDED.previous_close,
             snapshotted_at = NOW()`,
          [
            req.sessionId,
            symbol,
            quote.price,
            quote.volume,
            quote.changePercent,
            quote.previousClose,
          ]
        );
        committed++;
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({
      committed,
      snapshotAt: new Date().toISOString(),
      message: `Snapshot saved for ${committed} stock${committed !== 1 ? 's' : ''}.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/snapshots/diff
 * Returns "What Changed?" diff comparing current prices to last snapshot.
 * Also auto-commits a fresh snapshot if one doesn't exist yet.
 */
router.get('/diff', async (req, res, next) => {
  try {
    // Get watchlist
    const watchlistResult = await db.query(
      'SELECT symbol FROM watchlist WHERE session_id = $1',
      [req.sessionId]
    );
    const symbols = watchlistResult.rows.map(r => r.symbol);

    if (symbols.length === 0) {
      return res.json({
        changed: [],
        unchanged: [],
        errors: [],
        hasSnapshot: false,
        message: 'Add stocks to your watchlist to track changes.',
      });
    }

    // Get last snapshots for this session
    const snapshotResult = await db.query(
      `SELECT symbol, price, volume, change_pct, previous_close, snapshotted_at
       FROM snapshots
       WHERE session_id = $1 AND symbol = ANY($2)`,
      [req.sessionId, symbols]
    );
    const snapshots = snapshotResult.rows;

    // Fetch current quotes
    const quotesMap = await marketDataService.getQuotes(symbols);

    // Compute changes
    const { changed, unchanged, errors } = processWatchlist(snapshots, quotesMap);

    // Find the most recent snapshot time (to display "last checked at X")
    const lastSnapshotAt =
      snapshots.length > 0
        ? snapshots.reduce((latest, s) =>
            new Date(s.snapshotted_at) > new Date(latest)
              ? s.snapshotted_at
              : latest,
            snapshots[0].snapshotted_at
          )
        : null;

    res.json({
      changed,
      unchanged,
      errors,
      hasSnapshot: snapshots.length > 0,
      lastSnapshotAt,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/snapshots — List current snapshots for this session
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT symbol, price, volume, change_pct, snapshotted_at
       FROM snapshots
       WHERE session_id = $1
       ORDER BY snapshotted_at DESC`,
      [req.sessionId]
    );
    res.json({ snapshots: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
