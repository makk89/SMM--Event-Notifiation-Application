const express  = require('express');
const router   = express.Router();
const ExcelJS  = require('exceljs');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { load, save } = require('../db/database');
const { notify }     = require('../notifications');

const ATTACH_DIR = path.join(__dirname, '../../data/attachments');
fs.mkdirSync(ATTACH_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(ATTACH_DIR, req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

function now() { return new Date().toISOString(); }

function calcDaysDiff(eventDate, reportDate) {
  if (!eventDate || !reportDate) return null;
  const diff = Math.round((new Date(reportDate) - new Date(eventDate)) / 86400000);
  return diff >= 0 ? diff : null;
}

function applyFilters(incidents, query) {
  let list = [...incidents];
  const { search, status, incident_type, fleet, date_from, date_to } = query;

  if (search) {
    const t = search.toLowerCase();
    list = list.filter(i =>
      (i.vessel_name    || '').toLowerCase().includes(t) ||
      (i.location       || '').toLowerCase().includes(t) ||
      (i.charterer      || '').toLowerCase().includes(t) ||
      (i.nature         || '').toLowerCase().includes(t) ||
      (i.incident_type  || '').toLowerCase().includes(t)
    );
  }
  if (status === 'Open')  list = list.filter(i => i.status !== 'Closed');
  else if (status)        list = list.filter(i => i.status === status);
  if (query.oil_pending === '1') list = list.filter(i => i.oil_informed !== 'Yes' && i.status !== 'Closed');
  if (incident_type) list = list.filter(i => i.incident_type === incident_type);
  if (fleet)         list = list.filter(i => i.fleet === fleet);
  if (date_from)     list = list.filter(i => i.date_of_event >= date_from);
  if (date_to)       list = list.filter(i => i.date_of_event <= date_to);

  return list.sort((a, b) =>
    (b.date_of_reporting || '').localeCompare(a.date_of_reporting || '') || b.id - a.id
  );
}

// ── Excel helpers ──────────────────────────────────────────────────────────────
const NAVY   = '003366';
const WHITE  = 'FFFFFFFF';
const AMBER  = 'FFF59E0B';
const LGRAY  = 'FFF1F5F9';
const LBLUE  = 'FFE0F2FE';
const LRED   = 'FFFEE2E2';

const INCIDENT_TYPES = [
  'Grounding','Collision','Fire / Explosion','Crew Injury','Cargo Damage',
  'Pollution / Spill','Loss of Power / Blackout','Near Miss','Security Incident',
  'Weather Damage','Navigation Incident','Machinery / Equipment Failure',
  'Environmental / Inspection','Alcohol Violation','Other',
];

function styleHeader(row) {
  row.eachCell(cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + NAVY } };
    cell.font   = { bold: true, color: { argb: WHITE }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
  });
  row.height = 28;
}

function styleGuide(row) {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LGRAY } };
    cell.font = { italic: true, color: { argb: 'FF6B7280' }, size: 9 };
    cell.alignment = { wrapText: true, vertical: 'top' };
  });
  row.height = 48;
}

function styleExample(row) {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LBLUE } };
    cell.font = { color: { argb: 'FF0369A1' }, size: 10 };
    cell.alignment = { wrapText: true, vertical: 'top' };
  });
  row.height = 36;
}

function styleRequired(cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LRED } };
  cell.font = { bold: true, color: { argb: 'FF1F2937' }, size: 10 };
  cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
}

