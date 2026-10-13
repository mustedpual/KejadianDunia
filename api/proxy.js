// api/proxy.js
// Env vars (set in Vercel → Settings → Environment Variables):
//   ESRI_URL
//   UPSTASH_URL
//   UPSTASH_API_KEY
//   TURSO_URL_DB
//   TURSO_API_KEY

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { target, body } = req.body || {};

  const routes = {
    esri: {
      url: process.env.ESRI_URL,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    },
    upstash: {
      url: process.env.UPSTASH_URL,
      method: "GET",
      headers: {
        Authorization: process.env.UPSTASH_API_KEY,
      },
    },
    turso: {
      url: process.env.TURSO_URL_DB,
      method: "POST",
      headers: {
        Authorization: process.env.TURSO_API_KEY,
        "Content-Type": "application/json",
      },
    },
  };

  const route = routes[target];
  if (!route) return res.status(400).json({ error: `Unknown target: ${target}` });
  if (!route.url) return res.status(500).json({ error: `Missing env var for target: ${target}` });

  const options = { method: route.method, headers: route.headers };
  if (route.method === "POST" && body) options.body = JSON.stringify(body);

  try {
    const upstream = await fetch(route.url, options);
    const text = await upstream.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    res.status(upstream.status).json(data);
  } catch (err) {
    console.error(`Proxy error for "${target}":`, err);
    res.status(500).json({ error: err.message });
  }
}
