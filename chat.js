// Vercel serverless function: /api/chat
// API keys sirf yahan (server par) rehti hain, kabhi browser mein nahi jaati.
const hits = new Map(); // best-effort rate limit (har serverless instance ka apna)

function limited(ip) {
  const now = Date.now();
  const max = Number(process.env.RATE_LIMIT_PER_MIN || 20);
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}

async function callGemini(messages) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 2800, temperature: 0.7 },
      }),
    }
  );
  if (!r.ok) throw Object.assign(new Error('gemini ' + r.status), { status: r.status });
  const d = await r.json();
  const text = (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  if (!text) throw Object.assign(new Error('gemini empty'), { status: 502 });
  return text;
}

async function callGroq(messages) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.GROQ_API_KEY },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 2800,
      temperature: 0.7,
    }),
  });
  if (!r.ok) throw Object.assign(new Error('groq ' + r.status), { status: r.status });
  const d = await r.json();
  const text = d.choices?.[0]?.message?.content || '';
  if (!text) throw Object.assign(new Error('groq empty'), { status: 502 });
  return text;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const allowed = process.env.ALLOWED_ORIGIN; // e.g. https://mera-app.vercel.app
  if (allowed && req.headers.origin && req.headers.origin !== allowed) {
    return res.status(403).json({ error: 'origin' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ error: 'rate_limited' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const msgs = body && body.messages;
  if (!Array.isArray(msgs) || msgs.length < 1 || msgs.length > 30) return res.status(400).json({ error: 'bad_request' });
  let total = 0;
  for (const m of msgs) {
    if (!m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string') return res.status(400).json({ error: 'bad_request' });
    total += m.content.length;
  }
  if (total > 20000 || msgs[msgs.length - 1].role !== 'user') return res.status(400).json({ error: 'bad_request' });

  const providers = { gemini: [callGemini, 'GEMINI_API_KEY'], groq: [callGroq, 'GROQ_API_KEY'] };
  const first = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  const order = [first, first === 'gemini' ? 'groq' : 'gemini'].filter((p) => providers[p] && process.env[providers[p][1]]);
  if (!order.length) return res.status(500).json({ error: 'not_configured' });

  let lastStatus = 502;
  for (const p of order) {
    try {
      const text = await providers[p][0](msgs);
      return res.status(200).json({ text });
    } catch (e) {
      lastStatus = e.status || 502; // content kabhi log nahi karte
      console.error('provider failed:', p, e.message);
    }
  }
  return res.status(lastStatus === 429 ? 429 : 502).json({ error: lastStatus === 429 ? 'rate_limited' : 'upstream' });
};
