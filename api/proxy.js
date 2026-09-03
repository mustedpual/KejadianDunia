// api/proxy.js
export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
  
    try {
      const response = await fetch(url, {
        headers: {
          // Mimic a standard browser user-agent so government/news sites don't block the request
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
  
      const contentType = response.headers.get('content-type') || 'text/plain';
      const body = await response.text();
  
      // Allow your frontend to read the response
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', contentType);
      res.status(response.status).send(body);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch external resource', details: error.message });
    }
  }