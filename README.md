# file-share

Self-hosted, zero-knowledge encrypted file sharing. Stage a file (or several),
it's zipped and AES-256-GCM encrypted **in your browser**, uploaded as opaque
ciphertext, and turned into a one-time share link. The server never sees the
encryption key or the original filenames. Once the link is opened and the
download completes (plus a short grace window for retries), the file is
deleted for good.

There are no user accounts. The only credential is a single admin password
(`ADMIN_PASSWORD`) that lets you mint or revoke "upload access" links — share
one of those with someone to let them upload through your server until you
disable it.

## How it works

1. **Upload** — you open an admin-issued `/upload/<token>` link, pick files.
   The browser zips them (via [fflate](https://github.com/101arrowz/fflate)),
   generates a random AES-256-GCM key, encrypts the zip, and POSTs the
   ciphertext. The server stores it as an opaque blob keyed by a random file
   id — it has no idea what's inside.
2. **Share link** — the client builds `https://host/d/<fileId>#<key>`. The key
   lives in the URL **fragment** (after `#`), which browsers never send to
   any server — so even the app's own backend never sees it, only whoever you
   send the link to.
3. **Download** — opening the link fetches the ciphertext, decrypts and
   unzips it client-side, and saves the file(s). The first download request
   marks the file "claimed"; it stays available for `DOWNLOAD_GRACE_MINUTES`
   (default 5) in case the transfer needs a retry, then a background sweep
   deletes it unconditionally.
4. **Expiry (optional)** — an upload can also be given a TTL so it
   self-deletes if nobody ever downloads it. Off by default.
5. **Anonymous history** — every visitor gets an opaque session cookie (no
   account) so a returning browser can see its own upload/download history
   at `/history` and manually delete its own pending uploads. The admin
   dashboard (`/admin`) sees a global, still-anonymous audit log across all
   sessions.

## What's included

| Layer | Stack |
|-------|-------|
| Backend | Express 5, better-sqlite3 (WAL mode), Server-Sent Events |
| Frontend | Vite 6, React 18, TypeScript, DaisyUI v4, Tailwind CSS v3 |
| Crypto | Browser WebCrypto (AES-256-GCM) — no crypto library needed |
| Zip | [fflate](https://github.com/101arrowz/fflate) (client-side only) |
| Auth | One admin password (env var) + httpOnly session cookies. No user accounts. |
| State | Zustand v5 |
| Routing | react-router-dom v7 |
| Package manager | pnpm workspaces (root + `client/`) |
| Deployment | CapRover via GitHub Actions |
| Containers | Docker multi-stage build → GHCR |

## Project structure

```
.
├── client/                  # Vite + React frontend (pnpm workspace)
│   └── src/
│       ├── lib/              # crypto.ts (WebCrypto), zip.ts (fflate), localHistory.ts
│       ├── routes/           # Home, UploadPage, DownloadPage, HistoryPage, AdminPage
│       └── store/            # adminStore (login state), themeStore
├── routes/
│   ├── admin.mjs             # Admin login, upload-token CRUD, global audit log
│   ├── uploadTokens.mjs      # Public token validity check
│   ├── files.mjs             # Upload / metadata / download-and-claim / manual delete
│   ├── session.mjs           # Per-session upload/download history
│   └── sse.mjs                # Live updates for history + admin dashboard
├── middlewares/
│   ├── session.mjs           # Anonymous session cookie
│   └── requireAdmin.mjs
├── lib/
│   ├── config.mjs            # Upload size cap, grace window, session lifetimes
│   ├── blobStore.mjs         # Encrypted blob read/write/delete on disk
│   └── cleanup.mjs           # Background sweep: grace-expired + TTL-expired files
├── scripts/                  # CapRover scaffold/deploy/secret-sync scripts
├── db.mjs                    # SQLite schema + connection singleton
├── index.mjs                 # Express server entry point
└── Dockerfile
```

## Local development

```bash
git clone https://github.com/asyncawaitpromise/file-share
cd file-share
pnpm install
cp .env.example .env.local

pnpm dev
# Backend:  http://localhost:8080
# Frontend: http://localhost:5173 (proxies /api to :8080)
```

`pnpm dev:local` (or `LOCAL_DEV=true pnpm dev`) defaults `ADMIN_PASSWORD` to
`dev-admin` if unset and creates a standing `local-dev` upload link, printing
both to the console on boot.

better-sqlite3 needs its native binding built once after install:

```bash
pnpm approve-builds   # select better-sqlite3
```

## Environment variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|----------|--------------|
| `ADMIN_PASSWORD` | The only credential in the app — gates `/admin` |
| `MAX_UPLOAD_MB` | Max encrypted upload size (default 50) |
| `DOWNLOAD_GRACE_MINUTES` | How long a claimed file stays available for retry (default 5) |
| `CORS_ORIGINS` | Comma-separated allowed origins (only needed cross-origin) |
| `CAPROVER_URL` / `CAPROVER_PASSWORD` / `CAPROVER_APP` / `CAPROVER_APP_DOMAIN` | Deployment only |
| `GITHUB_OWNER` / `GHCR_TOKEN` | Private GHCR image pull auth for CapRover |

## Deploying to CapRover

```bash
# One-time app setup (creates the app, persistent volume for data/, env vars)
bash scripts/scaffold.sh

# Push secrets to GitHub Actions + CapRover
bash scripts/sync-secrets.sh

# Push to master — GitHub Actions builds and deploys
git push origin master
```

Or a manual tar deploy with no CI/registry:

```bash
npm install -g caprover
caprover login
bash scripts/deploy-tar.sh
```

The app stores encrypted blobs and the SQLite DB under `/app/data`, which
`scaffold.sh` mounts as a persistent CapRover volume — make sure that's in
place before relying on this in production, or a redeploy will wipe stored
files.

## Threat model, in short

- The server operator can see file sizes, upload/download timestamps, and
  the admin-visible audit log — but never file contents, filenames, or
  decryption keys.
- Anyone who obtains a full share link (`.../d/<id>#<key>`) can download the
  file until someone else does first. Send the link and the "out of band"
  context (who it's for, when to expect it) through different channels if
  that matters for your use case.
- This is built for personal / small-group self-hosting — upload access is
  gated by admin-issued links, not open to the public internet by default.

## License

MIT
