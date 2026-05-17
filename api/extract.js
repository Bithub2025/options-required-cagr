// api/extract.js
// Receives a base64-encoded options chain screenshot, calls Anthropic's vision API,
// returns structured chain data (ticker, spot, expiration, strikes with deltas + last prices).

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on server' });

  let body;
  try {
    body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { image } = body || {};
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'Missing image field' });
  }

  // image is a data URL like "data:image/png;base64,iVBOR..."
  const match = image.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return res.status(400).json({ error: 'Image must be base64 data URL' });
  const mediaType = match[1];
  const base64Data = match[2];

  if (base64Data.length > 5 * 1024 * 1024) {
    return res.status(413).json({ error: 'Image too large (max 5MB)' });
  }

  const extractionPrompt = `Extract options chain data from this brokerage screenshot. Return ONLY valid JSON with no preamble, no markdown fences, no explanation.

Required JSON structure:
{
  "ticker": "string (the underlying stock symbol, e.g. TSLA)",
  "spot": number (the current/last price of the underlying stock),
  "expiration": "YYYY-MM-DD (expiration date)",
  "strikes": [
    {
      "strike": number,
      "call_last": number (or null),
      "call_delta": number (or null, decimal like 0.65),
      "call_iv": number (or null, decimal like 0.4768 for 47.68%, or already-decimal 0.48),
      "put_last": number (or null),
      "put_delta": number (or null, can be negative or absolute - use what's shown),
      "put_iv": number (or null, same format as call_iv)
    }
  ]
}

Rules:
- Read every strike row visible in the image
- For prices, parse the actual last/mid value displayed
- For delta, parse the decimal value shown (e.g. 0.6924, -0.3352)
- For IV (implied volatility), parse the percentage if shown — convert to decimal (51.69% becomes 0.5169)
- If a field isn't visible or readable, use null for that field
- Sort the strikes array in ascending order by strike price
- If you can't determine the ticker, use "UNKNOWN"
- If you can't determine spot price, set spot to null
- If you can't determine expiration, set expiration to null
- Return only the JSON object, nothing else`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 50000);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
            { type: 'text', text: extractionPrompt },
          ],
        }],
      }),
    });
    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'Anthropic API error', detail: errText.slice(0, 500) });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const cleaned = text.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(502).json({ error: 'Could not parse extraction response', raw: cleaned.slice(0, 500) });
    }

    // Light validation
    if (!parsed.strikes || !Array.isArray(parsed.strikes)) {
      return res.status(502).json({ error: 'Invalid extraction shape (no strikes array)', parsed });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
