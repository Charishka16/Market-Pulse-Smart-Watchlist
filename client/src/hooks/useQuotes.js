/**
 * useQuotes — fetches and auto-refreshes market quotes for the watchlist.
 * Polls every POLL_INTERVAL_MS if the watchlist is non-empty.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { stocksApi } from '../services/api';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (matching server cache TTL)

export function useQuotes(sessionId, symbols) {
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const intervalRef = useRef(null);

  const fetchQuotes = useCallback(async () => {
    if (!sessionId || symbols.length === 0) {
      setQuotes({});
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await stocksApi.getWatchlistQuotes();
      setQuotes(data.quotes || {});
      setLastFetched(data.fetchedAt || new Date().toISOString());
    } catch (err) {
      setError(err.message || 'Failed to fetch quotes');
    } finally {
      setLoading(false);
    }
  }, [sessionId, symbols.length]);

  // Initial load + when symbols list changes
  useEffect(() => {
    if (sessionId && symbols.length > 0) {
      setLoading(true);
      fetchQuotes();
    } else {
      setLoading(false);
      setQuotes({});
    }
  }, [sessionId, symbols.length, fetchQuotes]);

  // Set up polling
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (sessionId && symbols.length > 0) {
      intervalRef.current = setInterval(fetchQuotes, POLL_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionId, symbols.length, fetchQuotes]);

  return {
    quotes,
    loading,
    error,
    lastFetched,
    refresh: fetchQuotes,
  };
}
