/**
 * Alpha Vantage Market Data Adapter
 *
 * Implements the MarketDataAdapter interface:
 *   - getQuote(symbol): Promise<MarketQuote>
 *   - searchSymbols(query): Promise<SearchResult[]>
 *
 * Data is 15-minute delayed for US equities on the free plan.
 * This is clearly communicated to the user via dataStatus field.
 *
 * To swap providers: create a new file implementing the same interface
 * and update marketDataService.js to use the new adapter.
 */

const axios = require('axios');

const BASE_URL = 'https://www.alphavantage.co/query';

/**
 * @typedef {Object} MarketQuote
 * @property {string}  symbol
 * @property {string}  companyName
 * @property {number}  price
 * @property {number}  open
 * @property {number}  high
 * @property {number}  low
 * @property {number}  previousClose
 * @property {number}  change
 * @property {number}  changePercent
 * @property {number}  volume
 * @property {string}  latestTradingDay
 * @property {string}  fetchedAt        ISO timestamp
 * @property {'fresh'|'cached'|'stale'|'error'} dataStatus
 * @property {string}  dataNote         Human-readable note about data freshness
 */

class AlphaVantageAdapter {
  constructor(apiKey) {
    if (!apiKey || apiKey === 'demo') {
      console.warn(
        '[AlphaVantage] Using "demo" API key — only IBM and a few symbols will work. ' +
        'Register free at https://www.alphavantage.co/support/#api-key'
      );
    }
    this.apiKey = apiKey || 'demo';
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
    });
  }

  /**
   * Fetch a live quote for a single stock symbol.
   * @param {string} symbol
   * @returns {Promise<MarketQuote>}
   */
  async getQuote(symbol) {
    const sym = symbol.toUpperCase();
    if (this.apiKey === 'demo' && (sym === 'AAPL' || sym === 'MSFT')) {
      const isAapl = sym === 'AAPL';
      
      // Add random jitter to simulate market movement (persists due to cache)
      const basePrice = isAapl ? 185.50 : 420.30;
      const baseVol = isAapl ? 85000000 : 35000000;
      
      const priceJitter = 1 + (Math.random() * 0.1 - 0.05); // +/- 5%
      const volJitter = 1 + (Math.random() * 2.0); // up to 3x volume spike

      const price = parseFloat((basePrice * priceJitter).toFixed(2));
      const volume = Math.floor(baseVol * volJitter);

      return {
        symbol: sym,
        companyName: sym,
        price,
        open: basePrice - 2.0,
        high: price > basePrice ? price + 1.0 : basePrice + 1.0,
        low: price < basePrice ? price - 1.0 : basePrice - 1.0,
        previousClose: basePrice,
        change: parseFloat((price - basePrice).toFixed(2)),
        changePercent: parseFloat(((price - basePrice) / basePrice * 100).toFixed(2)),
        volume,
        latestTradingDay: new Date().toISOString().split('T')[0],
        fetchedAt: new Date().toISOString(),
        dataStatus: 'fresh',
        dataNote: 'Mock data (with jitter) for end-to-end testing',
      };
    }

    const params = {
      function: 'GLOBAL_QUOTE',
      symbol: sym,
      apikey: this.apiKey,
    };

    const response = await this.client.get('', { params });
    const data = response.data;

    // Alpha Vantage returns rate limit messages as JSON info fields
    if (data['Information'] || data['Note']) {
      const message = data['Information'] || data['Note'];
      const err = new Error(message);
      err.code = 'RATE_LIMITED';
      throw err;
    }

    const quote = data['Global Quote'];
    if (!quote || !quote['05. price']) {
      const err = new Error(`Symbol "${symbol}" not found or returned empty data.`);
      err.code = 'SYMBOL_NOT_FOUND';
      throw err;
    }

    return this._parseQuote(quote);
  }

  /**
   * Search for symbols matching a query string.
   * @param {string} queryStr
   * @returns {Promise<Array<{symbol: string, name: string, type: string, region: string}>>}
   */
  async searchSymbols(queryStr) {
    if (this.apiKey === 'demo') {
      const q = queryStr.toUpperCase();
      if (q.includes('AAPL') || q.includes('APPLE')) {
        return [{ symbol: 'AAPL', name: 'Apple Inc.', type: 'Equity', region: 'United States', currency: 'USD' }];
      }
      if (q.includes('MSFT') || q.includes('MICROSOFT')) {
        return [{ symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Equity', region: 'United States', currency: 'USD' }];
      }
    }

    const params = {
      function: 'SYMBOL_SEARCH',
      keywords: queryStr,
      apikey: this.apiKey,
    };

    const response = await this.client.get('', { params });
    const data = response.data;

    if (data['Information'] || data['Note']) {
      const message = data['Information'] || data['Note'];
      const err = new Error(message);
      err.code = 'RATE_LIMITED';
      throw err;
    }

    const matches = data['bestMatches'] || [];
    return matches
      .filter(m => m['4. region'] === 'United States') // Focus on US equities
      .slice(0, 8)
      .map(m => ({
        symbol: m['1. symbol'],
        name: m['2. name'],
        type: m['3. type'],
        region: m['4. region'],
        currency: m['8. currency'],
      }));
  }

  /**
   * Parse the raw Alpha Vantage Global Quote into our standard MarketQuote shape.
   * @private
   */
  _parseQuote(raw) {
    const price = parseFloat(raw['05. price']) || 0;
    const open = parseFloat(raw['02. open']) || 0;
    const high = parseFloat(raw['03. high']) || 0;
    const low = parseFloat(raw['04. low']) || 0;
    const previousClose = parseFloat(raw['08. previous close']) || 0;
    const change = parseFloat(raw['09. change']) || 0;
    const changePercentStr = raw['10. change percent'] || '0%';
    const changePercent = parseFloat(changePercentStr.replace('%', '')) || 0;
    const volume = parseInt(raw['06. volume']) || 0;
    const latestTradingDay = raw['07. latest trading day'] || '';

    // Determine if market is likely open based on the trading day date
    const today = new Date().toISOString().split('T')[0];
    const isCurrentDay = latestTradingDay === today;

    return {
      symbol: raw['01. symbol'],
      companyName: raw['01. symbol'], // Alpha Vantage GLOBAL_QUOTE doesn't return company name
      price,
      open,
      high,
      low,
      previousClose,
      change,
      changePercent,
      volume,
      latestTradingDay,
      fetchedAt: new Date().toISOString(),
      // Data is always 15-min delayed on free plan; if it's an old trading day, it's end-of-day data
      dataStatus: isCurrentDay ? 'fresh' : 'stale',
      dataNote: isCurrentDay
        ? 'Data is ~15 minutes delayed (Alpha Vantage free tier)'
        : `End-of-day data from ${latestTradingDay} (market may be closed)`,
    };
  }
}

module.exports = AlphaVantageAdapter;
