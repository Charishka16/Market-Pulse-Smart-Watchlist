/**
 * useSession — manages the browser's session identity.
 *
 * On first load: creates a new session via API, stores sessionId in localStorage.
 * On subsequent loads: uses the stored sessionId.
 * If the session is invalid: creates a new one.
 */

import { useState, useEffect, useCallback } from 'react';
import { sessionsApi } from '../services/api';

const SESSION_KEY = 'mp_session_id';

export function useSession() {
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_KEY));
  const [loading, setLoading] = useState(!localStorage.getItem(SESSION_KEY));
  const [error, setError] = useState(null);

  const createSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sessionsApi.create();
      localStorage.setItem(SESSION_KEY, data.sessionId);
      setSessionId(data.sessionId);
    } catch (err) {
      setError(err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      // Validate the stored session is still valid
      setSessionId(stored);
      setLoading(false);
    } else {
      createSession();
    }
  }, [createSession]);

  return { sessionId, loading, error, retry: createSession };
}
