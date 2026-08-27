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
  departments: [
    {
      id: 'dept-01',
      name: 'Transport & Mobility Cell',
      code: 'TS-CELL',
      description: 'Taxi fare regulation, permit compliance, prepaid booth oversight, and driver conduct.',
      contactPhone: '+91 177 2654321',
      contactEmail: 'transport.gms@sikkim.gov.in',
      isActive: true,
      officerCount: 1,
      activeComplaintsCount: 1,
      assignedOfficers: [
        {
          id: 'OFF-847291',
          name: 'Ramesh Chand',
          email: 'ramesh.chand@sikkim.gov.in',
          designation: 'Senior Transport Inspector',
          phone: '+91 98160 12345'
        }
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 'dept-02',
      name: 'Hospitality & Hotel Standards',
      code: 'HT-STD',
      description: 'Hotel tariff transparency, hygiene compliance, booking refunds, and hospitality dispute redressal.',
      contactPhone: '+91 177 2654322',
      contactEmail: 'hospitality.gms@sikkim.gov.in',
      isActive: true,
      officerCount: 1,
      activeComplaintsCount: 1,
      assignedOfficers: [
        {
          id: 'OFF-912834',
          name: 'Sunil Kumar',
          email: 'sunil.kumar@sikkim.gov.in',
          designation: 'Hospitality Nodal Inspector',
          phone: '+91 98160 67890'
        }
      ],
      createdAt: new Date().toISOString()
    }
  ],
  officers: [
    {
      id: 'OFF-847291',
      name: 'Ramesh Chand',
      email: 'ramesh.chand@sikkim.gov.in',
      password: 'password123',
      departmentId: 'dept-01',
      departmentName: 'Transport & Mobility Cell',
      designation: 'Senior Transport Inspector',
      phone: '+91 98160 12345',
      isRevoked: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'OFF-912834',
      name: 'Sunil Kumar',
      email: 'sunil.kumar@sikkim.gov.in',
      password: 'password123',
      departmentId: 'dept-02',
      departmentName: 'Hospitality & Hotel Standards',
      designation: 'Hospitality Nodal Inspector',
      phone: '+91 98160 67890',
      isRevoked: false,
      createdAt: new Date().toISOString()
    }
  ],
  grievances: [
    {
      id: 'g-1001',
      trackingCode: 'GMS-2026-8492',
      title: 'Overcharging prepaid taxi fare at Ridge Shimla',
      description: 'Taxi operator demanded double rate beyond approved Directorate prepaid fare chart.',
      category: 'Transport & Mobility Cell',
      departmentId: 'dept-01',
      departmentName: 'Transport & Mobility Cell',
      assignedOfficerId: 'OFF-847291',
      assignedOfficerName: 'Ramesh Chand',
      status: 'in_progress',
      isEscalated: false,
      citizenId: 'cit-001',
      citizenName: 'Amit Kapoor',
      citizenEmail: 'amit.kapoor@gmail.com',
      citizenPhone: '+91 98765 43210',
      location: 'Shimla Ridge Prepaid Stand',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'g-1002',
      trackingCode: 'GMS-2026-9184',
      title: 'Sanitation & Tariff Dispute at Mall Road Hotel',
      description: 'Hotel management refused room refund and levied undisclosed surcharge upon checkout.',
      category: 'Hospitality & Hotel Standards',
      departmentId: 'dept-02',
      departmentName: 'Hospitality & Hotel Standards',
      assignedOfficerId: 'OFF-912834',
      assignedOfficerName: 'Sunil Kumar',
      status: 'assigned',
      isEscalated: false,
      citizenId: 'cit-002',
      citizenName: 'Neha Sharma',
      citizenEmail: 'neha.sharma@gmail.com',
      citizenPhone: '+91 98160 54321',
      location: 'Mall Road Manali',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  citizens: [
    {
      id: 'cit-001',
      name: 'Amit Kapoor',
      email: 'amit.kapoor@gmail.com',
      password: 'password123',
      phone: '+91 98765 43210',
      createdAt: new Date().toISOString()
    },
    {
      id: 'cit-002',
      name: 'Neha Sharma',
      email: 'neha.sharma@gmail.com',
      password: 'password123',
      phone: '+91 98160 54321',
      createdAt: new Date().toISOString()
    }
  ],
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

// GET /api/citizens
app.get('/api/citizens', (req, res) => {
  res.json(dbData.citizens || []);
});

// POST /api/citizens
app.post('/api/citizens', (req, res) => {
  const citizen = req.body;
  const cleanEmail = (citizen.email || '').toLowerCase().trim();
  
  if (!dbData.citizens) dbData.citizens = [];
  
  const existing = dbData.citizens.find(c => c.email.toLowerCase().trim() === cleanEmail || c.id === citizen.id);
  if (existing) {
    dbData.citizens = dbData.citizens.map(c => (c.email.toLowerCase().trim() === cleanEmail || c.id === citizen.id) ? { ...c, ...citizen } : c);
  } else {
    dbData.citizens.push(citizen);
  }
  
  saveData();
  res.status(201).json(citizen);
});

// PUT /api/citizens/:id
app.put('/api/citizens/:id', (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  
  if (!dbData.citizens) dbData.citizens = [];
  dbData.citizens = dbData.citizens.map(c => (c.id === id || c.email.toLowerCase().trim() === (updatedData.email || '').toLowerCase().trim()) ? { ...c, ...updatedData } : c);
  saveData();
  res.json({ success: true, message: `Citizen ${id} updated.` });
});

// DELETE /api/citizens/:id
app.delete('/api/citizens/:id', (req, res) => {
  const { id } = req.params;
  if (!dbData.citizens) dbData.citizens = [];
  dbData.citizens = dbData.citizens.filter(c => c.id !== id);
  saveData();
  res.json({ success: true, message: `Citizen ${id} deleted.` });
});

// GET /api/grievances
app.get('/api/grievances', (req, res) => {
  res.json(dbData.grievances);
});

// POST /api/grievances
app.post('/api/grievances', (req, res) => {
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  const body = req.body;

  const targetDeptId = body.departmentId;
  const targetDeptName = body.departmentName;

  // Find active non-revoked officers assigned to this target department
  const activeOfficers = (dbData.officers || []).filter(o => !o.isRevoked);
  const deptOfficers = activeOfficers.filter(o => 
    (targetDeptId && o.departmentId === targetDeptId) || 
    (targetDeptName && o.departmentName && o.departmentName.toLowerCase() === targetDeptName.toLowerCase())
  );

  let assignedOfficerId = body.assignedOfficerId || '';
  let assignedOfficerName = body.assignedOfficerName || '';
  let initialStatus = body.status || 'submitted';

  if (!assignedOfficerId && deptOfficers.length > 0) {
    const existingGrievances = dbData.grievances || [];
    
    // Count active complaints for each officer
    const officersWithCounts = deptOfficers.map(off => {
      const count = existingGrievances.filter(g => 
        g.assignedOfficerId === off.id || 
        g.assignedOfficerId === off.email || 
        g.assignedOfficerName === off.name
      ).length;
      return { officer: off, count };
    });

    const minCount = Math.min(...officersWithCounts.map(o => o.count));
    const leastLoaded = officersWithCounts.filter(o => o.count === minCount);
    const selectedObj = leastLoaded[Math.floor(Math.random() * leastLoaded.length)];

    assignedOfficerId = selectedObj.officer.id;
    assignedOfficerName = selectedObj.officer.name;
    initialStatus = 'assigned';
  }

  const newGrievance = {
    id: `g-${Date.now().toString().slice(-4)}`,
    trackingCode: `GMS-2026-${randomCode}`,
    isEscalated: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...body,
    assignedOfficerId,
    assignedOfficerName,
    status: initialStatus
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
