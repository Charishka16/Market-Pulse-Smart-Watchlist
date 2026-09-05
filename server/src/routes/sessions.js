/**
 * Sessions Routes
 * POST /api/sessions  — Create a new session (first visit)
 * GET  /api/sessions/me — Get current session info (requires X-Session-Id)
 */

const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const sessionMiddleware = require('../middleware/session');

// POST /api/sessions — Create a new session
router.post('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `INSERT INTO sessions DEFAULT VALUES RETURNING id, created_at, last_seen`
    );
    const session = result.rows[0];
    res.status(201).json({
      sessionId: session.id,
      createdAt: session.created_at,
      lastSeen: session.last_seen,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/me — Get current session details
router.get('/me', sessionMiddleware, async (req, res) => {
  res.json({
    sessionId: req.session.id,
    createdAt: req.session.created_at,
    lastSeen: req.session.last_seen,
  });
});

module.exports = router;
