/**
 * Session middleware
 * Reads X-Session-Id header, validates against DB, attaches session to req.session.
 * If the session ID is missing or invalid, returns 401.
 */

const db = require('../db/pool');

async function sessionMiddleware(req, res, next) {
  const sessionId = req.headers['x-session-id'];

  if (!sessionId) {
    return res.status(401).json({ error: 'Missing X-Session-Id header' });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    return res.status(401).json({ error: 'Invalid session ID format' });
  }

  try {
    const result = await db.query(
      'SELECT id, created_at, last_seen FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Session not found. Please create a session first.' });
    }

    req.session = result.rows[0];
    req.sessionId = sessionId;

    // Update last_seen asynchronously (don't wait for it)
    db.query('UPDATE sessions SET last_seen = NOW() WHERE id = $1', [sessionId]).catch(() => {});

    next();
  } catch (err) {
    console.error('[Session] DB error:', err.message);
    next(err);
  }
}

module.exports = sessionMiddleware;
