const express = require('express');
const router = express.Router();
const db = require('../db');

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET appointments (default: today or filter by ?date=YYYY-MM-DD or date=all, plus q, status, is_paid, type)
router.get('/', async (req, res) => {
  try {
    const filterDate = req.query.date !== undefined ? req.query.date.trim() : getLocalDateString();
    const search = req.query.q ? req.query.q.trim() : '';
    const status = req.query.status ? req.query.status.trim() : '';
    const isPaid = req.query.is_paid !== undefined && req.query.is_paid !== '' ? req.query.is_paid === 'true' : null;
    const type = req.query.type ? req.query.type.trim() : '';
    
    if (db.isPostgresConnected()) {
      let queryText = `
        SELECT a.*, 
               p.full_name as patient_name, 
               p.phone as patient_phone, 
               p.patient_code,
               p.age as patient_age,
               p.is_pregnant,
               p.blood_group
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
      `;
      const conditions = [];
      const params = [];
      let pIdx = 1;

      if (filterDate && filterDate !== 'all') {
        conditions.push(`a.appointment_date = $${pIdx++}`);
        params.push(filterDate);
      }

      if (search) {
        conditions.push(`(p.full_name ILIKE $${pIdx} OR p.phone ILIKE $${pIdx} OR p.patient_code ILIKE $${pIdx} OR a.notes ILIKE $${pIdx})`);
        params.push(`%${search}%`);
        pIdx++;
      }

      if (status && status !== 'all') {
        conditions.push(`a.status = $${pIdx++}`);
        params.push(status);
      }

      if (isPaid !== null) {
        conditions.push(`a.is_paid = $${pIdx++}`);
        params.push(isPaid);
      }

      if (type && type !== 'all') {
        conditions.push(`a.type = $${pIdx++}`);
        params.push(type);
      }

      if (conditions.length > 0) {
        queryText += ` WHERE ` + conditions.join(' AND ');
      }

      queryText += ` ORDER BY a.appointment_date DESC, a.queue_number ASC, a.appointment_time ASC`;

      const result = await db.query(queryText, params);
      return res.json({ success: true, date: filterDate, data: result.rows });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    let rows = store.appointments.map(a => {
      const p = store.patients.find(pt => pt.id === a.patient_id) || {};
      return {
        ...a,
        patient_name: p.full_name || a.patient_name,
        patient_phone: p.phone || a.patient_phone,
        patient_code: p.patient_code,
        patient_age: p.age,
        is_pregnant: p.is_pregnant,
        blood_group: p.blood_group
      };
    });

    if (filterDate && filterDate !== 'all') {
      rows = rows.filter(a => a.appointment_date === filterDate);
    }

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(a =>
        (a.patient_name && a.patient_name.toLowerCase().includes(q)) ||
        (a.patient_phone && a.patient_phone.includes(q)) ||
        (a.patient_code && a.patient_code.toLowerCase().includes(q)) ||
        (a.notes && a.notes.toLowerCase().includes(q))
      );
    }

    if (status && status !== 'all') {
      rows = rows.filter(a => a.status === status);
    }

    if (isPaid !== null) {
      rows = rows.filter(a => Boolean(a.is_paid) === isPaid);
    }

    if (type && type !== 'all') {
      rows = rows.filter(a => a.type === type);
    }

    rows.sort((a, b) => a.queue_number - b.queue_number);
    return res.json({ success: true, date: filterDate, data: rows });
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST book new appointment
router.post('/', async (req, res) => {
  try {
    const { patient_id, appointment_date, appointment_time, type, fee, notes } = req.body;

    if (!patient_id) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد المريضة' });
    }

    const appDate = appointment_date || getLocalDateString();
    const appTime = appointment_time || '18:00:00';
    const appType = type || 'كشف جديد';
    const appFee = fee !== undefined ? parseFloat(fee) : 300.00;

    if (db.isPostgresConnected()) {
      // Calculate next queue number for this date
      const qRes = await db.query(
        'SELECT COALESCE(MAX(queue_number), 0) + 1 AS next_queue FROM appointments WHERE appointment_date = $1',
        [appDate]
      );
      const queueNumber = parseInt(qRes.rows[0].next_queue, 10);

      const insRes = await db.query(`
        INSERT INTO appointments (patient_id, appointment_date, appointment_time, queue_number, type, status, fee, is_paid, notes)
        VALUES ($1, $2, $3, $4, $5, 'محجوز', $6, false, $7)
        RETURNING *
      `, [patient_id, appDate, appTime, queueNumber, appType, appFee, notes || null]);

      return res.status(201).json({ success: true, data: insRes.rows[0] });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    const sameDateApps = store.appointments.filter(a => a.appointment_date === appDate);
    const queueNumber = sameDateApps.length > 0 ? Math.max(...sameDateApps.map(a => a.queue_number)) + 1 : 1;
    const nextId = store.appointments.length > 0 ? Math.max(...store.appointments.map(a => a.id)) + 1 : 1;
    const patient = store.patients.find(p => p.id === parseInt(patient_id, 10));

    const newApp = {
      id: nextId,
      patient_id: parseInt(patient_id, 10),
      patient_name: patient ? patient.full_name : '',
      patient_phone: patient ? patient.phone : '',
      appointment_date: appDate,
      appointment_time: appTime,
      queue_number: queueNumber,
      type: appType,
      status: 'محجوز',
      fee: appFee,
      is_paid: false,
      notes: notes || null,
      created_at: new Date().toISOString()
    };
    store.appointments.push(newApp);
    return res.status(201).json({ success: true, data: newApp });
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH change appointment status (e.g. 'محجوز', 'في الانتظار', 'جاري الكشف', 'مكتمل', 'ملغي')
router.patch('/:id/status', async (req, res) => {
  try {
    const appId = parseInt(req.params.id, 10);
    const { status, is_paid } = req.body;

    if (db.isPostgresConnected()) {
      let queryText = 'UPDATE appointments SET ';
      const updates = [];
      const params = [];
      let pIdx = 1;

      if (status !== undefined) {
        updates.push(`status = $${pIdx++}`);
        params.push(status);
      }
      if (is_paid !== undefined) {
        updates.push(`is_paid = $${pIdx++}`);
        params.push(Boolean(is_paid));
      }
      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'لا توجد بيانات للتحديث' });
      }

      queryText += updates.join(', ') + ` WHERE id = $${pIdx} RETURNING *`;
      params.push(appId);

      const result = await db.query(queryText, params);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'الموعد غير موجود' });
      }
      return res.json({ success: true, data: result.rows[0] });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    const app = store.appointments.find(a => a.id === appId);
    if (!app) {
      return res.status(404).json({ success: false, message: 'الموعد غير موجود' });
    }
    if (status !== undefined) app.status = status;
    if (is_paid !== undefined) app.is_paid = Boolean(is_paid);
    return res.json({ success: true, data: app });
  } catch (err) {
    console.error('Error updating appointment status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update appointment details
router.put('/:id', async (req, res) => {
  try {
    const appId = parseInt(req.params.id, 10);
    if (isNaN(appId)) {
      return res.status(400).json({ success: false, message: 'معرف الموعد غير صالح' });
    }

    const { appointment_date, appointment_time, type, fee, status, is_paid, notes } = req.body;

    if (db.isPostgresConnected()) {
      const updates = [];
      const params = [];
      let pIdx = 1;

      if (appointment_date !== undefined) { updates.push(`appointment_date = $${pIdx++}`); params.push(appointment_date); }
      if (appointment_time !== undefined) { updates.push(`appointment_time = $${pIdx++}`); params.push(appointment_time); }
      if (type !== undefined) { updates.push(`type = $${pIdx++}`); params.push(type.trim()); }
      if (fee !== undefined) { updates.push(`fee = $${pIdx++}`); params.push(parseFloat(fee)); }
      if (status !== undefined) { updates.push(`status = $${pIdx++}`); params.push(status.trim()); }
      if (is_paid !== undefined) { updates.push(`is_paid = $${pIdx++}`); params.push(Boolean(is_paid)); }
      if (notes !== undefined) { updates.push(`notes = $${pIdx++}`); params.push(notes ? notes.trim() : null); }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'لا توجد بيانات للتحديث' });
      }

      params.push(appId);
      const queryText = `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING *`;
      const result = await db.query(queryText, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'الموعد غير موجود' });
      }
      return res.json({ success: true, data: result.rows[0] });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    const app = store.appointments.find(a => a.id === appId);
    if (!app) {
      return res.status(404).json({ success: false, message: 'الموعد غير موجود' });
    }
    if (appointment_date !== undefined) app.appointment_date = appointment_date;
    if (appointment_time !== undefined) app.appointment_time = appointment_time;
    if (type !== undefined) app.type = type.trim();
    if (fee !== undefined) app.fee = parseFloat(fee);
    if (status !== undefined) app.status = status.trim();
    if (is_paid !== undefined) app.is_paid = Boolean(is_paid);
    if (notes !== undefined) app.notes = notes ? notes.trim() : null;

    return res.json({ success: true, data: app });
  } catch (err) {
    console.error('Error updating appointment:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE appointment
router.delete('/:id', async (req, res) => {
  try {
    const appId = parseInt(req.params.id, 10);
    if (db.isPostgresConnected()) {
      await db.query('DELETE FROM appointments WHERE id = $1', [appId]);
      return res.json({ success: true, message: 'تم حذف الموعد بنجاح' });
    }

    const store = db.getMemoryStore();
    store.appointments = store.appointments.filter(a => a.id !== appId);
    return res.json({ success: true, message: 'تم حذف الموعد بنجاح' });
  } catch (err) {
    console.error('Error deleting appointment:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

