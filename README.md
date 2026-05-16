# Options Required CAGR

A LEAPS analysis tool that calculates the compound annual growth rate (CAGR) a stock needs to hit to break even on a given call option by expiration.

## What it does

- Enter a ticker → see LEAPS chain
- **Picks** mode: hand-pick (date, strike) combos to compare side-by-side
- **Sweep** mode: full strike chain at one expiration, color-graded by CAGR
- Both modes show: cost, breakeven, leverage, $/day, required CAGR
- BEST/WORST/BALANCED/TIME badges to surface the relevant winners

## Data

Currently uses placeholder data + Black-Scholes math. Next step is wiring up Yahoo Finance for live spot prices and option chains.

## Stack

- Static HTML/CSS/JS (single file: `index.html`)
- Vercel for hosting + serverless functions (for Yahoo proxy when added)

## Roadmap

- [ ] Deploy mockup as-is to Vercel
- [ ] Add Vercel function to proxy Yahoo Finance
- [ ] Wire ticker search to fetch real spot/IV/IVR
- [ ] Wire option chain to real bid/ask
- [ ] Compute IV Rank from 52-week IV history
