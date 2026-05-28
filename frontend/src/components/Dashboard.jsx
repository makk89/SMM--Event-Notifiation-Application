import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchIncidents } from '../api/incidents.js';
import './Dashboard.css';

const STATUSES = ['Open','Pending OM Notification','Closed'];
const FLEETS   = ['Fleet 1','Fleet 2','Fleet 3','Fleet 4','Fleet 5'];
const INCIDENT_TYPES = [
  'Grounding','Collision','Fire / Explosion','Crew Injury','Cargo Damage',
  'Pollution / Spill','Loss of Power / Blackout','Near Miss','Security Incident',
  'Weather Damage','Navigation Incident','Machinery / Equipment Failure','Environmental / Inspection','Alcohol Violation','Other',
];

const STATUS_COLORS = {
  'Open':'#f59e0b','Pending OM Notification':'#ef4444','Closed':'#003366',
};
const CAT_COLORS = {
  'Grounding':'#dc2626','Collision':'#7c3aed','Fire / Explosion':'#ea580c',
  'Crew Injury':'#0891b2','Cargo Damage':'#16a34a','Pollution / Spill':'#2563eb',
  'Loss of Power / Blackout':'#9333ea','Near Miss':'#ca8a04','Security Incident':'#be185d',
  'Weather Damage':'#0369a1','Navigation Incident':'#15803d','Machinery / Equipment Failure':'#b45309',
  'Environmental / Inspection':'#065f46','Alcohol Violation':'#7e22ce','Other':'#6b7280',
};

function statusBadgeClass(s) {
  if (s === 'Closed') return 'closed';
  if (s === 'Pending OM Notification') return 'pending-om';
  return 'open';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
}

/* SVG donut chart — matches ship-incidents.html exactly */
function DonutChart({ data }) {
  const cx=70, cy=70, r=50, r2=28;
  const total = data.reduce((s,x)=>s+x.count,0) || 1;
  let angle = -Math.PI/2;
  const paths = [];

  data.forEach(({status, count}) => {
    if (!count) return;
    const a  = (count/total)*Math.PI*2;
    const x1 = cx+r*Math.cos(angle),   y1 = cy+r*Math.sin(angle);
    const x2 = cx+r*Math.cos(angle+a), y2 = cy+r*Math.sin(angle+a);
    const ix1= cx+r2*Math.cos(angle),  iy1= cy+r2*Math.sin(angle);
    const ix2= cx+r2*Math.cos(angle+a),iy2= cy+r2*Math.sin(angle+a);
    const lg = a>Math.PI?1:0;
    const col= STATUS_COLORS[status]||'#6b7280';
    paths.push(
      <path key={status}
        d={`M${ix1},${iy1} L${x1},${y1} A${r},${r} 0 ${lg},1 ${x2},${y2} L${ix2},${iy2} A${r2},${r2} 0 ${lg},0 ${ix1},${iy1}`}
        fill={col} opacity=".9" />
    );
    angle += a;
  });

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="donut-svg">
      {paths}
      <circle cx={cx} cy={cy} r={r2-2} fill="white"/>
      <text x={cx} y={cy+5} textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--navy)">{total}</text>
    </svg>
  );
}

