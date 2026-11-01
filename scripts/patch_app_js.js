const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'src', 'public', 'js', 'app.js');
let code = fs.readFileSync(appJsPath, 'utf8');

// 1. Add setupPrivacyMode to init()
if (!code.includes('setupPrivacyMode();')) {
  code = code.replace(
    'setupPrescriptionBuilder();',
    'setupPrescriptionBuilder();\n    setupPrivacyMode();'
  );
}

// 2. Add setupPrivacyMode, openLightbox, and sendWhatsAppReminder implementations
const newHelperFunctions = `
  // --------------------------------------------------------------------------
  // Receptionist Privacy Mode & WhatsApp Reminders & Lightbox
  // --------------------------------------------------------------------------
  function setupPrivacyMode() {
    const btnTogglePrivacyMode = document.getElementById('btnTogglePrivacyMode');
    const textEl = document.getElementById('privacyModeText');

    const updateUI = (isPrivacy) => {
      if (isPrivacy) {
        document.body.classList.add('receptionist-mode');
        if (btnTogglePrivacyMode) {
          btnTogglePrivacyMode.classList.add('active');
          btnTogglePrivacyMode.title = 'إلغاء وضع الاستقبال (العودة لوضع الطبيب الكامل)';
        }
        if (textEl) textEl.textContent = 'وضع الاستقبال (مفعّل)';
      } else {
        document.body.classList.remove('receptionist-mode');
        if (btnTogglePrivacyMode) {
          btnTogglePrivacyMode.classList.remove('active');
          btnTogglePrivacyMode.title = 'تفعيل وضع الخصوصية للاستقبال (حجب التشخيصات والروشتات)';
        }
        if (textEl) textEl.textContent = 'وضع الاستقبال';
      }
    };

    const saved = localStorage.getItem('dha_privacy_mode') === '1';
    updateUI(saved);

    if (btnTogglePrivacyMode) {
      btnTogglePrivacyMode.addEventListener('click', () => {
        const isNow = !document.body.classList.contains('receptionist-mode');
        localStorage.setItem('dha_privacy_mode', isNow ? '1' : '0');
        updateUI(isNow);
        showToast(isNow ? 'تم تفعيل وضع خصوصية الاستقبال (تم حجب التشخيصات والروشتات)' : 'تم العودة إلى وضع الطبيب الكامل');
      });
    }
  }

  window.openLightbox = (imgSrc, title = 'معاينة المرفق') => {
    const modal = document.getElementById('modalLightbox');
    const img = document.getElementById('lightboxImg');
    const titleEl = document.getElementById('lightboxTitle');
    if (img) img.src = imgSrc;
    if (titleEl) titleEl.textContent = title;
    if (modal) openModal(modal);
  };

  window.sendWhatsAppReminder = (patientName, phone, date, time) => {
    if (!phone || phone === '--' || !phone.trim()) {
      showToast('رقم هاتف المريضة غير مسجل', 'warning');
      return;
    }
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '20' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('20') && cleanPhone.length === 10) {
      cleanPhone = '20' + cleanPhone;
    }
    const timeStr = time ? time.slice(0, 5) : '';
    const dateStr = (date === 'اليوم' || !date) ? 'اليوم' : formatDate(date);
    const msg = 'مرحباً بحضرتك أستاذة / ' + (patientName || 'الفاضلة') + ' 🌸\\n' +
                'نود تذكيرك بموعد كشفك لدى عيادة الدكتور حاتم عواجة (استشاري النساء والتوليد).\\n' +
                '📅 التاريخ: ' + dateStr + '\\n' +
                (timeStr ? '⏰ الموعد: ' + timeStr + '\\n' : '') +
                'نتمنى لكِ دوام الصحة والعافية، وفي حال الرغبة في تعديل الموعد يرجى التواصل معنا.\\n' +
                'عيادة د. حاتم عواجة 🩺';
    window.open('https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(msg), '_blank');
  };
`;

if (!code.includes('function setupPrivacyMode()')) {
  code = code.replace(
    '  function setupClock() {',
    newHelperFunctions + '\n  function setupClock() {'
  );
}

// 3. Update renderTodayQueue to include WhatsApp button
const oldQueueAction = `<button class="btn-icon" onclick="window.viewPatientProfile(\${item.patient_id})" title="الملف الطبي">
              <i class="fa-regular fa-id-badge"></i>
            </button>`;
