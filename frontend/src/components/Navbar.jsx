import { Link, NavLink } from 'react-router-dom';
import './Navbar.css';

export default function Navbar({ role, onRoleChange }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="navbar-logo-link">
          <img
            src="/scorpio-logo.png"
            alt="Scorpio"
            className="navbar-logo"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
          <span className="navbar-logo-fallback" style={{ display: 'none' }}>SCORPIO</span>
        </Link>
      </div>

      <div className="navbar-center">
        <NavLink to="/"          end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Dashboard</NavLink>
        <NavLink to="/incidents"    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Incidents</NavLink>
        <Link to="/incidents/new" className="nav-link nav-btn-report">+ Report Incident</Link>
      </div>

      <div className="navbar-right">
        <div className="role-pill">
          <span className="role-label">Role:</span>
          <select value={role} onChange={e => onRoleChange(e.target.value)}>
            <option value="vessel">Vessel / Fleet Team</option>
            <option value="vetting">Vetting Superintendent</option>
            <option value="management">Management</option>
          </select>
        </div>
      </div>
    </nav>
  );
}
