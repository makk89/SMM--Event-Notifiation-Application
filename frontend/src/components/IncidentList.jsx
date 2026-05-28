import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { fetchIncidents, exportIncidentsUrl, importIncidents, templateUrl, deleteIncident } from '../api/incidents.js';
import './IncidentList.css';

const INCIDENT_TYPES = [
  'Grounding', 'Collision', 'Fire / Explosion', 'Crew Injury', 'Cargo Damage',
  'Pollution / Spill', 'Loss of Power / Blackout', 'Near Miss', 'Security Incident',
  'Weather Damage', 'Navigation Incident', 'Machinery / Equipment Failure',
  'Environmental / Inspection', 'Alcohol Violation', 'Other',
];

const STATUSES = ['Open', 'Pending OM Notification', 'Closed'];

const FLEETS = ['Fleet 1', 'Fleet 2', 'Fleet 3', 'Fleet 4', 'Fleet 5'];

const PAGE_SIZE = 15;

function statusBadgeClass(s) {
  if (s === 'Closed') return 'closed';
  if (s === 'Pending OM Notification') return 'pending-om';
  return 'open';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const EMPTY_FILTERS = { search: '', status: '', incident_type: '', fleet: '', date_from: '', date_to: '', oil_pending: '' };

export default function IncidentList({ role }) {
  const location = useLocation();

  const initialFilters = useMemo(() => {
    const p = new URLSearchParams(location.search);
    return {
      ...EMPTY_FILTERS,
      status:        p.get('status')        || '',
      oil_pending:   p.get('oil_pending')   || '',
      incident_type: p.get('incident_type') || '',
      fleet:         p.get('fleet')         || '',
      date_from:     p.get('date_from')     || '',
      date_to:       p.get('date_to')       || '',
    };
  }, []); // only on first mount

  const [incidents, setIncidents] = useState([]);
  const [filters, setFilters]     = useState(initialFilters);
  const [applied, setApplied]     = useState(initialFilters);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [page, setPage]           = useState(1);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const load = useCallback((f) => {
    setLoading(true);
    setError(null);
    fetchIncidents(f)
      .then(data => { setIncidents(data); setPage(1); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(applied); }, [applied, load]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  }
  function handleApply(e) { e.preventDefault(); setApplied(filters); }
  function handleReset() { setFilters(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); }

  function handleExport() {
    const url = exportIncidentsUrl(applied);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = '';
    a.click();
  }

  function handleTemplate() {
    const a = document.createElement('a');
    a.href = templateUrl();
    a.download = '';
    a.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportMsg(null);
    setImporting(true);
    try {
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { cellDates: true, raw: false });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      // Skip guide rows (rows 2-3 in the template) — keep only rows after header
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const data = rows.filter(r => {
        const v = r['Vessel Name'] || r['Vessel Name *'] || r.vessel_name || '';
        return v && !v.toString().startsWith('[');
      });
      if (data.length === 0) throw new Error('No data rows found. Make sure to use the provided template and delete the guide/example rows.');
      // Normalise starred header names from template
      const normalised = data.map(r => {
        const n = {};
        Object.entries(r).forEach(([k, v]) => { n[k.replace(' *', '')] = v; });
        return n;
      });
      const result = await importIncidents(normalised);
      setImportMsg({
        type: 'success',
        text: `Imported ${result.created} incident${result.created !== 1 ? 's' : ''}${result.skipped ? ` · ${result.skipped} skipped (missing required fields)` : ''}.`,
      });
      load(applied);
    } catch (err) {
      setImportMsg({ type: 'error', text: err.message });
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(e, incId) {
    e.stopPropagation();
    if (!confirm('Delete this incident? This cannot be undone.')) return;
    try {
      await deleteIncident(incId);
      load(applied);
    } catch (err) {
      setError(err.message);
    }
  }

  const totalPages = Math.max(1, Math.ceil(incidents.length / PAGE_SIZE));
  const paged      = incidents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="incident-list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Incident History</h1>
          <p className="page-subtitle">{incidents.length} incident{incidents.length !== 1 ? 's' : ''} found</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleTemplate} title="Download blank import template (.xlsx)">
            📋 Template
          </button>
          <button className="btn btn-secondary" onClick={handleExport} title="Download visible incidents as Excel">
            ⬇ Export Excel
          </button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={importing} title="Import incidents from Excel file">
            {importing ? 'Importing…' : '⬆ Import Excel'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <Link to="/incidents/new" className="btn btn-primary">+ Report Incident</Link>
        </div>
      </div>
      {importMsg && (
        <div className={`import-msg import-msg-${importMsg.type}`}>
          {importMsg.text}
          <button className="import-msg-close" onClick={() => setImportMsg(null)}>&#10005;</button>
        </div>
      )}

      {/* Filters */}
      <div className="card filter-card">
        <form className="filter-form" onSubmit={handleApply}>
          <div className="filter-row">
            <div className="filter-field filter-search">
              <label>Search</label>
              <input type="text" name="search" value={filters.search} onChange={handleChange}
                placeholder="Vessel, location, charterer, type…" />
            </div>
            <div className="filter-field">
              <label>Status</label>
              <select name="status" value={filters.status} onChange={handleChange}>
                <option value="">All</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="filter-field">
              <label>Type</label>
              <select name="incident_type" value={filters.incident_type} onChange={handleChange}>
                <option value="">All</option>
                {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="filter-field">
              <label>Fleet</label>
              <select name="fleet" value={filters.fleet} onChange={handleChange}>
                <option value="">All Fleets</option>
                {FLEETS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="filter-field">
              <label>Event Date From</label>
              <input type="date" name="date_from" value={filters.date_from} onChange={handleChange} />
            </div>
            <div className="filter-field">
              <label>Event Date To</label>
              <input type="date" name="date_to" value={filters.date_to} onChange={handleChange} />
            </div>
          </div>
          <div className="filter-actions">
            <button type="submit" className="btn btn-primary">Apply</button>
            <button type="button" className="btn btn-secondary" onClick={handleReset}>Reset</button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card table-card">
        {loading ? (
          <div className="loading-state"><div className="spinner" /><span>Loading incidents…</span></div>
        ) : error ? (
          <div className="error-state"><span className="error-icon">&#9888;</span><span>{error}</span></div>
        ) : incidents.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '2rem' }}>&#128196;</span>
            <span>No incidents match your filters.</span>
            <button className="btn btn-secondary" onClick={handleReset}>Clear filters</button>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="incidents-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Vessel</th>
                    <th>Event Date</th>
                    <th>Report Date</th>
                    <th>Δ Days</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Fleet</th>
                    <th>Charterer</th>
                    <th>Oil Majors Informed</th>
                    <th>Status</th>
                    <th>Reported in Docmap</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((inc, idx) => (
                    <tr key={inc.id} className="clickable-row" onClick={() => navigate(`/incidents/${inc.id}`)}>
                      <td className="id-cell">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="vessel-cell">{inc.vessel_name}</td>
                      <td className="nowrap">{formatDate(inc.date_of_event)}</td>
                      <td className="nowrap">{formatDate(inc.date_of_reporting)}</td>
                      <td className="diff-cell">{inc.days_diff != null ? inc.days_diff : '—'}</td>
                      <td className="type-cell">{inc.incident_type}</td>
                      <td className="location-cell">{inc.location}</td>
                      <td className="nowrap">{inc.fleet || '—'}</td>
                      <td>{inc.charterer || '—'}</td>
                      <td className="om-cell">
                        {inc.oil_informed === 'Yes'
                          ? <span className="om-yes" title={inc.oil_which || 'Yes'}>{inc.oil_which || 'Yes'}</span>
                          : <span className="om-no">{inc.oil_informed === 'No' ? 'No' : '—'}</span>}
                      </td>
                      <td>
                        <span className={`badge badge-${statusBadgeClass(inc.status)}`}>{inc.status}</span>
                      </td>
                      <td className="nowrap">{inc.docmap_reported || '—'}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <Link to={`/incidents/${inc.id}`} className="btn btn-secondary btn-sm">View</Link>
                        {role === 'admin' && (
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ marginLeft: '6px' }}
                            onClick={e => handleDelete(e, inc.id)}
                            title="Delete incident"
                          >🗑</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <span className="page-info">
                  Page {page} of {totalPages} &nbsp;&middot;&nbsp; {incidents.length} total
                </span>
                <div className="page-btns">
                  <button className="btn btn-secondary btn-sm" disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}>&#8592; Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                      acc.push(p); return acc;
                    }, [])
                    .map((p, i) =>
                      p === '…'
                        ? <span key={`d${i}`} className="page-dot">…</span>
                        : <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setPage(p)}>{p}</button>
                    )}
                  <button className="btn btn-secondary btn-sm" disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}>Next &#8594;</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
