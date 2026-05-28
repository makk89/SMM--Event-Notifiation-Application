const fs   = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'incidents.json');

const STATUSES = ['Submitted', 'DPA Ack.', 'Fleet Mgr Review', 'Mgmt Review', 'Safety Inv.', 'Closed'];
const FLEETS   = ['Fleet 1', 'Fleet 2', 'Fleet 3', 'Fleet 4', 'Fleet 5'];

const SEED = [
  {
    id: 1,
    vessel_name:       'STI Stability',
    date_of_event:     '2026-02-21',
    date_of_reporting: '2026-02-23',
    days_diff:         2,
    incident_type:     'Fire / Explosion',
    location:          'South China Sea',
    charterer:         'Chevron',
    cargo:             'Gasoil',
    last_port:         'Yosu / 18 Feb 2026',
    next_port:         'Botany Bay / 04 Mar 2026',
    nature:            'Engine room fire following hydraulic failure. Fire suppression system activated immediately. All crew mustered at emergency stations.',
    action_plan:       '1. Fire brigade engaged.\n2. Mayday broadcast.\n3. Vessel under repair at anchorage.\n4. Class surveyor attending.',
    oil_informed:      'Yes',
    oil_which:         'Chevron, Ampol',
    follow_up:         'Chevron acknowledged. Ampol follow-up pending.',
    status:            'Fleet Mgr Review',
    fleet:             'Fleet B',
    created_at:        '2026-02-23T08:00:00Z',
    updated_at:        '2026-02-23T08:00:00Z',
  },
  {
    id: 2,
    vessel_name:       'STI Aqua',
    date_of_event:     '2026-04-02',
    date_of_reporting: '2026-04-15',
    days_diff:         13,
    incident_type:     'Environmental / Inspection',
    location:          'Cristobal, Panama',
    charterer:         'NA',
    cargo:             'Ballast',
    last_port:         'Rodeo, San Francisco',
    next_port:         'USG for orders / 22 Apr 2026',
    nature:            'CSLC Oil Transfer Monitoring Inspection at Rodeo dated 02 Apr 2026. Sampling valve drain cap not securely fitted. Class 3 violation. NOV issued 09 Apr 2026.',
    action_plan:       '1. Drain cap secured immediately.\n2. Rectification demonstrated to CSLC inspector.\n3. Shipboard training conducted.\n4. Training records submitted to CSLC.\n5. CAPA submitted within timeframe.',
    oil_informed:      'No',
    oil_which:         '',
    follow_up:         'NOV received 09 Apr 2026. CAPA deadline: 09 May 2026.',
    status:            'DPA Ack.',
    fleet:             'Fleet A',
    created_at:        '2026-04-15T10:05:00Z',
    updated_at:        '2026-04-15T10:05:00Z',
  },
  {
    id: 3,
    vessel_name:       'STI Rose',
    date_of_event:     '2026-01-10',
    date_of_reporting: '2026-01-11',
    days_diff:         1,
    incident_type:     'Collision',
    location:          'Strait of Malacca',
    charterer:         'BP',
    cargo:             'Naphtha',
    last_port:         'Singapore / 08 Jan 2026',
    next_port:         'Ulsan / 18 Jan 2026',
    nature:            'Port side contact with anchored fishing vessel during restricted visibility. Minor hull damage above waterline.',
    action_plan:       '1. Coast Guard notified.\n2. Flag state informed.\n3. P&I Club engaged.\n4. Damage survey arranged.',
    oil_informed:      'Yes',
    oil_which:         'BP',
    follow_up:         'Survey completed 12 Jan 2026. Repair estimate USD 85,000.',
    status:            'Mgmt Review',
    fleet:             'Fleet C',
    created_at:        '2026-01-11T06:30:00Z',
    updated_at:        '2026-01-11T06:30:00Z',
  },
  {
    id: 4,
    vessel_name:       'STI Amber',
    date_of_event:     '2026-03-05',
    date_of_reporting: '2026-03-05',
    days_diff:         0,
    incident_type:     'Loss of Power / Blackout',
    location:          'Gulf of Aden',
    charterer:         'Shell',
    cargo:             'Fuel Oil',
    last_port:         'Fujairah / 02 Mar 2026',
    next_port:         'Djibouti / 07 Mar 2026',
    nature:            'Complete blackout lasting 4 hours due to main switchboard fault. Vessel drifted 3nm from TSS. Auxiliary power restored.',
    action_plan:       '1. Emergency generator started.\n2. Coast Guard and VTS informed.\n3. Main switchboard fault isolated.\n4. Shore technician arranged for next port.',
    oil_informed:      'No',
    oil_which:         '',
    follow_up:         'Switchboard repairs completed Djibouti 08 Mar 2026.',
    status:            'Closed',
    fleet:             'Fleet A',
    created_at:        '2026-03-05T14:00:00Z',
    updated_at:        '2026-03-05T14:00:00Z',
  },
  {
    id: 5,
    vessel_name:       'STI Executive',
    date_of_event:     '2026-03-20',
    date_of_reporting: '2026-03-21',
    days_diff:         1,
    incident_type:     'Crew Injury',
    location:          'Port of Rotterdam',
    charterer:         'Trafigura',
    cargo:             'Gasoline',
    last_port:         'Antwerp / 18 Mar 2026',
    next_port:         'New York / 02 Apr 2026',
    nature:            'AB suffered fractured wrist during mooring operations when heaving line became entangled. Crew member evacuated to shoreside hospital.',
    action_plan:       '1. First aid administered.\n2. Crew member transported to Rotterdam Medical Centre.\n3. Port authorities notified.\n4. Flag state informed within 24 hrs.',
    oil_informed:      'No',
    oil_which:         '',
    follow_up:         'Hospital treatment ongoing. Flag state investigation underway.',
    status:            'Safety Inv.',
    fleet:             'Fleet D',
    created_at:        '2026-03-21T09:15:00Z',
    updated_at:        '2026-03-21T09:15:00Z',
  },
  {
    id: 6,
    vessel_name:       'STI Coral',
    date_of_event:     '2026-04-08',
    date_of_reporting: '2026-04-08',
    days_diff:         0,
    incident_type:     'Near Miss',
    location:          'English Channel',
    charterer:         'Vitol',
    cargo:             'Jet Fuel',
    last_port:         'Le Havre / 06 Apr 2026',
    next_port:         'Fawley / 09 Apr 2026',
    nature:            'ECDIS alarm failure led to near miss with inbound bulk carrier in TSS. CPA of 0.1nm. Vessels passed safely after evasive action.',
    action_plan:       '1. ECDIS serviced.\n2. Navigation audit initiated.\n3. Master report completed.',
    oil_informed:      'No',
    oil_which:         '',
    follow_up:         '',
    status:            'Submitted',
    fleet:             'Fleet B',
    created_at:        '2026-04-08T16:45:00Z',
    updated_at:        '2026-04-08T16:45:00Z',
  },
];

function load() {
  if (!fs.existsSync(dbPath)) {
    const initial = { nextId: SEED.length + 1, incidents: SEED };
    fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2));
    console.log('Database seeded with', SEED.length, 'sample incidents.');
    return initial;
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function save(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = { load, save };
