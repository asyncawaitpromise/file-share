import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, GitHub, LogIn, Database, Server, GitBranch,
  Lock, Key, Terminal, Sliders, Users, Check, Package,
  Zap, Shield, RefreshCw, X, Cloud, HardDrive, Globe,
} from 'react-feather'
import Navbar from '../components/Navbar.tsx'
import { useAuthStore } from '../store/authStore.ts'

const TECH: { label: string; href: string }[] = [
  { label: 'Express 5',        href: 'https://expressjs.com' },
  { label: 'better-sqlite3',   href: 'https://github.com/WiseLibs/better-sqlite3' },
  { label: 'React 18',         href: 'https://react.dev' },
  { label: 'Vite 6',           href: 'https://vitejs.dev' },
  { label: 'TypeScript',       href: 'https://www.typescriptlang.org' },
  { label: 'DaisyUI',          href: 'https://daisyui.com' },
  { label: 'Tailwind CSS',     href: 'https://tailwindcss.com' },
  { label: 'Zustand',          href: 'https://zustand-demo.pmnd.rs' },
  { label: 'react-router-dom', href: 'https://reactrouter.com' },
  { label: 'react-feather',    href: 'https://feathericons.com' },
  { label: 'pnpm workspaces',  href: 'https://pnpm.io/workspaces' },
  { label: 'CapRover',         href: 'https://caprover.com' },
  { label: 'Docker',           href: 'https://docker.com' },
]

function BrowserFrame({ children, url = 'localhost:5173' }: { children: ReactNode; url?: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-base-300 shadow-xl">
      <div className="bg-base-300 px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-error opacity-60" />
          <div className="w-2.5 h-2.5 rounded-full bg-warning opacity-60" />
          <div className="w-2.5 h-2.5 rounded-full bg-success opacity-60" />
        </div>
        <div className="flex-1 bg-base-200 rounded px-2 py-0.5 text-center">
          <span className="text-xs opacity-40 font-mono">{url}</span>
        </div>
      </div>
      <div className="bg-base-100">{children}</div>
    </div>
  )
}

function MockSignIn() {
  return (
    <BrowserFrame url="yourapp.com/signin">
      <div className="p-6 flex items-center justify-center">
        <div className="w-full max-w-xs pointer-events-none select-none">
          <h3 className="text-xl font-bold mb-5 text-center">Sign in</h3>
          <div className="space-y-3">
            <div className="form-control">
              <label className="label py-0.5">
                <span className="label-text text-xs">Email</span>
              </label>
              <div className="input input-bordered input-sm flex items-center text-xs opacity-40">
                you@example.com
              </div>
            </div>
            <div className="form-control">
              <label className="label py-0.5">
                <span className="label-text text-xs">Password</span>
              </label>
              <div className="input input-bordered input-sm flex items-center text-xs opacity-40">
                ••••••••
              </div>
            </div>
            <button className="btn btn-primary btn-sm w-full gap-1 mt-1">
              <LogIn size={12} /> Sign in
            </button>
          </div>
          <div className="divider text-xs opacity-40 my-2">or continue with</div>
          <div className="flex flex-col gap-1.5">
            <button className="btn btn-outline btn-xs gap-1">
              <GitHub size={12} /> GitHub
            </button>
            <button className="btn btn-outline btn-xs">Google</button>
            <button className="btn btn-outline btn-xs">Discord</button>
          </div>
          <p className="text-center text-xs mt-3 opacity-50">
            Don't have an account?{' '}
            <span className="text-primary">Sign up</span>
          </p>
        </div>
      </div>
    </BrowserFrame>
  )
}

