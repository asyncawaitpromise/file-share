export const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB, 10) || 50;

// +1MB slack over the raw file size cap for AES-GCM's 16-byte tag, the 12-byte
// IV, and zip container overhead — all added client-side before upload.
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024 + 1024 * 1024;

export const DOWNLOAD_GRACE_MINUTES = parseInt(process.env.DOWNLOAD_GRACE_MINUTES, 10) || 5;
export const DOWNLOAD_GRACE_MS = DOWNLOAD_GRACE_MINUTES * 60 * 1000;

export const ADMIN_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
export const ANON_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 365; // 1 year
