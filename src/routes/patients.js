const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all patients with optional search query, filters, and sorting
router.get('/', async (req, res) => {
  try {
    const search = req.query.q ? req.query.q.trim() : '';
    const isPregnant = req.query.is_pregnant !== undefined && req.query.is_pregnant !== '' ? req.query.is_pregnant === 'true' : null;
    const bloodGroup = req.query.blood_group ? req.query.blood_group.trim() : '';
    const history = req.query.history ? req.query.history.trim() : '';
    const sort = req.query.sort ? req.query.sort.trim() : 'newest';

    if (db.isPostgresConnected()) {
      let queryText = `
        SELECT p.*,
          (SELECT COUNT(*) FROM visits v WHERE v.patient_id = p.id)::int as visits_count,
          (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id)::int as appointments_count
        FROM patients p
      `;
      const conditions = [];
      const params = [];
      let pIdx = 1;

      if (search) {
        conditions.push(`(
          p.full_name ILIKE $${pIdx} OR 
          p.phone ILIKE $${pIdx} OR 
          p.patient_code ILIKE $${pIdx} OR 
          p.husband_name ILIKE $${pIdx} OR 
          p.address ILIKE $${pIdx} OR 
          p.chronic_diseases ILIKE $${pIdx}
        )`);
        params.push(`%${search}%`);
        pIdx++;
      }

      if (isPregnant !== null) {
        conditions.push(`p.is_pregnant = $${pIdx++}`);
        params.push(isPregnant);
      }

      if (bloodGroup && bloodGroup !== 'all') {
        conditions.push(`p.blood_group = $${pIdx++}`);
        params.push(bloodGroup);
      }

      if (history === 'cs') {
        conditions.push(`p.cs_count > 0`);
      } else if (history === 'abortion') {
        conditions.push(`p.abortion > 0`);
      } else if (history === 'primigravida') {
        conditions.push(`p.gravida = 1`);
      } else if (history === 'multipara') {
        conditions.push(`p.para >= 2`);
      }

      if (conditions.length > 0) {
        queryText += ` WHERE ` + conditions.join(' AND ');
      }

      if (sort === 'oldest') {
        queryText += ` ORDER BY p.id ASC`;
      } else if (sort === 'name_asc') {
        queryText += ` ORDER BY p.full_name ASC`;
      } else if (sort === 'age_desc') {
        queryText += ` ORDER BY p.age DESC`;
      } else if (sort === 'age_asc') {
        queryText += ` ORDER BY p.age ASC`;
      } else {
        queryText += ` ORDER BY p.id DESC`;
      }

      const result = await db.query(queryText, params);
      return res.json({ success: true, data: result.rows });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    let rows = [...store.patients];

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(p => 
        (p.full_name && p.full_name.toLowerCase().includes(q)) || 
        (p.phone && p.phone.includes(q)) ||
        (p.patient_code && p.patient_code.toLowerCase().includes(q)) ||
        (p.husband_name && p.husband_name.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q)) ||
        (p.chronic_diseases && p.chronic_diseases.toLowerCase().includes(q))
      );
    }

    if (isPregnant !== null) {
      rows = rows.filter(p => Boolean(p.is_pregnant) === isPregnant);
    }

    if (bloodGroup && bloodGroup !== 'all') {
      rows = rows.filter(p => p.blood_group === bloodGroup);
    }

    if (history === 'cs') {
      rows = rows.filter(p => (p.cs_count || 0) > 0);
    } else if (history === 'abortion') {
      rows = rows.filter(p => (p.abortion || 0) > 0);
    } else if (history === 'primigravida') {
      rows = rows.filter(p => (p.gravida || 0) === 1);
    } else if (history === 'multipara') {
      rows = rows.filter(p => (p.para || 0) >= 2);
    }

    let enhanced = rows.map(p => ({
      ...p,
      visits_count: store.visits.filter(v => v.patient_id === p.id).length,
      appointments_count: store.appointments.filter(a => a.patient_id === p.id).length
    }));

    if (sort === 'oldest') {
      enhanced.sort((a, b) => a.id - b.id);
    } else if (sort === 'name_asc') {
      enhanced.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
    } else if (sort === 'age_desc') {
      enhanced.sort((a, b) => (b.age || 0) - (a.age || 0));
    } else if (sort === 'age_asc') {
      enhanced.sort((a, b) => (a.age || 0) - (b.age || 0));
    } else {
      enhanced.sort((a, b) => b.id - a.id);
    }

    return res.json({ success: true, data: enhanced });
  } catch (err) {
    console.error('Error fetching patients:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single patient by ID with full history
router.get('/:id', async (req, res) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    if (isNaN(patientId)) {
      return res.status(400).json({ success: false, message: 'معرف المريضة غير صالح' });
    }

    if (db.isPostgresConnected()) {
      const pRes = await db.query('SELECT * FROM patients WHERE id = $1', [patientId]);
      if (pRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'المريضة غير موجودة' });
      }
      const patient = pRes.rows[0];
      const vRes = await db.query('SELECT * FROM visits WHERE patient_id = $1 ORDER BY visit_date DESC, visit_time DESC', [patientId]);
      const aRes = await db.query('SELECT * FROM appointments WHERE patient_id = $1 ORDER BY appointment_date DESC, appointment_time DESC', [patientId]);
      const rxRes = await db.query(`
        SELECT p.*, COALESCE(json_agg(pi.*) FILTER (WHERE pi.id IS NOT NULL), '[]') as items 
        FROM prescriptions p 
        LEFT JOIN prescription_items pi ON pi.prescription_id = p.id 
        WHERE p.patient_id = $1 
        GROUP BY p.id 
        ORDER BY p.issue_date DESC, p.issue_time DESC
      `, [patientId]);

      const attRes = await db.query(`
        SELECT va.*, v.visit_date, v.visit_time, v.gestational_age_weeks, v.diagnosis
        FROM visit_attachments va
        LEFT JOIN visits v ON va.visit_id = v.id
        WHERE va.patient_id = $1
        ORDER BY va.created_at DESC
      `, [patientId]);

      const visitsWithAtt = vRes.rows.map(v => ({
        ...v,
        attachments: attRes.rows.filter(a => a.visit_id === v.id)
      }));

      return res.json({
        success: true,
        data: {
          ...patient,
          visits: visitsWithAtt,
          appointments: aRes.rows,
          prescriptions: rxRes.rows,
          attachments: attRes.rows
        }
      });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    const patient = store.patients.find(p => p.id === patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'المريضة غير موجودة' });
    }
    const visits = store.visits.filter(v => v.patient_id === patientId);
    const appointments = store.appointments.filter(a => a.patient_id === patientId);
    const prescriptions = store.prescriptions.filter(p => p.patient_id === patientId);

    return res.json({
      success: true,
      data: {
        ...patient,
        visits,
        appointments,
        prescriptions
      }
    });
  } catch (err) {
    console.error('Error fetching patient:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create new patient
router.post('/', async (req, res) => {
  try {
    const {
      full_name,
      age,
      phone,
      phone_alt,
      husband_name,
      address,
      blood_group,
      allergies,
      chronic_diseases,
      gravida,
      para,
      abortion,
      living,
      cs_count,
      normal_delivery_count,
      is_pregnant,
      lmp,
      edd,
      notes
    } = req.body;

    if (!full_name || !phone || age === undefined || age === null || isNaN(parseInt(age, 10))) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال اسم المريضة ورقم الهاتف والسن بشكل صحيح' });
    }

    if (db.isPostgresConnected()) {
      // Generate 4-digit numeric patient code (e.g. 0001, 0002, 0003...)
      const maxRes = await db.query(`
        SELECT COALESCE(MAX(CASE WHEN patient_code ~ '^\\d+$' THEN CAST(patient_code AS INTEGER) ELSE id END), 0) + 1 AS next_num 
        FROM patients
      `);
      const nextNum = parseInt(maxRes.rows[0].next_num, 10);
      const patient_code = String(nextNum).padStart(4, '0');

      const insertRes = await db.query(`
        INSERT INTO patients (
          patient_code, full_name, age, phone, phone_alt, husband_name, address,
          blood_group, allergies, chronic_diseases, gravida, para, abortion,
          living, cs_count, normal_delivery_count, is_pregnant, lmp, edd, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `, [
        patient_code, full_name.trim(), parseInt(age, 10), phone.trim(), phone_alt ? phone_alt.trim() : null,
        husband_name ? husband_name.trim() : null, address ? address.trim() : null, blood_group || 'غير محدد',
        allergies || 'لا توجد حساسية معروفة', chronic_diseases || null,
        parseInt(gravida || 0, 10), parseInt(para || 0, 10), parseInt(abortion || 0, 10),
        parseInt(living || 0, 10), parseInt(cs_count || 0, 10), parseInt(normal_delivery_count || 0, 10),
        Boolean(is_pregnant), lmp || null, edd || null, notes ? notes.trim() : null
      ]);

      return res.status(201).json({ success: true, data: insertRes.rows[0] });
    }

    // Memory fallback - 4-digit numeric patient code
    const store = db.getMemoryStore();
    let maxNum = 0;
    for (const p of store.patients) {
      const codeNum = parseInt(p.patient_code, 10);
      if (!isNaN(codeNum) && codeNum > maxNum) maxNum = codeNum;
      if (p.id > maxNum) maxNum = p.id;
    }
    const nextId = store.patients.length > 0 ? Math.max(...store.patients.map(p => p.id)) + 1 : 1;
    const patient_code = String(maxNum + 1).padStart(4, '0');

    const newPatient = {
      id: nextId,
      patient_code,
      full_name: full_name.trim(),
      age: parseInt(age, 10),
      phone: phone.trim(),
      phone_alt: phone_alt ? phone_alt.trim() : null,
      husband_name: husband_name ? husband_name.trim() : null,
      address: address ? address.trim() : null,
      blood_group: blood_group || 'غير محدد',
      allergies: allergies || 'لا توجد حساسية معروفة',
      chronic_diseases: chronic_diseases || null,
      gravida: parseInt(gravida || 0, 10),
      para: parseInt(para || 0, 10),
      abortion: parseInt(abortion || 0, 10),
      living: parseInt(living || 0, 10),
      cs_count: parseInt(cs_count || 0, 10),
      normal_delivery_count: parseInt(normal_delivery_count || 0, 10),
      is_pregnant: Boolean(is_pregnant),
      lmp: lmp || null,
      edd: edd || null,
      notes: notes ? notes.trim() : null,
      created_at: new Date().toISOString()
    };
    store.patients.unshift(newPatient);
    return res.status(201).json({ success: true, data: newPatient });
  } catch (err) {
    console.error('Error creating patient:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update patient
router.put('/:id', async (req, res) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    if (isNaN(patientId)) {
      return res.status(400).json({ success: false, message: 'معرف المريضة غير صالح' });
    }

    const {
      full_name, age, phone, phone_alt, husband_name, address,
      blood_group, allergies, chronic_diseases, gravida, para,
      abortion, living, cs_count, normal_delivery_count,
      is_pregnant, lmp, edd, notes
    } = req.body;

    if (db.isPostgresConnected()) {
      const updates = [];
      const params = [];
      let pIdx = 1;

      if (full_name !== undefined) { updates.push(`full_name = $${pIdx++}`); params.push(full_name.trim()); }
      if (age !== undefined && age !== '' && !isNaN(parseInt(age, 10))) { updates.push(`age = $${pIdx++}`); params.push(parseInt(age, 10)); }
      if (phone !== undefined) { updates.push(`phone = $${pIdx++}`); params.push(phone.trim()); }
      if (phone_alt !== undefined) { updates.push(`phone_alt = $${pIdx++}`); params.push(phone_alt ? phone_alt.trim() : null); }
      if (husband_name !== undefined) { updates.push(`husband_name = $${pIdx++}`); params.push(husband_name ? husband_name.trim() : null); }
      if (address !== undefined) { updates.push(`address = $${pIdx++}`); params.push(address ? address.trim() : null); }
      if (blood_group !== undefined) { updates.push(`blood_group = $${pIdx++}`); params.push(blood_group || 'غير محدد'); }
      if (allergies !== undefined) { updates.push(`allergies = $${pIdx++}`); params.push(allergies || 'لا توجد حساسية معروفة'); }
      if (chronic_diseases !== undefined) { updates.push(`chronic_diseases = $${pIdx++}`); params.push(chronic_diseases || null); }
      if (gravida !== undefined) { updates.push(`gravida = $${pIdx++}`); params.push(parseInt(gravida || 0, 10)); }
      if (para !== undefined) { updates.push(`para = $${pIdx++}`); params.push(parseInt(para || 0, 10)); }
      if (abortion !== undefined) { updates.push(`abortion = $${pIdx++}`); params.push(parseInt(abortion || 0, 10)); }
      if (living !== undefined) { updates.push(`living = $${pIdx++}`); params.push(parseInt(living || 0, 10)); }
      if (cs_count !== undefined) { updates.push(`cs_count = $${pIdx++}`); params.push(parseInt(cs_count || 0, 10)); }
      if (normal_delivery_count !== undefined) { updates.push(`normal_delivery_count = $${pIdx++}`); params.push(parseInt(normal_delivery_count || 0, 10)); }
      if (is_pregnant !== undefined) { updates.push(`is_pregnant = $${pIdx++}`); params.push(Boolean(is_pregnant)); }
      if (lmp !== undefined) { updates.push(`lmp = $${pIdx++}`); params.push(lmp || null); }
      if (edd !== undefined) { updates.push(`edd = $${pIdx++}`); params.push(edd || null); }
      if (notes !== undefined) { updates.push(`notes = $${pIdx++}`); params.push(notes ? notes.trim() : null); }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      params.push(patientId);
      const queryText = `UPDATE patients SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING *`;
      const updateRes = await db.query(queryText, params);

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'المريضة غير موجودة' });
      }
      return res.json({ success: true, data: updateRes.rows[0] });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    const idx = store.patients.findIndex(p => p.id === patientId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'المريضة غير موجودة' });
    }
    const current = store.patients[idx];
    const updated = {
      ...current,
      full_name: full_name !== undefined ? full_name.trim() : current.full_name,
      age: age !== undefined && !isNaN(parseInt(age, 10)) ? parseInt(age, 10) : current.age,
      phone: phone !== undefined ? phone.trim() : current.phone,
      phone_alt: phone_alt !== undefined ? (phone_alt ? phone_alt.trim() : null) : current.phone_alt,
      husband_name: husband_name !== undefined ? (husband_name ? husband_name.trim() : null) : current.husband_name,
      address: address !== undefined ? (address ? address.trim() : null) : current.address,
      blood_group: blood_group !== undefined ? blood_group : current.blood_group,
      allergies: allergies !== undefined ? allergies : current.allergies,
      chronic_diseases: chronic_diseases !== undefined ? chronic_diseases : current.chronic_diseases,
      gravida: gravida !== undefined ? parseInt(gravida, 10) : current.gravida,
      para: para !== undefined ? parseInt(para, 10) : current.para,
      abortion: abortion !== undefined ? parseInt(abortion, 10) : current.abortion,
      living: living !== undefined ? parseInt(living, 10) : current.living,
      cs_count: cs_count !== undefined ? parseInt(cs_count, 10) : current.cs_count,
      normal_delivery_count: normal_delivery_count !== undefined ? parseInt(normal_delivery_count, 10) : current.normal_delivery_count,
      is_pregnant: is_pregnant !== undefined ? Boolean(is_pregnant) : current.is_pregnant,
      lmp: lmp !== undefined ? (lmp || null) : current.lmp,
      edd: edd !== undefined ? (edd || null) : current.edd,
      notes: notes !== undefined ? (notes ? notes.trim() : null) : current.notes,
      id: patientId,
      updated_at: new Date().toISOString()
    };
    store.patients[idx] = updated;
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating patient:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE patient
router.delete('/:id', async (req, res) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    if (isNaN(patientId)) {
      return res.status(400).json({ success: false, message: 'معرف المريضة غير صالح' });
    }

    if (db.isPostgresConnected()) {
      // Ensure associated prescriptions items are deleted if CASCADE isn't triggered
      await db.query(`
        DELETE FROM prescription_items 
        WHERE prescription_id IN (SELECT id FROM prescriptions WHERE patient_id = $1)
      `, [patientId]);

      // Delete prescriptions, visits, appointments (also cascades automatically)
      await db.query('DELETE FROM prescriptions WHERE patient_id = $1', [patientId]);
      await db.query('DELETE FROM visits WHERE patient_id = $1', [patientId]);
      await db.query('DELETE FROM appointments WHERE patient_id = $1', [patientId]);

      const deleteRes = await db.query('DELETE FROM patients WHERE id = $1 RETURNING id, full_name', [patientId]);
      if (deleteRes.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'المريضة غير موجودة' });
      }
      return res.json({ success: true, message: 'تم حذف ملف المريضة وسجلاتها بنجاح', data: deleteRes.rows[0] });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    const idx = store.patients.findIndex(p => p.id === patientId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'المريضة غير موجودة' });
    }
    const removed = store.patients.splice(idx, 1)[0];
    store.appointments = store.appointments.filter(a => a.patient_id !== patientId);
    store.visits = store.visits.filter(v => v.patient_id !== patientId);
    store.prescriptions = store.prescriptions.filter(pr => pr.patient_id !== patientId);
    return res.json({ success: true, message: 'تم حذف ملف المريضة وسجلاتها بنجاح', data: removed });
  } catch (err) {
    console.error('Error deleting patient:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
