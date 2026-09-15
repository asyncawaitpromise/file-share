import { Link, NavLink } from 'react-router-dom'
import { Menu, Home, Clock, Shield } from 'react-feather'

const links = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/history', label: 'My History', icon: Clock, end: false },
  { to: '/admin', label: 'Admin', icon: Shield, end: false },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 ${isActive ? 'active' : ''}`

export default function Navbar() {
  return (
    <div className="navbar bg-base-200 px-4 sticky top-0 z-30 shadow-sm">
      <div className="navbar-start">
        {/* Hamburger menu — only shown below the lg breakpoint, where the
            horizontal link list in navbar-center is hidden. Keeps Home/My
            History/Admin reachable in one tap from every page, including the
            full-screen upload/download flows that don't otherwise link back. */}
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden" aria-label="Open menu">
            <Menu size={20} />
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            {links.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={navLinkClass}>
                  <Icon size={15} /> {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
        <Link to="/" className="btn btn-ghost text-xl font-bold">File Share</Link>
      </div>

      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1 gap-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={navLinkClass}>
                <Icon size={15} /> {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="navbar-end" />
    </div>
  )
}
