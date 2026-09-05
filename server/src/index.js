/**
 * MarketPulse — Express Server Entry Point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const db = require('./db/pool');
const errorHandler = require('./middleware/errorHandler');
const sessionsRouter = require('./routes/sessions');
const watchlistRouter = require('./routes/watchlist');
const stocksRouter = require('./routes/stocks');
const snapshotsRouter = require('./routes/snapshots');

const app = express();
const PORT = process.env.PORT || 5173;

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'X-Session-Id'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Apply a global rate limiter to all /api routes (protect the server itself)
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120,                 // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.', errorCode: 'SERVER_RATE_LIMITED' },
});
app.use('/api/', globalLimiter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      apiKeyConfigured: process.env.ALPHA_VANTAGE_API_KEY !== 'demo',
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      db: 'disconnected',
      error: err.message,
    });
  }
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/sessions', sessionsRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/snapshots', snapshotsRouter);

// ─── 404 for unknown API routes ──────────────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found', errorCode: 'NOT_FOUND' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────
async function start() {
  try {
    // Verify DB connection before starting
    await db.query('SELECT NOW()');
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(`🚀 MarketPulse server running on http://localhost:${PORT}`);
      console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
      console.log(`   API Key     : ${process.env.ALPHA_VANTAGE_API_KEY === 'demo' ? '⚠️  demo (limited)' : '✅ configured'}`);
      console.log(`   Cache TTL   : ${process.env.CACHE_TTL_SECONDS || 300}s`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    console.error('   Make sure PostgreSQL is running and .env is configured correctly.');
    process.exit(1);
  }
}

start();
