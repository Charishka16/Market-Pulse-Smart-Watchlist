# MarketPulse 📈

> **Smart Market Watchlist** — Instead of repeatedly scanning prices, MarketPulse tells you what has *meaningfully changed* since your last visit.

Built for the **Groww Code 2026** Engineering Build Challenge.

---

## 🎯 Project Overview

Checking stock prices repeatedly is exhausting. MarketPulse introduces a **snapshot-based change detection system**. When you check your watchlist, you click **"Mark as Reviewed"** to save your current view. On your next visit, MarketPulse diffs the real-time market data against your last snapshot and intelligently highlights what deserves your attention based on predefined severity rules.

### Key Features
- **Meaningful-Change Detection**: Filters out market noise and clearly displays High/Medium/Low severity alerts.
  - 📉🚀 **Big price movement**: (≥2% = Medium, ≥5% = High severity)
  - 📊 **Unusual volume spike**: (2× = Medium, 3× = High severity)
  - 🔄 **Direction flip**: (Stock was gaining → now falling, or vice versa)
  - ⚡ **Key level breaks**: Crossed ±10% from the previous market close.
- **Persistent Snapshots**: Your watchlist and "last seen" prices are saved securely to PostgreSQL and restored via your browser session.
- **Honest Data Labeling**: Clearly denotes whether the data on your screen is `Live`, `Cached`, or `Stale`.
- **Graceful API Fallbacks**: Uses a two-layer cache (In-memory + PostgreSQL) to gracefully serve stale data if the AlphaVantage API hits rate limits.

---

## 🏗 Architecture & Two-Server Setup

MarketPulse is built as a robust, modern full-stack web application decoupled into two independent servers:

| Component | Stack | Purpose |
|-----------|-------|---------|
| **Frontend** | React 18, Vite 5, CSS | A sleek, dynamic SPA with glassmorphism UI running on `localhost:3001`. Communicates exclusively via REST API. |
| **Backend** | Node.js, Express | An API gateway running on `localhost:5173` handling business logic, rate limiting, and third-party data fetching. |
| **Database** | PostgreSQL 15 | Relational persistence for user sessions, watchlist configurations, cached market data, and snapshots. |
| **Market Data** | Alpha Vantage API | Fetches live market quotes. Extracted behind an adapter pattern for easy provider swapping. |

### The Change Detection Engine (`changeDetectionService.js`)
All diffing logic is handled **server-side** to ensure consistency. When the `/api/snapshots/diff` endpoint is called, the server queries the database for the user's last `snapshotPrice` and compares it to the live `MarketQuote`. Triggers are computed on-the-fly and returned as structured alerts to the frontend.

---

## 🚀 Setup & Run Instructions

Follow these steps to run MarketPulse locally for judging.

### 1. Database Setup (PostgreSQL)
Ensure you have PostgreSQL 15+ installed and running.

Connect to your PostgreSQL instance (via `psql` or pgAdmin) and create the database:
```sql
CREATE DATABASE marketpulse;
```

### 2. Environment Configuration (.env)
We provide an example environment file for the backend.
```bash
cd server
cp .env.example .env
```
Open `server/.env` and ensure your database credentials match your local PostgreSQL setup (e.g., `DB_USER` and `DB_PASSWORD`). 

*Note: The `ALPHA_VANTAGE_API_KEY` is set to `demo` by default. Read the **Testing for Judges** section below for how this works.*

### 3. Run Backend Migrations & Start Backend
Navigate to the `/server` directory and install dependencies:
```bash
cd server
npm install
```
Run the database migrations to create the schemas (`sessions`, `watchlist`, `market_cache`, `snapshots`):
```bash
npm run migrate
```
Start the Express backend server:
```bash
npm run dev
```
*Expected Output:* `🚀 MarketPulse server running on http://localhost:5173`

### 4. Start the Frontend
Open a **new terminal window**, navigate to the `/client` directory:
```bash
cd client
npm install
npm run dev
```
*Expected Output:* `➜ Local: http://localhost:3001/`

**Open [http://localhost:3001](http://localhost:3001) in your browser to view MarketPulse!**

---

## 🧪 Testing for Judges (How to trigger the diffs)

Because the free AlphaVantage API restricts quotes solely to `IBM` and heavily rate-limits other tickers, we implemented a **Mock Data Simulator** inside the adapter specifically for testing the change detection logic end-to-end.

To test the application:
1. Load the frontend and add **`IBM`** (Real API Data).
2. Search and add **`AAPL`** and **`MSFT`** (Mocked Simulator Data).
3. Click the **"Mark as Reviewed"** button. This saves your snapshot baseline into PostgreSQL.
4. **Wait a few seconds and refresh the page.**
5. Look at the **"What Changed?"** panel:
   - You will immediately see `AAPL` and `MSFT` trigger `[HIGH]` or `[MEDIUM]` severity alerts. 
   - This works because our simulator applies a realistic *random market jitter* to `AAPL` and `MSFT` on every fetch, simulating a rapidly moving live market. `IBM` remains unchanged.

---

## 📡 API Reference

All routes require an `X-Session-Id` header (handled automatically by the frontend).

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/sessions` | Create a new session. |
| `GET` | `/api/watchlist` | List all configured stocks for the session. |
| `POST` | `/api/watchlist` | Add a stock to the watchlist. |
| `GET` | `/api/stocks/quotes` | Bulk fetch fresh or cached quotes for the watchlist. |
| `POST` | `/api/snapshots/commit`| Freeze current market data as the baseline snapshot. |
| `GET` | `/api/snapshots/diff` | Compute severity alerts between the live market and the snapshot. |
| `GET` | `/api/health` | Health check (verifies DB connection). |

---

*Built with ❤️ for Groww Code 2026*