const newQueueAction = `<button class="btn-icon" onclick="window.viewPatientProfile(\${item.patient_id})" title="الملف الطبي">
              <i class="fa-regular fa-id-badge"></i>
            </button>
            <button class="btn-icon btn-whatsapp-icon" onclick="window.sendWhatsAppReminder('\${escapeHtml(item.patient_name || \'\')}', '\${escapeHtml(item.patient_phone || \'\')}', 'اليوم', '\${escapeHtml(item.appointment_time || \'\')}')" title="إرسال تذكير بالموعد عبر واتساب">
              <i class="fa-brands fa-whatsapp"></i>
            </button>`;

if (code.includes(oldQueueAction) && !code.includes('btn-whatsapp-icon')) {
  code = code.replace(oldQueueAction, newQueueAction);
}

// 4. Update renderAppointmentsTable to include WhatsApp button
const oldApptActions = `<button class="btn-icon edit" onclick="window.editAppointment(\${a.id})" title="تعديل الموعد">
              <i class="fa-solid fa-pen"></i>
            </button>`;
const newApptActions = `<button class="btn-icon btn-whatsapp-icon" onclick="window.sendWhatsAppReminder('\${escapeHtml(a.patient_name || \'\')}', '\${escapeHtml(a.patient_phone || \'\')}', '\${escapeHtml(a.appointment_date || \'\')}', '\${escapeHtml(a.appointment_time || \'\')}')" title="إرسال تذكير بالموعد عبر واتساب">
              <i class="fa-brands fa-whatsapp"></i>
            </button>
            <button class="btn-icon edit" onclick="window.editAppointment(\${a.id})" title="تعديل الموعد">
              <i class="fa-solid fa-pen"></i>
            </button>`;

if (code.includes(oldApptActions)) {
  code = code.replace(oldApptActions, newApptActions);
}

// 5. Update renderPatientsTable to include WhatsApp button and privacy blur
const oldPatientNotes = `\${p.notes ? \`<p style="font-size:0.74rem; color:#64748b;">\${escapeHtml(p.notes)}</p>\` : ''}`;
const newPatientNotes = `\${p.notes ? \`<p class="reception-only-blur" style="font-size:0.74rem; color:#64748b;">\${escapeHtml(p.notes)}</p>\` : ''}`;
if (code.includes(oldPatientNotes)) {
  code = code.replace(oldPatientNotes, newPatientNotes);
}

const oldPatientEditBtn = `<button class="btn-icon edit" onclick="window.editPatient(\${p.id})" title="تعديل البيانات">`;
const newPatientEditBtn = `<button class="btn-icon btn-whatsapp-icon" onclick="window.sendWhatsAppReminder('\${escapeHtml(p.full_name || \'\')}', '\${escapeHtml(p.phone || \'\')}', '', '')" title="مراسلة المريضة عبر واتساب">
              <i class="fa-brands fa-whatsapp"></i>
            </button>
            <button class="btn-icon edit" onclick="window.editPatient(\${p.id})" title="تعديل البيانات">`;
if (code.includes(oldPatientEditBtn)) {
  code = code.replace(oldPatientEditBtn, newPatientEditBtn);
}

// 6. Update renderVisitsTable for privacy blur and attachments count badge
const oldVisitDiag = `<strong style="color: #0f766e;">\${escapeHtml(v.diagnosis)}</strong>
          \${v.ultrasound_findings ? \`<p style="font-size:0.75rem; color:#64748b; margin:2px 0 0 0;">سونار: \${escapeHtml(v.ultrasound_findings)}</p>\` : ''}`;

const newVisitDiag = `<strong class="reception-only-blur" style="color: #0f766e;">\${escapeHtml(v.diagnosis)}</strong>
          \${v.ultrasound_findings ? \`<p class="reception-only-blur" style="font-size:0.75rem; color:#64748b; margin:2px 0 0 0;">سونار: \${escapeHtml(v.ultrasound_findings)}</p>\` : ''}
          \${v.attachments_count > 0 ? \`<span class="badge badge-booked mt-1" style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem;"><i class="fa-solid fa-camera"></i> \${v.attachments_count} مرفق</span>\` : ''}`;

