export default async function handler(req, res) {
  // Extract the path from the URL - everything after /api/notion/
  const urlPath = req.url || '';
  const notionPath = urlPath.replace(/^\/api\/notion\/?/, '');
  
  const notionUrl = `https://api.notion.com/${notionPath}`;
  
  console.log('Request URL:', req.url);
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
