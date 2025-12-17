export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const url = new URL(request.url);
  
  // Get the path after /api/notion (e.g., /v1/blocks/xxx/children)
  const notionPath = url.pathname.replace('/api/notion', '');
  const queryString = url.search;
  
  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  
  if (!NOTION_API_KEY) {
    return new Response(JSON.stringify({ error: 'NOTION_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const notionUrl = `https://api.notion.com${notionPath}${queryString}`;
  
  try {
    const response = await fetch(notionUrl, {
      method: request.method,
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: request.method !== 'GET' ? await request.text() : undefined,
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Notion API error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch from Notion' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

