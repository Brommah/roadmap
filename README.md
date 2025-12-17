# Outcome Roadmap

A visual roadmap tool that syncs with Notion to display deliverables, milestones, and team progress across quarters.

![Roadmap Preview](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple)

## Features

- **📊 Timeline View** - Visualize deliverables across Q4 2025 → Q4 2026
- **🔗 Notion Integration** - Real-time sync with your Notion roadmap page
- **🎯 Milestones** - Track key dates and associate deliverables
- **🏷️ Lane Organization** - Group by Core Infrastructure, Runtimes, Product & Demos, Commercial & Content, Team & Readiness
- **🔍 Filtering** - Filter by status, owner, and stream
- **📌 Drag & Drop** - Move deliverables and update delivery dates (syncs back to Notion)
- **🔄 Real-time Updates** - Changes propagate to Notion automatically

## Quick Start

### Prerequisites
- Node.js 18+
- Notion Integration Token ([Create one here](https://www.notion.so/my-integrations))

### Installation

```bash
# Clone the repository
git clone https://github.com/cere-io/Roadmap.git
cd Roadmap

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000

### Configuration

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` with your Notion credentials:
```bash
VITE_NOTION_PAGE_ID=your-page-id-here
VITE_NOTION_API_KEY=ntn_your-integration-token
```

> **Note**: `.env.local` is gitignored and won't be committed.

## Notion Structure

The roadmap expects your Notion page to follow this structure:

```
# Milestone 1: Launch MVP by 2026-01-16   (H1 = Milestone)
## S1 - Demo Sales                         (H2 = Lane identifier)
   [synced_block]
     Deliverable: Feature Name by 2026-01-15
       - Owner: John Doe
       - Delivery date: 2026-01-15
       - Engineering Deliverable: [Link]
       - Notes...
```

### Supported Block Types
| Block Type | Usage |
|------------|-------|
| `heading_1` | Milestones with dates |
| `heading_2` | Lane identifiers (S1, S2, A8b, B3, B4, etc.) |
| `synced_block` | Container for deliverables |
| `paragraph` | Deliverable details |
| `toggle` | Nested content (client opportunities, etc.) |

### Lane Codes
| Code | Lane |
|------|------|
| S1 | CEF Demos |
| S2 | CEF Website |
| S3 | CEF ICP |
| S4 | CEF Campaigns |
| B3 | Product Marketing |
| B4 | Enterprise G2M |
| A7 | NG Demo |
| A8b | Gaming Demo |

## Tech Stack

- **React 18** - UI Framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **Lucide Icons** - Icon library
- **Notion API** - Data source

## Project Structure

```
├── App.tsx           # Main application + Notion fetch logic
├── constants.tsx     # Lanes, quarters, initial data
├── types.ts          # TypeScript interfaces
├── utils.ts          # Helper functions (date parsing, etc.)
├── components/
│   ├── Modal.tsx     # Side drawer modal
│   ├── StickyCard.tsx # Deliverable card component
│   └── Sidebar.tsx   # Left sidebar (legend)
├── vite.config.ts    # Vite config with Notion proxy
└── index.html        # Entry point
```

## API Proxy

The Vite dev server proxies Notion API requests to avoid CORS issues:

```typescript
// vite.config.ts
proxy: {
  '/api/notion': {
    target: 'https://api.notion.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/notion/, ''),
  },
}
```

## Deployment

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

### Environment Variables (Vercel)

Set these in your Vercel project settings:

| Variable | Purpose | Exposed to |
|----------|---------|------------|
| `VITE_NOTION_PAGE_ID` | Your roadmap page ID | Client (browser) |
| `NOTION_API_KEY` | Your Notion integration token | Server only |

> **Important**: The page ID needs the `VITE_` prefix to be available in the browser. The API key does NOT need the prefix (it's used by the serverless function only).

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © Cere Network

---

Built with ❤️ for product teams who love Notion
