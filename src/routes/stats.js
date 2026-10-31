const express = require('express');
const router = express.Router();
const db = require('../db');

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

router.get('/dashboard', async (req, res) => {
  try {
    const today = getLocalDateString();

    if (db.isPostgresConnected()) {
      const [
        totalPatients,
        pregnantPatients,
        todayAppointments,
        waitingCount,
        inProgressCount,
        completedCount,
        totalVisits,
        totalPrescriptions,
        recentAppointments
      ] = await Promise.all([
        db.query('SELECT COUNT(*) FROM patients'),
        db.query('SELECT COUNT(*) FROM patients WHERE is_pregnant = true'),
        db.query('SELECT COUNT(*) FROM appointments WHERE appointment_date = $1', [today]),
        db.query("SELECT COUNT(*) FROM appointments WHERE appointment_date = $1 AND status = 'في الانتظار'", [today]),
        db.query("SELECT COUNT(*) FROM appointments WHERE appointment_date = $1 AND status = 'جاري الكشف'", [today]),
        db.query("SELECT COUNT(*) FROM appointments WHERE appointment_date = $1 AND status = 'مكتمل'", [today]),
        db.query('SELECT COUNT(*) FROM visits'),
        db.query('SELECT COUNT(*) FROM prescriptions'),
        db.query(`
          SELECT a.*, p.full_name as patient_name, p.phone as patient_phone, p.patient_code
          FROM appointments a
          JOIN patients p ON a.patient_id = p.id
          WHERE a.appointment_date = $1
          ORDER BY a.queue_number ASC
          LIMIT 100
        `, [today])
      ]);

      return res.json({
        success: true,
        stats: {
          totalPatients: parseInt(totalPatients.rows[0].count, 10),
          pregnantPatients: parseInt(pregnantPatients.rows[0].count, 10),
          todayAppointments: parseInt(todayAppointments.rows[0].count, 10),
          waitingCount: parseInt(waitingCount.rows[0].count, 10),
          inProgressCount: parseInt(inProgressCount.rows[0].count, 10),
          completedCount: parseInt(completedCount.rows[0].count, 10),
          totalVisits: parseInt(totalVisits.rows[0].count, 10),
          totalPrescriptions: parseInt(totalPrescriptions.rows[0].count, 10)
        },
        todayQueue: recentAppointments.rows,
        databaseStatus: {
          isPostgres: true,
          mode: 'Docker PostgreSQL 16 (Live)'
        }
      });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    const todayApps = store.appointments.filter(a => a.appointment_date === today).map(a => {
      const p = store.patients.find(pt => pt.id === a.patient_id) || {};
      return {
        ...a,
        patient_name: p.full_name,
        patient_phone: p.phone,
        patient_code: p.patient_code
      };
    });

    return res.json({
      success: true,
      stats: {
        totalPatients: store.patients.length,
        pregnantPatients: store.patients.filter(p => p.is_pregnant).length,
        todayAppointments: todayApps.length,
        waitingCount: todayApps.filter(a => a.status === 'في الانتظار').length,
        inProgressCount: todayApps.filter(a => a.status === 'جاري الكشف').length,
        completedCount: todayApps.filter(a => a.status === 'مكتمل').length,
        totalVisits: store.visits.length,
        totalPrescriptions: store.prescriptions.length
      },
      todayQueue: todayApps,
      databaseStatus: {
        isPostgres: false,
        mode: 'Resilient Cache (Ready for Docker PostgreSQL)'
      }
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET global search across patients, visits, appointments, prescriptions
router.get('/global-search', async (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    if (!q || q.length < 2) {
      return res.json({ success: true, results: { patients: [], appointments: [], visits: [], prescriptions: [] } });
    }

    if (db.isPostgresConnected()) {
      const searchParam = `%${q}%`;
      const [patientsRes, appointmentsRes, visitsRes, prescriptionsRes] = await Promise.all([
        db.query(`
          SELECT id, patient_code, full_name, phone, age, is_pregnant, blood_group, husband_name
          FROM patients
          WHERE full_name ILIKE $1 OR phone ILIKE $1 OR patient_code ILIKE $1 OR husband_name ILIKE $1
          ORDER BY id DESC LIMIT 5
        `, [searchParam]),
        db.query(`
          SELECT a.id, a.patient_id, a.appointment_date, a.appointment_time, a.status, a.type, a.queue_number,
                 p.full_name as patient_name, p.phone as patient_phone
          FROM appointments a
          JOIN patients p ON a.patient_id = p.id
          WHERE p.full_name ILIKE $1 OR p.phone ILIKE $1 OR a.notes ILIKE $1
          ORDER BY a.appointment_date DESC, a.queue_number ASC LIMIT 5
        `, [searchParam]),
        db.query(`
          SELECT v.id, v.patient_id, v.visit_date, v.visit_time, v.diagnosis, v.visit_type,
                 p.full_name as patient_name
          FROM visits v
          JOIN patients p ON v.patient_id = p.id
          WHERE p.full_name ILIKE $1 OR v.diagnosis ILIKE $1 OR v.ultrasound_findings ILIKE $1 OR v.chief_complaint ILIKE $1
          ORDER BY v.visit_date DESC, v.id DESC LIMIT 5
        `, [searchParam]),
        db.query(`
          SELECT pr.id, pr.patient_id, pr.prescription_code, pr.issue_date, pr.diagnosis_summary,
                 p.full_name as patient_name,
                 (SELECT COUNT(*) FROM prescription_items WHERE prescription_id = pr.id) as items_count,
                 (SELECT string_agg(medication_name, '، ') FROM prescription_items WHERE prescription_id = pr.id) as medications_summary
          FROM prescriptions pr
          JOIN patients p ON pr.patient_id = p.id
          WHERE p.full_name ILIKE $1 
             OR pr.prescription_code ILIKE $1 
             OR pr.diagnosis_summary ILIKE $1
             OR EXISTS (SELECT 1 FROM prescription_items pi WHERE pi.prescription_id = pr.id AND pi.medication_name ILIKE $1)
          ORDER BY pr.issue_date DESC, pr.id DESC LIMIT 5
        `, [searchParam])
      ]);

      return res.json({
        success: true,
        results: {
          patients: patientsRes.rows,
          appointments: appointmentsRes.rows,
          visits: visitsRes.rows,
          prescriptions: prescriptionsRes.rows
        }
      });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    const lower = q.toLowerCase();
    const matchedPatients = store.patients.filter(p =>
      (p.full_name && p.full_name.toLowerCase().includes(lower)) ||
      (p.phone && p.phone.includes(lower)) ||
      (p.patient_code && p.patient_code.toLowerCase().includes(lower)) ||
      (p.husband_name && p.husband_name.toLowerCase().includes(lower))
    ).slice(0, 5);

    const matchedAppointments = store.appointments.filter(a => {
      const p = store.patients.find(pt => pt.id === a.patient_id) || {};
      return (p.full_name && p.full_name.toLowerCase().includes(lower)) || 
             (p.phone && p.phone.includes(lower)) || 
             (a.notes && a.notes.toLowerCase().includes(lower));
    }).map(a => {
      const p = store.patients.find(pt => pt.id === a.patient_id) || {};
      return {
        ...a,
        patient_name: p.full_name,
        patient_phone: p.phone
      };
    }).slice(0, 5);

    const matchedVisits = store.visits.filter(v => {
      const p = store.patients.find(pt => pt.id === v.patient_id) || {};
      return (p.full_name && p.full_name.toLowerCase().includes(lower)) || 
             (v.diagnosis && v.diagnosis.toLowerCase().includes(lower)) ||
             (v.chief_complaint && v.chief_complaint.toLowerCase().includes(lower)) ||
             (v.ultrasound_findings && v.ultrasound_findings.toLowerCase().includes(lower));
    }).map(v => {
      const p = store.patients.find(pt => pt.id === v.patient_id) || {};
      return {
        ...v,
        patient_name: p.full_name
      };
    }).slice(0, 5);

    const matchedPrescriptions = store.prescriptions.filter(pr => {
      const p = store.patients.find(pt => pt.id === pr.patient_id) || {};
      const hasMed = (pr.items || []).some(it => it.medication_name && it.medication_name.toLowerCase().includes(lower));
      return (p.full_name && p.full_name.toLowerCase().includes(lower)) || 
             (pr.prescription_code && pr.prescription_code.toLowerCase().includes(lower)) ||
             (pr.diagnosis_summary && pr.diagnosis_summary.toLowerCase().includes(lower)) ||
             hasMed;
    }).map(pr => {
      const p = store.patients.find(pt => pt.id === pr.patient_id) || {};
      const items = pr.items || [];
      return {
        ...pr,
        patient_name: p.full_name,
        items_count: items.length,
        medications_summary: items.map(i => i.medication_name).join('، ')
      };
    }).slice(0, 5);

    return res.json({
      success: true,
      results: {
        patients: matchedPatients,
        appointments: matchedAppointments,
        visits: matchedVisits,
        prescriptions: matchedPrescriptions
      }
    });
  } catch (err) {
    console.error('Error in global search:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
