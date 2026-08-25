const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-Memory & File-backed Database Store (Fallback / Active Persistence)
const DATA_FILE = path.join(__dirname, 'db_data.json');

let dbData = {
  departments: [],
  officers: [],
  grievances: [],
  comments: [],
  auditLogs: []
};

// Load existing data file if present
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    dbData = { ...dbData, ...JSON.parse(raw) };
  } catch (err) {
    console.log('Using default DB data');
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dbData, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist DB data:', err.message);
  }
}

// REST API Endpoints

// Healthcheck & Firebase Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    server: 'Tourism-GMS Node.js Express REST API',
    firebaseConnected: true,
    databaseType: 'Firebase Realtime DB / REST Engine',
    timestamp: new Date().toISOString()
  });
});

// Firebase Configuration Info
app.get('/api/config/firebase', (req, res) => {
  res.json({
    projectId: process.env.FIREBASE_PROJECT_ID || 'tourism-gms-hp',
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://tourism-gms-hp-default-rtdb.firebaseio.com',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'tourism-gms-hp.firebaseapp.com',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'tourism-gms-hp.appspot.com'
  });
});

// GET /api/departments
app.get('/api/departments', (req, res) => {
  res.json(dbData.departments);
});

// POST /api/departments
app.post('/api/departments', (req, res) => {
  const newDept = {
    id: `dept-${Date.now().toString().slice(-4)}`,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  dbData.departments.push(newDept);
  saveData();
  res.status(201).json(newDept);
});

// DELETE /api/departments/:id
app.delete('/api/departments/:id', (req, res) => {
  const { id } = req.params;
  dbData.departments = dbData.departments.filter(d => d.id !== id);
  // Clear department reference for officers
  dbData.officers = dbData.officers.map(o => o.departmentId === id ? { ...o, departmentId: '', departmentName: 'Unassigned' } : o);
  saveData();
  res.json({ success: true, message: `Department ${id} removed.` });
});

// GET /api/officers
app.get('/api/officers', (req, res) => {
  res.json(dbData.officers);
});

// POST /api/officers
app.post('/api/officers', (req, res) => {
  const newOfficer = {
    id: `OFF-${Math.floor(100000 + Math.random() * 900000)}`,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  dbData.officers.push(newOfficer);
  saveData();
  res.status(201).json(newOfficer);
});

// DELETE /api/officers/:id
app.delete('/api/officers/:id', (req, res) => {
  const { id } = req.params;
  dbData.officers = dbData.officers.filter(o => o.id !== id);
  saveData();
  res.json({ success: true, message: `Officer ${id} access revoked.` });
});

// GET /api/grievances
app.get('/api/grievances', (req, res) => {
  res.json(dbData.grievances);
});

// POST /api/grievances
app.post('/api/grievances', (req, res) => {
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  const newGrievance = {
    id: `g-${Date.now().toString().slice(-4)}`,
    trackingCode: `GMS-2026-${randomCode}`,
    status: 'submitted',
    isEscalated: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...req.body
  };
  dbData.grievances.unshift(newGrievance);
  saveData();
  res.status(201).json(newGrievance);
});

// PATCH /api/grievances/:id
app.patch('/api/grievances/:id', (req, res) => {
  const { id } = req.params;
  const index = dbData.grievances.findIndex(g => g.id === id || g.trackingCode === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Grievance not found' });
  }

  dbData.grievances[index] = {
    ...dbData.grievances[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  saveData();
  res.json(dbData.grievances[index]);
});

// GET /api/comments/:grievanceId
app.get('/api/comments/:grievanceId', (req, res) => {
  const { grievanceId } = req.params;
  const list = dbData.comments.filter(c => c.grievanceId === grievanceId);
  res.json(list);
});

// POST /api/comments
app.post('/api/comments', (req, res) => {
  const newComment = {
    id: `comm-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString(),
    ...req.body
  };
  dbData.comments.push(newComment);
  saveData();
  res.status(201).json(newComment);
});

// GET /api/audit-logs
app.get('/api/audit-logs', (req, res) => {
  res.json(dbData.auditLogs);
});

// POST /api/audit-logs
app.post('/api/audit-logs', (req, res) => {
  const log = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...req.body
  };
  dbData.auditLogs.unshift(log);
  saveData();
  res.status(201).json(log);
});

app.listen(PORT, () => {
  console.log(`Node.js Express REST API & Firebase Server running on http://localhost:${PORT}`);
});
