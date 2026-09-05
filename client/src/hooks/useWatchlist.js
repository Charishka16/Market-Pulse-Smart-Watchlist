/**
 * useWatchlist — manages the user's stock watchlist CRUD operations.
 */

import { useState, useEffect, useCallback } from 'react';
import { watchlistApi } from '../services/api';

export function useWatchlist(sessionId) {
  const [symbols, setSymbols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWatchlist = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await watchlistApi.getAll();
      setSymbols(data.symbols || []);
    } catch (err) {
      setError(err.message || 'Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const addSymbol = useCallback(async (symbol, companyName) => {
    const data = await watchlistApi.add(symbol, companyName);
    setSymbols(prev => [data.item, ...prev]);
    return data.item;
  }, []);

  const removeSymbol = useCallback(async (symbol) => {
    await watchlistApi.remove(symbol);
    setSymbols(prev => prev.filter(s => s.symbol !== symbol));
  }, []);

  return {
    symbols,
    loading,
    error,
    refresh: fetchWatchlist,
    addSymbol,
    removeSymbol,
  };
}
