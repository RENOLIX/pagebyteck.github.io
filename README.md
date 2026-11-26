# Byteck

Link pages for your clients. The admin creates an account for each client and builds their page. The client signs in to change their links, social accounts and phone numbers, and to see how many people opened the page and clicked each link.

Every page lives at `https://your-domain/<page-name>`.

## What a page can contain

- Profile: logo, name and short bio
- Links, shown as buttons
- Social accounts (more than 3,000 brand icons, searchable)
- Phone numbers. With more than one number, the visitor picks which one to call
- A "save contact" button that downloads a vCard (`/<page-name>/contact.vcf`)
- Embedded videos and posts from YouTube, TikTok, Instagram, X and Facebook. They load only when the visitor taps them
- Image gallery

The design is set per page: fonts, colors, background color, gradient or image, button style (solid, outline, glass), corner radius, shadows, logo glow, and left-to-right or right-to-left layout. The dashboard is available in English, French and Arabic.

## Three addresses, one app

| Address | Used by |
|---|---|
| `example.com/<page-name>` | Visitors |
| `app.example.com` | Clients editing their page, and the admin |
| `admin.example.com` | Admin panel: accounts, suspensions, stats |

There is no public sign-up. Admin rights go to the emails listed in `ADMIN_EMAILS`.

## Stack

- Node 20, TypeScript, [Hono](https://hono.dev) for the server
- PostgreSQL 16 with [Drizzle ORM](https://orm.drizzle.team)
- [Better Auth](https://www.better-auth.com) for sign-in
- React 19, Vite, Tailwind CSS 4 and shadcn/ui for the dashboard
- Uploads on local disk or on Cloudflare R2

Pages are rendered to HTML when they are saved and served from memory, so opening a page does not hit the database.

## Layout

```
shared/   block and design definitions used by both the server and the dashboard
server/   API, page rendering, admin panel, scripts
web/      dashboard (React)
docs/     deployment guide
```

## Deploying

Read [docs/DEPLOY.md](docs/DEPLOY.md). The short version, on a server with Docker:

```bash
cp .env.example .env        # then fill it in
docker compose build
docker compose run --rm app /app/node_modules/.bin/drizzle-kit push
docker compose up -d
```

## Working on the code

You need Node 20 and a local PostgreSQL.

```bash
npm ci
cp .env.example .env        # set DATABASE_URL to your local database
npm run db:push
npm run build               # builds the dashboard once, the server serves it
npm run dev                 # server on http://127.0.0.1:3100
npm test
npm run typecheck
```

The server picks the site by the `Host` header, so for local testing send requests with the right host, for example `curl -H 'host: app.example.com' http://127.0.0.1:3100/`.
