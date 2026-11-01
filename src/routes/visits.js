const express = require('express');
const router = express.Router();
const db = require('../db');

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET all visits with patient info and prescriptions count
router.get('/', async (req, res) => {
  try {
    const search = req.query.q ? req.query.q.trim() : '';
    const type = req.query.type ? req.query.type.trim() : '';
    const hasRx = req.query.has_prescription !== undefined && req.query.has_prescription !== '' ? req.query.has_prescription === 'true' : null;
    const date = req.query.date ? req.query.date.trim() : '';

    if (db.isPostgresConnected()) {
      let queryText = `
        SELECT v.*,
               p.full_name as patient_name,
               p.patient_code,
               p.phone as patient_phone,
               p.age as patient_age,
               p.is_pregnant,
               (SELECT COUNT(*) FROM prescriptions pr WHERE pr.visit_id = v.id)::int as prescriptions_count,
               (SELECT COUNT(*) FROM visit_attachments va WHERE va.visit_id = v.id)::int as attachments_count
        FROM visits v
        JOIN patients p ON v.patient_id = p.id
      `;
      const conditions = [];
      const params = [];
      let pIdx = 1;

      if (search) {
        conditions.push(`(p.full_name ILIKE $${pIdx} OR v.diagnosis ILIKE $${pIdx} OR p.patient_code ILIKE $${pIdx} OR v.chief_complaint ILIKE $${pIdx} OR v.ultrasound_findings ILIKE $${pIdx})`);
        params.push(`%${search}%`);
        pIdx++;
      }

      if (type && type !== 'all') {
        conditions.push(`v.visit_type = $${pIdx++}`);
        params.push(type);
      }

      if (date && date !== 'all') {
        conditions.push(`v.visit_date = $${pIdx++}`);
        params.push(date);
      }

      if (hasRx !== null) {
        if (hasRx) {
          conditions.push(`EXISTS (SELECT 1 FROM prescriptions pr WHERE pr.visit_id = v.id)`);
        } else {
          conditions.push(`NOT EXISTS (SELECT 1 FROM prescriptions pr WHERE pr.visit_id = v.id)`);
        }
      }

      if (conditions.length > 0) {
        queryText += ` WHERE ` + conditions.join(' AND ');
      }

      queryText += ` ORDER BY v.visit_date DESC, v.visit_time DESC`;

      const result = await db.query(queryText, params);
      return res.json({ success: true, data: result.rows });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    let rows = store.visits.map(v => {
      const p = store.patients.find(pt => pt.id === v.patient_id) || {};
      const rxCount = store.prescriptions.filter(pr => pr.visit_id === v.id).length;
      return {
        ...v,
        patient_name: p.full_name || v.patient_name,
        patient_code: p.patient_code,
        patient_phone: p.phone,
        patient_age: p.age,
        is_pregnant: p.is_pregnant,
        prescriptions_count: rxCount
      };
    });

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(v =>
        (v.patient_name && v.patient_name.toLowerCase().includes(q)) ||
        (v.diagnosis && v.diagnosis.toLowerCase().includes(q)) ||
        (v.patient_code && v.patient_code.toLowerCase().includes(q)) ||
        (v.chief_complaint && v.chief_complaint.toLowerCase().includes(q)) ||
        (v.ultrasound_findings && v.ultrasound_findings.toLowerCase().includes(q))
      );
    }

    if (type && type !== 'all') {
      rows = rows.filter(v => v.visit_type === type);
    }

    if (date && date !== 'all') {
      rows = rows.filter(v => v.visit_date === date);
    }

    if (hasRx !== null) {
      rows = rows.filter(v => (v.prescriptions_count > 0) === hasRx);
    }

    rows.sort((a, b) => new Date(b.visit_datetime || b.visit_date) - new Date(a.visit_datetime || a.visit_date));
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching visits:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single visit with patient and prescription details
router.get('/:id', async (req, res) => {
  try {
    const visitId = parseInt(req.params.id, 10);

    if (db.isPostgresConnected()) {
      const vRes = await db.query(`
        SELECT v.*,
               p.full_name as patient_name,
               p.patient_code,
               p.phone as patient_phone,
               p.age as patient_age,
               p.blood_group,
               p.allergies,
               p.chronic_diseases,
               p.is_pregnant,
               p.lmp,
               p.edd,
               p.gravida,
               p.para,
               p.abortion,
               p.living,
               p.cs_count,
               p.normal_delivery_count
        FROM visits v
        JOIN patients p ON v.patient_id = p.id
        WHERE v.id = $1
      `, [visitId]);

      if (vRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'الكشف غير موجود' });
      }

      const rxRes = await db.query(`
        SELECT pr.*, COALESCE(json_agg(pi.*) FILTER (WHERE pi.id IS NOT NULL), '[]') as items
        FROM prescriptions pr
        LEFT JOIN prescription_items pi ON pi.prescription_id = pr.id
        WHERE pr.visit_id = $1
        GROUP BY pr.id
      `, [visitId]);

      const attRes = await db.query(`
        SELECT id, visit_id, patient_id, attachment_type, title, file_data, created_at
        FROM visit_attachments
        WHERE visit_id = $1
        ORDER BY id ASC
      `, [visitId]);

      return res.json({
        success: true,
        data: {
          ...vRes.rows[0],
          prescriptions: rxRes.rows,
          attachments: attRes.rows
        }
      });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    const visit = store.visits.find(v => v.id === visitId);
    if (!visit) {
      return res.status(404).json({ success: false, message: 'الكشف غير موجود' });
    }
    const patient = store.patients.find(p => p.id === visit.patient_id) || {};
    const prescriptions = store.prescriptions.filter(pr => pr.visit_id === visitId);

    return res.json({
      success: true,
      data: {
        ...visit,
        patient_name: patient.full_name,
        patient_code: patient.patient_code,
        patient_phone: patient.phone,
        patient_age: patient.age,
        blood_group: patient.blood_group,
        allergies: patient.allergies,
        chronic_diseases: patient.chronic_diseases,
        is_pregnant: patient.is_pregnant,
        lmp: patient.lmp,
        edd: patient.edd,
        gravida: patient.gravida,
        para: patient.para,
        abortion: patient.abortion,
        living: patient.living,
        cs_count: patient.cs_count,
        normal_delivery_count: patient.normal_delivery_count,
        prescriptions
      }
    });
  } catch (err) {
    console.error('Error fetching visit details:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST record new examination & diagnosis with timestamp
router.post('/', async (req, res) => {
  try {
    const {
      patient_id,
      appointment_id,
      visit_date,
      visit_time,
      visit_type,
      chief_complaint,
      blood_pressure,
      weight_kg,
      temperature,
      gestational_age_weeks,
      gestational_age_days,
      fetal_heart_rate,
      ultrasound_findings,
      diagnosis,
      clinical_notes,
      next_visit_date,
      attachments,
      // Doctor's recorded clinical & obstetric history
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
      edd
    } = req.body;

    if (!patient_id || !diagnosis) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد المريضة وتسجيل التشخيص الطبي' });
    }

    const now = new Date();
    const curDate = visit_date || getLocalDateString(now);
    const curTime = visit_time || now.toTimeString().split(' ')[0];

    if (db.isPostgresConnected()) {
      const insRes = await db.query(`
        INSERT INTO visits (
          patient_id, appointment_id, visit_date, visit_time, visit_type,
          chief_complaint, blood_pressure, weight_kg, temperature,
          gestational_age_weeks, gestational_age_days, fetal_heart_rate,
          ultrasound_findings, diagnosis, clinical_notes, next_visit_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING *
      `, [
        patient_id,
        appointment_id ? parseInt(appointment_id, 10) : null,
        curDate,
        curTime,
        visit_type || 'كشف نساء وتوليد',
        chief_complaint || 'فحص روتيني ومتابعة',
        blood_pressure || null,
        weight_kg ? parseFloat(weight_kg) : null,
        temperature ? parseFloat(temperature) : null,
        gestational_age_weeks ? parseInt(gestational_age_weeks, 10) : null,
        gestational_age_days ? parseInt(gestational_age_days, 10) : null,
        fetal_heart_rate ? parseInt(fetal_heart_rate, 10) : null,
        ultrasound_findings || null,
        diagnosis,
        clinical_notes || null,
        next_visit_date || null
      ]);

      // If doctor recorded obstetric/medical history during the visit, update patient record
      if (patient_id && (allergies !== undefined || chronic_diseases !== undefined || gravida !== undefined || para !== undefined || abortion !== undefined || living !== undefined || cs_count !== undefined || normal_delivery_count !== undefined || is_pregnant !== undefined || lmp !== undefined || edd !== undefined)) {
        const ptUpdates = [];
        const ptParams = [];
        let ptIdx = 1;
        if (allergies !== undefined) { ptUpdates.push(`allergies = $${ptIdx++}`); ptParams.push(allergies || 'لا توجد حساسية معروفة'); }
        if (chronic_diseases !== undefined) { ptUpdates.push(`chronic_diseases = $${ptIdx++}`); ptParams.push(chronic_diseases || null); }
        if (gravida !== undefined) { ptUpdates.push(`gravida = $${ptIdx++}`); ptParams.push(parseInt(gravida || 0, 10)); }
        if (para !== undefined) { ptUpdates.push(`para = $${ptIdx++}`); ptParams.push(parseInt(para || 0, 10)); }
        if (abortion !== undefined) { ptUpdates.push(`abortion = $${ptIdx++}`); ptParams.push(parseInt(abortion || 0, 10)); }
        if (living !== undefined) { ptUpdates.push(`living = $${ptIdx++}`); ptParams.push(parseInt(living || 0, 10)); }
        if (cs_count !== undefined) { ptUpdates.push(`cs_count = $${ptIdx++}`); ptParams.push(parseInt(cs_count || 0, 10)); }
        if (normal_delivery_count !== undefined) { ptUpdates.push(`normal_delivery_count = $${ptIdx++}`); ptParams.push(parseInt(normal_delivery_count || 0, 10)); }
        if (is_pregnant !== undefined) { ptUpdates.push(`is_pregnant = $${ptIdx++}`); ptParams.push(Boolean(is_pregnant)); }
        if (lmp !== undefined) { ptUpdates.push(`lmp = $${ptIdx++}`); ptParams.push(lmp || null); }
        if (edd !== undefined) { ptUpdates.push(`edd = $${ptIdx++}`); ptParams.push(edd || null); }
        ptUpdates.push(`updated_at = CURRENT_TIMESTAMP`);
        ptParams.push(parseInt(patient_id, 10));
        await db.query(`UPDATE patients SET ${ptUpdates.join(', ')} WHERE id = $${ptIdx}`, ptParams);
      }

      // If tied to an appointment, mark it completed
      if (appointment_id) {
        await db.query(`UPDATE appointments SET status = 'مكتمل' WHERE id = $1`, [appointment_id]);
      }

      // Save attachments (ultrasound, lab results) if provided
      const newVisitId = insRes.rows[0].id;
      if (Array.isArray(attachments) && attachments.length > 0) {
        for (const att of attachments) {
          if (att.file_data) {
            await db.query(`
              INSERT INTO visit_attachments (visit_id, patient_id, attachment_type, title, file_data)
              VALUES ($1, $2, $3, $4, $5)
            `, [newVisitId, parseInt(patient_id, 10), att.attachment_type || 'سونار', att.title || 'صورة فحص', att.file_data]);
          }
        }
      }

      return res.status(201).json({ success: true, data: insRes.rows[0] });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    const nextId = store.visits.length > 0 ? Math.max(...store.visits.map(v => v.id)) + 1 : 1;
    const patient = store.patients.find(p => p.id === parseInt(patient_id, 10));

    // Update patient in memory store
    if (patient) {
      if (allergies !== undefined) patient.allergies = allergies || 'لا توجد حساسية معروفة';
      if (chronic_diseases !== undefined) patient.chronic_diseases = chronic_diseases || null;
      if (gravida !== undefined) patient.gravida = parseInt(gravida || 0, 10);
      if (para !== undefined) patient.para = parseInt(para || 0, 10);
      if (abortion !== undefined) patient.abortion = parseInt(abortion || 0, 10);
      if (living !== undefined) patient.living = parseInt(living || 0, 10);
      if (cs_count !== undefined) patient.cs_count = parseInt(cs_count || 0, 10);
      if (normal_delivery_count !== undefined) patient.normal_delivery_count = parseInt(normal_delivery_count || 0, 10);
      if (is_pregnant !== undefined) patient.is_pregnant = Boolean(is_pregnant);
      if (lmp !== undefined) patient.lmp = lmp || null;
      if (edd !== undefined) patient.edd = edd || null;
      patient.updated_at = new Date().toISOString();
    }

    const newVisit = {
      id: nextId,
      patient_id: parseInt(patient_id, 10),
      patient_name: patient ? patient.full_name : '',
      appointment_id: appointment_id ? parseInt(appointment_id, 10) : null,
      visit_date: curDate,
      visit_time: curTime,
      visit_datetime: `${curDate}T${curTime}Z`,
      visit_type: visit_type || 'كشف نساء وتوليد',
      chief_complaint: chief_complaint || 'فحص روتيني ومتابعة',
      blood_pressure: blood_pressure || null,
      weight_kg: weight_kg ? parseFloat(weight_kg) : null,
      temperature: temperature ? parseFloat(temperature) : null,
      gestational_age_weeks: gestational_age_weeks ? parseInt(gestational_age_weeks, 10) : null,
      gestational_age_days: gestational_age_days ? parseInt(gestational_age_days, 10) : null,
      fetal_heart_rate: fetal_heart_rate ? parseInt(fetal_heart_rate, 10) : null,
      ultrasound_findings: ultrasound_findings || null,
      diagnosis,
      clinical_notes: clinical_notes || null,
      next_visit_date: next_visit_date || null,
      created_at: new Date().toISOString()
    };

    store.visits.unshift(newVisit);

    if (appointment_id) {
      const app = store.appointments.find(a => a.id === parseInt(appointment_id, 10));
      if (app) app.status = 'مكتمل';
    }

    return res.status(201).json({ success: true, data: newVisit });
  } catch (err) {
    console.error('Error creating visit:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update clinical visit
router.put('/:id', async (req, res) => {
  try {
    const visitId = parseInt(req.params.id, 10);
    if (isNaN(visitId)) {
      return res.status(400).json({ success: false, message: 'معرف الكشف غير صالح' });
    }

    const {
      patient_id,
      visit_date,
      visit_time,
      visit_type,
      chief_complaint,
      blood_pressure,
      weight_kg,
      temperature,
      gestational_age_weeks,
      gestational_age_days,
      fetal_heart_rate,
      ultrasound_findings,
      diagnosis,
      clinical_notes,
      next_visit_date,
      attachments,
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
      edd
    } = req.body;

    if (db.isPostgresConnected()) {
      const updates = [];
      const params = [];
      let pIdx = 1;

      if (visit_date !== undefined) { updates.push(`visit_date = $${pIdx++}`); params.push(visit_date); }
      if (visit_time !== undefined) { updates.push(`visit_time = $${pIdx++}`); params.push(visit_time); }
      if (visit_type !== undefined) { updates.push(`visit_type = $${pIdx++}`); params.push(visit_type.trim()); }
      if (chief_complaint !== undefined) { updates.push(`chief_complaint = $${pIdx++}`); params.push(chief_complaint.trim()); }
      if (blood_pressure !== undefined) { updates.push(`blood_pressure = $${pIdx++}`); params.push(blood_pressure ? blood_pressure.trim() : null); }
      if (weight_kg !== undefined) { updates.push(`weight_kg = $${pIdx++}`); params.push(weight_kg ? parseFloat(weight_kg) : null); }
      if (temperature !== undefined) { updates.push(`temperature = $${pIdx++}`); params.push(temperature ? parseFloat(temperature) : null); }
      if (gestational_age_weeks !== undefined) { updates.push(`gestational_age_weeks = $${pIdx++}`); params.push(gestational_age_weeks ? parseInt(gestational_age_weeks, 10) : null); }
      if (gestational_age_days !== undefined) { updates.push(`gestational_age_days = $${pIdx++}`); params.push(gestational_age_days ? parseInt(gestational_age_days, 10) : null); }
      if (fetal_heart_rate !== undefined) { updates.push(`fetal_heart_rate = $${pIdx++}`); params.push(fetal_heart_rate ? parseInt(fetal_heart_rate, 10) : null); }
      if (ultrasound_findings !== undefined) { updates.push(`ultrasound_findings = $${pIdx++}`); params.push(ultrasound_findings ? ultrasound_findings.trim() : null); }
      if (diagnosis !== undefined) { updates.push(`diagnosis = $${pIdx++}`); params.push(diagnosis.trim()); }
      if (clinical_notes !== undefined) { updates.push(`clinical_notes = $${pIdx++}`); params.push(clinical_notes ? clinical_notes.trim() : null); }
      if (next_visit_date !== undefined) { updates.push(`next_visit_date = $${pIdx++}`); params.push(next_visit_date || null); }

      let targetPatientId = patient_id ? parseInt(patient_id, 10) : null;

      if (updates.length > 0) {
        params.push(visitId);
        const queryText = `UPDATE visits SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING *`;
        const updateRes = await db.query(queryText, params);

        if (updateRes.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'الكشف غير موجود' });
        }
        targetPatientId = targetPatientId || updateRes.rows[0].patient_id;
      }

      // Update patient clinical record if supplied
      if (targetPatientId && (allergies !== undefined || chronic_diseases !== undefined || gravida !== undefined || para !== undefined || abortion !== undefined || living !== undefined || cs_count !== undefined || normal_delivery_count !== undefined || is_pregnant !== undefined || lmp !== undefined || edd !== undefined)) {
        const ptUpdates = [];
        const ptParams = [];
        let ptIdx = 1;
        if (allergies !== undefined) { ptUpdates.push(`allergies = $${ptIdx++}`); ptParams.push(allergies || 'لا توجد حساسية معروفة'); }
        if (chronic_diseases !== undefined) { ptUpdates.push(`chronic_diseases = $${ptIdx++}`); ptParams.push(chronic_diseases || null); }
        if (gravida !== undefined) { ptUpdates.push(`gravida = $${ptIdx++}`); ptParams.push(parseInt(gravida || 0, 10)); }
        if (para !== undefined) { ptUpdates.push(`para = $${ptIdx++}`); ptParams.push(parseInt(para || 0, 10)); }
        if (abortion !== undefined) { ptUpdates.push(`abortion = $${ptIdx++}`); ptParams.push(parseInt(abortion || 0, 10)); }
        if (living !== undefined) { ptUpdates.push(`living = $${ptIdx++}`); ptParams.push(parseInt(living || 0, 10)); }
        if (cs_count !== undefined) { ptUpdates.push(`cs_count = $${ptIdx++}`); ptParams.push(parseInt(cs_count || 0, 10)); }
        if (normal_delivery_count !== undefined) { ptUpdates.push(`normal_delivery_count = $${ptIdx++}`); ptParams.push(parseInt(normal_delivery_count || 0, 10)); }
        if (is_pregnant !== undefined) { ptUpdates.push(`is_pregnant = $${ptIdx++}`); ptParams.push(Boolean(is_pregnant)); }
        if (lmp !== undefined) { ptUpdates.push(`lmp = $${ptIdx++}`); ptParams.push(lmp || null); }
        if (edd !== undefined) { ptUpdates.push(`edd = $${ptIdx++}`); ptParams.push(edd || null); }
        ptUpdates.push(`updated_at = CURRENT_TIMESTAMP`);
        ptParams.push(targetPatientId);
        await db.query(`UPDATE patients SET ${ptUpdates.join(', ')} WHERE id = $${ptIdx}`, ptParams);
      }

      // Update attachments if supplied
      if (Array.isArray(attachments)) {
        await db.query('DELETE FROM visit_attachments WHERE visit_id = $1', [visitId]);
        for (const att of attachments) {
          if (att.file_data) {
            await db.query(`
              INSERT INTO visit_attachments (visit_id, patient_id, attachment_type, title, file_data)
              VALUES ($1, $2, $3, $4, $5)
            `, [visitId, targetPatientId, att.attachment_type || 'سونار', att.title || 'صورة فحص', att.file_data]);
          }
        }
      }

      const freshRes = await db.query('SELECT * FROM visits WHERE id = $1', [visitId]);
      return res.json({ success: true, data: freshRes.rows[0] });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    const idx = store.visits.findIndex(v => v.id === visitId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'الكشف غير موجود' });
    }
    const current = store.visits[idx];
    const updated = {
      ...current,
      visit_date: visit_date !== undefined ? visit_date : current.visit_date,
      visit_time: visit_time !== undefined ? visit_time : current.visit_time,
      visit_type: visit_type !== undefined ? visit_type.trim() : current.visit_type,
      chief_complaint: chief_complaint !== undefined ? chief_complaint.trim() : current.chief_complaint,
      blood_pressure: blood_pressure !== undefined ? (blood_pressure ? blood_pressure.trim() : null) : current.blood_pressure,
      weight_kg: weight_kg !== undefined ? (weight_kg ? parseFloat(weight_kg) : null) : current.weight_kg,
      temperature: temperature !== undefined ? (temperature ? parseFloat(temperature) : null) : current.temperature,
      gestational_age_weeks: gestational_age_weeks !== undefined ? (gestational_age_weeks ? parseInt(gestational_age_weeks, 10) : null) : current.gestational_age_weeks,
      gestational_age_days: gestational_age_days !== undefined ? (gestational_age_days ? parseInt(gestational_age_days, 10) : null) : current.gestational_age_days,
      fetal_heart_rate: fetal_heart_rate !== undefined ? (fetal_heart_rate ? parseInt(fetal_heart_rate, 10) : null) : current.fetal_heart_rate,
      ultrasound_findings: ultrasound_findings !== undefined ? (ultrasound_findings ? ultrasound_findings.trim() : null) : current.ultrasound_findings,
      diagnosis: diagnosis !== undefined ? diagnosis.trim() : current.diagnosis,
      clinical_notes: clinical_notes !== undefined ? (clinical_notes ? clinical_notes.trim() : null) : current.clinical_notes,
      next_visit_date: next_visit_date !== undefined ? (next_visit_date || null) : current.next_visit_date
    };
    store.visits[idx] = updated;

    const patient = store.patients.find(p => p.id === (patient_id ? parseInt(patient_id, 10) : current.patient_id));
    if (patient) {
      if (allergies !== undefined) patient.allergies = allergies || 'لا توجد حساسية معروفة';
      if (chronic_diseases !== undefined) patient.chronic_diseases = chronic_diseases || null;
      if (gravida !== undefined) patient.gravida = parseInt(gravida || 0, 10);
      if (para !== undefined) patient.para = parseInt(para || 0, 10);
      if (abortion !== undefined) patient.abortion = parseInt(abortion || 0, 10);
      if (living !== undefined) patient.living = parseInt(living || 0, 10);
      if (cs_count !== undefined) patient.cs_count = parseInt(cs_count || 0, 10);
      if (normal_delivery_count !== undefined) patient.normal_delivery_count = parseInt(normal_delivery_count || 0, 10);
      if (is_pregnant !== undefined) patient.is_pregnant = Boolean(is_pregnant);
      if (lmp !== undefined) patient.lmp = lmp || null;
      if (edd !== undefined) patient.edd = edd || null;
      patient.updated_at = new Date().toISOString();
    }
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating visit:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE visit
router.delete('/:id', async (req, res) => {
  try {
    const visitId = parseInt(req.params.id, 10);
    if (isNaN(visitId)) {
      return res.status(400).json({ success: false, message: 'معرف الكشف غير صالح' });
    }

    if (db.isPostgresConnected()) {
      await db.query(`
        DELETE FROM prescription_items 
        WHERE prescription_id IN (SELECT id FROM prescriptions WHERE visit_id = $1)
      `, [visitId]);
      await db.query('DELETE FROM prescriptions WHERE visit_id = $1', [visitId]);
      const delRes = await db.query('DELETE FROM visits WHERE id = $1 RETURNING id, patient_id', [visitId]);
      if (delRes.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'الكشف غير موجود' });
      }
      return res.json({ success: true, message: 'تم حذف الكشف بنجاح', data: delRes.rows[0] });
    }

    // Memory fallback
    const store = db.getMemoryStore();
    const idx = store.visits.findIndex(v => v.id === visitId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'الكشف غير موجود' });
    }
    const removed = store.visits.splice(idx, 1)[0];
    store.prescriptions = store.prescriptions.filter(p => p.visit_id !== visitId);
    return res.json({ success: true, message: 'تم حذف الكشف بنجاح', data: removed });
  } catch (err) {
    console.error('Error deleting visit:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
