/**
 * useChanges — fetches change diff and manages snapshot commits.
 */

import { useState, useEffect, useCallback } from 'react';
import { snapshotsApi } from '../services/api';

export function useChanges(sessionId, symbols) {
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [committing, setCommitting] = useState(false);
  const [lastCommit, setLastCommit] = useState(null);

  const fetchDiff = useCallback(async () => {
    if (!sessionId || symbols.length === 0) {
      setDiff(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await snapshotsApi.getDiff();
      setDiff(data);
    } catch (err) {
      setError(err.message || 'Failed to load change data');
    } finally {
      setLoading(false);
    }
  }, [sessionId, symbols.length]);

  useEffect(() => {
    if (sessionId && symbols.length > 0) {
      fetchDiff();
    }
  }, [fetchDiff]);

  /**
   * Commit the current prices as the new "last seen" snapshot.
   * Called when the user clicks "Mark as Reviewed" or "I've seen this".
   */
  const commitSnapshot = useCallback(async () => {
    if (!sessionId) return;
    try {
      setCommitting(true);
      const data = await snapshotsApi.commit();
      setLastCommit(new Date().toISOString());
      // Re-fetch diff after committing (changes will be cleared)
      await fetchDiff();
      return data;
    } catch (err) {
      throw err;
    } finally {
      setCommitting(false);
    }
  }, [sessionId, fetchDiff]);

  return {
    diff,
    loading,
    error,
    committing,
    lastCommit,
    refresh: fetchDiff,
    commitSnapshot,
  };
}
