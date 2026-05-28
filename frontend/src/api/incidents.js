const BASE = '/api/incidents';

export async function fetchIncidents(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
}

export async function fetchIncident(id) {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('Incident not found');
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function createIncident(data) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create incident');
  }
  return res.json();
}

export async function updateIncident(id, data) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update incident');
  }
  return res.json();
}

export async function deleteIncident(id) {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete incident');
  return res.json();
}

export async function publishIncident(id) {
  const res = await fetch(`${BASE}/${id}/publish`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to publish incident');
  }
  return res.json();
}

export function exportIncidentsUrl(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
  return `${BASE}/export?${params}`;
}

export function templateUrl() {
  return `${BASE}/template`;
}

export async function importIncidents(rows) {
  const res = await fetch(`${BASE}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Import failed');
  }
  return res.json();
}
