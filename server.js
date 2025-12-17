import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Notion API Proxy
app.use('/api/notion', createProxyMiddleware({
  target: 'https://api.notion.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/notion': '', // Remove /api/notion prefix
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add Notion headers
    proxyReq.setHeader('Authorization', `Bearer ${process.env.NOTION_API_KEY}`);
    proxyReq.setHeader('Notion-Version', '2022-06-28');
  },
}));

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

