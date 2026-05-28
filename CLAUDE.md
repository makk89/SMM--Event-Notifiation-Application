# Shipping Incidents Test 1

A shipping incident management system for Scorpio Group — report, track, and manage vessel incidents across fleets with dashboard analytics, Excel import/export, and file attachments.

Inherits from the [global Scorpio CLAUDE.md](C:\Users\Tchanduwadia\Claude\CLAUDE.md).

---

## Overview

| Item | Value |
|------|-------|
| Purpose | Track and manage shipping incidents across Scorpio vessel fleets |
| Status | In Development |
| Tech Stack | Express.js (Node) + React (Vite) + JSON file storage |
| Location | `C:\Users\Tchanduwadia\Claude\Shipping-Incidents-Test-1` |

---

## Tech Stack (Differences from Global)

This is a **Node/React** project, not the standard Spring Boot + Angular stack:

| Layer | Choice |
|-------|--------|
| Backend | Express.js (Node.js) |
| Frontend | React 18 + Vite |
| Database | JSON flat-file (`backend/data/incidents.json`) |
| File uploads | Multer (disk storage, `backend/data/attachments/`) |
| Excel I/O | ExcelJS (backend export/template), SheetJS/xlsx (frontend import) |
| Notifications | Nodemailer (email) + Teams webhook |

---

## Build & Run

```batch
# Install dependencies (first time or after pull)
cd backend  && npm install
cd frontend && npm install

# Build frontend (production)
cd frontend
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run build

# Start backend (serves built frontend on port 3001)
cd backend
node src/server.js
```

App available at: **http://localhost:3001**

---

## Project Structure

```
Shipping-Incidents-Test-1/
├── backend/
│   ├── src/
│   │   ├── server.js           ← Express entry point (port 3001)
│   │   ├── routes/incidents.js ← All API routes + attachment routes
│   │   ├── db/database.js      ← JSON file read/write helpers
│   │   └── notifications.js    ← Email + Teams notifications
│   ├── data/
│   │   ├── incidents.json      ← All incident records (source of truth)
│   │   └── attachments/        ← Uploaded files per incident
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx             ← Router + role state
│   │   ├── api/incidents.js    ← All API calls
│   │   └── components/
│   │       ├── Dashboard.jsx   ← Stats, charts, clickable bars
│   │       ├── IncidentList.jsx← Filterable table + Excel import/export
│   │       ├── IncidentForm.jsx← Create/edit form with attachments
│   │       ├── IncidentDetail.jsx ← Read-only view with attachments
│   │       ├── Attachments.jsx ← Reusable per-section attachment panel
│   │       ├── Topbar.jsx      ← Role switcher
│   │       └── Sidebar.jsx     ← Navigation
│   └── dist/                   ← Built frontend (served by Express)
└── CLAUDE.md                   ← This file
```

---

## Roles

| Role value | Label | Capabilities |
|---|---|---|
| `vessel` | Vessel / Fleet Team | Create & view incidents, add attachments |
| `vetting` | Vetting Superintendent | + Edit oil major fields |
| `management` | Management | View only |
| `admin` | Admin | + Delete incidents (list + detail) |

---

## Key Features Implemented

- **3 statuses**: Open, Pending OM Notification, Closed
- **Dashboard**: clickable category/fleet/year/status charts, auto-scaling bar charts (multiples of 10)
- **Incident types**: includes "Machinery / Equipment Failure" with conditional sub-form
- **Excel**: formatted export, import template with guide rows + dropdowns, Template download
- **File attachments**: per section (initial, oil_major, follow_up, remarks, machinery) — on both detail and edit views
- **Reported in Docmap**: Yes/No field shown in form, detail, and list
- **Admin role**: delete from list (trash button per row) and from detail view

---

## Key Learnings

- PUT route uses `...body` spread so new fields are saved automatically; POST route requires explicit destructuring
- Attachments require an existing `incidentId` — new incident forms show a note to save first
- Frontend build must be rebuilt after every JSX/CSS change: `node npm-cli.js run build` from `frontend/`
- robocopy exit code 1 = success (files copied); exit code 8+ = errors
- PowerShell heredocs use `@'...'@` (single-quoted) not `$(cat <<'EOF'...EOF)` which is bash-only

---

## Sprint Progress

### Sprint 1 — Core Incident Management ✅
- Status simplification (3 statuses), dashboard stat cards, sequential row numbers

### Sprint 2 — Dashboard & Navigation ✅
- Clickable chart elements, auto-scaling bar charts, removed Recent Incidents table

### Sprint 3 — Form Enhancements ✅
- Machinery/Equipment sub-form, Docmap field, Admin delete role

### Sprint 4 — Excel Import/Export ✅
- Formatted .xlsx export, import template with dropdowns, Template button

### Sprint 5 — File Attachments ✅
- Per-section attachments on detail view and edit form, Multer backend
