import { useEffect, useState } from 'react'
import { Copy, Trash2, Check } from 'react-feather'
import { apiClient, ApiError } from '../services/apiClient.ts'
import { getAllRememberedLinks } from '../lib/localHistory.ts'

type Status = 'pending' | 'downloading' | 'downloaded' | 'expired' | 'deleted'

interface FileSummary {
  fileId: string
  sizeBytes: number
  createdAt: string
  expiresAt: string | null
  claimedAt: string | null
  deletedAt: string | null
  status: Status
}

const STATUS_LABEL: Record<Status, string> = {
  pending: 'Waiting for download',
  downloading: 'Download in progress (grace window)',
  downloaded: 'Downloaded & deleted',
  expired: 'Expired unclaimed',
  deleted: 'Deleted by you',
}

const STATUS_BADGE: Record<Status, string> = {
  pending: 'badge-info',
  downloading: 'badge-warning',
  downloaded: 'badge-success',
  expired: 'badge-ghost',
  deleted: 'badge-ghost',
}

export default function HistoryPage() {
  const [uploads, setUploads] = useState<FileSummary[]>([])
  const [downloads, setDownloads] = useState<FileSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const localLinks = getAllRememberedLinks()

  async function load() {
    try {
      const data = await apiClient.get<{ uploads: FileSummary[]; downloads: FileSummary[] }>('/api/session/history')
      setUploads(data.uploads)
      setDownloads(data.downloads)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const es = new EventSource('/api/sse/stream', { withCredentials: true })
    es.addEventListener('update', () => load())
    return () => es.close()
  }, [])

  async function handleDelete(fileId: string) {
    try {
      await apiClient.delete(`/api/files/${fileId}`)
      load()
    } catch {
      // File may already have been claimed or expired since the page loaded — refresh will show it.
      load()
    }
  }

  async function copyLink(fileId: string) {
    const link = localLinks[fileId]
    if (!link) return
    await navigator.clipboard.writeText(link.url)
    setCopiedId(fileId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold mb-1">My History</h1>
        <p className="opacity-60 text-sm">
          Tied to this browser only, via an anonymous session — no account. Share links only work
          in the browser that created them, so a cleared browser or a different device won't show
          them here, even though the server still remembers each file's status.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <section>
        <h2 className="text-xl font-semibold mb-3">Uploaded by you ({uploads.length})</h2>
        {uploads.length === 0 && <p className="opacity-50 text-sm">Nothing yet.</p>}
        <div className="space-y-2">
          {uploads.map((f) => (
            <div key={f.fileId} className="card bg-base-200 p-4 flex-row items-center justify-between gap-4">
              <div>
                <div className="font-mono text-sm">
                  {localLinks[f.fileId]?.fileNames?.join(', ') || f.fileId}
                </div>
                <div className="text-xs opacity-60">
                  {(f.sizeBytes / 1024).toFixed(1)} KB · {new Date(f.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${STATUS_BADGE[f.status]}`}>{STATUS_LABEL[f.status]}</span>
                {localLinks[f.fileId] && f.status === 'pending' && (
                  <button className="btn btn-ghost btn-xs" onClick={() => copyLink(f.fileId)}>
                    {copiedId === f.fileId ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                )}
                {f.status === 'pending' && (
                  <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(f.fileId)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Downloaded by you ({downloads.length})</h2>
        {downloads.length === 0 && <p className="opacity-50 text-sm">Nothing yet.</p>}
        <div className="space-y-2">
          {downloads.map((f) => (
            <div key={f.fileId} className="card bg-base-200 p-4">
              <div className="font-mono text-sm">{f.fileId}</div>
              <div className="text-xs opacity-60">
                {(f.sizeBytes / 1024).toFixed(1)} KB · {f.claimedAt ? new Date(f.claimedAt).toLocaleString() : ''}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