function MockSSE() {
  const events = [
    { time: '14:32:01', kind: 'connected', msg: 'Stream connected' },
    { time: '14:32:31', kind: 'heartbeat', msg: '♥ ping' },
    { time: '14:33:07', kind: 'update',    msg: '{"type":"notification","data":{"msg":"Hello!"}}' },
    { time: '14:33:31', kind: 'heartbeat', msg: '♥ ping' },
    { time: '14:34:02', kind: 'update',    msg: '{"type":"sync","data":{"count":42}}' },
  ]
  return (
    <BrowserFrame url="yourapp.com/dashboard">
      <div className="p-5 pointer-events-none select-none">
        <div className="flex items-center gap-2 mb-3">
          <div className="badge badge-success badge-sm gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-success-content animate-pulse" />
            Connected
          </div>
          <span className="text-xs opacity-40">Server-Sent Events stream</span>
        </div>
        <div className="bg-base-300 rounded-lg p-3 font-mono text-xs space-y-1.5">
          {events.map((e) => (
            <div key={e.time + e.kind} className="flex gap-3">
              <span className="opacity-30 shrink-0">{e.time}</span>
              <span className={
                e.kind === 'update' ? 'text-primary' :
                e.kind === 'connected' ? 'text-success' :
                'opacity-30'
              }>
                {e.msg}
              </span>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  )
}

const SAMPLE_THEMES = ['night', 'light', 'cupcake', 'synthwave', 'retro', 'cyberpunk', 'dracula', 'forest']

function MockThemes() {
  const { preferredTheme, setPreferredTheme } = useAuthStore()

  return (
    <div>
      <div className="grid grid-cols-4 gap-1.5">
        {SAMPLE_THEMES.map(t => {
          const active = (preferredTheme === t)
          return (
            <button
              key={t}
              data-theme={t}
              onClick={() => setPreferredTheme(t)}
              className={`rounded-lg p-2.5 bg-base-200 border-2 text-left transition-all ${
                active ? 'border-primary scale-105 shadow-lg' : 'border-base-300 hover:border-primary/50 hover:scale-105'
              }`}
            >
              <p className="text-xs font-mono text-base-content/60 mb-1.5 truncate">{t}</p>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <div className="w-3 h-3 rounded-full bg-secondary" />
                <div className="w-3 h-3 rounded-full bg-accent" />
              </div>
            </button>
          )
        })}
      </div>
      <p className="text-xs opacity-30 text-center mt-2">8 of 35 DaisyUI themes — tap to apply</p>
    </div>
  )
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2 text-sm items-start">
      <Check size={15} className="text-success shrink-0 mt-0.5" />
      <span className="opacity-80">{children}</span>
    </li>
  )
}

function SectionLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-primary justify-center mb-3">
      {icon}
      <span className="text-sm font-semibold uppercase tracking-widest">{label}</span>
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="flex flex-col items-center justify-center text-center px-6 py-24 gap-6 max-w-4xl mx-auto w-full">
          <div className="badge badge-outline badge-lg gap-2">
            <Package size={14} /> Full-stack starter template
          </div>

          <h1 className="text-5xl font-extrabold leading-tight">
            Ship your next app<br />
            <span className="text-primary">without the boilerplate</span>
          </h1>

          <p className="text-lg opacity-60 max-w-2xl leading-relaxed">
            Express&nbsp;+&nbsp;SQLite backend · React&nbsp;+&nbsp;DaisyUI frontend · JWT&nbsp;&amp;&nbsp;OAuth
            auth · Server-Sent Events · one-command deploy to CapRover with branch previews on every push.
          </p>

          <div className="flex gap-3 flex-wrap justify-center">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-lg gap-2"
            >
              <GitHub size={18} /> Use this template
            </a>
            <Link to="/signin" className="btn btn-ghost btn-lg gap-2">
              View demo <ArrowRight size={18} />
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {TECH.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="badge badge-ghost hover:badge-primary transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </section>

        {/* ── Auth ─────────────────────────────────────────────────────── */}
        <section className="bg-base-200 py-20 px-6">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <SectionLabel icon={<Lock size={16} />} label="Authentication" />
              <h2 className="text-3xl font-bold mb-4 text-center md:text-left">Auth that actually works</h2>
              <p className="opacity-60 mb-6 text-center md:text-left">
                Full email/password flows plus OAuth for GitHub, Google, and Discord — all backed
                by JWTs and stored in SQLite.
              </p>
              <ul className="space-y-2.5">
                <CheckItem>JWT tokens, 30-day expiry, persisted via Zustand</CheckItem>
                <CheckItem>bcrypt password hashing (cost&nbsp;12)</CheckItem>
                <CheckItem>OAuth: GitHub · Google · Discord</CheckItem>
                <CheckItem>Admin allowlist via <code className="bg-base-300 px-1 rounded text-xs">config/admins.json</code> or <code className="bg-base-300 px-1 rounded text-xs">ADMIN_USERS</code> env</CheckItem>
                <CheckItem>Passwordless dev-login in non-production environments</CheckItem>
                <CheckItem>ProtectedRoute, PublicOnlyRoute, AdminRoute wrappers included</CheckItem>
              </ul>
            </div>
            <MockSignIn />
          </div>
        </section>

        {/* ── SSE ──────────────────────────────────────────────────────── */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <MockSSE />
            <div>
              <SectionLabel icon={<RefreshCw size={16} />} label="Real-time" />
              <h2 className="text-3xl font-bold mb-4 text-center md:text-left">Server-Sent Events, built in</h2>
              <p className="opacity-60 mb-6 text-center md:text-left">
                The server exposes a <code className="bg-base-200 px-1 rounded text-xs">/api/sse/stream</code> endpoint.
                Authenticated clients connect once and receive pushed updates for the lifetime of their session.
              </p>
              <ul className="space-y-2.5">
                <CheckItem>Node.js EventEmitter singleton — no extra broker needed</CheckItem>
                <CheckItem>Per-user channels: <code className="bg-base-200 px-1 rounded text-xs">emit("update:&lt;userId&gt;", data)</code></CheckItem>
                <CheckItem>30-second heartbeat keeps connections alive through proxies</CheckItem>
                <CheckItem><code className="bg-base-200 px-1 rounded text-xs">?token=</code> query param for EventSource compatibility</CheckItem>
                <CheckItem>Automatic cleanup on client disconnect</CheckItem>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Themes ───────────────────────────────────────────────────── */}
        <section className="bg-base-200 py-20 px-6">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <SectionLabel icon={<Sliders size={16} />} label="UI" />
              <h2 className="text-3xl font-bold mb-4 text-center md:text-left">35 themes, zero config</h2>
              <p className="opacity-60 mb-6 text-center md:text-left">
                DaisyUI ships every theme out of the box. Users pick their preferred theme in
                Settings — it persists in the database and survives sign-out via localStorage.
              </p>
              <ul className="space-y-2.5">
                <CheckItem>
                  <a href="https://daisyui.com" target="_blank" rel="noopener noreferrer" className="link link-hover">DaisyUI v4</a>
                  {' '}on{' '}
                  <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" className="link link-hover">Tailwind CSS v3</a>
                </CheckItem>
                <CheckItem>
                  <a href="https://feathericons.com" target="_blank" rel="noopener noreferrer" className="link link-hover">react-feather</a>
                  {' '}icon set (Feather Icons)
                </CheckItem>
                <CheckItem>User theme stored in the database, synced on login</CheckItem>
                <CheckItem>Zustand persist falls back to localStorage when signed out</CheckItem>
                <CheckItem>
                  <a href="https://reactrouter.com" target="_blank" rel="noopener noreferrer" className="link link-hover">react-router-dom v7</a>
                  {' '}— BrowserRouter with file-based route structure
                </CheckItem>
              </ul>
            </div>
            <MockThemes />
          </div>
        </section>

        {/* ── CI/CD ────────────────────────────────────────────────────── */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <SectionLabel icon={<GitBranch size={16} />} label="CI / CD" />
              <h2 className="text-3xl font-bold mb-3">Branch previews + production deploy</h2>
              <p className="opacity-60 max-w-xl mx-auto">
                Two GitHub Actions workflows wire up your CapRover instance for zero-friction delivery.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card bg-base-200 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <code className="badge badge-primary">deploy.yml</code>
                  <span className="text-sm opacity-50">push to master</span>
                </div>
                <ol className="space-y-3">
                  {[
                    'Checkout + build Docker image',
                    'Push to GHCR (GitHub Container Registry)',
                    'POST captainDefinitionContent to CapRover API',
                    'App goes live at your custom domain',
                  ].map((step, i) => (
                    <li key={step} className="flex gap-3 text-sm items-start">
                      <span className="badge badge-sm badge-outline shrink-0 mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="card bg-base-200 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <code className="badge badge-secondary">preview.yml</code>
                  <span className="text-sm opacity-50">push to any branch</span>
                </div>
                <ol className="space-y-3">
                  {[
                    'Sanitize branch name → CapRover-safe app name',
                    'Build + push branch-specific Docker image',
                    'Create (or update) ephemeral CapRover app',
                    'Preview URL printed in CI logs',
                    'App deleted automatically when branch is deleted',
                  ].map((step, i) => (
                    <li key={step} className="flex gap-3 text-sm items-start">
                      <span className="badge badge-sm badge-outline shrink-0 mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ── Why CapRover ─────────────────────────────────────────────── */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <SectionLabel icon={<Server size={16} />} label="Why self-host?" />
              <h2 className="text-3xl font-bold mb-3">
                A $10/year VPS beats a $20/month SaaS<br />
                <span className="text-primary">for this kind of app</span>
              </h2>
              <p className="opacity-60 max-w-2xl mx-auto">
                Netlify and Vercel are excellent — for static sites and serverless functions.
                This template is a different shape: a persistent, always-on server with a local
                database and long-lived connections. That shape fits self-hosting far better than
                it fits a serverless platform.
              </p>
            </div>

            {/* Comparison table */}
            <div className="overflow-x-auto mb-12">
              <table className="table table-zebra w-full text-sm">
                <thead>
                  <tr>
                    <th className="w-1/3"></th>
                    <th className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Cloud size={16} className="opacity-60" />
                        <span>Netlify / Vercel</span>
                        <span className="badge badge-ghost badge-sm font-normal">free → $20+/mo</span>
                      </div>
                    </th>
                    <th className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Server size={16} className="text-primary" />
                        <span className="text-primary font-semibold">RackNerd VPS + CapRover</span>
                        <span className="badge badge-primary badge-sm font-normal">~$10/yr</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      feature: 'SQLite / persistent disk',
                      them: { ok: false, note: 'Serverless is stateless — no local filesystem between calls' },
                      us:   { ok: true,  note: 'Full persistent volume, WAL mode, no extra database bill' },
                    },
                    {
                      feature: 'Server-Sent Events / WebSockets',
                      them: { ok: false, note: 'Function max duration 10–60 s; connections forcibly closed' },
                      us:   { ok: true,  note: 'Always-on process keeps connections open indefinitely' },
                    },
                    {
                      feature: 'Branch preview environments',
                      them: { ok: true,  note: 'First-class feature on both platforms' },
                      us:   { ok: true,  note: 'preview.yml creates ephemeral CapRover apps per branch' },
                    },
                    {
                      feature: 'Cold starts',
                      them: { ok: false, note: 'Serverless functions spin up on each request' },
                      us:   { ok: true,  note: 'Process stays warm — no latency spike on first hit' },
                    },
                    {
                      feature: 'Custom backend logic',
                      them: { ok: false, note: 'Constrained to serverless function model and runtimes' },
                      us:   { ok: true,  note: 'Any Node.js code, any npm package, any port' },
                    },
                    {
                      feature: 'HTTPS + custom domain',
                      them: { ok: true,  note: 'Included' },
                      us:   { ok: true,  note: "CapRover provisions Let's Encrypt automatically" },
                    },
                    {
                      feature: 'Multiple apps on one server',
                      them: { ok: false, note: 'Each project billed separately' },
                      us:   { ok: true,  note: 'CapRover runs unlimited apps on the same VPS' },
                    },
                    {
                      feature: 'Vendor lock-in',
                      them: { ok: false, note: 'Platform-specific config, routing, and function conventions' },
                      us:   { ok: true,  note: 'Standard Docker image — move to any host in minutes' },
                    },
                  ].map(({ feature, them, us }) => (
                    <tr key={feature}>
                      <td className="font-medium">{feature}</td>
                      <td>
                        <div className="flex gap-2 items-start">
                          {them.ok
                            ? <Check size={14} className="text-success shrink-0 mt-0.5" />
                            : <X size={14} className="text-error shrink-0 mt-0.5" />}
                          <span className="opacity-60 text-xs">{them.note}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2 items-start">
                          {us.ok
                            ? <Check size={14} className="text-success shrink-0 mt-0.5" />
                            : <X size={14} className="text-error shrink-0 mt-0.5" />}
                          <span className="opacity-60 text-xs">{us.note}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Three callout cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="card bg-base-200 p-6">
                <HardDrive size={22} className="text-primary mb-3" />
                <h3 className="font-semibold mb-2">SQLite is the right database here</h3>
                <p className="text-sm opacity-60 leading-relaxed">
                  Serverless platforms can't run SQLite because each function invocation may land
                  on a different machine with a fresh filesystem. A VPS keeps one process and one
                  file — which is exactly what SQLite needs. For most indie apps, SQLite with WAL
                  mode handles thousands of concurrent readers without breaking a sweat.
                </p>
              </div>
              <div className="card bg-base-200 p-6">
                <Globe size={22} className="text-primary mb-3" />
                <h3 className="font-semibold mb-2">CapRover is self-hosted Heroku</h3>
                <p className="text-sm opacity-60 leading-relaxed">
                  CapRover gives you a web UI, one-click SSL, app logs, metrics, and a deploy API
                  — all running on your own VPS.{' '}
                  <a href="https://caprover.com" target="_blank" rel="noopener noreferrer" className="link link-hover">
                    RackNerd's $10–15/year KVM VPS
                  </a>{' '}
                  (1 vCPU, 1 GB RAM, 20 GB SSD) is enough to host CapRover plus several small
                  apps simultaneously, keeping your total infrastructure cost under a coffee per month.
                </p>
              </div>
              <div className="card bg-base-200 p-6">
                <Zap size={22} className="text-primary mb-3" />
                <h3 className="font-semibold mb-2">You still get the DX you expect</h3>
                <p className="text-sm opacity-60 leading-relaxed">
                  The preview.yml workflow brings Vercel-style branch previews to your self-hosted
                  stack. Push a branch, get a live URL. Delete the branch, the app disappears.
                  The scaffold and sync-secrets scripts mean first deploy is a single command,
                  not an afternoon of clicking through cloud consoles.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Scripts ──────────────────────────────────────────────────── */}
        <section className="bg-base-200 py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <SectionLabel icon={<Terminal size={16} />} label="Scripts" />
              <h2 className="text-3xl font-bold mb-3">Day-one ops, automated</h2>
              <p className="opacity-60 max-w-xl mx-auto">
                Three shell scripts handle everything from first deploy to secret rotation.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  icon: <Server size={20} />,
                  name: 'scaffold.sh',
                  desc: 'Creates the CapRover app, sets all environment variables, mounts a persistent volume for SQLite, registers your GHCR private registry, and enables HTTPS.',
                },
                {
                  icon: <Key size={20} />,
                  name: 'sync-secrets.sh',
                  desc: 'Reads your .env.local and pushes each variable to GitHub Secrets and/or CapRover env vars based on a routing table. One command to rotate a secret everywhere.',
                },
                {
                  icon: <Lock size={20} />,
                  name: 'env-crypt / bootstrap',
                  desc: 'GPG-encrypt .env.local so it can live in git (.env.local.enc). bootstrap.sh decrypts on a new machine — secrets travel with the repo, safely.',
                },
              ].map(({ icon, name, desc }) => (
                <div key={name} className="card bg-base-100 p-6">
                  <div className="text-primary mb-3">{icon}</div>
                  <h3 className="font-mono font-bold mb-2 text-sm">{name}</h3>
                  <p className="text-sm opacity-60 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Backend ──────────────────────────────────────────────────── */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <SectionLabel icon={<Database size={16} />} label="Backend" />
              <h2 className="text-3xl font-bold mb-3">Express + SQLite, no fuss</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  icon: <Server size={22} />,
                  title: 'Express 5',
                  desc: 'Async handlers with native error propagation. CORS, static serving, SPA catch-all, and a /health endpoint — all pre-wired.',
                },
                {
                  icon: <Database size={22} />,
                  title: 'better-sqlite3',
                  desc: 'WAL mode + foreign keys. Synchronous API keeps code simple. Schema auto-migrates on startup — no migration runner needed.',
                },
                {
                  icon: <Users size={22} />,
                  title: 'Users & OAuth',
                  desc: 'users, oauth_accounts, and oauth_state tables. Stale states purged on boot. Admin flag synced on every login from the allowlist.',
                },
                {
                  icon: <Zap size={22} />,
                  title: 'pnpm workspaces',
                  desc: 'Root package runs the server; client/ is a workspace package. One pnpm install, one pnpm dev — concurrently starts both.',
                },
                {
                  icon: <Shield size={22} />,
                  title: 'Secrets',
                  desc: 'JWT_SECRET, OAuth credentials, and CapRover tokens managed via .env.local with GPG encryption for git-safe storage.',
                },
                {
                  icon: <Package size={22} />,
                  title: 'Docker',
                  desc: 'Multi-stage Dockerfile: client build in stage 1, production server in stage 2. Image is small — only prod deps included.',
                },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="card bg-base-200 p-6">
                  <div className="text-primary mb-3">{icon}</div>
                  <h3 className="font-semibold mb-2">{title}</h3>
                  <p className="text-sm opacity-60 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="bg-base-200 border-t border-base-300 py-10 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center text-sm mb-6">
              {TECH.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-40 hover:opacity-80 transition-opacity"
                >
                  {label}
                </a>
              ))}
            </div>
            <p className="text-center text-xs opacity-25">caprover-app-template · MIT License</p>
          </div>
        </footer>

      </main>
    </div>
  )
}
