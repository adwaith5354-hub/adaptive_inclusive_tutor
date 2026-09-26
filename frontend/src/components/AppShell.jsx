import { Link, NavLink, useLocation } from 'react-router-dom'

/** Dark navy top bar (LexieLingua-style): brand, pill nav, learner profile. Wraps every signed-in page. */
export default function AppShell({ student, onLogout, children }) {
  const loc = useLocation()
  const practicing = loc.pathname.startsWith('/learn')
  const initial = (student.name || '?').trim().charAt(0).toUpperCase()

  return (
    <div className="shell">
      <header className="shell-bar">
        <Link to="/home" className="brand"><span aria-hidden>🦉</span> SmartTutor</Link>
        <nav className="nav-pills" aria-label="Primary">
          <NavLink to="/home" end className={({ isActive }) => `nav-pill${isActive ? ' active' : ''}`}>
            Home
          </NavLink>
          <span className={`nav-pill static${practicing ? ' active' : ''}`}>Practice</span>
        </nav>
        <div className="shell-user">
          <span className="avatar" aria-hidden>{initial}</span>
          <span className="user-meta">
            <strong>{student.name.split(' ')[0]}</strong>
            <small>Grade {student.grade}</small>
          </span>
          <button className="icon-btn" onClick={onLogout} title="Log out" aria-label="Log out">⏻</button>
        </div>
      </header>
      <div className="shell-body">{children}</div>
    </div>
  )
}
