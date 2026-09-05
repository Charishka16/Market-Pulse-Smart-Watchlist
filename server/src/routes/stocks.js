/**
 * Stocks Routes
 * GET /api/stocks/quotes        — Get live quotes for all watchlist symbols
 * GET /api/stocks/quote/:symbol — Get quote for a single symbol
 * GET /api/stocks/search?q=     — Search for symbols
 */

const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const sessionMiddleware = require('../middleware/session');
const marketDataService = require('../services/marketDataService');

// All stock routes require a valid session
router.use(sessionMiddleware);

// GET /api/stocks/quotes — bulk quotes for the entire watchlist
router.get('/quotes', async (req, res, next) => {
  try {
    const watchlistResult = await db.query(
      'SELECT symbol FROM watchlist WHERE session_id = $1 ORDER BY added_at DESC',
      [req.sessionId]
    );

    const symbols = watchlistResult.rows.map(r => r.symbol);

    if (symbols.length === 0) {
      return res.json({ quotes: {}, symbols: [] });
    }

    const quotesMap = await marketDataService.getQuotes(symbols);

    // Normalize the response: include metadata per quote
    const enriched = {};
    for (const [sym, quote] of Object.entries(quotesMap)) {
      enriched[sym] = {
        ...quote,
        // Ensure consistent fields even on error
        symbol: sym,
        dataStatus: quote.dataStatus || 'error',
      };
    }

    res.json({
      quotes: enriched,
      symbols,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/stocks/quote/:symbol — single symbol quote
router.get('/quote/:symbol', async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const quote = await marketDataService.getQuote(symbol);
    res.json({ quote });
  } catch (err) {
    next(err);
  }
});

// GET /api/stocks/search?q= — symbol search
router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();

    if (!q || q.length < 1) {
      return res.status(400).json({ error: 'Search query is required (q parameter)' });
    }

    if (q.length > 30) {
      return res.status(400).json({ error: 'Search query too long' });
    }

    const results = await marketDataService.searchSymbols(q);
    res.json({ results, query: q });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
