const nodemailer = require('nodemailer');

const RECIPIENTS = [
  { name: 'Tabriz Chanduwadia', email: 'TChanduwadia@scorpiogroup.net' },
  { name: 'Aisha Shaikh',       email: 'AisShaikh@scorpiogroup.net'   },
];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildEmailHtml(incident) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; font-size: 14px; color: #222; }
    .header { background: #003366; color: white; padding: 18px 24px; }
    .header h2 { margin: 0; font-size: 18px; }
    .header p  { margin: 4px 0 0; font-size: 13px; opacity: .8; }
    .body { padding: 24px; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; }
    th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-size: 12px; color: #6b7280; text-transform: uppercase; }
    td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; background: #ef4444; color: white; }
    .section { margin-top: 20px; }
    .section h3 { color: #003366; font-size: 14px; border-bottom: 2px solid #003366; padding-bottom: 4px; }
    pre { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px; font-size: 13px; white-space: pre-wrap; }
    .footer { background: #f3f4f6; padding: 12px 24px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h2>&#128226; Incident Published — ${incident.vessel_name}</h2>
    <p>Incident #${incident.id} · ${incident.incident_type} · ${fmtDate(incident.date_of_event)}</p>
  </div>
  <div class="body">
    <p>A new incident report has been published and requires your attention.</p>

    <div class="section">
      <h3>Initial Notification</h3>
      <table>
        <tr><th>Field</th><th>Details</th></tr>
        <tr><td>1. Vessel Name</td><td><strong>${incident.vessel_name || '—'}</strong></td></tr>
        <tr><td>2. Date of Event</td><td>${fmtDate(incident.date_of_event)}</td></tr>
        <tr><td>3. Date of Reporting</td><td>${fmtDate(incident.date_of_reporting)}</td></tr>
        <tr><td>4. Days Difference</td><td>${incident.days_diff != null ? incident.days_diff + ' day(s)' : '—'}</td></tr>
        <tr><td>5. Type of Incident</td><td>${incident.incident_type || '—'}</td></tr>
        <tr><td>6. Present Location</td><td>${incident.location || '—'}</td></tr>
        <tr><td>7. Charterer</td><td>${incident.charterer || '—'}</td></tr>
        <tr><td>8. Cargo Onboard</td><td>${incident.cargo || '—'}</td></tr>
        <tr><td>9. Last Port / ETD</td><td>${incident.last_port || '—'}</td></tr>
        <tr><td>10. Next Port / ETA</td><td>${incident.next_port || '—'}</td></tr>
        <tr><td>Fleet</td><td>${incident.fleet || '—'}</td></tr>
      </table>
    </div>

    <div class="section">
      <h3>Nature of Event</h3>
      <pre>${incident.nature || '—'}</pre>
    </div>

    <div class="section">
      <h3>Action Plan</h3>
      <pre>${incident.action_plan || '—'}</pre>
    </div>

    <div class="section">
      <h3>Oil Major Notification</h3>
      <table>
        <tr><th>Field</th><th>Details</th></tr>
        <tr><td>13. Oil Major Informed?</td><td>${incident.oil_informed || '—'}</td></tr>
        <tr><td>14. Which Oil Majors</td><td>${incident.oil_which || '—'}</td></tr>
      </table>
    </div>

    <div class="section">
      <h3>Status</h3>
      <span class="badge">${incident.status}</span>
    </div>
  </div>
  <div class="footer">
    This is an automated notification from the Shipping Incidents Management System.<br/>
    Published at: ${new Date().toLocaleString('en-GB')}
  </div>
</body>
</html>`;
}

function buildTeamsCard(incident) {
  return {
    '@type':    'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: '003366',
    summary:    `Incident Published: ${incident.vessel_name}`,
    sections: [{
      activityTitle:    `📢 Incident Published — ${incident.vessel_name}`,
      activitySubtitle: `#${incident.id} · ${incident.incident_type} · ${fmtDate(incident.date_of_event)}`,
      activityText:     'A new incident report has been published.',
      facts: [
        { name: 'Vessel',         value: incident.vessel_name   || '—' },
        { name: 'Date of Event',  value: fmtDate(incident.date_of_event) },
        { name: 'Type',           value: incident.incident_type || '—' },
        { name: 'Location',       value: incident.location      || '—' },
        { name: 'Charterer',      value: incident.charterer     || '—' },
        { name: 'Fleet',          value: incident.fleet         || '—' },
        { name: 'Oil Major Informed', value: incident.oil_informed || '—' },
        { name: 'Status',         value: incident.status        || '—' },
      ],
    }],
  };
}

async function sendEmail(incident) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[notify] Email skipped — SMTP_HOST / SMTP_USER / SMTP_PASS not configured in .env');
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host,
    port:   Number(process.env.SMTP_PORT  || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  const toList = RECIPIENTS.map(r => `"${r.name}" <${r.email}>`).join(', ');

  const info = await transporter.sendMail({
    from:    `"Shipping Incidents System" <${user}>`,
    to:      toList,
    subject: `[Incident Published] #${incident.id} — ${incident.vessel_name} (${incident.incident_type})`,
    html:    buildEmailHtml(incident),
  });

  console.log('[notify] Email sent:', info.messageId);
  return { messageId: info.messageId };
}

async function sendTeams(incident) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('[notify] Teams skipped — TEAMS_WEBHOOK_URL not configured in .env');
    return { skipped: true };
  }

  const body = JSON.stringify(buildTeamsCard(incident));
  const res  = await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Teams webhook returned ${res.status}: ${text}`);
  }

  console.log('[notify] Teams message sent');
  return { ok: true };
}

async function notify(incident) {
  const results = await Promise.allSettled([
    sendEmail(incident),
    sendTeams(incident),
  ]);

  const [emailResult, teamsResult] = results;
  return {
    email: emailResult.status === 'fulfilled' ? emailResult.value : { error: emailResult.reason?.message },
    teams: teamsResult.status === 'fulfilled' ? teamsResult.value : { error: teamsResult.reason?.message },
  };
}

module.exports = { notify };
