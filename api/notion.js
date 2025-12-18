export default async function handler(req, res) {
  // Get the path after /api/notion/
  const url = new URL(req.url, `http://${req.headers.host}`);
  const fullPath = url.pathname.replace('/api/notion/', '');
  const queryString = url.search;
  
  const notionUrl = `https://api.notion.com/${fullPath}${queryString}`;
  
  console.log('Proxying to:', notionUrl);
  console.log('API Key exists:', !!process.env.NOTION_API_KEY);
  
  try {
    const response = await fetch(notionUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
}

