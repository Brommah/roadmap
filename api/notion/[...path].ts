import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get the path after /api/notion/
  const { path } = req.query;
  const notionPath = Array.isArray(path) ? path.join('/') : path || '';
  
  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  
  if (!NOTION_API_KEY) {
    return res.status(500).json({ error: 'NOTION_API_KEY not configured' });
  }

  const notionUrl = `https://api.notion.com/${notionPath}`;
  
  try {
    const response = await fetch(notionUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    
    // Forward the status code and response
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error('Notion API error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch from Notion' });
  }
}