export default function Dashboard() {
  const [allIncidents, setAll] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState(null);
  const [fStatus, setFStatus]  = useState('');
  const [fDays,   setFDays]    = useState('90');
  const [fFleet,  setFFleet]   = useState('');
  const [fRisk,   setFRisk]    = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchIncidents()
      .then(setAll)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const data = useMemo(() => {
    const now = new Date();
    return allIncidents.filter(r => {
      if (fStatus === 'Open'   && r.status === 'Closed') return false;
      if (fStatus === 'Closed' && r.status !== 'Closed') return false;
      if (fDays && fDays !== '0') {
        const d = new Date(r.date_of_reporting||r.created_at||0);
        if ((now-d)/86400000 > Number(fDays)) return false;
      }
      if (fFleet && r.fleet !== fFleet) return false;
      if (fRisk  && r.incident_type !== fRisk) return false;
      return true;
    });
  }, [allIncidents, fStatus, fDays, fFleet, fRisk]);

  const total    = allIncidents.length;
  const open     = allIncidents.filter(r=>r.status==='Open').length;
  const closed   = allIncidents.filter(r=>r.status==='Closed').length;
  const oilPend  = allIncidents.filter(r=>r.status==='Pending OM Notification').length;
  const submitted= oilPend;

  const catCount = INCIDENT_TYPES.reduce((acc,t)=>({...acc,[t]:0}),{});
  data.forEach(r=>{ if(catCount[r.incident_type]!==undefined) catCount[r.incident_type]++; else catCount['Other']=(catCount['Other']||0)+1; });
  const maxCat      = Math.max(...Object.values(catCount),1);
  const scaledCat   = Math.max(10, Math.ceil(maxCat/10)*10);
  const ticksCat    = scaledCat===10 ? [2,4,6,8,10] : Array.from({length:scaledCat/10},(_,i)=>(i+1)*10);

  const statusCount = STATUSES.map(s=>({status:s, count:data.filter(r=>r.status===s).length}));

  const fleetCount  = FLEETS.map(f=>({fleet:f, count:data.filter(r=>r.fleet===f).length}));
  const maxFleet    = Math.max(...fleetCount.map(x=>x.count),1);
  const scaledFleet = Math.max(10, Math.ceil(maxFleet/10)*10);
  const ticksFleet  = scaledFleet===10 ? [2,4,6,8,10] : Array.from({length:scaledFleet/10},(_,i)=>(i+1)*10);

  const yearMap = {};
  data.forEach(r => {
    const yr = r.date_of_event ? r.date_of_event.slice(0,4) : 'Unknown';
    yearMap[yr] = (yearMap[yr] || 0) + 1;
  });
  const yearCount  = Object.entries(yearMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([year,count])=>({year,count}));
  const maxYear    = Math.max(...yearCount.map(x=>x.count),1);
  const scaledYear = Math.max(10, Math.ceil(maxYear/10)*10);
  const ticksYear  = scaledYear===10 ? [2,4,6,8,10] : Array.from({length:scaledYear/10},(_,i)=>(i+1)*10);

  const recent = [...data].sort((a,b)=>(b.date_of_reporting||'').localeCompare(a.date_of_reporting||'')).slice(0,6);

  const daysLabel = {90:'Last 90 Days',30:'Last 30 Days',180:'Last 180 Days',365:'Last 1 Year',0:'All Time'}[fDays]||'Last 90 Days';
  const subtitle  = `All Incidents · ${fFleet||'All Fleets'} · ${daysLabel} · ${fRisk||'All Risk Types'}`;

  if (loading) return <div className="loading-state"><div className="spinner"/><span>Loading dashboard…</span></div>;
  if (error)   return <div className="error-state"><span className="error-icon">⚠</span><span>{error}</span></div>;

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dash-hdr">
        <h2 className="page-title">Dashboard</h2>
        <div className="dash-subtitle">{subtitle}</div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-btn">
          <span className="fi-icon">⊕</span>
          <select value={fStatus} onChange={e=>setFStatus(e.target.value)}>
            <option value="">All</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
        <div className="filter-btn">
          <span className="fi-icon">🕐</span>
          <select value={fDays} onChange={e=>setFDays(e.target.value)}>
            <option value="90">90 Days</option>
            <option value="30">30 Days</option>
            <option value="180">180 Days</option>
            <option value="365">1 Year</option>
            <option value="0">All Time</option>
          </select>
        </div>
        <div className="filter-btn">
          <span className="fi-icon">⚓</span>
          <select value={fFleet} onChange={e=>setFFleet(e.target.value)}>
            <option value="">All Fleets</option>
            {FLEETS.map(f=><option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="filter-btn">
          <span className="fi-icon">⚠</span>
          <select value={fRisk} onChange={e=>setFRisk(e.target.value)}>
            <option value="">All Risk</option>
            {INCIDENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-row">
        <div className="stat stat-link" onClick={()=>navigate('/incidents')} title="View all incidents">
          <div className="stat-label">Total</div><div className="stat-val">{total}</div><div className="stat-sub">incidents</div>
        </div>
        <div className="stat amber stat-link" onClick={()=>navigate('/incidents?status=Open')} title="View open incidents">
          <div className="stat-label">Open</div><div className="stat-val">{open}</div><div className="stat-sub">active</div>
        </div>
        <div className="stat red stat-link" onClick={()=>navigate('/incidents?status=Pending+OM+Notification')} title="View pending OM notification">
          <div className="stat-label">Pending OM</div><div className="stat-val">{oilPend}</div><div className="stat-sub">notification</div>
        </div>
        <div className="stat green stat-link" onClick={()=>navigate('/incidents?status=Closed')} title="View closed incidents">
          <div className="stat-label">Closed</div><div className="stat-val">{closed}</div><div className="stat-sub">resolved</div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="charts-grid">

        {/* Incidents by Category — full width bar chart */}
        <div className="card chart-full">
          <div className="card-title">⊕ Incidents by Category</div>
          <div className="bar-scale-row">
            <div className="bar-lbl" />
            <div className="bar-scale-track">
              {ticksCat.map(t=><span key={t} className="bar-scale-tick" style={{left:`${(t/scaledCat)*100}%`}}>{t}</span>)}
            </div>
            <div className="bar-cnt" />
          </div>
          <div className="bar-group">
            {INCIDENT_TYPES.map(t=>{
              const v = catCount[t]||0;
              const col = CAT_COLORS[t]||'#6b7280';
              return (
                <div className="bar-row chart-clickable" key={t}
                  onClick={()=>v>0&&navigate(`/incidents?incident_type=${encodeURIComponent(t)}`)}
                  style={{cursor:v>0?'pointer':'default'}}>
                  <div className="bar-lbl">{t}</div>
                  <div className="bar-track bar-track-grid" style={{'--grid-step':`${100/ticksCat.length}%`}}>
                    <div className="bar-fill" style={{width:`${(v/scaledCat)*100}%`,background:col}}/>
                  </div>
                  <div className="bar-cnt">{v}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Incidents by Status — donut */}
        <div className="card">
          <div className="card-title">● Incidents by Status</div>
          <div className="donut-wrap">
            <DonutChart data={statusCount}/>
            <div className="donut-legend">
              {statusCount.map(({status,count})=>(
                <div className="legend-item chart-clickable" key={status}
                  onClick={()=>count>0&&navigate(`/incidents?status=${encodeURIComponent(status)}`)}
                  style={{cursor:count>0?'pointer':'default'}}>
                  <div className="legend-dot" style={{background:STATUS_COLORS[status]}}/>
                  <span>{status}</span>
                  <span className="legend-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Incidents by Fleet — bar chart */}
        <div className="card">
          <div className="card-title">⚓ Incidents by Fleet</div>
          <div className="bar-scale-row">
            <div className="bar-lbl short" />
            <div className="bar-scale-track">
              {ticksFleet.map(t=><span key={t} className="bar-scale-tick" style={{left:`${(t/scaledFleet)*100}%`}}>{t}</span>)}
            </div>
            <div className="bar-cnt" />
          </div>
          <div className="bar-group">
            {fleetCount.map(({fleet,count})=>(
              <div className="bar-row chart-clickable" key={fleet}
                onClick={()=>count>0&&navigate(`/incidents?fleet=${encodeURIComponent(fleet)}`)}
                style={{cursor:count>0?'pointer':'default'}}>
                <div className="bar-lbl short">{fleet}</div>
                <div className="bar-track bar-track-grid" style={{'--grid-step':`${100/ticksFleet.length}%`}}>
                  <div className="bar-fill" style={{width:`${(count/scaledFleet)*100}%`,background:'var(--gold)'}}/>
                </div>
                <div className="bar-cnt">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Incidents per Year — bar chart */}
        <div className="card">
          <div className="card-title">📅 Incidents per Year</div>
          {yearCount.length === 0 ? (
            <div className="empty-chart">No data for selected filters.</div>
          ) : (
            <>
              <div className="bar-scale-row">
                <div className="bar-lbl short" />
                <div className="bar-scale-track">
                  {ticksYear.map(t=><span key={t} className="bar-scale-tick" style={{left:`${(t/scaledYear)*100}%`}}>{t}</span>)}
                </div>
                <div className="bar-cnt" />
              </div>
              <div className="bar-group">
                {yearCount.map(({year,count})=>(
                  <div className="bar-row chart-clickable" key={year}
                    onClick={()=>navigate(`/incidents?date_from=${year}-01-01&date_to=${year}-12-31`)}
                    style={{cursor:'pointer'}}>
                    <div className="bar-lbl short">{year}</div>
                    <div className="bar-track bar-track-grid" style={{'--grid-step':`${100/ticksYear.length}%`}}>
                      <div className="bar-fill" style={{width:`${(count/scaledYear)*100}%`,background:'#0891b2'}}/>
                    </div>
                    <div className="bar-cnt">{count}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