if (code.includes(oldVisitDiag)) {
  code = code.replace(oldVisitDiag, newVisitDiag);
}

// 7. Update renderPrescriptionsTable for privacy blur
const oldRxDiag = `<td>\${escapeHtml(pr.diagnosis_summary || 'متابعة نساء وتوليد')}</td>`;
const newRxDiag = `<td><span class="reception-only-blur">\${escapeHtml(pr.diagnosis_summary || 'متابعة نساء وتوليد')}</span></td>`;
if (code.includes(oldRxDiag)) {
  code = code.replace(oldRxDiag, newRxDiag);
}

// 8. Add Attachment handling logic in setupForms
const attachmentSetupCode = `
    // Attachments Handling (Ultrasound & Lab)
    const btnTriggerAddAttachment = document.getElementById('btnTriggerAddAttachment');
    const inputVisitAttachmentFile = document.getElementById('inputVisitAttachmentFile');
    const selectVisitAttachmentType = document.getElementById('selectVisitAttachmentType');

    if (btnTriggerAddAttachment && inputVisitAttachmentFile) {
      btnTriggerAddAttachment.addEventListener('click', () => {
        inputVisitAttachmentFile.click();
      });

      inputVisitAttachmentFile.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) {
          showToast('حجم الملف كبير جداً (الحد الأقصى 8 ميجابايت)', 'error');
          e.target.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          const base64Data = evt.target.result;
          const attType = selectVisitAttachmentType?.value || 'سونار';
          const gaWeeks = document.getElementById('visitGaWeeks')?.value;
          const title = attType + (gaWeeks ? ' (أسبوع ' + gaWeeks + ')' : '');
          currentVisitAttachments.push({
            attachment_type: attType,
            title: title,
            file_data: base64Data
          });
          renderVisitAttachmentsPreviews();
          e.target.value = '';
          showToast('تم إرفاق الملف بنجاح');
        };
        reader.readAsDataURL(file);
      });
    }
`;

if (!code.includes('const btnTriggerAddAttachment')) {
  code = code.replace(
    'if (formVisit) {',
    'let currentVisitAttachments = [];\n\n' + attachmentSetupCode + '\n    if (formVisit) {'
  );
}

// 9. In formVisit submit, pass attachments: currentVisitAttachments
const oldPayloadLmp = `edd: document.getElementById('visitEdd')?.value || null`;
const newPayloadLmp = `edd: document.getElementById('visitEdd')?.value || null,
          attachments: currentVisitAttachments`;
if (code.includes(oldPayloadLmp) && !code.includes('attachments: currentVisitAttachments')) {
  code = code.replace(oldPayloadLmp, newPayloadLmp);
}

// 10. In formVisit success, reset attachments
if (!code.includes('currentVisitAttachments = [];\n            renderVisitAttachmentsPreviews();')) {
  code = code.replace(
    'formVisit.reset();\n            resetVisitClinicalFields();',
    'formVisit.reset();\n            resetVisitClinicalFields();\n            currentVisitAttachments = [];\n            renderVisitAttachmentsPreviews();'
  );
}

// 11. Add renderVisitAttachmentsPreviews and window.removeVisitAttachment
const previewFunctions = `
  function renderVisitAttachmentsPreviews() {
    const container = document.getElementById('visitAttachmentsContainer');
    if (!container) return;
    if (currentVisitAttachments.length === 0) {
      container.innerHTML = '<span class="text-slate-400" style="font-size: 0.85rem; padding: 6px 0; grid-column: 1 / -1;">لا توجد صور سونار أو تحاليل مرفقة حتى الآن. انقر على "رفع صورة / ملف" للإضافة.</span>';
      return;
    }
    container.innerHTML = currentVisitAttachments.map((att, idx) => \`
      <div class="attachment-preview-card">
        <img src="\${att.file_data}" class="attachment-thumb-img" alt="\${escapeHtml(att.title || att.attachment_type || 'مرفق')}" onclick="window.openLightbox('\${att.file_data}', '\${escapeHtml(att.title || att.attachment_type || 'مرفق')}')">
        <button type="button" class="btn-remove-attachment" onclick="window.removeVisitAttachment(\${idx})" title="حذف المرفق">&times;</button>
        <span class="attachment-type-badge">\${escapeHtml(att.attachment_type || 'سونار')}</span>
      </div>
    \`).join('');
  }

  window.removeVisitAttachment = (idx) => {
    currentVisitAttachments.splice(idx, 1);
    renderVisitAttachmentsPreviews();
  };
`;

