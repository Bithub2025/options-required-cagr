// api/options.js
// Vercel serverless function — proxies Yahoo Finance options chain data.
// Called with ?symbol=TSLA to get list of available expirations.
// Called with ?symbol=TSLA&date=<unix> to get full chain for that expiration.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  // Cache aggressively at the edge - chains don't change often during the day
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const symbol = (req.query.symbol || '').toString().toUpperCase().trim();
  const dateParam = req.query.date ? String(req.query.date).replace(/\D/g, '') : null;

  if (!symbol || !/^[A-Z0-9.\-^]{1,12}$/.test(symbol)) {
    return res.status(400).json({ error: 'Invalid symbol format' });
  }

  const path = `/v7/finance/options/${encodeURIComponent(symbol)}${dateParam ? `?date=${dateParam}` : ''}`;
  const urls = [
    `https://query2.finance.yahoo.com${path}`,
    `https://query1.finance.yahoo.com${path}`,
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  };

  let lastErr = 'No data';

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 9000);
      const response = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        if (response.status === 429) {
          return res.status(429).json({ error: 'Rate limited by data provider — please wait a minute and try again' });
        }
        lastErr = `Yahoo returned ${response.status}`;
        continue;
      }

      const data = await response.json();

      if (data.optionChain?.error) {
        return res.status(404).json({ error: data.optionChain.error.description || 'Symbol not found' });
      }

      const result = data.optionChain?.result?.[0];
      if (!result) {
        lastErr = 'No chain data';
        continue;
      }

      // Build expirations list (sorted ascending)
      const expirations = (result.expirationDates || [])
        .map(unix => {
          const d = new Date(unix * 1000);
          return {
            unix,
            iso: d.toISOString().slice(0, 10),
            label: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }),
          };
        })
        .sort((a, b) => a.unix - b.unix);

      // If a specific date was requested, include the chain for it
      const chainData = result.options?.[0];
      const mapContract = c => ({
        strike: c.strike,
        bid: c.bid ?? 0,
        ask: c.ask ?? 0,
        last: c.lastPrice ?? 0,
        iv: c.impliedVolatility ?? 0,
        oi: c.openInterest ?? 0,
        vol: c.volume ?? 0,
        itm: !!c.inTheMoney,
      });

      const calls = chainData?.calls ? chainData.calls.map(mapContract) : [];
      const puts = chainData?.puts ? chainData.puts.map(mapContract) : [];

      return res.status(200).json({
        symbol: result.underlyingSymbol || symbol,
        spot: result.quote?.regularMarketPrice ?? null,
        expirations,
        chainExpiration: chainData?.expirationDate || null,
        strikes: result.strikes || [],
        calls,
        puts,
        timestamp: Date.now(),
      });
    } catch (err) {
      lastErr = err.message || 'Fetch failed';
    }
  }

  return res.status(502).json({ error: lastErr });
}
