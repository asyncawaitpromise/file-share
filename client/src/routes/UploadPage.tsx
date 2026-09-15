import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Upload as UploadIcon, Copy, Check, AlertTriangle } from 'react-feather'
import { apiClient, ApiError } from '../services/apiClient.ts'
import { zipFiles } from '../lib/zip.ts'
import { generateKey, exportKey, encryptBytes } from '../lib/crypto.ts'
import { rememberLink } from '../lib/localHistory.ts'

// Matches the server's default MAX_UPLOAD_MB — a client-side sanity check so
// people don't wait through a whole encrypt+upload cycle just to get a 413.
// The server enforces the real limit regardless.
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

const EXPIRY_OPTIONS = [
  { label: 'Never (default)', seconds: 0 },
  { label: '1 hour', seconds: 3600 },
  { label: '24 hours', seconds: 86400 },
  { label: '7 days', seconds: 604800 },
]

export default function UploadPage() {
  const { token } = useParams<{ token: string }>()
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [expirySeconds, setExpirySeconds] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!token) return
    apiClient.get<{ valid: boolean }>(`/api/upload-tokens/${token}/check`)
      .then((res) => setTokenValid(res.valid))
      .catch(() => setTokenValid(false))
  }, [token])

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  async function handleUpload() {
    if (!token || files.length === 0) return
    if (totalSize > MAX_UPLOAD_BYTES) {
      setError(`Total size exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit for this server`)
      return
    }

    setUploading(true)
    setError(null)

    try {
      const zipped = await zipFiles(files)
      const key = await generateKey()
      const ciphertext = await encryptBytes(zipped, key)

      const headers: Record<string, string> = { 'Content-Type': 'application/octet-stream' }
      if (expirySeconds > 0) headers['X-Expires-In-Seconds'] = String(expirySeconds)

      const res = await fetch(`/api/files/upload?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: ciphertext,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new ApiError(data.error ?? `HTTP ${res.status}`, res.status)

      const keyStr = await exportKey(key)
      const url = `${window.location.origin}/d/${data.fileId}#${keyStr}`
      rememberLink(data.fileId, url, files.map((f) => f.name))
      setShareUrl(url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function copyLink() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <AlertTriangle size={48} className="mx-auto mb-4 text-warning" />
          <h1 className="text-2xl font-bold mb-2">This upload link isn't valid</h1>
          <p className="opacity-60">It may have been disabled or has reached its use limit.</p>
        </div>
      </div>
    )
  }

  if (shareUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-lg w-full space-y-4">
          <h1 className="text-2xl font-bold">Uploaded and encrypted</h1>
          <p className="opacity-70 text-sm">
            Send this link through a different channel than however the recipient will expect
            it. Anyone who opens it can decrypt and download the file exactly once.
          </p>
          <div className="join w-full">
            <input readOnly value={shareUrl} className="input input-bordered join-item w-full font-mono text-xs" />
            <button className="btn btn-primary join-item" onClick={copyLink}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { setShareUrl(null); setFiles([]) }}>
            Share another file
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-4">
        <h1 className="text-2xl font-bold">Share a file</h1>
        <p className="opacity-60 text-sm">
          Files are zipped and encrypted with a one-time key in your browser before upload —
          nothing readable ever reaches the server.
        </p>

        <input
          type="file"
          multiple
          className="file-input file-input-bordered w-full"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />

        {files.length > 0 && (
          <div className="text-sm opacity-70">
            {files.length} file{files.length > 1 ? 's' : ''} — {(totalSize / 1024 / 1024).toFixed(2)} MB
          </div>
        )}

        <div className="form-control">
          <label className="label"><span className="label-text">Delete automatically if never downloaded</span></label>
          <select
            className="select select-bordered"
            value={expirySeconds}
            onChange={(e) => setExpirySeconds(Number(e.target.value))}
          >
            {EXPIRY_OPTIONS.map((opt) => (
              <option key={opt.seconds} value={opt.seconds}>{opt.label}</option>
            ))}
          </select>
        </div>

        {error && <div className="alert alert-error text-sm">{error}</div>}

        <button
          className="btn btn-primary w-full gap-2"
          disabled={files.length === 0 || uploading}
          onClick={handleUpload}
        >
          {uploading ? <span className="loading loading-spinner loading-sm" /> : <UploadIcon size={16} />}
          {uploading ? 'Encrypting & uploading…' : 'Encrypt & upload'}
        </button>
      </div>
    </div>
  )
}
