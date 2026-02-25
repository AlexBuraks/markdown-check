# Markdown Presence Checker

Public Next.js tool to check whether a URL returns Markdown when requested with:

`Accept: text/markdown`

If markdown is found, the app renders a preview and shows response diagnostics (status, headers, latency, and markdown-specific headers).

## Features

- Single URL check (no batch mode).
- User-Agent selector + custom User-Agent.
- Markdown detection rule: `2xx` + `Content-Type: text/markdown`.
- No redirect following (`redirect: manual`).
- SSRF protection (blocks localhost/private networks).
- Rate limiting:
  - Upstash Redis in production (recommended).
  - In-memory fallback for local dev.
- SEO-ready metadata (title, description, OG, canonical).

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local` if you want production-like rate limiting in development.

```bash
cp .env.example .env.local
```

Required only for Upstash-based rate limit:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Without these, the app uses an in-memory limiter.

## Vercel deploy

1. Push this repo to GitHub.
2. In Vercel: **Add New Project** -> import this repo.
3. Add env vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) in project settings.
4. Deploy.

## Connect your custom domain (`dotversis.com`)

1. Open Vercel project -> **Settings** -> **Domains**.
2. Add domain (for example `md-check.dotversis.com`).
3. Vercel will show required DNS records (usually CNAME/A records).
4. Create those records in your DNS provider.
5. Wait for verification in Vercel and set domain as primary if needed.

## Security notes

- URL credentials are blocked.
- Only `http` and `https` are allowed.
- Local/private network destinations are blocked after DNS resolution.
- Redirects are intentionally disabled to avoid hidden hops.

