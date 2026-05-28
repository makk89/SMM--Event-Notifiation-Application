import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchIncident, createIncident, updateIncident } from '../api/incidents.js';
import Attachments from './Attachments.jsx';
import './IncidentForm.css';

const INCIDENT_TYPES = [
  'Grounding', 'Collision', 'Fire / Explosion', 'Crew Injury', 'Cargo Damage',
  'Pollution / Spill', 'Loss of Power / Blackout', 'Near Miss', 'Security Incident',
  'Weather Damage', 'Navigation Incident', 'Machinery / Equipment Failure',
  'Environmental / Inspection', 'Alcohol Violation', 'Other',
];

const STATUSES = ['Open', 'Pending OM Notification', 'Closed'];

const FLEETS = ['Fleet 1', 'Fleet 2', 'Fleet 3', 'Fleet 4', 'Fleet 5'];

const EMPTY_FORM = {
  vessel_name: '', date_of_event: '', date_of_reporting: '', incident_type: '',
  location: '', charterer: '', cargo: '', last_port: '', next_port: '',
  nature: '', action_plan: '', oil_informed: '', oil_which: '',
  follow_up: '', status: 'Open', fleet: '', remarks: '',
  machinery_name: '', machinery_failure_type: '', machinery_failure_desc: '', machinery_repair_status: '',
  docmap_reported: '',
};

function calcDiff(eventDate, reportDate) {
  if (!eventDate || !reportDate) return '';
  const diff = Math.round((new Date(reportDate) - new Date(eventDate)) / 86400000);
  if (diff < 0) return '';
  return diff === 0 ? 'Same day' : `${diff} day${diff === 1 ? '' : 's'}`;
}

