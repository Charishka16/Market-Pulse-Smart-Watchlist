/**
 * Watchlist Routes
 * GET    /api/watchlist          — Get all symbols in user's watchlist
 * POST   /api/watchlist          — Add a symbol to watchlist
 * DELETE /api/watchlist/:symbol  — Remove a symbol from watchlist
 */

const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const sessionMiddleware = require('../middleware/session');
const marketDataService = require('../services/marketDataService');

// All watchlist routes require a valid session
router.use(sessionMiddleware);

const MAX_WATCHLIST_SIZE = 20;

// GET /api/watchlist
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT symbol, company_name, added_at
       FROM watchlist
       WHERE session_id = $1
       ORDER BY added_at DESC`,
      [req.sessionId]
    );
    res.json({
      symbols: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/watchlist
router.post('/', async (req, res, next) => {
  try {
    const { symbol, companyName } = req.body;

    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({ error: 'symbol is required' });
    }

    const cleanSymbol = symbol.trim().toUpperCase();

    if (!/^[A-Z.]{1,10}$/.test(cleanSymbol)) {
      return res.status(400).json({
        error: 'Invalid symbol format. Use uppercase letters only (e.g. AAPL, TSLA).',
        errorCode: 'INVALID_SYMBOL',
      });
    }

    // Check watchlist size limit
    const countResult = await db.query(
      'SELECT COUNT(*) FROM watchlist WHERE session_id = $1',
      [req.sessionId]
    );
    if (parseInt(countResult.rows[0].count) >= MAX_WATCHLIST_SIZE) {
      return res.status(400).json({
        error: `Watchlist is full. Maximum ${MAX_WATCHLIST_SIZE} stocks allowed.`,
        errorCode: 'WATCHLIST_FULL',
      });
    }

    // Validate the symbol exists via market data (throws SYMBOL_NOT_FOUND if not)
    let resolvedName = companyName || cleanSymbol;
    try {
      const quote = await marketDataService.getQuote(cleanSymbol);
      resolvedName = companyName || quote.companyName || cleanSymbol;
    } catch (err) {
      if (err.code === 'SYMBOL_NOT_FOUND') {
        return res.status(404).json({
          error: `Symbol "${cleanSymbol}" was not found. Please check the ticker symbol.`,
          errorCode: 'SYMBOL_NOT_FOUND',
        });
      }
      if (err.code === 'RATE_LIMITED') {
        // Don't block the add operation on rate limit — add optimistically
        console.warn(`[Watchlist] Rate limited when validating ${cleanSymbol}, adding anyway`);
      }
      // Other errors: add anyway (don't block UX on API flakiness)
    }

    const result = await db.query(
      `INSERT INTO watchlist (session_id, symbol, company_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id, symbol) DO NOTHING
       RETURNING symbol, company_name, added_at`,
      [req.sessionId, cleanSymbol, resolvedName]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({
        error: `"${cleanSymbol}" is already in your watchlist.`,
        errorCode: 'DUPLICATE',
      });
    }

    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/watchlist/:symbol
router.delete('/:symbol', async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    const result = await db.query(
      `DELETE FROM watchlist
       WHERE session_id = $1 AND symbol = $2
       RETURNING symbol`,
      [req.sessionId, symbol]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: `"${symbol}" was not found in your watchlist.`,
        errorCode: 'NOT_FOUND',
      });
    }

    // Also clean up snapshot for this symbol
    db.query(
      'DELETE FROM snapshots WHERE session_id = $1 AND symbol = $2',
      [req.sessionId, symbol]
    ).catch(() => {});

    res.json({ removed: symbol });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
