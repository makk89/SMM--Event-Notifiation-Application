import { Link } from 'react-router-dom';
import './Topbar.css';

function makeLogoWhite(img) {
  if (img.dataset.whitened) return;   // already processed — prevent re-fire loop
  img.dataset.whitened = '1';
  try {
    const canvas = document.createElement('canvas');
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d  = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
      if (lum < 180) { d[i]=d[i+1]=d[i+2]=255; d[i+3]=255; }
      else            { d[i+3]=0; }
    }
    ctx.putImageData(id, 0, 0);
    img.src = canvas.toDataURL('image/png');
  } catch (_) { /* cross-origin fallback: keep original */ }
}

export default function Topbar({ role, onRoleChange, sidebarOpen, onToggleSidebar }) {
  return (
    <header className="topbar">
      <button className="hamburger" onClick={onToggleSidebar} title="Toggle sidebar">
        &#9776;
      </button>
      <div className="topbar-logo-wrap">
        <Link to="/" className="topbar-logo-link">
          <img
            src="/scorpio-logo.png"
            alt="Scorpio"
            className="topbar-logo-img"
            onLoad={e => makeLogoWhite(e.target)}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
          />
          <span className="topbar-logo-fallback" style={{ display: 'none' }}>SCORPIO</span>
        </Link>
      </div>

      <div className="topbar-spacer" />

      <div className="role-pill">
        <span className="role-label">Role:</span>
        <select value={role} onChange={e => onRoleChange(e.target.value)}>
          <option value="vessel">Vessel / Fleet Team</option>
          <option value="vetting">Vetting Superintendent</option>
          <option value="management">Management</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <Link to="/incidents/new" className="btn-new">+ New Incident</Link>
    </header>
  );
}
