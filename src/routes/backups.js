const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');

// Ensure backups directory exists
const BACKUPS_DIR = path.join(__dirname, '..', '..', 'backups');
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

/**
 * Extract complete snapshot data from PostgreSQL or Memory Store
 */
async function fetchFullDatabaseSnapshot() {
  const isPg = db.isPostgresConnected();
  let patients = [];
  let appointments = [];
  let visits = [];
  let prescriptions = [];
  let prescription_items = [];
  let drugs_catalog = [];

  if (isPg) {
    try {
      const pRes = await db.query('SELECT * FROM patients ORDER BY id ASC');
      patients = pRes.rows;

      const aRes = await db.query('SELECT * FROM appointments ORDER BY id ASC');
      appointments = aRes.rows;

      const vRes = await db.query('SELECT * FROM visits ORDER BY id ASC');
      visits = vRes.rows;

      const rxRes = await db.query('SELECT * FROM prescriptions ORDER BY id ASC');
      prescriptions = rxRes.rows;

      const rxiRes = await db.query('SELECT * FROM prescription_items ORDER BY id ASC');
      prescription_items = rxiRes.rows;

      const dRes = await db.query('SELECT * FROM drugs_catalog ORDER BY id ASC');
      drugs_catalog = dRes.rows;
    } catch (err) {
      console.error('Error fetching snapshot from Postgres:', err.message);
      throw err;
    }
  } else {
    const store = db.getMemoryStore();
    patients = store.patients || [];
    appointments = store.appointments || [];
    visits = store.visits || [];
    prescriptions = store.prescriptions || [];
    drugs_catalog = store.drugs || [];

    // Flatten prescription items from memory store if present
    prescription_items = [];
    prescriptions.forEach(rx => {
      if (rx.items && Array.isArray(rx.items)) {
        rx.items.forEach((it, idx) => {
          prescription_items.push({
            id: idx + 1,
            prescription_id: rx.id,
            medication_name: it.medication_name,
            dosage: it.dosage,
            frequency: it.frequency,
            duration: it.duration,
            instructions: it.instructions
          });
        });
      }
    });
  }

  const snapshot = {
    metadata: {
      system: 'Dr. Hatem Awaja Obstetrics & Gynecology Clinic Management System',
      clinic_name: process.env.CLINIC_NAME || 'عيادة الدكتور حاتم عواجة',
      doctor: 'د. حاتم عواجة',
      specialty: 'استشاري أمراض النساء والتوليد وجراحة المناظير وعلاج العقم',
      version: '2.0.0',
      exported_at: new Date().toISOString(),
      database_type: isPg ? 'PostgreSQL' : 'In-Memory Cache',
      counts: {
        patients: patients.length,
        appointments: appointments.length,
        visits: visits.length,
        prescriptions: prescriptions.length,
        prescription_items: prescription_items.length,
        drugs_catalog: drugs_catalog.length
      }
    },
    data: {
      patients,
      appointments,
      visits,
      prescriptions,
      prescription_items,
      drugs_catalog
    }
  };

  return snapshot;
}

/**
 * Restore data from structured JSON snapshot
 */