if (!code.includes('function renderVisitAttachmentsPreviews()')) {
  code = code.replace(
    '  window.openNewVisitModal = () => {',
    previewFunctions + '\n  window.openNewVisitModal = () => {'
  );
}

// 12. In openNewVisitModal, reset attachments
if (!code.includes('currentVisitAttachments = [];\n    renderVisitAttachmentsPreviews();\n    const visitFormId')) {
  code = code.replace(
    'formVisit.reset();\n    resetVisitClinicalFields();\n    const visitFormId',
    'formVisit.reset();\n    resetVisitClinicalFields();\n    currentVisitAttachments = [];\n    renderVisitAttachmentsPreviews();\n    const visitFormId'
  );
}

// 13. In editVisit, load existing attachments
if (!code.includes('currentVisitAttachments = v.attachments && Array.isArray(v.attachments) ? [...v.attachments] : [];')) {
  code = code.replace(
    'formVisit.reset();\n      const visitFormId',
    'formVisit.reset();\n      currentVisitAttachments = v.attachments && Array.isArray(v.attachments) ? [...v.attachments] : [];\n      renderVisitAttachmentsPreviews();\n      const visitFormId'
  );
}

// 14. Smart Prescription Safety Alerts Implementation
const safetyCheckFunction = `
  // --------------------------------------------------------------------------
  // Smart Prescription Safety Check Engine (Allergy & Drug Interactions)
  // --------------------------------------------------------------------------
  function checkPrescriptionSafety() {
    const container = document.getElementById('rxAlertsContainer');
    if (!container) return;

    const patientId = document.getElementById('rxPatientSelect')?.value;
    const patient = state.patients.find(p => String(p.id) === String(patientId));
    
    // Gather all med names currently in rows
    const medInputs = document.querySelectorAll('.rx-med-name-input');
    const medNames = Array.from(medInputs).map(input => input.value.trim().toLowerCase()).filter(Boolean);

    const alerts = [];

    // 1. Patient Allergy Check
    if (patient && patient.allergies && !patient.allergies.includes('لا توجد') && !patient.allergies.includes('لا يوجد')) {
      const ptAllergyLower = patient.allergies.toLowerCase();
      
      // Check Penicillin family
      const isPenicillinAllergic = ptAllergyLower.includes('بنسلين') || 
                                   ptAllergyLower.includes('penicillin') || 
                                   ptAllergyLower.includes('amox') || 
                                   ptAllergyLower.includes('augmentin');
                                   
      if (isPenicillinAllergic) {
        const penKeywords = ['penicillin', 'amoxicillin', 'augmentin', 'curam', 'amoxil', 'klavox', 'megamox', 'unasyn', 'ampicillin', 'بنسلين', 'أوجمنتين', 'اوجمنتين', 'اموكسيسيلين', 'كيورام', 'يوناسين'];
        const offendingDrugs = medNames.filter(name => penKeywords.some(kw => name.includes(kw)));
        if (offendingDrugs.length > 0) {
          alerts.push({
            type: 'danger',
            icon: 'fa-shield-virus',
            title: 'تحذير حساسية دوائية خطير (Drug Allergy Alert)',
            message: 'المريضة لديها حساسية مسجلة من (<strong>' + escapeHtml(patient.allergies) + '</strong>). الدواء المضاف [<strong>' + escapeHtml(offendingDrugs.join('، ')) + '</strong>] ينتمي لمجموعة البنسلين، وقد يعرض المريضة لصدمة حساسية حادة مهددة للحياة.'
          });
        }
      }

      // Check NSAIDs / Aspirin allergy
      const isNsaidAllergic = ptAllergyLower.includes('اسبرين') || 
                              ptAllergyLower.includes('aspirin') || 
                              ptAllergyLower.includes('بروفين') || 
                              ptAllergyLower.includes('nsaid');
      if (isNsaidAllergic) {
        const nsaidKeywords = ['aspirin', 'brufen', 'ibuprofen', 'voltaren', 'cataflam', 'ketofan', 'ketolac', 'أسبرين', 'اسبرين', 'بروفين', 'فولتارين', 'كتافلام', 'كيتوفان'];
        const offendingDrugs = medNames.filter(name => nsaidKeywords.some(kw => name.includes(kw)));
        if (offendingDrugs.length > 0) {
          alerts.push({
            type: 'danger',
            icon: 'fa-triangle-exclamation',
            title: 'تحذير حساسية دوائية (NSAIDs Allergy Alert)',
            message: 'المريضة مسجل لديها حساسية من الأسبرين ومسكنات NSAIDs (<strong>' + escapeHtml(patient.allergies) + '</strong>). يرجى مراجعة الدواء [<strong>' + escapeHtml(offendingDrugs.join('، ')) + '</strong>].'
          });
        }
      }
    }

    // 2. Drug-Drug Interaction Check: Iron + Calcium
    const ironKeywords = ['iron', 'feroglobin', 'ferose', 'ferrum', 'fefol', 'innofer', 'vitiron', 'hemamax', 'ferrous', 'حديد', 'فيروجلوبين', 'فيروز', 'فيروم', 'هيماماكس'];
    const calciumKeywords = ['calcium', 'caltrate', 'calcimate', 'osteocare', 'calci-max', 'cal-mag', 'كالسيوم', 'كالتريت', 'كالسيماكس', 'أوستيوكير', 'اوستيوكير'];

    const hasIron = medNames.some(name => ironKeywords.some(kw => name.includes(kw)));
    const hasCalcium = medNames.some(name => calciumKeywords.some(kw => name.includes(kw)));

    if (hasIron && hasCalcium) {
      alerts.push({
        type: 'warning',
        icon: 'fa-triangle-exclamation',
        title: 'تنبيه تداخل دوائي: الكالسيوم يقلل امتصاص الحديد (Drug Interaction)',
        message: 'تحتوي الروشتة على مستحضر <strong>حديد</strong> مع مستحضر <strong>كالسيوم</strong>. أملاح الكالسيوم ترتبط بالحديد وتقلل امتصاصه الهضمي بنسبة تتجاوز 50%. <strong>توجيه إكلينيكي:</strong> يرجى التنبيه على المريضة بالفصل بين موعد تناول الحديد وموعد تناول الكالسيوم بساعتين على الأقل.'
      });
    }

    // Render Alerts
    if (alerts.length === 0) {
      container.classList.add('d-none');
      container.innerHTML = '';
    } else {
      container.classList.remove('d-none');
      container.innerHTML = alerts.map(a => \`
        <div class="rx-alert-box \${a.type === 'danger' ? 'rx-alert-danger' : 'rx-alert-warning'}">
          <div class="rx-alert-content">
            <i class="fa-solid \${a.icon}"></i>
            <div>
              <strong>\${a.title}</strong>
              <p class="mb-0" style="font-size: 0.85rem; margin-top: 3px;">\${a.message}</p>
            </div>
          </div>
        </div>
      \`).join('');
    }
  }

  window.triggerRxSafetyCheck = () => {
    setTimeout(checkPrescriptionSafety, 50);
  };
`;