export default function IncidentForm({ role }) {
  const { id }    = useParams();
  const isEdit    = Boolean(id);
  const navigate  = useNavigate();

  const [form, setForm]       = useState({ ...EMPTY_FORM, date_of_reporting: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const [errors, setErrors]   = useState({});

  const isVetting = role === 'vetting';
  const oilLocked = !isVetting;

  useEffect(() => {
    if (!isEdit) return;
    fetchIncident(id)
      .then(inc => setForm({
        vessel_name:       inc.vessel_name       || '',
        date_of_event:     inc.date_of_event     || '',
        date_of_reporting: inc.date_of_reporting || '',
        incident_type:     inc.incident_type     || '',
        location:          inc.location          || '',
        charterer:         inc.charterer         || '',
        cargo:             inc.cargo             || '',
        last_port:         inc.last_port         || '',
        next_port:         inc.next_port         || '',
        nature:            inc.nature            || '',
        action_plan:       inc.action_plan       || '',
        oil_informed:      inc.oil_informed      || '',
        oil_which:         inc.oil_which         || '',
        follow_up:         inc.follow_up         || '',
        status:                 inc.status                 || 'Open',
        fleet:                  inc.fleet                  || '',
        remarks:                inc.remarks                || '',
        machinery_name:         inc.machinery_name         || '',
        machinery_failure_type: inc.machinery_failure_type || '',
        machinery_failure_desc: inc.machinery_failure_desc || '',
        machinery_repair_status:inc.machinery_repair_status|| '',
        docmap_reported:        inc.docmap_reported        || '',
      }))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function validate() {
    const e = {};
    if (!form.vessel_name.trim())    e.vessel_name      = 'Required';
    if (!form.date_of_event)         e.date_of_event    = 'Required';
    if (!form.date_of_reporting)     e.date_of_reporting = 'Required';
    if (!form.incident_type)         e.incident_type    = 'Required';
    if (!form.location.trim())       e.location         = 'Required';
    if (!form.nature.trim())         e.nature           = 'Required';
    if (!form.action_plan.trim())    e.action_plan      = 'Required';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    setError(null);
    try {
      const saved = isEdit
        ? await updateIncident(id, form)
        : await createIncident(form);
      navigate(`/incidents/${saved.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const daysDiff = calcDiff(form.date_of_event, form.date_of_reporting);

  if (loading) return (
    <div className="loading-state"><div className="spinner" /><span>Loading incident…</span></div>
  );

  return (
    <div className="incident-form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Incident' : 'Report New Incident'}</h1>
          <p className="page-subtitle">
            {isEdit ? `Editing record #${id}` : 'Submit a new shipping incident report'}
          </p>
        </div>
        <Link to={isEdit ? `/incidents/${id}` : '/incidents'} className="btn btn-secondary">
          &#8592; Cancel
        </Link>
      </div>

      {error && <div className="form-error-banner">&#9888;&nbsp;{error}</div>}

      <form className="incident-form" onSubmit={handleSubmit} noValidate>

        {/* ── Section 1–12: Initial Notification ── */}
        <div className="form-section">
          <div className="form-section-hdr">
            Initial Notification
            <span className="sec-badge">Cols 1–12 · Vessel / Fleet Team</span>
          </div>
          <div className="form-section-body">
            <div className="form-grid">

              <div className={`fg${errors.vessel_name ? ' has-error' : ''}`}>
                <label><span className="col-ref">1.</span> Vessel Name <span className="req">*</span></label>
                <input name="vessel_name" type="text" value={form.vessel_name} onChange={handleChange} placeholder="e.g. STI Aqua" />
                {errors.vessel_name && <span className="field-error">{errors.vessel_name}</span>}
              </div>

              <div className={`fg${errors.date_of_event ? ' has-error' : ''}`}>
                <label><span className="col-ref">2.</span> Date of Event <span className="req">*</span></label>
                <input name="date_of_event" type="date" value={form.date_of_event} onChange={handleChange} />
                {errors.date_of_event && <span className="field-error">{errors.date_of_event}</span>}
              </div>

              <div className={`fg${errors.date_of_reporting ? ' has-error' : ''}`}>
                <label><span className="col-ref">3.</span> Date of Reporting <span className="req">*</span></label>
                <input name="date_of_reporting" type="date" value={form.date_of_reporting} onChange={handleChange} />
                {errors.date_of_reporting && <span className="field-error">{errors.date_of_reporting}</span>}
              </div>

              <div className="fg">
                <label><span className="col-ref">4.</span> Days Difference (auto)</label>
                <input type="text" value={daysDiff} readOnly className="readonly-field" placeholder="—" />
              </div>

              <div className={`fg${errors.incident_type ? ' has-error' : ''}`}>
                <label><span className="col-ref">5.</span> Type of Incident <span className="req">*</span></label>
                <select name="incident_type" value={form.incident_type} onChange={handleChange}>
                  <option value="">Select…</option>
                  {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.incident_type && <span className="field-error">{errors.incident_type}</span>}
              </div>

              {form.incident_type === 'Machinery / Equipment Failure' && (
                <div className="fg fg-full machinery-panel">
                  <div className="machinery-panel-title">Machinery / Equipment Details</div>
                  <div className="form-grid machinery-grid">
                    <div className="fg">
                      <label>Machinery / Equipment Name</label>
                      <input name="machinery_name" type="text" value={form.machinery_name} onChange={handleChange}
                        placeholder="e.g. Main Engine, Aux Generator, Steering Gear…" />
                    </div>
                    <div className="fg">
                      <label>Type of Failure</label>
                      <select name="machinery_failure_type" value={form.machinery_failure_type} onChange={handleChange}>
                        <option value="">Select…</option>
                        <option>Mechanical</option>
                        <option>Electrical</option>
                        <option>Hydraulic</option>
                        <option>Pneumatic</option>
                        <option>Structural</option>
                        <option>Software / Control System</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="fg">
                      <label>Repair Status</label>
                      <select name="machinery_repair_status" value={form.machinery_repair_status} onChange={handleChange}>
                        <option value="">Select…</option>
                        <option>Under Investigation</option>
                        <option>Temporary Repair</option>
                        <option>Permanent Repair</option>
                        <option>Deferred to Next Port</option>
                        <option>Completed</option>
                      </select>
                    </div>
                    <div className="fg fg-full">
                      <label>Failure Description</label>
                      <textarea name="machinery_failure_desc" value={form.machinery_failure_desc} onChange={handleChange}
                        rows={3} placeholder="Describe the nature of the machinery/equipment failure…" />
                    </div>
                  </div>
                  {isEdit && <Attachments incidentId={id} section="machinery" label="Machinery Attachments" />}
                </div>
              )}

              <div className={`fg${errors.location ? ' has-error' : ''}`}>
                <label><span className="col-ref">6.</span> Present Location <span className="req">*</span></label>
                <input name="location" type="text" value={form.location} onChange={handleChange} placeholder="e.g. Cristobal, Panama" />
                {errors.location && <span className="field-error">{errors.location}</span>}
              </div>

              <div className="fg">
                <label><span className="col-ref">7.</span> Charterer</label>
                <input name="charterer" type="text" value={form.charterer} onChange={handleChange} placeholder="e.g. Chevron / NA" />
              </div>

              <div className="fg">
                <label><span className="col-ref">8.</span> Cargo Onboard</label>
                <input name="cargo" type="text" value={form.cargo} onChange={handleChange} placeholder="e.g. Gasoil / Ballast" />
              </div>

              <div className="fg">
                <label><span className="col-ref">9.</span> Last Port &amp; ETD</label>
                <input name="last_port" type="text" value={form.last_port} onChange={handleChange} placeholder="e.g. Yosu / 18 Feb 2026" />
              </div>

              <div className="fg">
                <label><span className="col-ref">10.</span> Next Port &amp; ETA</label>
                <input name="next_port" type="text" value={form.next_port} onChange={handleChange} placeholder="e.g. Botany Bay / 04 Mar 2026" />
              </div>

              <div className="fg">
                <label><span className="col-ref">F.</span> Fleet</label>
                <select name="fleet" value={form.fleet} onChange={handleChange}>
                  <option value="">Select…</option>
                  {FLEETS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div className="fg fg-full">
                <label><span className="col-ref">11.</span> Nature of Event <span className="req">*</span></label>
                <textarea name="nature" value={form.nature} onChange={handleChange} rows={4} placeholder="Describe what happened…" />
                {errors.nature && <span className="field-error">{errors.nature}</span>}
              </div>

              <div className="fg fg-full">
                <label><span className="col-ref">12.</span> Action Plan <span className="req">*</span></label>
                <textarea name="action_plan" value={form.action_plan} onChange={handleChange} rows={4} placeholder="Steps taken or planned…" />
                {errors.action_plan && <span className="field-error">{errors.action_plan}</span>}
              </div>

            </div>
            {isEdit && <Attachments incidentId={id} section="initial" label="Initial Notification Attachments" />}
          </div>
        </div>

        {/* ── Section 13–14: Oil Major Notification ── */}
        <div className="form-section">
          <div className="form-section-hdr">
            Oil Major Notification
            <span className="sec-badge">Cols 13–14 · Vetting Superintendent</span>
          </div>
          <div className="form-section-body">
            {oilLocked && (
              <div className="lock-note">
                &#9888; These fields are filled by the Vetting Superintendent after initial notification.
              </div>
            )}
            <div className="form-grid">
              <div className="fg">
                <label><span className="col-ref">13.</span> Oil Major Informed?</label>
                <select name="oil_informed" value={form.oil_informed} onChange={handleChange} disabled={oilLocked}>
                  <option value="">Select…</option>
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>
              <div className="fg fg-half">
                <label><span className="col-ref">14.</span> Which Oil Majors</label>
                <input name="oil_which" type="text" value={form.oil_which} onChange={handleChange}
                  placeholder="e.g. Chevron, Ampol, BP" disabled={oilLocked} />
              </div>
            </div>
            {isEdit && <Attachments incidentId={id} section="oil_major" label="Oil Major Attachments" />}
          </div>
        </div>

        {/* ── Section 15–16: Follow Up & Status ── */}
        <div className="form-section">
          <div className="form-section-hdr">
            Follow Up &amp; Status
            <span className="sec-badge">Cols 15–16 · All Users</span>
          </div>
          <div className="form-section-body">
            <div className="form-grid">
              <div className="fg fg-full">
                <label><span className="col-ref">15.</span> Follow Up Messages</label>
                <textarea name="follow_up" value={form.follow_up} onChange={handleChange} rows={3}
                  placeholder="Follow-up details, updates, responses…" />
              </div>
              <div className="fg">
                <label><span className="col-ref">16.</span> Status</label>
                <select name="status" value={form.status} onChange={handleChange}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="fg">
                <label>Report Made in Docmap</label>
                <select name="docmap_reported" value={form.docmap_reported} onChange={handleChange}>
                  <option value="">Select…</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>
            {isEdit && <Attachments incidentId={id} section="follow_up" label="Follow Up Attachments" />}
          </div>
        </div>

        {/* ── Remarks ── */}
        <div className="form-section">
          <div className="form-section-hdr">
            Remarks
            <span className="sec-badge">All Users · Optional</span>
          </div>
          <div className="form-section-body">
            <div className="form-grid">
              <div className="fg fg-full">
                <label>Free-text Remarks</label>
                <textarea name="remarks" value={form.remarks} onChange={handleChange} rows={3}
                  placeholder="Any additional notes, observations or context…" />
              </div>
            </div>
            {isEdit && <Attachments incidentId={id} section="remarks" label="Remarks Attachments" />}
          </div>
        </div>

        {!isEdit && (
          <div className="attach-new-note">
            📎 You can add attachments after saving the incident.
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Submit Report'}
          </button>
          <Link to={isEdit ? `/incidents/${id}` : '/incidents'} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
