# Options Required CAGR

A LEAPS analysis tool that calculates the compound annual growth rate (CAGR) a stock needs to hit for a given call option to break even by expiration.

## What it does

- **Three input paths**:
  - 📷 Upload a screenshot of an options chain (Questrade, broker app, etc.) → AI extracts ticker, spot, strikes, prices, deltas → app builds the comparison automatically
  - Type a ticker → app pulls live spot + chain from Yahoo Finance
  - Pure manual entry — type spot, IV, IV Rank, target growth and adjust strikes yourself
- **Picks** mode: curate (date, strike) combos to compare side-by-side
- **Sweep** mode: full strike chain at one expiration, color-graded by CAGR
- Shows: cost, breakeven, $/day, leverage, delta, required CAGR
- **BALANCED** badge: highest-leverage strike where CAGR stays under your target growth rate
- **Heat coloring**: IV and IV Rank fields turn green→yellow→red so you can see at a glance whether you're paying inflated premium

## Live data

- `/api/quote` — Yahoo Finance spot prices
- `/api/options` — Yahoo Finance options chain (bid/ask/IV)
- `/api/extract` — Anthropic vision API for screenshot → structured chain data
- Falls back to Black-Scholes estimates when real data is unavailable

## Stack

- Static HTML/CSS/JS (single file: `index.html`)
- Three Vercel serverless functions in `api/`
- Anthropic API key required as `ANTHROPIC_API_KEY` env var on Vercel
- Hosted on Vercel with edge caching

## Roadmap

- [x] Live spot prices from Yahoo
- [x] Live option chain (bid/ask per strike)
- [x] Dynamic expirations per ticker
- [x] Screenshot upload → AI extraction → autofill chain
- [x] Delta column
- [x] Heat-colored IV/IVR fields
- [ ] Save snapshot history (last 5 screenshots)
- [ ] Compute IV Rank from 52-week IV history