if (!code.includes('function checkPrescriptionSafety()')) {
  code = code.replace(
    '  function setupPrescriptionBuilder() {',
    safetyCheckFunction + '\n  function setupPrescriptionBuilder() {'
  );
}

// 15. In setupPrescriptionBuilder, wire rxPatientSelect & rxItemsContainer events
const oldSetupRx = `    if (btnPrintActual) {
      btnPrintActual.addEventListener('click', () => {
        window.print();
      });
    }`;

const newSetupRx = `    if (btnPrintActual) {
      btnPrintActual.addEventListener('click', () => {
        window.print();
      });
    }

    const rxPatientSelect = document.getElementById('rxPatientSelect');
    if (rxPatientSelect) {
      rxPatientSelect.addEventListener('change', () => {
        checkPrescriptionSafety();
      });
    }

    if (rxItemsContainer) {
      rxItemsContainer.addEventListener('input', () => {
        checkPrescriptionSafety();
      });
      rxItemsContainer.addEventListener('change', () => {
        checkPrescriptionSafety();
      });
    }`;

if (code.includes(oldSetupRx)) {
  code = code.replace(oldSetupRx, newSetupRx);
}

// 16. In addRxItemRow, trigger checkPrescriptionSafety & row delete callback
if (code.includes('rxItemsContainer.appendChild(row);') && !code.includes('rxItemsContainer.appendChild(row);\n    checkPrescriptionSafety();')) {
  code = code.replace(
    'rxItemsContainer.appendChild(row);',
    'rxItemsContainer.appendChild(row);\n    checkPrescriptionSafety();'
  );
}

