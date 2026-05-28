import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/',            end: true,  icon: '⊕', label: 'Dashboard' },
  { to: '/incidents',              icon: '⚠', label: 'Incidents' },
  { to: '/incidents/new',          icon: '＋', label: 'Report Incident' },
  { divider: true },
  { to: '/vessels',                icon: '⚓', label: 'Vessels' },
  { to: '/email-audit',            icon: '✉', label: 'Email Audit' },
  { divider: true },
  { to: '/user-mgmt',              icon: '👤', label: 'User Management' },
  { to: '/settings',               icon: '⚙', label: 'Settings' },
];

export default function Sidebar({ open }) {
  return (
    <nav className={`sidebar${open ? '' : ' sidebar-collapsed'}`}>
      <div className="sidebar-nav">
        {NAV_ITEMS.map((item, i) =>
          item.divider
            ? <div key={i} className="nav-divider" />
            : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            )
        )}
      </div>
      <div className="sidebar-footer">Scorpio Group &copy; 2026</div>
    </nav>
  );
}
