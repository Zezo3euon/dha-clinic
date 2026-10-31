const express = require('express');
const router = express.Router();
const db = require('../db');

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET all prescriptions with optional search and date filter
router.get('/', async (req, res) => {
  try {
    const search = req.query.q ? req.query.q.trim() : '';
    const filterDate = req.query.date ? req.query.date.trim() : '';

    if (db.isPostgresConnected()) {
      let queryText = `
        SELECT pr.*, 
               p.full_name as patient_name,
               p.patient_code,
               p.age as patient_age,
               p.phone as patient_phone,
               (SELECT COUNT(*) FROM prescription_items pi WHERE pi.prescription_id = pr.id)::int as items_count,
               (SELECT string_agg(pi.medication_name, ', ') FROM prescription_items pi WHERE pi.prescription_id = pr.id) as medications_summary
        FROM prescriptions pr
        JOIN patients p ON pr.patient_id = p.id
      `;
      const conditions = [];
      const params = [];
      let pIdx = 1;

      if (search) {
        conditions.push(`(
          p.full_name ILIKE $${pIdx} OR 
          pr.prescription_code ILIKE $${pIdx} OR 
          pr.diagnosis_summary ILIKE $${pIdx} OR 
          p.phone ILIKE $${pIdx} OR
          EXISTS (SELECT 1 FROM prescription_items pi WHERE pi.prescription_id = pr.id AND pi.medication_name ILIKE $${pIdx})
        )`);
        params.push(`%${search}%`);
        pIdx++;
      }

      if (filterDate) {
        conditions.push(`pr.issue_date = $${pIdx}`);
        params.push(filterDate);
        pIdx++;
      }

      if (conditions.length > 0) {
        queryText += ` WHERE ` + conditions.join(' AND ');
      }

      queryText += ` ORDER BY pr.issue_date DESC, pr.issue_time DESC`;
      const result = await db.query(queryText, params);
      return res.json({ success: true, data: result.rows });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    let rows = store.prescriptions.map(pr => {
      const p = store.patients.find(pt => pt.id === pr.patient_id) || {};
      const meds = (pr.items || []).map(i => i.medication_name).join(', ');
      return {
        ...pr,
        patient_name: p.full_name || pr.patient_name,
        patient_code: p.patient_code,
        patient_age: p.age || pr.patient_age,
        patient_phone: p.phone,
        items_count: (pr.items || []).length,
        medications_summary: meds
      };
    });

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(pr => 
        (pr.patient_name && pr.patient_name.toLowerCase().includes(q)) ||
        (pr.prescription_code && pr.prescription_code.toLowerCase().includes(q)) ||
        (pr.diagnosis_summary && pr.diagnosis_summary.toLowerCase().includes(q)) ||
        (pr.patient_phone && pr.patient_phone.includes(q)) ||
        (pr.medications_summary && pr.medications_summary.toLowerCase().includes(q))
      );
    }

    if (filterDate) {
      rows = rows.filter(pr => pr.issue_date === filterDate);
    }

    rows.sort((a, b) => b.id - a.id);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching prescriptions:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single prescription with full items and doctor details for print
router.get('/:id', async (req, res) => {
  try {
    const rxId = parseInt(req.params.id, 10);
    if (isNaN(rxId)) {
      return res.status(400).json({ success: false, message: 'معرف الروشتة غير صالح' });
    }

    if (db.isPostgresConnected()) {
      const rxRes = await db.query(`
        SELECT pr.*,
               p.full_name as patient_name,
               p.patient_code,
               p.age as patient_age,
               p.phone as patient_phone,
               p.blood_group,
               p.allergies,
               v.gestational_age_weeks,
               v.gestational_age_days,
               v.next_visit_date
        FROM prescriptions pr
        JOIN patients p ON pr.patient_id = p.id
        LEFT JOIN visits v ON pr.visit_id = v.id
        WHERE pr.id = $1
      `, [rxId]);

      if (rxRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'الروشتة غير موجودة' });
      }

      const itemsRes = await db.query(
        'SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY id ASC',
        [rxId]
      );

      return res.json({
        success: true,
        data: {
          ...rxRes.rows[0],
          items: itemsRes.rows,
          doctor_info: {
            name: 'د. حاتم عواجة',
            title: 'استشاري أمراض النساء والتوليد وجراحة المناظير وعلاج العقم',
            degrees: 'زميل الكلية الملكية لأطباء النساء والتوليد - دكتوراه أمراض النساء والتوليد',
            phone: '01000000000 / 0225000000',
            address: 'ميدان التحرير / المعادي - برج الأطباء التخصصي - الدور الرابع'
          }
        }
      });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    const rx = store.prescriptions.find(p => p.id === rxId);
    if (!rx) {
      return res.status(404).json({ success: false, message: 'الروشتة غير موجودة' });
    }

    const patient = store.patients.find(p => p.id === rx.patient_id) || {};
    const visit = store.visits.find(v => v.id === rx.visit_id) || {};

    return res.json({
      success: true,
      data: {
        ...rx,
        patient_name: patient.full_name || rx.patient_name,
        patient_code: patient.patient_code,
        patient_age: patient.age || rx.patient_age,
        patient_phone: patient.phone,
        blood_group: patient.blood_group,
        allergies: patient.allergies,
        gestational_age_weeks: visit.gestational_age_weeks,
        gestational_age_days: visit.gestational_age_days,
        next_visit_date: visit.next_visit_date,
        items: rx.items || [],
        doctor_info: {
          name: 'د. حاتم عواجة',
          title: 'استشاري أمراض النساء والتوليد وجراحة المناظير وعلاج العقم',
          degrees: 'زميل الكلية الملكية لأطباء النساء والتوليد - دكتوراه أمراض النساء والتوليد',
          phone: '01000000000 / 0225000000',
          address: 'ميدان التحرير / المعادي - برج الأطباء التخصصي - الدور الرابع'
        }
      }
    });
  } catch (err) {
    console.error('Error fetching prescription details:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create prescription with items
router.post('/', async (req, res) => {
  try {
    const { patient_id, visit_id, diagnosis_summary, general_advice, items } = req.body;

    if (!patient_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد المريضة وإضافة دواء واحد على الأقل' });
    }

    const now = new Date();
    const issueDate = getLocalDateString(now);
    const issueTime = now.toTimeString().split(' ')[0];

    if (db.isPostgresConnected()) {
      const maxRes = await db.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_num FROM prescriptions');
      const nextNum = parseInt(maxRes.rows[0].next_num, 10);
      const rxCode = `RX-DHA-2026-${String(nextNum).padStart(4, '0')}`;

      // Insert prescription
      const rxIns = await db.query(`
        INSERT INTO prescriptions (visit_id, patient_id, prescription_code, issue_date, issue_time, diagnosis_summary, general_advice)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        visit_id ? parseInt(visit_id, 10) : null,
        parseInt(patient_id, 10),
        rxCode,
        issueDate,
        issueTime,
        diagnosis_summary || 'كشف ومتابعة نساء وتوليد',
        general_advice || 'الالتزام بمواعيد الجرعات والراحة التامة.'
      ]);

      const newRx = rxIns.rows[0];

      // Insert items
      for (const item of items) {
        if (item.medication_name && item.medication_name.trim()) {
          await db.query(`
            INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, instructions)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            newRx.id,
            item.medication_name.trim(),
            item.dosage || '',
            item.frequency || '',
            item.duration || '',
            item.instructions || ''
          ]);
        }
      }

      return res.status(201).json({ success: true, data: { ...newRx, items } });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    const nextId = store.prescriptions.length > 0 ? Math.max(...store.prescriptions.map(p => p.id)) + 1 : 1;
    const rxCode = `RX-DHA-2026-${String(nextId).padStart(4, '0')}`;
    const patient = store.patients.find(p => p.id === parseInt(patient_id, 10));

    const newRx = {
      id: nextId,
      visit_id: visit_id ? parseInt(visit_id, 10) : null,
      patient_id: parseInt(patient_id, 10),
      patient_name: patient ? patient.full_name : '',
      patient_age: patient ? patient.age : null,
      prescription_code: rxCode,
      issue_date: issueDate,
      issue_time: issueTime,
      diagnosis_summary: diagnosis_summary || 'كشف ومتابعة نساء وتوليد',
      general_advice: general_advice || 'الالتزام بمواعيد الجرعات والراحة التامة.',
      items: items.filter(i => i.medication_name && i.medication_name.trim())
    };

    store.prescriptions.unshift(newRx);
    return res.status(201).json({ success: true, data: newRx });
  } catch (err) {
    console.error('Error creating prescription:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET drugs catalog for fast autocomplete
router.get('/catalog/drugs', async (req, res) => {
  try {
    if (db.isPostgresConnected()) {
      const result = await db.query('SELECT * FROM drugs_catalog ORDER BY category, name');
      return res.json({ success: true, data: result.rows });
    }
    const store = db.getMemoryStore();
    return res.json({ success: true, data: store.drugs });
  } catch (err) {
    console.error('Error fetching drugs catalog:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update prescription
router.put('/:id', async (req, res) => {
  try {
    const rxId = parseInt(req.params.id, 10);
    if (isNaN(rxId)) {
      return res.status(400).json({ success: false, message: 'معرف الروشتة غير صالح' });
    }

    const { diagnosis_summary, general_advice, items } = req.body;

    if (items !== undefined && (!Array.isArray(items) || items.length === 0)) {
      return res.status(400).json({ success: false, message: 'يجب أن تحتوي الروشتة على دواء واحد على الأقل' });
    }

    if (db.isPostgresConnected()) {
      const updates = [];
      const params = [];
      let pIdx = 1;

      if (diagnosis_summary !== undefined) {
        updates.push(`diagnosis_summary = $${pIdx++}`);
        params.push(diagnosis_summary ? diagnosis_summary.trim() : null);
      }
      if (general_advice !== undefined) {
        updates.push(`general_advice = $${pIdx++}`);
        params.push(general_advice ? general_advice.trim() : null);
      }

      if (updates.length > 0) {
        params.push(rxId);
        await db.query(`UPDATE prescriptions SET ${updates.join(', ')} WHERE id = $${pIdx}`, params);
      }

      // If items were provided, update them
      if (items && Array.isArray(items)) {
        await db.query('DELETE FROM prescription_items WHERE prescription_id = $1', [rxId]);
        for (const item of items) {
          if (item.medication_name && item.medication_name.trim()) {
            await db.query(`
              INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, instructions)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [
              rxId,
              item.medication_name.trim(),
              item.dosage || '',
              item.frequency || '',
              item.duration || '',
              item.instructions || ''
            ]);
          }
        }
      }

      const updatedRes = await db.query('SELECT * FROM prescriptions WHERE id = $1', [rxId]);
      if (updatedRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'الروشتة غير موجودة' });
      }

      const updatedItems = await db.query('SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY id ASC', [rxId]);
      return res.json({ success: true, data: { ...updatedRes.rows[0], items: updatedItems.rows } });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    const rx = store.prescriptions.find(p => p.id === rxId);
    if (!rx) {
      return res.status(404).json({ success: false, message: 'الروشتة غير موجودة' });
    }

    if (diagnosis_summary !== undefined) rx.diagnosis_summary = diagnosis_summary ? diagnosis_summary.trim() : null;
    if (general_advice !== undefined) rx.general_advice = general_advice ? general_advice.trim() : null;
    if (items && Array.isArray(items)) {
      rx.items = items.filter(i => i.medication_name && i.medication_name.trim());
    }

    return res.json({ success: true, data: rx });
  } catch (err) {
    console.error('Error updating prescription:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE prescription
router.delete('/:id', async (req, res) => {
  try {
    const rxId = parseInt(req.params.id, 10);
    if (isNaN(rxId)) {
      return res.status(400).json({ success: false, message: 'معرف الروشتة غير صالح' });
    }

    if (db.isPostgresConnected()) {
      await db.query('DELETE FROM prescription_items WHERE prescription_id = $1', [rxId]);
      const delRes = await db.query('DELETE FROM prescriptions WHERE id = $1 RETURNING id, prescription_code', [rxId]);
      if (delRes.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'الروشتة غير موجودة' });
      }
      return res.json({ success: true, message: 'تم حذف الروشتة بنجاح', data: delRes.rows[0] });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    const idx = store.prescriptions.findIndex(p => p.id === rxId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'الروشتة غير موجودة' });
    }
    const removed = store.prescriptions.splice(idx, 1)[0];
    return res.json({ success: true, message: 'تم حذف الروشتة بنجاح', data: removed });
  } catch (err) {
    console.error('Error deleting prescription:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