if (code.includes(`onclick="this.closest('.rx-item-row').remove()"`)) {
  code = code.replace(
    `onclick="this.closest('.rx-item-row').remove()"`,
    `onclick="this.closest('.rx-item-row').remove(); window.triggerRxSafetyCheck();"`
  );
}

// 17. In addDrugFromPreset, call checkPrescriptionSafety
if (code.includes('addRxItemRow(drug);\n    showToast(`تمت إضافة ${drug.name} إلى الروشتة`);')) {
  code = code.replace(
    'addRxItemRow(drug);\n    showToast(`تمت إضافة ${drug.name} إلى الروشتة`);',
    'addRxItemRow(drug);\n    checkPrescriptionSafety();\n    showToast(`تمت إضافة ${drug.name} إلى الروشتة`);'
  );
}

// 18. In openNewRxModal, openNewRxModalForVisit, openNewRxModalForPatient, editPrescription: call checkPrescriptionSafety
if (code.includes('addRxItemRow();\n    openModal(modalPrescription);')) {
  code = code.replace(
    'addRxItemRow();\n    openModal(modalPrescription);',
    'addRxItemRow();\n    checkPrescriptionSafety();\n    openModal(modalPrescription);'
  );
}

if (code.includes('openModal(modalPrescription);\n    } catch (err) {\n      alert(\'تعذر فتح الروشتة للتعديل\');')) {
  code = code.replace(
    'openModal(modalPrescription);\n    } catch (err) {\n      alert(\'تعذر فتح الروشتة للتعديل\');',
    'checkPrescriptionSafety();\n      openModal(modalPrescription);\n    } catch (err) {\n      alert(\'تعذر فتح الروشتة للتعديل\');'
  );
}

if (code.includes('if (diagInput && resolvedDiagnosis) diagInput.value = resolvedDiagnosis;')) {
  code = code.replace(
    'if (diagInput && resolvedDiagnosis) diagInput.value = resolvedDiagnosis;',
    'if (diagInput && resolvedDiagnosis) diagInput.value = resolvedDiagnosis;\n    checkPrescriptionSafety();'
  );
}

if (code.includes('if (sel) sel.value = patientId;')) {
  code = code.replace(
    'if (sel) sel.value = patientId;',
    'if (sel) sel.value = patientId;\n    checkPrescriptionSafety();'
  );
}

// 19. In viewPatientProfile, render Ultrasound & Lab timeline gallery and attachments in visits table
const oldProfileVisitsTable = `        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>التاريخ والوقت</th>
                <th>النوع</th>
                <th>الضغط / الوزن</th>
                <th>عمر الحمل / النبض</th>
                <th>التشخيص الطبي</th>
                <th>السونار</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              \${(p.visits || []).length === 0 ? \`<tr><td colspan="7" class="text-center p-3">لا توجد كشوفات سابقة مسجلة</td></tr>\` : 
                (p.visits || []).map(v => \`
                  <tr>
                    <td><strong>\${formatDate(v.visit_date)}</strong><br><small>\${v.visit_time ? v.visit_time.slice(0, 5) : ''}</small></td>
                    <td>\${escapeHtml(v.visit_type)}</td>
                    <td>\${v.blood_pressure || '--'} / \${v.weight_kg ? v.weight_kg + ' كجم' : '--'}</td>
                    <td>\${v.gestational_age_weeks ? v.gestational_age_weeks + ' أسبوع' : '--'} \${v.fetal_heart_rate ? \`(\${v.fetal_heart_rate} bpm)\` : ''}</td>
                    <td><strong style="color: #0f766e;">\${escapeHtml(v.diagnosis)}</strong></td>
                    <td><small>\${escapeHtml(v.ultrasound_findings || '--')}</small></td>
                    <td>
                      <div class="action-btns">
                        <button class="btn-icon edit" onclick="window.closePatientProfileModal(); window.editVisit(\${v.id})" title="تعديل الكشف">
                          <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon delete" onclick="window.closePatientProfileModal(); window.deleteVisit(\${v.id})" title="حذف الكشف">
                          <i class="fa-regular fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                \`).join('')}
            </tbody>
          </table>
        </div>`;

