# Deploying Byteck

This guide puts Byteck on one Linux server with Docker.

## 1. What you need

- A Linux server (Ubuntu 22.04 or 24.04 works). 1 CPU and 2 GB of RAM are enough; the running app, database and tunnel use about 250 MB together.
- Docker Engine with the compose plugin: https://docs.docker.com/engine/install/
  Check with `docker compose version`.
- A domain, with three hostnames pointing to this setup:
  - `example.com` for the pages
  - `app.example.com` for the dashboard
  - `admin.example.com` for the admin panel
- HTTPS on all three. Sign-in cookies are marked secure, so sign-in will not work over plain http.

Replace `example.com` with your own domain everywhere below.

## 2. Get the code

```bash
git clone <repository-url> byteck
cd byteck
```

## 3. Fill in the settings

```bash
cp .env.example .env
chmod 600 .env
openssl rand -hex 32   # paste as SESSION_SECRET
openssl rand -hex 24   # paste as DB_PASSWORD
nano .env
```

Set at least `BRAND_NAME`, the three domains, `ADMIN_EMAILS`, `SESSION_SECRET` and `DB_PASSWORD`. Keep `STORAGE_DRIVER=local` for now: uploads are stored in a Docker volume on the server. Section 11 explains how to move them to Cloudflare R2 later.

Keep `SESSION_SECRET` and `DB_PASSWORD` the same once the site is live. Changing `SESSION_SECRET` signs everybody out, and `DB_PASSWORD` is written into the database volume on its first start.

## 4. Build and create the database

```bash
docker compose build
docker compose run --rm app /app/node_modules/.bin/drizzle-kit push
```

The second command starts PostgreSQL and creates the tables. It is safe to run again: it only applies what is missing.

If you are moving existing pages from another server, skip `drizzle-kit push` and follow section 7 instead.

## 5. Start

```bash
docker compose up -d
docker compose ps
curl -s -H 'host: example.com' http://127.0.0.1:3100/health
```

After about 30 seconds `docker compose ps` should show `db` and `app` as healthy, and the curl prints `{"ok":true}`.

The app only listens on `127.0.0.1:3100`, so nothing is reachable from outside yet. If port 3100 is taken on this server, set `APP_PORT=3200` (or any free port) in `.env` and use that port below.

## 6. Put it online

Pick one of the two options.

### Option A: Cloudflare Tunnel (no open ports)

Use this if the domain is on Cloudflare. The server does not need ports 80 or 443 open.

1. In the Cloudflare dashboard, go to Zero Trust, then Networks, then Tunnels, and create a tunnel (type Cloudflared). Copy the token it shows.
2. Put it in `.env` as `TUNNEL_TOKEN=...`.
3. In the tunnel, add three public hostnames, `example.com`, `app.example.com` and `admin.example.com`, each with service `http://app:3100`.
4. Start the tunnel:

   ```bash
   docker compose --profile tunnel up -d
   ```

Cloudflare creates the DNS records and handles HTTPS. Any older A or CNAME record on the same names has to be deleted first.

### Option B: your own reverse proxy

Point the three hostnames to the server's IP address (A records), open ports 80 and 443, and run a reverse proxy that forwards to `127.0.0.1:3100` and keeps the original `Host` header. With [Caddy](https://caddyserver.com), which also gets the HTTPS certificates for you, the whole config is:

```
example.com, app.example.com, admin.example.com {
    reverse_proxy 127.0.0.1:3100
}
```

With nginx, use `proxy_pass http://127.0.0.1:3100;` and `proxy_set_header Host $host;` in each server block, with a certificate from certbot.

## 7. Moving existing pages (optional)

If you received `byteck-db.dump` and `byteck-uploads.tar.gz`, restore them instead of starting empty. Do this on a fresh install, after `docker compose build` in step 4:

```bash
docker compose up -d db
docker compose exec -T db pg_restore -U app -d app --no-owner --no-acl < byteck-db.dump
docker compose run --rm -T --no-deps app tar -C /app/server/data -xzf - < byteck-uploads.tar.gz
docker compose up -d
```

Accounts keep their passwords. Make sure your admin email is in `ADMIN_EMAILS`. If the domain or `BRAND_NAME` changed, render the pages again so they pick up the new settings, then restart:

```bash
docker compose exec app /app/node_modules/.bin/tsx src/scripts/rerender-published.mts
docker compose restart app
```

## 8. Create the first admin

Skip this if you restored existing data in section 7.

```bash
docker compose exec -e NEW_ADMIN_EMAIL=you@example.com -e NEW_ADMIN_PASSWORD='a long password' \
  app /app/node_modules/.bin/tsx src/scripts/create-admin.mts
```

The email must be listed in `ADMIN_EMAILS`, and the password needs at least 12 characters. Then sign in at `https://app.example.com` to build pages, or at `https://admin.example.com` to manage accounts.

## 9. Backups

Everything lives in two Docker volumes: `byteck_dbdata` (database) and `byteck_uploads` (images). Back up both, and copy the files off the server.

```bash
mkdir -p backups
docker compose exec -T db pg_dump -U app -d app -Fc > backups/db-$(date +%F).dump
docker compose exec -T app tar -C /app/server/data -czf - . > backups/uploads-$(date +%F).tar.gz
```

To run it every night at 03:00, add this line with `crontab -e`, changing the path to where the code lives:

```
0 3 * * * cd /root/byteck && docker compose exec -T db pg_dump -U app -d app -Fc > backups/db-$(date +\%F).dump && docker compose exec -T app tar -C /app/server/data -czf - . > backups/uploads-$(date +\%F).tar.gz
```

Section 7 shows how to restore these two files.

## 10. Updating

```bash
git pull
docker compose build
docker compose run --rm app /app/node_modules/.bin/drizzle-kit push
docker compose up -d
```

Take a backup first. If `drizzle-kit push` asks about deleting a column or a table, answer no and check what changed before going on.

## 11. Moving uploads to Cloudflare R2 (optional)

1. Create a bucket in Cloudflare R2 and connect a public custom domain to it, for example `media.example.com`.
2. Create an R2 API token with Object Read and Write on that one bucket only.
3. In `.env` set `STORAGE_DRIVER=r2`, then uncomment and fill in `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and `R2_PUBLIC_BASE` (`https://media.example.com`).
4. Run `docker compose up -d` to restart with the new settings.

New uploads go to R2. Images uploaded before the switch stay in the `byteck_uploads` volume and keep working, so keep backing it up.

## 12. When something goes wrong

- Logs: `docker compose logs --tail 100 app`. Refused uploads are logged with the file name, type and size.
- The app does not start: the log names the setting in `.env` that is missing or invalid.
- Sign-in returns to the login page: the site is being opened over http, or through a proxy that changes the `Host` header. All three addresses must be HTTPS.
- 502 from Cloudflare with the tunnel: check `docker compose ps`, then `docker compose logs tunnel`.
- Uploads: PNG, JPG, WebP, GIF and SVG up to 5 MB. HEIC photos from iPhones are refused because browsers cannot display them; export them as JPG first.
- Stop everything and keep the data: `docker compose --profile tunnel down`. Delete everything including the data: `docker compose --profile tunnel down -v`.
