// Client-side AES-256-GCM. The key is generated per upload and never sent to
// the server — it only ever travels in the URL fragment of the share link,
// which browsers never include in requests.

const IV_LENGTH = 12

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return toBase64Url(new Uint8Array(raw))
}

export async function importKey(keyStr: string): Promise<CryptoKey> {
  const raw = fromBase64Url(keyStr)
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
}

// Output is IV || ciphertext (GCM tag is appended to the ciphertext by WebCrypto).
export async function encryptBytes(data: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  const out = new Uint8Array(iv.length + ciphertext.byteLength)
  out.set(iv, 0)
  out.set(new Uint8Array(ciphertext), iv.length)
  return out
}

export async function decryptBytes(data: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
  const iv = data.slice(0, IV_LENGTH)
  const ciphertext = data.slice(IV_LENGTH)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new Uint8Array(plaintext)
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(str: string): Uint8Array {
  const padLength = (4 - (str.length % 4)) % 4
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLength)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
