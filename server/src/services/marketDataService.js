/**
 * MarketDataService
 *
 * Wraps the market data adapter with:
 *   - In-memory caching (node-cache, configurable TTL)
 *   - Database-level cache persistence (survives server restarts)
 *   - Graceful fallback: memory → DB cache → error response
 *   - Batch quote fetching with concurrency control
 */

const NodeCache = require('node-cache');
const db = require('../db/pool');
const AlphaVantageAdapter = require('../adapters/alphaVantageAdapter');

const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '300'); // 5 minutes default
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes — beyond this = stale

class MarketDataService {
  constructor() {
    // In-memory cache: fast, lost on restart
    this.memCache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 60 });
    // Adapter: swap this to change providers
    this.adapter = new AlphaVantageAdapter(process.env.ALPHA_VANTAGE_API_KEY);
  }

  /**
   * Get a quote for a single symbol.
   * Strategy: memory cache → DB cache → live API → store in both caches
   * @param {string} symbol
   * @returns {Promise<MarketQuote>}
   */
  async getQuote(symbol) {
    const key = symbol.toUpperCase();

    // 1. Check in-memory cache (fastest)
    const memHit = this.memCache.get(key);
    if (memHit) {
      return { ...memHit, dataStatus: this._resolveStatus(memHit, 'cached') };
    }

    // 2. Check DB cache (survives restarts)
    const dbHit = await this._getFromDbCache(key);
    if (dbHit) {
      const ageMs = Date.now() - new Date(dbHit.fetchedAt).getTime();
      if (ageMs < CACHE_TTL * 1000) {
        // Still fresh enough — store back in memory and return
        this.memCache.set(key, dbHit);
        return { ...dbHit, dataStatus: this._resolveStatus(dbHit, 'cached') };
      }
    }

    // 3. Fetch live from API
    try {
      const quote = await this.adapter.getQuote(key);
      await this._saveToCache(key, quote);
      return quote;
    } catch (err) {
      // 4. API failed — return stale DB data if available, with error status
      if (dbHit) {
        console.warn(`[MarketData] Live fetch failed for ${key}, serving stale cache:`, err.message);
        return {
          ...dbHit,
          dataStatus: 'stale',
          dataNote: `Showing data from ${new Date(dbHit.fetchedAt).toLocaleString()} (live fetch failed)`,
          error: err.message,
          errorCode: err.code,
        };
      }
      // No cache at all — propagate error
      throw err;
    }
  }

  /**
   * Get quotes for multiple symbols, with rate-limit-aware batching.
   * Processes in groups to avoid hammering the API simultaneously.
   * @param {string[]} symbols
   * @returns {Promise<Object.<string, MarketQuote|{error: string}>>}
   */
  async getQuotes(symbols) {
    const results = {};
    const BATCH_SIZE = 5;
    const BATCH_DELAY_MS = 200; // Small delay between batches

    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(sym => this.getQuote(sym))
      );

      batch.forEach((sym, idx) => {
        const result = batchResults[idx];
        if (result.status === 'fulfilled') {
          results[sym] = result.value;
        } else {
          results[sym] = {
            symbol: sym,
            error: result.reason?.message || 'Failed to fetch',
            errorCode: result.reason?.code,
            dataStatus: 'error',
          };
        }
      });

      // Brief pause between batches if more remain
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    return results;
  }

  /**
   * Search for symbols matching a query.
   * @param {string} queryStr
   */
  async searchSymbols(queryStr) {
    const cacheKey = `search:${queryStr.toLowerCase()}`;
    const cached = this.memCache.get(cacheKey);
    if (cached) return cached;

    const results = await this.adapter.searchSymbols(queryStr);
    this.memCache.set(cacheKey, results, 60); // Cache search results for 60s
    return results;
  }

  /**
   * Resolve data status based on age and source.
   * @private
   */
  _resolveStatus(quote, fromCache) {
    if (!quote?.fetchedAt) return 'stale';
    const ageMs = Date.now() - new Date(quote.fetchedAt).getTime();
    if (ageMs > STALE_THRESHOLD_MS) return 'stale';
    if (fromCache === 'cached') return 'cached';
    return 'fresh';
  }

  /**
   * Read from DB cache.
   * @private
   */
  async _getFromDbCache(symbol) {
    try {
      const result = await db.query(
        'SELECT data, fetched_at FROM market_cache WHERE symbol = $1',
        [symbol]
      );
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return { ...row.data, fetchedAt: row.fetched_at.toISOString() };
    } catch {
      return null; // DB failure shouldn't block the request
    }
  }

  /**
   * Save quote to both memory and DB caches.
   * @private
   */
  async _saveToCache(symbol, quote) {
    this.memCache.set(symbol, quote);
    try {
      await db.query(
        `INSERT INTO market_cache (symbol, data, fetched_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (symbol)
         DO UPDATE SET data = $2, fetched_at = NOW()`,
        [symbol, JSON.stringify(quote)]
      );
    } catch (err) {
      console.warn('[MarketData] Failed to write to DB cache:', err.message);
      // Non-fatal: memory cache is still populated
    }
  }

  /**
   * Invalidate cache for a symbol (e.g., after forced refresh).
   */
  invalidate(symbol) {
    this.memCache.del(symbol.toUpperCase());
  }
}

// Singleton instance
module.exports = new MarketDataService();
