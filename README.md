# Options Required CAGR

A LEAPS analysis tool that calculates the compound annual growth rate (CAGR) a stock needs to hit for a given call option to break even by expiration.

## What it does

- Enter a ticker → see LEAPS chain
- **Picks** mode: hand-pick (date, strike) combos to compare side-by-side
- **Sweep** mode: full strike chain at one expiration, color-graded by CAGR
- Both modes show: cost, breakeven, leverage, $/day, required CAGR
- BEST / WORST / BALANCED / TIME badges to surface the relevant winners

## Live data

- Spot prices are fetched live from Yahoo Finance via `/api/quote`
- IV and IV Rank still come from hardcoded defaults (can be overridden manually)
- The "LIVE" pill in the ticker control shows when real data is loaded

## Stack

- Static HTML/CSS/JS (single file: `index.html`)
- One Vercel serverless function: `api/quote.js`
- Hosted on Vercel

## Roadmap

- [x] Deploy mockup
- [x] Add Vercel function to proxy Yahoo Finance for spot prices
- [ ] Add Yahoo options chain endpoint for real bid/ask + IV
- [ ] Compute IV Rank from 52-week IV history
- [ ] Persist user's curated Picks list across visits
