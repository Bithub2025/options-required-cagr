# Options Required CAGR

A LEAPS analysis tool that calculates the compound annual growth rate (CAGR) a stock needs to hit for a given call option to break even by expiration.

## What it does

- Pick any ticker → app pulls live spot price + LEAPS option chain from Yahoo Finance
- **Picks** mode: curate a comparison set of (expiration, strike) combos
- **Sweep** mode: full strike chain at one expiration, color-graded by required CAGR
- Real-time CAGR, leverage, $/day, breakeven calculations
- BEST / WORST / BALANCED / TIME / ATM badges

## Live data

- **Spot prices** — live from Yahoo Finance via `/api/quote`
- **Option chain** — real bid/ask/last per strike from Yahoo via `/api/options`
- **Real expirations** — dynamically populated from Yahoo's available LEAPS for each ticker
- **Black-Scholes fallback** — when data is missing or hasn't loaded yet, prices are estimated locally
- **REAL / EST indicators** — every row shows whether its price came from Yahoo or BS estimate

## Stack

- Static HTML/CSS/JS (single file: `index.html`)
- Two Vercel serverless functions: `api/quote.js` and `api/options.js`
- Hosted on Vercel with edge caching for Yahoo responses

## Roadmap

- [x] Live spot prices from Yahoo
- [x] Live option chain (bid/ask per strike)
- [x] Dynamic expirations per ticker
- [ ] Live IV per strike (for fallback BS calcs)
- [ ] Compute IV Rank from 52-week IV history
- [ ] Persist user's curated Picks list across visits