const newProfileVisitsTable = `        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>التاريخ والوقت</th>
                <th>النوع</th>
                <th>الضغط / الوزن</th>
                <th>عمر الحمل / النبض</th>
                <th>التشخيص الطبي</th>
                <th>السونار والمرفقات</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              \${(p.visits || []).length === 0 ? \`<tr><td colspan="7" class="text-center p-3">لا توجد كشوفات سابقة مسجلة</td></tr>\` : 
                (p.visits || []).map(v => \`
                  <tr>
                    <td><strong>\${formatDate(v.visit_date)}</strong><br><small>\${v.visit_time ? v.visit_time.slice(0, 5) : ''}</small></td>
                    <td>\${escapeHtml(v.visit_type)}</td>
                    <td>\${v.blood_pressure || '--'} / \${v.weight_kg ? v.weight_kg + ' كجم' : '--'}</td>
                    <td>\${v.gestational_age_weeks ? v.gestational_age_weeks + ' أسبوع' : '--'} \${v.fetal_heart_rate ? \`(\${v.fetal_heart_rate} bpm)\` : ''}</td>
                    <td><strong class="reception-only-blur" style="color: #0f766e;">\${escapeHtml(v.diagnosis)}</strong></td>
                    <td>
                      <small class="reception-only-blur">\${escapeHtml(v.ultrasound_findings || '--')}</small>
                      \${(v.attachments && v.attachments.length > 0) ? \`
                        <div class="mt-1 d-flex gap-1 flex-wrap">
                          \${v.attachments.map(a => \`
                            <span class="badge badge-booked" style="cursor: pointer; font-size: 0.72rem; padding: 2px 6px;" onclick="window.openLightbox('\${a.file_data}', '\${escapeHtml(a.title || a.attachment_type)}')">
                              <i class="fa-solid fa-camera"></i> \${escapeHtml(a.attachment_type)}
                            </span>
                          \`).join('')}
                        </div>
                      \` : ''}
                    </td>
                    <td>
                      <div class="action-btns">
                        <button class="btn-icon edit" onclick="window.closePatientProfileModal(); window.editVisit(\${v.id})" title="تعديل الكشف">
                          <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon delete" onclick="window.closePatientProfileModal(); window.deleteVisit(\${v.id})" title="حذف الكشف">
                          <i class="fa-regular fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                \`).join('')}
            </tbody>
          </table>
        </div>

        <h4 class="form-section-title mt-4">
          <i class="fa-solid fa-camera text-primary"></i> معرض السونار والتحاليل الطبية بالتطور الزمني (\${(p.attachments || []).length})
        </h4>
        \${(p.attachments || []).length === 0 ? \`
          <div class="p-3 text-slate-400 text-center" style="background: var(--slate-50); border-radius: 8px; font-size: 0.9rem;">
            <i class="fa-regular fa-image mb-1" style="font-size: 20px; display: block;"></i>
            لا توجد صور سونار أو تحاليل طبية مرفقة في سجل هذه المريضة حتى الآن.
          </div>
        \` : \`
          <div class="profile-sonar-gallery">
            \${(p.attachments || []).map(att => \`
              <div class="sonar-gallery-item" onclick="window.openLightbox('\${att.file_data}', '\${escapeHtml(att.title || att.attachment_type)}')">
                <img src="\${att.file_data}" alt="\${escapeHtml(att.title || 'سونار')}">
                <div class="sonar-gallery-overlay">
                  <span class="sonar-ga-tag">\${escapeHtml(att.attachment_type || 'سونار')}</span>
                  <p class="sonar-gallery-title">\${escapeHtml(att.title || '')}</p>
                  <small class="sonar-gallery-date">\${formatDate(att.created_at)}</small>
                </div>
              </div>
            \`).join('')}
          </div>
        \`}`;

if (code.includes(oldProfileVisitsTable)) {
  code = code.replace(oldProfileVisitsTable, newProfileVisitsTable);
}

fs.writeFileSync(appJsPath, code, 'utf8');
console.log('app.js updated successfully!');

