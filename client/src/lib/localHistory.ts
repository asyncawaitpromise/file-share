// The server never learns the encryption key or original filenames — both
// only ever exist in the browser that created the share link. To make "My
// History" more useful than a list of opaque ids, this browser remembers its
// own share links and filenames locally. It's a convenience, not a source of
// truth: clearing site data or switching browsers loses it, and the server's
// status (pending/downloaded/deleted) always wins over anything cached here.

const STORAGE_KEY = 'fileShareLinks'

interface StoredLink {
  fileId: string
  url: string
  createdAt: string
  fileNames: string[]
}

function readAll(): Record<string, StoredLink> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, StoredLink>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage unavailable or full — the link just won't be remembered locally.
  }
}

export function rememberLink(fileId: string, url: string, fileNames: string[]) {
  const all = readAll()
  all[fileId] = { fileId, url, createdAt: new Date().toISOString(), fileNames }
  writeAll(all)
}

export function getRememberedLink(fileId: string): StoredLink | undefined {
  return readAll()[fileId]
}

export function getAllRememberedLinks(): Record<string, StoredLink> {
  return readAll()
}