async function restoreDatabaseSnapshot(snapshot) {
  if (!snapshot || !snapshot.data) {
    throw new Error('ملف النسخة الاحتياطية غير صالح أو تالف');
  }

  const { patients = [], appointments = [], visits = [], prescriptions = [], prescription_items = [], drugs_catalog = [] } = snapshot.data;
  const isPg = db.isPostgresConnected();

  if (isPg) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Clear existing records in correct foreign key order
      await client.query('DELETE FROM prescription_items');
      await client.query('DELETE FROM prescriptions');
      await client.query('DELETE FROM visits');
      await client.query('DELETE FROM appointments');
      await client.query('DELETE FROM patients');

      // 1. Insert Patients
      for (const p of patients) {
        await client.query(`
          INSERT INTO patients (
            id, patient_code, full_name, age, phone, phone_alt, husband_name, address,
            blood_group, allergies, chronic_diseases, gravida, para, abortion, living,
            cs_count, normal_delivery_count, is_pregnant, lmp, edd, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        `, [
          p.id, p.patient_code, p.full_name, p.age, p.phone, p.phone_alt || null, p.husband_name || null, p.address || null,
          p.blood_group || 'غير محدد', p.allergies || 'لا توجد حساسية معروفة', p.chronic_diseases || null,
          p.gravida || 0, p.para || 0, p.abortion || 0, p.living || 0, p.cs_count || 0, p.normal_delivery_count || 0,
          p.is_pregnant || false, p.lmp || null, p.edd || null, p.notes || null, p.created_at || new Date().toISOString()
        ]);
      }

      // 2. Insert Appointments
      for (const a of appointments) {
        await client.query(`
          INSERT INTO appointments (
            id, patient_id, appointment_date, appointment_time, queue_number, type, status, fee, is_paid, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          a.id, a.patient_id, a.appointment_date, a.appointment_time, a.queue_number,
          a.type || 'كشف جديد', a.status || 'محجوز', a.fee || 300.00, a.is_paid || false,
          a.notes || null, a.created_at || new Date().toISOString()
        ]);
      }

      // 3. Insert Visits
      for (const v of visits) {
        await client.query(`
          INSERT INTO visits (
            id, patient_id, appointment_id, visit_date, visit_time, visit_datetime, visit_type,
            chief_complaint, blood_pressure, weight_kg, temperature, gestational_age_weeks,
            gestational_age_days, fetal_heart_rate, ultrasound_findings, diagnosis, clinical_notes,
            next_visit_date, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `, [
          v.id, v.patient_id, v.appointment_id || null, v.visit_date, v.visit_time,
          v.visit_datetime || new Date().toISOString(), v.visit_type || 'كشف نساء وتوليد',
          v.chief_complaint || 'فحص روتيني', v.blood_pressure || null, v.weight_kg || null, v.temperature || null,
          v.gestational_age_weeks || null, v.gestational_age_days || null, v.fetal_heart_rate || null,
          v.ultrasound_findings || null, v.diagnosis || 'فحص طبي', v.clinical_notes || null,
          v.next_visit_date || null, v.created_at || new Date().toISOString()
        ]);
      }

      // 4. Insert Prescriptions
      for (const rx of prescriptions) {
        await client.query(`
          INSERT INTO prescriptions (
            id, visit_id, patient_id, prescription_code, issue_date, issue_time, diagnosis_summary, general_advice, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          rx.id, rx.visit_id || null, rx.patient_id, rx.prescription_code, rx.issue_date, rx.issue_time,
          rx.diagnosis_summary || null, rx.general_advice || null, rx.created_at || new Date().toISOString()
        ]);
      }

      // 5. Insert Prescription Items
      for (const it of prescription_items) {
        await client.query(`
          INSERT INTO prescription_items (
            id, prescription_id, medication_name, dosage, frequency, duration, instructions
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          it.id, it.prescription_id, it.medication_name, it.dosage || null,
          it.frequency || null, it.duration || null, it.instructions || null
        ]);
      }

      // Reset auto-increment sequences so future inserts don't collide
      await client.query(`SELECT setval('patients_id_seq', COALESCE((SELECT MAX(id) FROM patients), 1))`);
      await client.query(`SELECT setval('appointments_id_seq', COALESCE((SELECT MAX(id) FROM appointments), 1))`);
      await client.query(`SELECT setval('visits_id_seq', COALESCE((SELECT MAX(id) FROM visits), 1))`);
      await client.query(`SELECT setval('prescriptions_id_seq', COALESCE((SELECT MAX(id) FROM prescriptions), 1))`);
      if (prescription_items.length > 0) {
        await client.query(`SELECT setval('prescription_items_id_seq', COALESCE((SELECT MAX(id) FROM prescription_items), 1))`);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Transaction error during restore:', err);
      throw err;
    } finally {
      client.release();
    }
  } else {
    // Memory store fallback
    const store = db.getMemoryStore();
    store.patients = patients;
    store.appointments = appointments;
    store.visits = visits;

    // Attach items to prescriptions in memory
    const itemsByRx = {};
    prescription_items.forEach(it => {
      if (!itemsByRx[it.prescription_id]) itemsByRx[it.prescription_id] = [];
      itemsByRx[it.prescription_id].push(it);
    });

    store.prescriptions = prescriptions.map(rx => ({
      ...rx,
      items: rx.items || itemsByRx[rx.id] || []
    }));
  }

  return {
    restoredCounts: {
      patients: patients.length,
      appointments: appointments.length,
      visits: visits.length,
      prescriptions: prescriptions.length,
      prescription_items: prescription_items.length
    }
  };
}

// ----------------------------------------------------------------------------
// API Endpoints
// ----------------------------------------------------------------------------

/**
 * GET /api/backups/list
 * Returns list of local backup files with size and creation dates
 */
router.get('/list', async (req, res) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR);
    const backupList = [];

    for (const f of files) {
      if (f.endsWith('.json')) {
        const filePath = path.join(BACKUPS_DIR, f);
        const stats = fs.statSync(filePath);

        let metadata = null;
        try {
          // Read first 2KB to parse metadata header
          const fd = fs.openSync(filePath, 'r');
          const buffer = Buffer.alloc(3000);
          const bytesRead = fs.readSync(fd, buffer, 0, 3000, 0);
          fs.closeSync(fd);
          const partial = buffer.toString('utf8', 0, bytesRead);
          
          // Fast check for counts inside partial
          const matchPatients = partial.match(/"patients"\s*:\s*(\d+)/);
          const matchVisits = partial.match(/"visits"\s*:\s*(\d+)/);
          const matchPrescriptions = partial.match(/"prescriptions"\s*:\s*(\d+)/);

          metadata = {
            patientsCount: matchPatients ? parseInt(matchPatients[1], 10) : null,
            visitsCount: matchVisits ? parseInt(matchVisits[1], 10) : null,
            prescriptionsCount: matchPrescriptions ? parseInt(matchPrescriptions[1], 10) : null
          };
        } catch (e) {
          metadata = null;
        }

        backupList.push({
          filename: f,
          sizeBytes: stats.size,
          sizeFormatted: (stats.size / 1024).toFixed(1) + ' KB',
          createdAt: stats.mtime.toISOString(),
          metadata
        });
      }
    }

    // Sort newest first
    backupList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      count: backupList.length,
      backups: backupList
    });
  } catch (err) {
    console.error('Failed to list backups:', err);
    res.status(500).json({ success: false, error: 'تعذر قراءة قائمة النسخ الاحتياطية' });
  }
});

/**
 * POST /api/backups/create
 * Generates a full snapshot and saves it as a JSON file in backups/ directory
 */
router.post('/create', async (req, res) => {
  try {
    const snapshot = await fetchFullDatabaseSnapshot();
    const note = req.body.note ? `_${req.body.note.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_')}` : '';
    
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup-dha-${timestamp}${note}.json`;
    const filePath = path.join(BACKUPS_DIR, filename);

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
    const stats = fs.statSync(filePath);

    res.json({
      success: true,
      message: 'تم إنشاء النسخة الاحتياطية بنجاح وحفظها في النظام',
      backup: {
        filename,
        sizeFormatted: (stats.size / 1024).toFixed(1) + ' KB',
        createdAt: stats.mtime.toISOString(),
        counts: snapshot.metadata.counts
      }
    });
  } catch (err) {
    console.error('Failed to create backup:', err);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء أخذ النسخة الاحتياطية: ' + err.message });
  }
});

/**
 * GET /api/backups/export-now
 * Downloads immediate snapshot directly to browser
 */
router.get('/export-now', async (req, res) => {
  try {
    const snapshot = await fetchFullDatabaseSnapshot();
    const now = new Date().toISOString().slice(0, 10);
    const filename = `dha-clinic-backup-${now}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(snapshot, null, 2));
  } catch (err) {
    console.error('Failed to export backup now:', err);
    res.status(500).json({ success: false, error: 'تعذر تنزيل النسخة الاحتياطية' });
  }
});

/**
 * GET /api/backups/download/:filename
 * Downloads a specific existing backup file
 */
router.get('/download/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(BACKUPS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'الملف غير موجود' });
  }

  res.download(filePath, filename);
});

