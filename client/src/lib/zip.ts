// Bundles staged files into one zip client-side (so multi-file shares are a
// single encrypted blob) using fflate — a small, dependency-free FOSS
// (de)compression library.

import { zipSync, unzipSync } from 'fflate'

export interface ZipEntry {
  name: string
  data: Uint8Array
}

export async function zipFiles(files: File[]): Promise<Uint8Array> {
  const entries: Record<string, Uint8Array> = {}
  for (const file of files) {
    entries[file.name] = new Uint8Array(await file.arrayBuffer())
  }
  return zipSync(entries, { level: 6 })
}

export function unzipToEntries(data: Uint8Array): ZipEntry[] {
  const unzipped = unzipSync(data)
  return Object.entries(unzipped).map(([name, fileData]) => ({ name, data: fileData }))
}
