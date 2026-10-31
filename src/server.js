const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const patientsRouter = require('./routes/patients');
const appointmentsRouter = require('./routes/appointments');
const visitsRouter = require('./routes/visits');
const prescriptionsRouter = require('./routes/prescriptions');
const statsRouter = require('./routes/stats');
const backupsRouter = require('./routes/backups');

const app = express();
const PORT = process.env.PORT || 5050;

// Middleware with large payload support for database backups/restores
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/patients', patientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/visits', visitsRouter);
app.use('/api/prescriptions', prescriptionsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/backups', backupsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    clinic: process.env.CLINIC_NAME || 'عيادة الدكتور حاتم عواجة',
    specialty: process.env.CLINIC_SPECIALTY || 'استشاري أمراض النساء والتوليد وجراحة المناظير وعلاج العقم',
    database: {
      connected: db.isPostgresConnected(),
      engine: db.isPostgresConnected() ? 'PostgreSQL 16 (Docker)' : 'In-Memory Cache (Docker syncing)'
    },
    timestamp: new Date().toISOString()
  });
});

// Clean HTML Page Routes (Independent Pages for Each Section)
app.get(['/', '/dashboard'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/patients', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'patients.html'));
});

app.get('/appointments', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'appointments.html'));
});

app.get('/visits', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'visits.html'));
});

app.get('/prescriptions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'prescriptions.html'));
});

app.get('/calculator', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'calculator.html'));
});

app.get('/backups', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'backups.html'));
});

// Routing fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start HTTP server & attempt DB connection
app.listen(PORT, async () => {
  console.log(`================================================================`);
  console.log(`🏥 نظام عيادة الدكتور حاتم عواجة (نساء وتوليد) يعمل الآن!`);
  console.log(`🌐 الرابط في المتصفح: http://localhost:${PORT}`);
  console.log(`⚙️ البيئة: ${process.env.NODE_ENV || 'development'}`);
  console.log(`================================================================`);
  
  // Initial DB connection attempt
  await db.connectDB();

  // Resilient periodic check to auto-reconnect if PostgreSQL drops
  setInterval(async () => {
    if (!db.isPostgresConnected()) {
      console.log('🔄 محاولة إعادة الاتصال بقاعدة بيانات PostgreSQL...');
      await db.connectDB();
    }
  }, 10000);
});
