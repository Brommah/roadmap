export default async function handler(req, res) {
  // Extract the path - Vercel passes it as query.path from the rewrite
  const pathSegments = req.query.path;
  const notionPath = Array.isArray(pathSegments) ? pathSegments.join('/') : (pathSegments || '');
  
  // Build query string WITHOUT the 'path' parameter (added by Vercel rewrite)
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'path') {
      queryParams.append(key, value);
    }
  }
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  const notionUrl = `https://api.notion.com/${notionPath}${queryString}`;
  
  console.log('Notion Path:', notionPath);
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