const EXPORT_COLS = [
  { header: 'ID',                  key: 'id',           width: 6  },
  { header: 'Vessel Name',         key: 'vessel_name',  width: 18 },
  { header: 'Date of Event',       key: 'date_of_event',width: 14 },
  { header: 'Date of Reporting',   key: 'date_of_reporting', width: 16 },
  { header: 'Days Diff',           key: 'days_diff',    width: 9  },
  { header: 'Type of Incident',    key: 'incident_type',width: 24 },
  { header: 'Present Location',    key: 'location',     width: 22 },
  { header: 'Fleet',               key: 'fleet',        width: 10 },
  { header: 'Charterer',           key: 'charterer',    width: 14 },
  { header: 'Cargo Onboard',       key: 'cargo',        width: 14 },
  { header: 'Last Port / ETD',     key: 'last_port',    width: 22 },
  { header: 'Next Port / ETA',     key: 'next_port',    width: 22 },
  { header: 'Nature of Event',     key: 'nature',       width: 36 },
  { header: 'Action Plan',         key: 'action_plan',  width: 36 },
  { header: 'Oil Major Informed',  key: 'oil_informed', width: 16 },
  { header: 'Which Oil Majors',    key: 'oil_which',    width: 20 },
  { header: 'Follow Up Messages',  key: 'follow_up',    width: 36 },
  { header: 'Remarks',             key: 'remarks',      width: 30 },
  { header: 'Status',              key: 'status',       width: 22 },
  { header: 'Created At',          key: 'created_at',   width: 18 },
];

const TEMPLATE_COLS = [
  { header: 'Vessel Name *',       key: 'vessel_name',  width: 18, req: true  },
  { header: 'Date of Event *',     key: 'date_of_event',width: 14, req: true  },
  { header: 'Date of Reporting *', key: 'date_of_reporting', width: 16, req: true },
  { header: 'Type of Incident *',  key: 'incident_type',width: 26, req: true  },
  { header: 'Present Location *',  key: 'location',     width: 22, req: true  },
  { header: 'Nature of Event *',   key: 'nature',       width: 36, req: true  },
  { header: 'Action Plan *',       key: 'action_plan',  width: 36, req: true  },
  { header: 'Fleet',               key: 'fleet',        width: 10, req: false },
  { header: 'Charterer',           key: 'charterer',    width: 14, req: false },
  { header: 'Cargo Onboard',       key: 'cargo',        width: 14, req: false },
  { header: 'Last Port / ETD',     key: 'last_port',    width: 22, req: false },
  { header: 'Next Port / ETA',     key: 'next_port',    width: 22, req: false },
  { header: 'Follow Up Messages',  key: 'follow_up',    width: 30, req: false },
  { header: 'Status',              key: 'status',       width: 22, req: false },
];

// ── GET /api/incidents/stats ───────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const { incidents } = load();

  const total     = incidents.length;
  const open      = incidents.filter(i => i.status !== 'Closed').length;
  const closed    = incidents.filter(i => i.status === 'Closed').length;
  const oilPend   = incidents.filter(i => i.oil_informed !== 'Yes' && i.status !== 'Closed').length;
  const submitted = incidents.filter(i => i.status === 'Submitted').length;

  const STATUSES = ['Open', 'Pending OM Notification', 'Closed'];
  const byStatus = STATUSES.map(s => ({
    status: s,
    count: incidents.filter(i => i.status === s).length,
  }));

  const FLEETS = ['Fleet 1', 'Fleet 2', 'Fleet 3', 'Fleet 4', 'Fleet 5'];
  const byFleet = FLEETS.map(f => ({
    fleet: f,
    count: incidents.filter(i => i.fleet === f).length,
  }));

  const typeMap = {};
  incidents.forEach(i => { typeMap[i.incident_type] = (typeMap[i.incident_type] || 0) + 1; });
  const byType = Object.entries(typeMap)
    .map(([incident_type, count]) => ({ incident_type, count }))
    .sort((a, b) => b.count - a.count);

  const recent = [...incidents]
    .sort((a, b) => (b.date_of_reporting || '').localeCompare(a.date_of_reporting || '') || b.id - a.id)
    .slice(0, 6);

  res.json({ total, open, closed, oilPend, submitted, byStatus, byFleet, byType, recent });
});

