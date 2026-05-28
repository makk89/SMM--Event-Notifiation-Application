require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const incidentsRouter = require('./routes/incidents');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/incidents', incidentsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Shipping Incidents API is running' });
});

// Serve built frontend if it exists
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (fs.existsSync(frontendDist)) {
    console.log(`Frontend available at http://localhost:${PORT}`);
  }
});
