import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download as DownloadIcon, AlertTriangle, CheckCircle } from 'react-feather'
import { apiClient, ApiError } from '../services/apiClient.ts'
import { decryptBytes, importKey } from '../lib/crypto.ts'
import { unzipToEntries } from '../lib/zip.ts'
import { getRememberedLink } from '../lib/localHistory.ts'

interface FileMeta {
  fileId: string
  sizeBytes: number
  claimed: boolean
  graceExpiresAt: string | null
  expiresAt: string | null
}

export default function DownloadPage() {
  const { fileId } = useParams<{ fileId: string }>()
  const [meta, setMeta] = useState<FileMeta | null>(null)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [key, setKey] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedNames, setSavedNames] = useState<string[] | null>(null)

  useEffect(() => {
    setKey(window.location.hash.slice(1) || null)
  }, [])

  useEffect(() => {
    if (!fileId) return
    apiClient.get<FileMeta>(`/api/files/${fileId}`)
      .then(setMeta)
      .catch((err) => setMetaError(err instanceof ApiError ? err.message : 'File not found'))
  }, [fileId])

  const remembered = fileId ? getRememberedLink(fileId) : undefined

  async function handleDownload() {
    if (!fileId || !key) return
    setDownloading(true)
    setError(null)

    try {
      const cryptoKey = await importKey(key)

      const res = await fetch(`/api/files/${fileId}/blob`, { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new ApiError(data.error ?? `HTTP ${res.status}`, res.status)
      }

      const ciphertext = new Uint8Array(await res.arrayBuffer())
      const zipped = await decryptBytes(ciphertext, cryptoKey)
      const entries = unzipToEntries(zipped)

      for (const entry of entries) {
        const blob = new Blob([entry.data as BlobPart])
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = entry.name
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      }

      setSavedNames(entries.map((e) => e.name))
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Decryption failed — the link may be incomplete, or the file was already claimed and removed.'
      )
    } finally {
      setDownloading(false)
    }
  }

  if (metaError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <AlertTriangle size={48} className="mx-auto mb-4 text-warning" />
          <h1 className="text-2xl font-bold mb-2">Not available</h1>
          <p className="opacity-60">{metaError}</p>
        </div>
      </div>
    )
  }

  if (!meta) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (savedNames) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <CheckCircle size={48} className="mx-auto mb-4 text-success" />
          <h1 className="text-2xl font-bold mb-2">Downloaded</h1>
          <p className="opacity-60 mb-4">
            Saved: {savedNames.join(', ')}
          </p>
          <p className="opacity-50 text-sm">
            This was the one download this link gets — it's being removed from the server now.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold">
          {remembered?.fileNames?.length ? remembered.fileNames.join(', ') : 'Encrypted file ready'}
        </h1>
        <p className="opacity-60 text-sm">{(meta.sizeBytes / 1024 / 1024).toFixed(2)} MB, encrypted</p>

        {!key && (
          <div className="alert alert-warning text-sm text-left">
            No decryption key found in this link. Make sure you opened the complete share link,
            including everything after the <code>#</code>.
          </div>
        )}

        {meta.claimed && (
          <div className="alert alert-warning text-sm text-left">
            This link has already been opened once. If that download didn't finish, you have a
            short grace window to retry — after that it's gone for good.
          </div>
        )}

        <div className="alert alert-info text-sm text-left">
          Downloading removes this file from the server shortly after — make sure you're ready
          to save it before you continue.
        </div>

        {error && <div className="alert alert-error text-sm">{error}</div>}

        <button
          className="btn btn-primary w-full gap-2"
          disabled={!key || downloading}
          onClick={handleDownload}
        >
          {downloading ? <span className="loading loading-spinner loading-sm" /> : <DownloadIcon size={16} />}
          {downloading ? 'Decrypting…' : 'Download & decrypt'}
        </button>
      </div>
    </div>
  )
}