/**
 * POST /api/backups/restore/:filename
 * Restores the system database from an existing local backup file
 */
router.post('/restore/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(BACKUPS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'ملف النسخة الاحتياطية غير موجود' });
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const snapshot = JSON.parse(raw);

    const result = await restoreDatabaseSnapshot(snapshot);

    res.json({
      success: true,
      message: 'تمت استعادة النسخة الاحتياطية بنجاح وتحديث كافة البيانات في النظام',
      result
    });
  } catch (err) {
    console.error('Failed to restore from file:', err);
    res.status(500).json({ success: false, error: 'فشلت عملية الاستعادة: ' + err.message });
  }
});

/**
 * POST /api/backups/upload-restore
 * Restores data from uploaded JSON snapshot in request body
 */
router.post('/upload-restore', async (req, res) => {
  try {
    const snapshot = req.body;
    if (!snapshot || !snapshot.data) {
      return res.status(400).json({ success: false, error: 'بيانات النسخة الاحتياطية المرفوعة غير صالحة' });
    }

    const result = await restoreDatabaseSnapshot(snapshot);

    // Also auto-save a copy of the uploaded backup
    try {
      const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `uploaded-backup-${now}.json`;
      fs.writeFileSync(path.join(BACKUPS_DIR, filename), JSON.stringify(snapshot, null, 2), 'utf8');
    } catch (saveErr) {
      console.warn('Could not archive uploaded backup:', saveErr.message);
    }

    res.json({
      success: true,
      message: 'تمت استعادة البيانات من الملف المرفوع بنجاح',
      result
    });
  } catch (err) {
    console.error('Failed to restore uploaded data:', err);
    res.status(500).json({ success: false, error: 'تعذر استعادة البيانات من الملف المرفوع: ' + err.message });
  }
});

/**
 * DELETE /api/backups/:filename
 * Deletes a local backup file
 */
router.delete('/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(BACKUPS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'الملف غير موجود' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'تم حذف النسخة الاحتياطية بنجاح' });
  } catch (err) {
    console.error('Failed to delete backup:', err);
    res.status(500).json({ success: false, error: 'تعذر حذف الملف: ' + err.message });
  }
});

module.exports = router;

