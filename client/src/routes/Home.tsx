import { Link } from 'react-router-dom'
import { Lock, Trash2, Clock } from 'react-feather'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-3">Share files, then forget them</h1>
          <p className="opacity-70">
            Files are zipped and encrypted in your browser before they ever leave it. The server
            only ever stores ciphertext, and deletes it automatically once it's been downloaded.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="card bg-base-200 p-4">
            <Lock size={20} className="mb-2" />
            <div className="font-semibold text-sm">End-to-end encrypted</div>
            <div className="text-xs opacity-60 mt-1">
              The decryption key never touches the server — it lives only in the share link.
            </div>
          </div>
          <div className="card bg-base-200 p-4">
            <Trash2 size={20} className="mb-2" />
            <div className="font-semibold text-sm">One download, then gone</div>
            <div className="text-xs opacity-60 mt-1">
              The file is deleted shortly after it's downloaded once.
            </div>
          </div>
          <div className="card bg-base-200 p-4">
            <Clock size={20} className="mb-2" />
            <div className="font-semibold text-sm">Optional expiry</div>
            <div className="text-xs opacity-60 mt-1">
              A file can also be set to self-delete if it's never picked up.
            </div>
          </div>
        </div>

        <p className="opacity-50 text-sm">
          Uploading requires an invite link from whoever runs this server. Have one? Open it to
          get started. Otherwise, check{' '}
          <Link to="/history" className="link">My History</Link> for files you've shared or received.
        </p>
      </div>
    </div>
  )
}
