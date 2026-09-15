import { Link } from 'react-router-dom'
import { Clock, Shield } from 'react-feather'

export default function Navbar() {
  return (
    <div className="navbar bg-base-200 px-4">
      <div className="navbar-start">
        <Link to="/" className="btn btn-ghost text-xl font-bold">File Share</Link>
      </div>

      <div className="navbar-end gap-2">
        <Link to="/history" className="btn btn-ghost btn-sm gap-1">
          <Clock size={15} /> My History
        </Link>
        <Link to="/admin" className="btn btn-ghost btn-sm gap-1">
          <Shield size={15} /> Admin
        </Link>
      </div>
    </div>
  )
}
