import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const blobDir = path.join(__dirname, '..', 'data', 'blobs');
fs.mkdirSync(blobDir, { recursive: true });

function blobPath(fileId) {
  return path.join(blobDir, `${fileId}.bin`);
}

export function writeBlob(fileId, buffer) {
  return fs.promises.writeFile(blobPath(fileId), buffer);
}

export function readBlobStream(fileId) {
  return fs.createReadStream(blobPath(fileId));
}

export async function deleteBlob(fileId) {
  await fs.promises.rm(blobPath(fileId), { force: true });
}

export function blobExists(fileId) {
  return fs.existsSync(blobPath(fileId));
}
