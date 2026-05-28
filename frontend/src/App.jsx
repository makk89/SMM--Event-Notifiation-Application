import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Topbar from './components/Topbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import IncidentList from './components/IncidentList.jsx';
import IncidentForm from './components/IncidentForm.jsx';
import IncidentDetail from './components/IncidentDetail.jsx';
import Placeholder from './components/Placeholder.jsx';
import './App.css';

function App() {
  const [role, setRole]               = useState('vessel');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <Router>
      <div className="app-shell">
        <Topbar
          role={role}
          onRoleChange={setRole}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
        />
        <Sidebar open={sidebarOpen} />
        <main className={`main-content${sidebarOpen ? '' : ' expanded'}`}>
          <Routes>
            <Route path="/"                   element={<Dashboard />} />
            <Route path="/incidents"          element={<IncidentList role={role} />} />
            <Route path="/incidents/new"      element={<IncidentForm role={role} />} />
            <Route path="/incidents/:id"      element={<IncidentDetail role={role} />} />
            <Route path="/incidents/:id/edit" element={<IncidentForm role={role} />} />
            <Route path="/vessels"    element={<Placeholder icon="⚓" title="Vessels" desc="Vessel registry and fleet management. Seed data will be populated in a future phase." />} />
            <Route path="/email-audit" element={<Placeholder icon="✉" title="Email Audit" desc="Notification log for all published incidents — email and Teams activity." />} />
            <Route path="/user-mgmt"  element={<Placeholder icon="👤" title="User Management" desc="Role-based access control, user accounts, and permissions." />} />
            <Route path="/settings"   element={<Placeholder icon="⚙" title="Settings" desc="SMTP configuration, Teams webhook, notification templates, and app preferences." />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
