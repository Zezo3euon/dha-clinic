const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
  'patients.html',
  'appointments.html',
  'visits.html',
  'prescriptions.html',
  'calculator.html',
  'backups.html',
  '_master_template.html'
];

const privacyButtonHtml = `            <button class="btn-toggle-privacy" id="btnTogglePrivacyMode" title="تفعيل وضع الخصوصية للاستقبال (حجب التشخيصات والروشتات)">
              <i class="fa-solid fa-user-shield"></i>
              <span id="privacyModeText">وضع الاستقبال</span>
            </button>
`;

const visitAttachmentsHtml = `          <!-- Visit Attachments (Ultrasound & Lab Photos) -->
          <div class="visit-attachments-section">
            <div class="attachments-upload-bar">
              <div class="d-flex align-items-center gap-2">
                <i class="fa-solid fa-camera text-primary"></i>
                <label class="mb-0 font-bold">مرفقات السونار والتحاليل الطبية للزيارة</label>
              </div>
              <div class="d-flex align-items-center gap-2">
                <select id="selectVisitAttachmentType" class="form-control form-control-sm" style="width: auto;">
                  <option value="سونار">صورة سونار</option>
                  <option value="تحليل دم / CBC">تحليل دم / CBC</option>
                  <option value="سكر عشوائي / تراكمي">سكر عشوائي / تراكمي</option>
                  <option value="غدة درقية / TSH">غدة درقية / TSH</option>
                  <option value="أشعة تفصيلية / 4D">أشعة تفصيلية / 4D</option>
                  <option value="مرفق طبي آخر">مرفق طبي آخر</option>
                </select>
                <input type="file" id="inputVisitAttachmentFile" accept="image/*" class="d-none">
                <button type="button" class="btn btn-sm btn-outline" id="btnTriggerAddAttachment">
                  <i class="fa-solid fa-upload"></i> رفع صورة / ملف
                </button>
              </div>
            </div>
            <div class="attachments-grid" id="visitAttachmentsContainer">
              <!-- Dynamically populated previews -->
            </div>
          </div>
`;

const rxAlertsHtml = `          <!-- Prescription Alerts: Drug Allergies & Drug Interactions -->
          <div class="rx-alerts-container d-none" id="rxAlertsContainer"></div>
`;

const lightboxModalHtml = `  <!-- 9. MODAL: IMAGE LIGHTBOX VIEWER -->
  <div class="modal-overlay lightbox-modal" id="modalLightbox">
    <div class="lightbox-content">
      <div class="lightbox-header">
        <h4 id="lightboxTitle" style="color: white; margin: 0; font-size: 1rem;">معاينة المرفق</h4>
        <button class="lightbox-close" data-close="modalLightbox">&times;</button>
      </div>
      <img id="lightboxImg" src="" alt="معاينة المرفق">
    </div>
  </div>

`;

files.forEach(file => {
  const filePath = path.join(__dirname, '..', 'src', 'public', file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file}: not found`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Add privacy toggle button if not already present
  if (!content.includes('id="btnTogglePrivacyMode"') && content.includes('<div class="quick-actions">')) {
    content = content.replace(
      '<div class="quick-actions">',
      '<div class="quick-actions">\n' + privacyButtonHtml
    );
    modified = true;
  }

  // 2. Add visit attachments section right after visitUltrasound form-group
  if (!content.includes('id="visitAttachmentsContainer"') && content.includes('id="visitUltrasound"')) {
    const target = 'id="visitUltrasound"';
    const idx = content.indexOf(target);
    const endDivIdx = content.indexOf('</div>', idx);
    if (endDivIdx !== -1) {
      const insertPos = endDivIdx + 6; // right after </div>
      content = content.slice(0, insertPos) + '\n\n' + visitAttachmentsHtml + content.slice(insertPos);
      modified = true;
    }
  }

  // 3. Add rx alerts container right after rxDiagnosisSummary form-group
  if (!content.includes('id="rxAlertsContainer"') && content.includes('id="rxDiagnosisSummary"')) {
    const target = 'id="rxDiagnosisSummary"';
    const idx = content.indexOf(target);
    // Find the enclosing form-row's closing </div>
    const nextRowDiv = content.indexOf('</div>', idx);
    const outerDiv = content.indexOf('</div>', nextRowDiv + 6);
    if (outerDiv !== -1) {
      const insertPos = outerDiv + 6;
      content = content.slice(0, insertPos) + '\n\n' + rxAlertsHtml + content.slice(insertPos);
      modified = true;
    }
  }

  // 4. Add lightbox modal before toast container
  if (!content.includes('id="modalLightbox"') && content.includes('<div class="toast-container"')) {
    content = content.replace(
      '<div class="toast-container"',
      lightboxModalHtml + '  <div class="toast-container"'
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully updated ${file}`);
  } else {
    console.log(`No changes needed for ${file}`);
  }
});
