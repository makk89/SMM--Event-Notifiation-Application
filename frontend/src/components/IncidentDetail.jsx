import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchIncident, deleteIncident, publishIncident } from '../api/incidents.js';
import Attachments from './Attachments.jsx';
import './IncidentDetail.css';

function statusBadgeClass(s) {
  if (s === 'Closed') return 'closed';
  if (s === 'Pending OM Notification') return 'pending-om';
  return 'open';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Field({ label, value, pre }) {
  return (
    <div className="detail-field">
      <span className="detail-label">{label}</span>
      <span className={`detail-value${pre ? ' pre' : ''}`}>{value || '—'}</span>
    </div>
  );
}

export default function IncidentDetail({ role }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [incident, setIncident]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDelete, setConfirm] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState(null);

  useEffect(() => {
    fetchIncident(id)
      .then(setIncident)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handlePublish() {
    setPublishing(true);
    setPublishMsg(null);
    try {
      const result = await publishIncident(id);
      setIncident(result.incident);
      const emailOk = !result.notifications?.email?.error && !result.notifications?.email?.skipped;
      const teamsOk = !result.notifications?.teams?.error && !result.notifications?.teams?.skipped;
      const parts = [];
      if (emailOk) parts.push('email sent');
      else if (result.notifications?.email?.skipped) parts.push('email not configured');
      else parts.push('email failed');
      if (teamsOk) parts.push('Teams notified');
      else if (result.notifications?.teams?.skipped) parts.push('Teams not configured');
      else parts.push('Teams failed');
      setPublishMsg({ type: 'success', text: `Published. ${parts.join(' · ')}.` });
    } catch (e) {
      setPublishMsg({ type: 'error', text: e.message });
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirm(true); return; }
    setDeleting(true);
    try {
      await deleteIncident(id);
      navigate('/incidents');
    } catch (e) {
      setError(e.message);
      setDeleting(false);
      setConfirm(false);
    }
  }

  if (loading) return <div className="loading-state"><div className="spinner" /><span>Loading…</span></div>;
  if (error)   return <div className="error-state"><span className="error-icon">&#9888;</span><span>{error}</span><Link to="/incidents" className="btn btn-secondary">Back</Link></div>;
  if (!incident) return null;

  const isVetting = role === 'vetting';

  return (
    <div className="incident-detail-page">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link to="/">Dashboard</Link>
        <span className="bc-sep">›</span>
        <Link to="/incidents">Incidents</Link>
        <span className="bc-sep">›</span>
        <span>#{incident.id} — {incident.vessel_name}</span>
      </nav>

      {/* Header */}
      <div className="detail-header card">
        <div className="detail-header-main">
          <div className="detail-id">#{incident.id}</div>
          <h1 className="detail-vessel">{incident.vessel_name}</h1>
          <div className="detail-meta">
            <span>{incident.incident_type}</span>
            <span className="meta-sep">·</span>
            <span>{incident.location}</span>
            {incident.fleet && <><span className="meta-sep">·</span><span>{incident.fleet}</span></>}
            <span className="meta-sep">·</span>
            <span>Event: {formatDate(incident.date_of_event)}</span>
          </div>
        </div>
        <div className="detail-header-badges">
          <span className={`badge badge-${statusBadgeClass(incident.status)} badge-lg`}>
            {incident.status}
          </span>
          {incident.oil_informed === 'Yes' && (
            <span className="badge badge-oil">&#9993; Oil Major Notified</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="detail-body">
        <div className="detail-main">

          {/* Cols 1–10: Core details */}
          <div className="card detail-section">
            <h2 className="section-heading">Initial Notification — Cols 1–10</h2>
            <div className="detail-grid">
              <Field label="1. Vessel Name"       value={incident.vessel_name} />
              <Field label="2. Date of Event"     value={formatDate(incident.date_of_event)} />
              <Field label="3. Date of Reporting" value={formatDate(incident.date_of_reporting)} />
              <Field label="4. Days Difference"   value={incident.days_diff != null ? `${incident.days_diff} day${incident.days_diff === 1 ? '' : 's'}` : '—'} />
              <Field label="5. Type of Incident"  value={incident.incident_type} />
              <Field label="6. Present Location"  value={incident.location} />
              <Field label="7. Charterer"         value={incident.charterer} />
              <Field label="8. Cargo Onboard"     value={incident.cargo} />
              <Field label="9. Last Port / ETD"   value={incident.last_port} />
              <Field label="10. Next Port / ETA"  value={incident.next_port} />
              <Field label="Fleet"                value={incident.fleet} />
            </div>
            <Attachments incidentId={incident.id} section="initial" label="Initial Notification Attachments" />
          </div>

          {/* Machinery / Equipment Details — conditional */}
          {incident.incident_type === 'Machinery / Equipment Failure' && (
            <div className="card detail-section machinery-detail-panel">
              <h2 className="section-heading">Machinery / Equipment Details</h2>
              <div className="detail-grid">
                <Field label="Machinery / Equipment Name" value={incident.machinery_name} />
                <Field label="Type of Failure"            value={incident.machinery_failure_type} />
                <Field label="Repair Status"              value={incident.machinery_repair_status} />
              </div>
              {incident.machinery_failure_desc && (
                <div className="detail-field" style={{marginTop:'12px'}}>
                  <span className="detail-label">Failure Description</span>
                  <p className="detail-text">{incident.machinery_failure_desc}</p>
                </div>
              )}
              <Attachments incidentId={incident.id} section="machinery" label="Machinery Attachments" />
            </div>
          )}

          {/* Cols 11–12: Nature & Action Plan */}
          <div className="card detail-section">
            <h2 className="section-heading">Nature &amp; Action Plan — Cols 11–12</h2>
            <div className="text-pair">
              <div>
                <div className="detail-label">11. Nature of Event</div>
                <p className="detail-text">{incident.nature || '—'}</p>
              </div>
              <div>
                <div className="detail-label">12. Action Plan</div>
                <p className="detail-text">{incident.action_plan || '—'}</p>
              </div>
            </div>
            <Attachments incidentId={incident.id} section="nature" label="Nature & Action Plan Attachments" />
          </div>

          {/* Cols 13–14: Oil Majors (shown to all, editable only by vetting) */}
          <div className="card detail-section">
            <h2 className="section-heading">Oil Major Notification — Cols 13–14</h2>
            <div className="detail-grid">
              <Field label="13. Oil Major Informed?" value={incident.oil_informed} />
              <Field label="14. Which Oil Majors"    value={incident.oil_which} />
            </div>
            <Attachments incidentId={incident.id} section="oil_major" label="Oil Major Attachments" />
          </div>

          {/* Cols 15–16: Follow Up & Status */}
          <div className="card detail-section">
            <h2 className="section-heading">Follow Up &amp; Status — Cols 15–16</h2>
            <div className="detail-grid">
              <div className="detail-field detail-field-wide">
                <span className="detail-label">15. Follow Up Messages</span>
                <p className="detail-text">{incident.follow_up || 'No follow-ups yet.'}</p>
              </div>
              <Field label="16. Status" value={incident.status} />
              <Field label="Report Made in Docmap" value={incident.docmap_reported} />
            </div>
            <Attachments incidentId={incident.id} section="follow_up" label="Follow Up Attachments" />
          </div>

          {/* Remarks */}
          <div className="card detail-section">
            <h2 className="section-heading">Remarks</h2>
            <p className="detail-text">{incident.remarks || 'No remarks.'}</p>
            <Attachments incidentId={incident.id} section="remarks" label="Remarks Attachments" />
          </div>

          {/* Record info */}
          <div className="card detail-section">
            <h2 className="section-heading">Record Information</h2>
            <div className="detail-grid">
              <Field label="Created"      value={formatDateTime(incident.created_at)} />
              <Field label="Last Updated" value={formatDateTime(incident.updated_at)} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="detail-sidebar">
          <div className="card sidebar-card">
            <h2 className="sidebar-heading">Quick Info</h2>
            <div className="sidebar-rows">
              <div className="sidebar-row">
                <span className="sidebar-label">Status</span>
                <span className={`badge badge-${statusBadgeClass(incident.status)}`}>{incident.status}</span>
              </div>
              <div className="sidebar-row">
                <span className="sidebar-label">Fleet</span>
                <span className="sidebar-value">{incident.fleet || '—'}</span>
              </div>
              <div className="sidebar-row">
                <span className="sidebar-label">Type</span>
                <span className="sidebar-value">{incident.incident_type}</span>
              </div>
              <div className="sidebar-row">
                <span className="sidebar-label">Event Date</span>
                <span className="sidebar-value">{formatDate(incident.date_of_event)}</span>
              </div>
              <div className="sidebar-row">
                <span className="sidebar-label">Reported</span>
                <span className="sidebar-value">{formatDate(incident.date_of_reporting)}</span>
              </div>
              <div className="sidebar-row">
                <span className="sidebar-label">Δ Days</span>
                <span className="sidebar-value">{incident.days_diff != null ? incident.days_diff : '—'}</span>
              </div>
              <div className="sidebar-row">
                <span className="sidebar-label">Oil Major</span>
                <span className="sidebar-value">{incident.oil_informed || '—'}</span>
              </div>
            </div>
          </div>

          <div className="card sidebar-card">
            <h2 className="sidebar-heading">Actions</h2>
            <div className="action-btns">
              {incident.published ? (
                <div className="publish-done">
                  <span className="publish-check">&#10003;</span> Published
                  {incident.published_at && (
                    <div className="publish-ts">{formatDateTime(incident.published_at)}</div>
                  )}
                </div>
              ) : (
                <button
                  className="btn btn-publish action-btn"
                  onClick={handlePublish}
                  disabled={publishing}
                >
                  {publishing ? 'Publishing…' : '📢 Publish & Notify'}
                </button>
              )}
              {publishMsg && (
                <div className={`publish-msg publish-msg-${publishMsg.type}`}>{publishMsg.text}</div>
              )}
              <Link to={`/incidents/${incident.id}/edit`} className="btn btn-primary action-btn">
                &#9998;&nbsp; Edit Incident
              </Link>
              {role === 'admin' && (
                <>
                  <button className="btn btn-danger action-btn" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Deleting…' : confirmDelete ? 'Confirm Delete' : '🗑 Delete'}
                  </button>
                  {confirmDelete && !deleting && (
                    <button className="btn btn-secondary action-btn" onClick={() => setConfirm(false)}>Cancel</button>
                  )}
                </>
              )}
            </div>
            {confirmDelete && <p className="delete-warning">This action cannot be undone.</p>}
          </div>

          <Link to="/incidents" className="btn btn-secondary action-btn">&#8592;&nbsp; Back to List</Link>
        </div>
      </div>
    </div>
  );
}
