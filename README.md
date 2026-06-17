# AI Money Scoreboard

Audit any website for how well AI search engines (ChatGPT Search, Google AI Overviews, Perplexity, Microsoft Copilot, Gemini) can read, trust, and cite it.

## Features

- **Real server-side crawling** — fetch + Playwright JS fallback + cheerio parsing
- **7 weighted analyzers** — Schema, E-E-A-T, FAQ, Content, Technical SEO, Authority, AI Accessibility
- **Reproducible AI Money Score (0–100)** with stored raw signals
- **Async scan jobs** with live gauge progress
- **PDF reports** + public share links
- **Scan history, rescan, and compare**

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- (Optional) Supabase project for production auth
- (Optional) Anthropic API key for LLM-enriched recommendation copy

## Setup

1. **Clone and install**

```bash
npm install
```

2. **Configure environment**

Copy `.env.example` to `.env` in the project root and fill in values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_money_scoreboard"
ANTHROPIC_API_KEY=""
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_KEY=""
PORT=3001
FRONTEND_URL="http://localhost:5173"
STORAGE_PATH="./storage"
```

Without Supabase keys, the app runs in **dev auth mode** — any email/password works, and login returns a `dev:{userId}` token.

3. **Database**

```bash
npm run db:migrate
npm run db:seed
```

The seed creates `demo@aimoneyscoreboard.com`. In dev mode, log in with any password.

4. **Install Playwright browser**

```bash
npx playwright install chromium
```

5. **Run**

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Project structure

```
├── frontend/          React + Vite + Tailwind + Framer Motion
├── backend/           Express + Prisma + Scanner engine
│   ├── prisma/        Database schema & migrations
│   └── src/scanner/   Crawler, analyzers, scoring
├── storage/           Generated PDF reports (dev)
└── .env.example
```

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| POST | `/api/scans` | Start async scan |
| GET | `/api/scans/:id/status` | Poll scan progress |
| GET | `/api/scans/:id` | Full scan result |
| GET | `/api/scans/compare?a=&b=` | Compare two scans |
| POST | `/api/scans/:id/report` | Generate PDF |
| GET | `/api/reports/r/:token` | Public share view |

## Scoring

| Category | Weight |
|----------|--------|
| Schema Markup | 15 |
| E-E-A-T | 15 |
| FAQ Coverage | 15 |
| Content Depth | 15 |
| Technical SEO | 15 |
| Authority Signals | 15 |
| AI Accessibility | 10 |

**Bands:** 0–39 Critical · 40–59 Needs Work · 60–79 Good · 80–100 AI-Ready

Scores are deterministic from parsed HTML signals. The LLM layer only enriches recommendation copy — it never changes the score.

## License

Private — all rights reserved.