// ── GET /api/incidents/export ──────────────────────────────────────────────────
router.get('/export', async (req, res) => {
  const { incidents } = load();
  const filtered = applyFilters(incidents, req.query);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Scorpio Incidents';
  const ws = wb.addWorksheet('Incidents', { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = EXPORT_COLS;
  styleHeader(ws.getRow(1));

  filtered.forEach(inc => {
    const row = ws.addRow({
      id:            inc.id,
      vessel_name:   inc.vessel_name,
      date_of_event: inc.date_of_event,
      date_of_reporting: inc.date_of_reporting,
      days_diff:     inc.days_diff != null ? inc.days_diff : '',
      incident_type: inc.incident_type,
      location:      inc.location,
      fleet:         inc.fleet || '',
      charterer:     inc.charterer || '',
      cargo:         inc.cargo || '',
      last_port:     inc.last_port || '',
      next_port:     inc.next_port || '',
      nature:        inc.nature || '',
      action_plan:   inc.action_plan || '',
      oil_informed:  inc.oil_informed || '',
      oil_which:     inc.oil_which || '',
      follow_up:     inc.follow_up || '',
      remarks:       inc.remarks || '',
      status:        inc.status,
      created_at:    inc.created_at || '',
    });
    row.alignment = { wrapText: true, vertical: 'top' };
    row.height = 20;
  });

  // Alternating row fill
  ws.eachRow((row, rowNum) => {
    if (rowNum > 1 && rowNum % 2 === 0) {
      row.eachCell(cell => {
        if (!cell.fill || cell.fill.fgColor?.argb === WHITE) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LGRAY } };
        }
      });
    }
  });

  const filename = `incidents_${new Date().toISOString().slice(0,10)}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
});

// ── GET /api/incidents/template ────────────────────────────────────────────────
router.get('/template', async (req, res) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Scorpio Incidents';
  const ws = wb.addWorksheet('Import Template', { views: [{ state: 'frozen', ySplit: 3 }] });

  ws.columns = TEMPLATE_COLS;

  // Row 1 — header
  const hdr = ws.getRow(1);
  TEMPLATE_COLS.forEach((col, i) => {
    hdr.getCell(i + 1).value = col.header;
  });
  styleHeader(hdr);
  TEMPLATE_COLS.forEach((col, i) => {
    if (col.req) styleRequired(hdr.getCell(i + 1));
  });

  // Row 2 — field guide
  const guide = ws.getRow(2);
  guide.values = [
    'Full vessel name', 'DD/MM/YYYY or YYYY-MM-DD', 'DD/MM/YYYY or YYYY-MM-DD',
    INCIDENT_TYPES.join(' | '),
    'City, port or coordinates',
    'Describe what happened in detail',
    'List all actions taken or planned',
    'Fleet 1–5 (optional)',
    'Charterer name or NA',
    'Cargo type or Ballast',
    'Port / DD Mon YYYY',
    'Port / DD Mon YYYY',
    'Follow-up notes or updates',
    'Open | Pending OM Notification | Closed',
  ];
  styleGuide(guide);

  // Row 3 — example
  const ex = ws.getRow(3);
  ex.values = [
    'STI Aqua', '02/04/2026', '15/04/2026',
    'Environmental / Inspection',
    'Cristobal, Panama',
    'CSLC Oil Transfer Monitoring Inspection. Sampling valve drain cap not securely fitted.',
    '1. Drain cap secured. 2. Crew training conducted. 3. CAPA submitted.',
    'Fleet 1', 'NA', 'Ballast',
    'Rodeo / 01 Apr 2026', 'USG / 22 Apr 2026',
    '', 'Pending OM Notification',
  ];
  styleExample(ex);

  // Data validation for Type of Incident
  const typeColLetter = 'D';
  ws.dataValidations.add(`${typeColLetter}4:${typeColLetter}10000`, {
    type: 'list',
    allowBlank: true,
    formulae: [`"${INCIDENT_TYPES.join(',')}"`],
    showErrorMessage: true,
    errorTitle: 'Invalid Type',
    error: 'Please select from the list.',
  });

  // Data validation for Status
  const statusColLetter = 'N';
  ws.dataValidations.add(`${statusColLetter}4:${statusColLetter}10000`, {
    type: 'list',
    allowBlank: true,
    formulae: ['"Open,Pending OM Notification,Closed"'],
    showErrorMessage: true,
    errorTitle: 'Invalid Status',
    error: 'Please select Open, Pending OM Notification, or Closed.',
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="incident-import-template.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

// ── POST /api/incidents/import ─────────────────────────────────────────────────
router.post('/import', (req, res) => {
  const rows = req.body; // array of plain objects from parsed CSV
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'Body must be a non-empty array of incident objects' });
  }

  const db = load();
  const created = [], skipped = [];

  rows.forEach((row, idx) => {
    const vessel_name      = row['Vessel Name']        || row.vessel_name      || '';
    const date_of_event    = row['Date of Event']      || row.date_of_event    || '';
    const date_of_reporting= row['Date of Reporting']  || row.date_of_reporting|| '';
    const incident_type    = row['Type of Incident']   || row.incident_type    || '';
    const location         = row['Present Location']   || row.location         || '';
    const nature           = row['Nature of Event']    || row.nature           || '';
    const action_plan      = row['Action Plan']        || row.action_plan      || '';

    if (!vessel_name || !date_of_event || !date_of_reporting || !incident_type || !location || !nature || !action_plan) {
      skipped.push({ row: idx + 1, reason: 'Missing required fields (cols 1-3,5,6,11,12)' });
      return;
    }

    const incident = {
      id:                db.nextId++,
      vessel_name,
      date_of_event,
      date_of_reporting,
      days_diff:         calcDaysDiff(date_of_event, date_of_reporting),
      incident_type,
      location,
      charterer:         row['Charterer']          || row.charterer     || '',
      cargo:             row['Cargo Onboard']      || row.cargo         || '',
      last_port:         row['Last Port / ETD']    || row.last_port     || '',
      next_port:         row['Next Port / ETA']    || row.next_port     || '',
      fleet:             row['Fleet']              || row.fleet         || '',
      nature,
      action_plan,
      oil_informed:      row['Oil Major Informed'] || row.oil_informed  || '',
      oil_which:         row['Which Oil Majors']   || row.oil_which     || '',
      follow_up:         row['Follow Up Messages'] || row.follow_up     || '',
      status:            row['Status']             || row.status        || 'Submitted',
      published:         false,
      created_at:        now(),
      updated_at:        now(),
    };
    db.incidents.push(incident);
    created.push(incident.id);
  });

  save(db);
  res.status(201).json({ created: created.length, skipped: skipped.length, skippedDetails: skipped });
});

// ── GET /api/incidents ─────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { incidents } = load();
  res.json(applyFilters(incidents, req.query));
});

// ── GET /api/incidents/:id ─────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const { incidents } = load();
  const incident = incidents.find(i => i.id === Number(req.params.id));
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  res.json(incident);
});

// ── POST /api/incidents ────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const {
    vessel_name, date_of_event, date_of_reporting,
    incident_type, location, charterer, cargo,
    last_port, next_port, nature, action_plan,
    oil_informed, oil_which, follow_up, status, fleet, remarks,
    machinery_name, machinery_failure_type, machinery_failure_desc, machinery_repair_status,
    docmap_reported,
  } = req.body;

  if (!vessel_name || !date_of_event || !date_of_reporting || !incident_type || !location || !nature || !action_plan) {
    return res.status(400).json({
      error: 'Missing required fields: vessel_name, date_of_event, date_of_reporting, incident_type, location, nature, action_plan',
    });
  }

  const db = load();
  const incident = {
    id:                db.nextId++,
    vessel_name,
    date_of_event,
    date_of_reporting,
    days_diff:         calcDaysDiff(date_of_event, date_of_reporting),
    incident_type,
    location,
    charterer:         charterer    || '',
    cargo:             cargo        || '',
    last_port:         last_port    || '',
    next_port:         next_port    || '',
    nature,
    action_plan,
    oil_informed:      oil_informed || '',
    oil_which:         oil_which    || '',
    follow_up:         follow_up    || '',
    remarks:                  remarks                  || '',
    status:                   status                   || 'Open',
    fleet:                    fleet                    || '',
    machinery_name:           machinery_name           || '',
    machinery_failure_type:   machinery_failure_type   || '',
    machinery_failure_desc:   machinery_failure_desc   || '',
    machinery_repair_status:  machinery_repair_status  || '',
    docmap_reported:          docmap_reported          || '',
    published:                false,
    created_at:        now(),
    updated_at:        now(),
  };
  db.incidents.push(incident);
  save(db);
  res.status(201).json(incident);
});

// ── POST /api/incidents/:id/publish ───────────────────────────────────────────
router.post('/:id/publish', async (req, res) => {
  const db  = load();
  const idx = db.incidents.findIndex(i => i.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Incident not found' });

  if (db.incidents[idx].published) {
    return res.status(409).json({ error: 'Incident already published' });
  }

  db.incidents[idx].published    = true;
  db.incidents[idx].published_at = now();
  db.incidents[idx].updated_at   = now();
  save(db);

  const incident = db.incidents[idx];

  // Fire notifications (non-blocking — errors are captured, not thrown)
  const notifyResult = await notify(incident).catch(err => ({
    email: { error: err.message },
    teams: { error: err.message },
  }));

  res.json({ incident, notifications: notifyResult });
});

// ── PUT /api/incidents/:id ─────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const db  = load();
  const idx = db.incidents.findIndex(i => i.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Incident not found' });

  const existing = db.incidents[idx];
  const body     = { ...req.body };
  delete body.id;
  delete body.created_at;

  const updated = { ...existing, ...body, id: existing.id, updated_at: now() };
  updated.days_diff = calcDaysDiff(updated.date_of_event, updated.date_of_reporting);

  db.incidents[idx] = updated;
  save(db);
  res.json(updated);
});

// ── DELETE /api/incidents/:id ──────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const db  = load();
  const idx = db.incidents.findIndex(i => i.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Incident not found' });
  db.incidents.splice(idx, 1);
  save(db);
  // Remove attachments directory
  const dir = path.join(ATTACH_DIR, req.params.id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  res.json({ message: 'Incident deleted successfully' });
});

// ── GET /api/incidents/:id/attachments ────────────────────────────────────────
router.get('/:id/attachments', (req, res) => {
  const { incidents } = load();
  const incident = incidents.find(i => i.id === Number(req.params.id));
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  res.json(incident.attachments || []);
});

// ── POST /api/incidents/:id/attachments ───────────────────────────────────────
router.post('/:id/attachments', upload.single('file'), (req, res) => {
  const db  = load();
  const idx = db.incidents.findIndex(i => i.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Incident not found' });
  if (!req.file)  return res.status(400).json({ error: 'No file uploaded' });

  const attachment = {
    id:            `${Date.now()}`,
    filename:      req.file.filename,
    original_name: req.file.originalname,
    size:          req.file.size,
    mimetype:      req.file.mimetype,
    section:       req.body.section || 'initial',
    uploaded_at:   now(),
  };

  if (!db.incidents[idx].attachments) db.incidents[idx].attachments = [];
  db.incidents[idx].attachments.push(attachment);
  db.incidents[idx].updated_at = now();
  save(db);
  res.status(201).json(attachment);
});

// ── GET /api/incidents/:id/attachments/:attachmentId ─────────────────────────
router.get('/:id/attachments/:attachmentId', (req, res) => {
  const { incidents } = load();
  const incident = incidents.find(i => i.id === Number(req.params.id));
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  const att = (incident.attachments || []).find(a => a.id === req.params.attachmentId);
  if (!att) return res.status(404).json({ error: 'Attachment not found' });

  const filePath = path.join(ATTACH_DIR, req.params.id, att.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

  res.setHeader('Content-Disposition', `attachment; filename="${att.original_name}"`);
  res.sendFile(filePath);
});

// ── DELETE /api/incidents/:id/attachments/:attachmentId ──────────────────────
router.delete('/:id/attachments/:attachmentId', (req, res) => {
  const db  = load();
  const idx = db.incidents.findIndex(i => i.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Incident not found' });

  const atts = db.incidents[idx].attachments || [];
  const aIdx = atts.findIndex(a => a.id === req.params.attachmentId);
  if (aIdx === -1) return res.status(404).json({ error: 'Attachment not found' });

  const att      = atts[aIdx];
  const filePath = path.join(ATTACH_DIR, req.params.id, att.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  atts.splice(aIdx, 1);
  db.incidents[idx].attachments = atts;
  db.incidents[idx].updated_at  = now();
  save(db);
  res.json({ message: 'Attachment deleted' });
});

module.exports = router;
