// api/quote.js
// Vercel serverless function — proxies Yahoo Finance for spot price data.
// Uses the v8 chart endpoint which is the most reliable public Yahoo endpoint.
// No auth needed.

export default async function handler(req, res) {
  // Allow CORS so the frontend can call this from any deployment URL
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const symbol = (req.query.symbol || '').toString().toUpperCase().trim();

  if (!symbol || !/^[A-Z0-9.\-^]{1,12}$/.test(symbol)) {
    return res.status(400).json({ error: 'Invalid symbol format' });
  }

  const urls = [
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  };

  let lastErr = 'No data';

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        if (response.status === 429) {
          // Don't retry on 429 - Yahoo's blocking us
          return res.status(429).json({ error: 'Rate limited by data provider — please wait a minute and try again' });
        }
        lastErr = `Yahoo returned ${response.status}`;
        continue;
      }

      const data = await response.json();

      if (data.chart?.error) {
        lastErr = data.chart.error.description || 'Symbol not found';
        // 404-style error — don't retry the other URL
        return res.status(404).json({ error: lastErr });
      }

      const meta = data.chart?.result?.[0]?.meta;
      if (!meta || typeof meta.regularMarketPrice !== 'number') {
        lastErr = `No price data for ${symbol}`;
        continue;
      }

      const price = meta.regularMarketPrice;
      const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
      const change = price - prevClose;
      const changePct = prevClose ? (change / prevClose) * 100 : 0;

      return res.status(200).json({
        symbol: meta.symbol || symbol,
        spot: price,
        change,
        changePct,
        prevClose,
        currency: meta.currency || 'USD',
        exchange: meta.exchangeName || '',
        timestamp: Date.now(),
      });
    } catch (err) {
      lastErr = err.message || 'Fetch failed';
    }
  }

  return res.status(502).json({ error: lastErr });
}
