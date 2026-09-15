import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2, Power, RefreshCw } from 'react-feather'
import { useAdminStore } from '../store/adminStore.ts'
import { apiClient } from '../services/apiClient.ts'

interface UploadToken {
  id: string
  label: string | null
  enabled: number
  max_uses: number | null
  use_count: number
  created_at: string
  disabled_at: string | null
}

interface AuditEvent {
  id: number
  file_id: string
  session_id: string | null
  event: string
  created_at: string
}

interface Stats {
  totalFilesEver: number
  activeFiles: number
  activeBytes: number
}

function AdminLogin() {
  const login = useAdminStore((s) => s.login)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await login(password)
    setLoading(false)
    if (!res.success) setError(res.error ?? 'Login failed')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="max-w-sm w-full space-y-4">
        <h1 className="text-2xl font-bold">Admin login</h1>
        <input
          type="password"
          placeholder="Admin password"
          className="input input-bordered w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <div className="alert alert-error text-sm">{error}</div>}
        <button className="btn btn-primary w-full" disabled={loading || !password}>
          {loading ? <span className="loading loading-spinner loading-sm" /> : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

function AdminDashboard() {
  const logout = useAdminStore((s) => s.logout)
  const [tokens, setTokens] = useState<UploadToken[]>([])
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [newTokenUrl, setNewTokenUrl] = useState<string | null>(null)

  async function loadAll() {
    const [t, a, s] = await Promise.all([
      apiClient.get<{ tokens: UploadToken[] }>('/api/admin/tokens'),
      apiClient.get<{ events: AuditEvent[] }>('/api/admin/audit'),
      apiClient.get<Stats>('/api/admin/stats'),
    ])
    setTokens(t.tokens)
    setAudit(a.events)
    setStats(s)
  }

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    const es = new EventSource('/api/sse/stream', { withCredentials: true })
    es.addEventListener('admin', () => loadAll())
    return () => es.close()
  }, [])

  async function createToken() {
    const res = await apiClient.post<{ token: UploadToken }>('/api/admin/tokens', { label: newLabel || null })
    setNewLabel('')
    setNewTokenUrl(`${window.location.origin}/upload/${res.token.id}`)
    loadAll()
  }

  async function toggleToken(t: UploadToken) {
    await apiClient.patch(`/api/admin/tokens/${t.id}`, { enabled: !t.enabled })
    loadAll()
  }

  async function deleteToken(id: string) {
    await apiClient.delete(`/api/admin/tokens/${id}`)
    loadAll()
  }

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin</h1>
        <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
      </div>

      {stats && (
        <div className="stats shadow w-full overflow-x-auto">
          <div className="stat">
            <div className="stat-title">Active files</div>
            <div className="stat-value">{stats.activeFiles}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Active storage</div>
            <div className="stat-value text-2xl">{(stats.activeBytes / 1024 / 1024).toFixed(1)} MB</div>
          </div>
          <div className="stat">
            <div className="stat-title">Total files ever</div>
            <div className="stat-value text-2xl">{stats.totalFilesEver}</div>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">Upload access links</h2>
        <div className="join mb-4">
          <input
            placeholder="Label (optional)"
            className="input input-bordered join-item"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <button className="btn btn-primary join-item gap-1" onClick={createToken}>
            <Plus size={16} /> New link
          </button>
        </div>

        {newTokenUrl && (
          <div className="alert alert-success text-sm mb-4 font-mono break-all">{newTokenUrl}</div>
        )}

        <div className="space-y-2">
          {tokens.map((t) => (
            <div key={t.id} className="card bg-base-200 p-4 flex-row items-center justify-between gap-4">
              <div>
                <div className="font-semibold">{t.label || '(no label)'}</div>
                <div className="text-xs opacity-60 font-mono">/upload/{t.id}</div>
                <div className="text-xs opacity-60">{t.use_count} use{t.use_count === 1 ? '' : 's'}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${t.enabled ? 'badge-success' : 'badge-ghost'}`}>
                  {t.enabled ? 'enabled' : 'disabled'}
                </span>
                <button className="btn btn-ghost btn-xs" onClick={() => toggleToken(t)} title="Toggle enabled">
                  <Power size={14} />
                </button>
                <button className="btn btn-ghost btn-xs text-error" onClick={() => deleteToken(t.id)} title="Delete link">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Audit log</h2>
          <button className="btn btn-ghost btn-xs gap-1" onClick={loadAll}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr><th>Time</th><th>Event</th><th>File</th><th>Session</th></tr>
            </thead>
            <tbody>
              {audit.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                  <td>{e.event}</td>
                  <td className="font-mono text-xs">{e.file_id}</td>
                  <td className="font-mono text-xs">{e.session_id ? e.session_id.slice(0, 8) : 'system'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default function AdminPage() {
  const { isLoggedIn, isChecked, checkSession } = useAdminStore()

  useEffect(() => {
    checkSession()
  }, [checkSession])

  if (!isChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return isLoggedIn ? <AdminDashboard /> : <AdminLogin />
}
