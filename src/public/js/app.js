/**
 * عيادة الدكتور حاتم عواجة - استشاري النساء والتوليد
 * Modern SPA Application Logic & Interactive State Manager
 */

document.addEventListener('DOMContentLoaded', () => {
  // Local Date Helper to avoid UTC skew in Cairo / Gulf timezones
  function getLocalDateString(d = new Date()) {
    if (!d) return '--';
    if (typeof d === 'string' && d.includes('T')) {
      d = new Date(d);
    } else if (typeof d === 'string') {
      return d.split('T')[0];
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Application State
  const state = {
    patients: [],
    allPatients: [],
    appointments: [],
    visits: [],
    prescriptions: [],
    drugsCatalog: [],
    todayQueue: [],
    queueFilter: 'all',
    apptDateMode: 'today',
    currentDate: getLocalDateString(),
    activeView: 'dashboard'
  };

  // DOM Elements - Navigation & Layout
  const navButtons = document.querySelectorAll('.nav-item');
  const viewPanels = document.querySelectorAll('.view-panel');
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');
  const appSidebar = document.getElementById('appSidebar');
  const currentTimeDisplay = document.getElementById('currentTimeDisplay');
  const currentDateDisplay = document.getElementById('currentDateDisplay');
  const dbStatusText = document.getElementById('dbStatusText');
  const dbStatusPill = document.getElementById('dbStatusPill');

  // Dashboard Stats Elements
  const statTotalPatients = document.getElementById('statTotalPatients');
  const statPregnantPatients = document.getElementById('statPregnantPatients');
  const statTodayAppointments = document.getElementById('statTodayAppointments');
  const statTotalPrescriptions = document.getElementById('statTotalPrescriptions');
  const todayQueueTableBody = document.getElementById('todayQueueTableBody');
  const btnRefreshQueue = document.getElementById('btnRefreshQueue');
  const btnBookAppointmentFromDash = document.getElementById('btnBookAppointmentFromDash');

  // Dashboard Queue Filter Pills & Counters
  const dashboardQueueFilterPills = document.getElementById('dashboardQueueFilterPills');
  const dashCountAll = document.getElementById('dashCountAll');
  const dashCountWaiting = document.getElementById('dashCountWaiting');
  const dashCountCurrent = document.getElementById('dashCountCurrent');
  const dashCountCompleted = document.getElementById('dashCountCompleted');

  // Global Real-Time Search Elements
  const globalSearchContainer = document.getElementById('globalSearchContainer');
  const globalSearchInput = document.getElementById('globalSearchInput');
  const btnClearGlobalSearch = document.getElementById('btnClearGlobalSearch');
  const globalSearchDropdown = document.getElementById('globalSearchDropdown');
  const searchDropdownContent = document.getElementById('searchDropdownContent');

  // Quick Action Buttons
  const btnQuickNewPatient = document.getElementById('btnQuickNewPatient');
  const btnQuickNewVisit = document.getElementById('btnQuickNewVisit');
  const btnQuickNewRx = document.getElementById('btnQuickNewRx');

  // Modals & Forms
  const modalPatient = document.getElementById('modalPatient');
  const formPatient = document.getElementById('formPatient');
  const modalAppointment = document.getElementById('modalAppointment');
  const formAppointment = document.getElementById('formAppointment');
  const modalVisit = document.getElementById('modalVisit');
  const formVisit = document.getElementById('formVisit');
  const modalPrescription = document.getElementById('modalPrescription');
  const formPrescription = document.getElementById('formPrescription');
  const modalPatientProfile = document.getElementById('modalPatientProfile');
  const modalPrintRx = document.getElementById('modalPrintRx');

  // Table Bodies
  const patientsTableBody = document.getElementById('patientsTableBody');
  const appointmentsTableBody = document.getElementById('appointmentsTableBody');
  const visitsTableBody = document.getElementById('visitsTableBody');
  const prescriptionsTableBody = document.getElementById('prescriptionsTableBody');

  // Search & Filter Inputs - Patients
  const patientSearchInput = document.getElementById('patientSearchInput');
  const filterPatientPregnant = document.getElementById('filterPatientPregnant');
  const filterPatientBlood = document.getElementById('filterPatientBlood');
  const filterPatientHistory = document.getElementById('filterPatientHistory');
  const filterPatientSort = document.getElementById('filterPatientSort');
  const btnResetPatientFilters = document.getElementById('btnResetPatientFilters');
  const patientFilterCount = document.getElementById('patientFilterCount');

  // Search & Filter Inputs - Appointments
  const appointmentSearchInput = document.getElementById('appointmentSearchInput');
  const appointmentsDatePicker = document.getElementById('appointmentsDatePicker');
  const btnApptDateToday = document.getElementById('btnApptDateToday');
  const btnApptDateTomorrow = document.getElementById('btnApptDateTomorrow');
  const btnApptDateAll = document.getElementById('btnApptDateAll');
  const filterApptStatus = document.getElementById('filterApptStatus');
  const filterApptPayment = document.getElementById('filterApptPayment');
  const filterApptType = document.getElementById('filterApptType');
  const btnResetApptFilters = document.getElementById('btnResetApptFilters');
  const appointmentFilterCount = document.getElementById('appointmentFilterCount');

  // Search & Filter Inputs - Visits
  const visitSearchInput = document.getElementById('visitSearchInput');
  const filterVisitType = document.getElementById('filterVisitType');
  const filterVisitHasRx = document.getElementById('filterVisitHasRx');
  const filterVisitDate = document.getElementById('filterVisitDate');
  const btnResetVisitFilters = document.getElementById('btnResetVisitFilters');
  const visitFilterCount = document.getElementById('visitFilterCount');

  // Search & Filter Inputs - Prescriptions
  const prescriptionSearchInput = document.getElementById('prescriptionSearchInput');
  const filterRxDate = document.getElementById('filterRxDate');
  const btnResetRxFilters = document.getElementById('btnResetRxFilters');
  const prescriptionFilterCount = document.getElementById('prescriptionFilterCount');

  // Calculators Elements
  const dashCalcLmp = document.getElementById('dashCalcLmp');
  const btnCalculatePregnancy = document.getElementById('btnCalculatePregnancy');
  const calcResultsBox = document.getElementById('calcResultsBox');
  const resEddDate = document.getElementById('resEddDate');
  const resGaWeeks = document.getElementById('resGaWeeks');
  const resTrimester = document.getElementById('resTrimester');
  const resDaysLeft = document.getElementById('resDaysLeft');

  // Detailed Calculator
  const fullCalcLmp = document.getElementById('fullCalcLmp');
  const fullCalcCycle = document.getElementById('fullCalcCycle');
  const btnRunFullCalc = document.getElementById('btnRunFullCalc');

  // Prescription Builder Elements
  const drugPresetPills = document.getElementById('drugPresetPills');
  const rxItemsContainer = document.getElementById('rxItemsContainer');
  const btnAddRxItemRow = document.getElementById('btnAddRxItemRow');
  const btnSaveAndPrintRx = document.getElementById('btnSaveAndPrintRx');
  const btnPrintActual = document.getElementById('btnPrintActual');

  // --------------------------------------------------------------------------
  // 1. Initial Setup & Event Listeners
  // --------------------------------------------------------------------------
  function init() {
    setupClock();
    setupNavigation();
    setupModalHandlers();
    setupCalculators();
    setupForms();
    setupSearches();
    setupPrescriptionBuilder();

    // Check query params for appointment date (e.g. /appointments?date=2026-10-31)
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');

    // Default dates
    if (appointmentsDatePicker) {
      appointmentsDatePicker.value = dateParam || state.currentDate;
    }

    // Load initial data
    loadHealth();
    loadDrugsCatalog();
    loadPatients(); // always loads to populate patient dropdowns in modals across all pages

    if (todayQueueTableBody) {
      loadDashboardStats();
    }
    if (appointmentsTableBody) {
      loadAppointments(dateParam || state.currentDate);
    }
    if (visitsTableBody) {
      loadVisits();
    }
    if (prescriptionsTableBody) {
      loadPrescriptions();
    }
    const backupsTableBody = document.getElementById('backupsTableBody');
    if (backupsTableBody) {
      loadBackups();
      setupBackups();
    }

    // Periodic health & stats refresh every 15s/30s
    setInterval(loadHealth, 15000);
    if (todayQueueTableBody) {
      setInterval(loadDashboardStats, 30000);
    }
  }

  function formatDate(val) {
    if (!val) return '--';
    return getLocalDateString(val);
  }

  // --------------------------------------------------------------------------
  // 2. Real-Time Clock & Header Date
  // --------------------------------------------------------------------------
  function setupClock() {
    const updateTime = () => {
      const now = new Date();
      if (currentTimeDisplay) {
        currentTimeDisplay.textContent = now.toLocaleTimeString('ar-EG', { hour12: true });
      }
      if (currentDateDisplay) {
        currentDateDisplay.textContent = now.toLocaleDateString('ar-EG', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  // --------------------------------------------------------------------------
  // 3. Navigation & Views Switching
  // --------------------------------------------------------------------------
  function setupNavigation() {
    // Detect active page based on pathname
    const currentPath = window.location.pathname.toLowerCase();
    let currentView = 'dashboard';
    if (currentPath.includes('/patients')) currentView = 'patients';
    else if (currentPath.includes('/appointments')) currentView = 'appointments';
    else if (currentPath.includes('/visits')) currentView = 'visits';
    else if (currentPath.includes('/prescriptions')) currentView = 'prescriptions';
    else if (currentPath.includes('/calculator')) currentView = 'calculator';
    else if (currentPath.includes('/backups')) currentView = 'backups';
    else currentView = 'dashboard';

    state.activeView = currentView;

    navButtons.forEach(btn => {
      const view = btn.dataset.view;
      btn.classList.toggle('active', view === currentView);
      btn.addEventListener('click', () => {
        if (window.innerWidth <= 1024 && appSidebar) {
          appSidebar.classList.remove('open');
        }
      });
    });

    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener('click', () => {
        appSidebar.classList.toggle('open');
      });
    }

    // Quick Action Bar triggers
    btnQuickNewPatient?.addEventListener('click', () => openModal(modalPatient));
    btnQuickNewVisit?.addEventListener('click', () => openNewVisitModal());
    btnQuickNewRx?.addEventListener('click', () => openNewRxModal());
    btnRefreshQueue?.addEventListener('click', () => {
      loadDashboardStats();
      showToast('تم تحديث قائمة اليوم بنجاح');
    });
    btnBookAppointmentFromDash?.addEventListener('click', () => openNewAppointmentModal());
    document.getElementById('btnOpenNewPatientModal')?.addEventListener('click', () => openModal(modalPatient));
    document.getElementById('btnOpenNewAppointmentModal')?.addEventListener('click', () => openNewAppointmentModal());
    document.getElementById('btnOpenNewVisitModal')?.addEventListener('click', () => openNewVisitModal());
    document.getElementById('btnOpenNewPrescriptionModal')?.addEventListener('click', () => openNewRxModal());
  }

  function switchView(viewName) {
    const viewRoutes = {
      dashboard: '/',
      patients: '/patients',
      appointments: '/appointments',
      visits: '/visits',
      prescriptions: '/prescriptions',
      calculator: '/calculator',
      backups: '/backups'
    };

    const targetPanel = document.getElementById(`view${capitalize(viewName)}`);
    if (targetPanel) {
      state.activeView = viewName;
      navButtons.forEach(b => {
        b.classList.toggle('active', b.dataset.view === viewName);
      });

      viewPanels.forEach(panel => {
        panel.classList.remove('active');
      });
      targetPanel.classList.add('active');

      // Update Header if elements exist
      const titles = {
        dashboard: { title: 'لوحة التحكم والعيادة', sub: 'نظرة عامة على نشاط اليوم والمريضات وطابور الانتظار' },
        patients: { title: 'سجل المريضات الشامل', sub: 'إدارة ملفات المريضات والتاريخ الطبي والتوليدي' },
        appointments: { title: 'الحجوزات وقائمة الانتظار', sub: 'إدارة مواعيد الكشف والاستشارات وجدول العيادة' },
        visits: { title: 'الكشوفات والتشخيصات', sub: 'تسجيل الفحوصات الإكلينيكية والسونار والتشخيص بالتوقيتات والتواريخ' },
        prescriptions: { title: 'الروشتات الطبية الإلكترونية', sub: 'إنشاء وتعديل وطباعة الروشتات العلاجية الفاخرة' },
        calculator: { title: 'حاسبة الحمل والولادة التخصصية', sub: 'حساب دقيق لعمر الحمل والموعد المتوقع للولادة والفحوصات المطلوبة' },
        backups: { title: 'إدارة النسخ الاحتياطية وقاعدة البيانات', sub: 'تصدير، حفظ، واسترجاع سجلات العيادة وملفات المريضات بأمان تام' }
      };

      if (titles[viewName] && pageTitle && pageSubtitle) {
        pageTitle.textContent = titles[viewName].title;
        pageSubtitle.textContent = titles[viewName].sub;
      }
    } else if (viewRoutes[viewName]) {
      window.location.href = viewRoutes[viewName];
    }
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // --------------------------------------------------------------------------
  // 4. Modal Open / Close Handlers
  // --------------------------------------------------------------------------
  function setupModalHandlers() {
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.close;
        const modal = document.getElementById(modalId);
        if (modal) closeModal(modal);
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModal(overlay);
        }
      });
    });
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  // --------------------------------------------------------------------------
  // 5. Toast Notifications
  // --------------------------------------------------------------------------
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check text-emerald' : 'fa-circle-exclamation text-rose';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // --------------------------------------------------------------------------
  // 6. API Services
  // --------------------------------------------------------------------------
  async function loadHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.database && data.database.connected) {
        dbStatusText.textContent = 'PostgreSQL (متصل بنجاح)';
        dbStatusPill.classList.remove('warning');
      } else {
        dbStatusText.textContent = 'Docker Syncing (وضع محلي)';
      }
    } catch (err) {
      dbStatusText.textContent = 'قاعدة البيانات (محلي)';
    }
  }

  async function loadDashboardStats() {
    try {
      const res = await fetch('/api/stats/dashboard');
      const json = await res.json();
      if (!json.success) return;

      const { stats, todayQueue } = json;
      if (statTotalPatients) statTotalPatients.textContent = stats.totalPatients || 0;
      if (statPregnantPatients) statPregnantPatients.textContent = stats.pregnantPatients || 0;
      if (statTodayAppointments) statTodayAppointments.textContent = stats.todayAppointments || 0;
      if (statTotalPrescriptions) statTotalPrescriptions.textContent = stats.totalPrescriptions || 0;

      state.todayQueue = todayQueue || [];
      updateDashboardQueueCounts(stats);
      applyDashboardQueueFilter();
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  function updateDashboardQueueCounts(stats) {
    const total = state.todayQueue.length;
    const waiting = stats?.waitingCount ?? state.todayQueue.filter(i => i.status === 'في الانتظار').length;
    const current = stats?.inProgressCount ?? state.todayQueue.filter(i => i.status === 'جاري الكشف').length;
    const completed = stats?.completedCount ?? state.todayQueue.filter(i => i.status === 'مكتمل').length;

    if (dashCountAll) dashCountAll.textContent = total;
    if (dashCountWaiting) dashCountWaiting.textContent = waiting;
    if (dashCountCurrent) dashCountCurrent.textContent = current;
    if (dashCountCompleted) dashCountCompleted.textContent = completed;
  }

  function applyDashboardQueueFilter() {
    let filtered = state.todayQueue;
    if (state.queueFilter && state.queueFilter !== 'all') {
      filtered = state.todayQueue.filter(item => item.status === state.queueFilter);
    }
    renderTodayQueue(filtered);
  }

  function renderTodayQueue(queue) {
    if (!todayQueueTableBody) return;
    if (queue.length === 0) {
      todayQueueTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center p-4 text-slate-400">
            <i class="fa-regular fa-calendar-xmark mb-2" style="font-size: 24px; display: block;"></i>
            لا توجد حجوزات مسجلة لهذا اليوم حتى الآن.
          </td>
        </tr>
      `;
      return;
    }

    todayQueueTableBody.innerHTML = queue.map(item => `
      <tr>
        <td><strong>#${item.queue_number}</strong></td>
        <td>
          <strong>${escapeHtml(item.patient_name || '--')}</strong>
          <span style="display: block; font-size: 0.75rem; color: #64748b;">كود: ${escapeHtml(item.patient_code || '--')}</span>
        </td>
        <td dir="ltr" class="text-right">${escapeHtml(item.patient_phone || '--')}</td>
        <td><span class="badge badge-booked">${escapeHtml(item.type || 'كشف')}</span></td>
        <td>${getStatusBadge(item.status)}</td>
        <td>
          <div class="action-btns">
            ${item.status !== 'جاري الكشف' && item.status !== 'مكتمل' ? `
              <button class="btn btn-sm btn-accent" onclick="window.startExamination(${item.patient_id}, ${item.id})" title="بدء الكشف الآن">
                <i class="fa-solid fa-stethoscope"></i>
                <span>بدء الكشف</span>
              </button>
            ` : ''}
            ${item.status === 'جاري الكشف' ? `
              <button class="btn btn-sm btn-emerald" onclick="window.startExamination(${item.patient_id}, ${item.id})" title="متابعة تسجيل الكشف والروشتة">
                <i class="fa-solid fa-clipboard-check"></i>
                <span>تسجيل التشخيص</span>
              </button>
            ` : ''}
            <button class="btn-icon" onclick="window.viewPatientProfile(${item.patient_id})" title="الملف الطبي">
              <i class="fa-regular fa-id-badge"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'في الانتظار':
        return `<span class="badge badge-waiting"><i class="fa-regular fa-clock"></i> في الانتظار</span>`;
      case 'جاري الكشف':
        return `<span class="badge badge-current"><i class="fa-solid fa-stethoscope"></i> جاري الكشف</span>`;
      case 'مكتمل':
        return `<span class="badge badge-completed"><i class="fa-solid fa-check"></i> مكتمل</span>`;
      case 'ملغي':
        return `<span class="badge badge-cancelled"><i class="fa-solid fa-xmark"></i> ملغي</span>`;
      default:
        return `<span class="badge badge-booked"><i class="fa-regular fa-calendar"></i> محجوز</span>`;
    }
  }

  // --------------------------------------------------------------------------
  // 7. Patients Management
  // --------------------------------------------------------------------------
  async function loadPatients() {
    try {
      const q = patientSearchInput ? patientSearchInput.value.trim() : '';
      const isPregnant = filterPatientPregnant ? filterPatientPregnant.value : 'all';
      const bloodGroup = filterPatientBlood ? filterPatientBlood.value : 'all';
      const history = filterPatientHistory ? filterPatientHistory.value : 'all';
      const sort = filterPatientSort ? filterPatientSort.value : 'newest';

      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (isPregnant && isPregnant !== 'all') params.append('is_pregnant', isPregnant);
      if (bloodGroup && bloodGroup !== 'all') params.append('blood_group', bloodGroup);
      if (history && history !== 'all') params.append('history', history);
      if (sort && sort !== 'newest') params.append('sort', sort);

      const url = `/api/patients${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) return;

      state.patients = json.data || [];
      renderPatientsTable(state.patients);
      if (patientFilterCount) {
        patientFilterCount.textContent = `عرض ${state.patients.length} مريضة`;
      }

      if (!q && isPregnant === 'all' && bloodGroup === 'all' && history === 'all') {
        state.allPatients = state.patients;
        populatePatientDropdowns(state.allPatients);
      } else if (!state.allPatients || state.allPatients.length === 0) {
        populatePatientDropdowns(state.patients);
      }
    } catch (err) {
      console.error('Failed to load patients:', err);
    }
  }

  function renderPatientsTable(patients) {
    if (!patientsTableBody) return;
    if (patients.length === 0) {
      patientsTableBody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center p-4">لا توجد سجلات مريضات مطابقة للبحث.</td>
        </tr>
      `;
      return;
    }

    patientsTableBody.innerHTML = patients.map(p => `
      <tr>
        <td><strong>${escapeHtml(p.patient_code)}</strong></td>
        <td>
          <strong>${escapeHtml(p.full_name)}</strong>
          ${p.notes ? `<p style="font-size:0.74rem; color:#64748b;">${escapeHtml(p.notes)}</p>` : ''}
        </td>
        <td>${p.age} سنة</td>
        <td dir="ltr" class="text-right">${escapeHtml(p.phone)}</td>
        <td>${escapeHtml(p.husband_name || '--')}</td>
        <td><span class="badge badge-booked">${escapeHtml(p.blood_group || 'غير محدد')}</span></td>
        <td>
          ${p.is_pregnant 
            ? `<span class="badge badge-pregnant"><i class="fa-solid fa-person-pregnant"></i> حامل</span>` 
            : `<span class="badge badge-not-pregnant">غير حامل</span>`}
        </td>
        <td>
          <small title="Gravida / Para / Abortion / Living">
            G:${p.gravida || 0} P:${p.para || 0} A:${p.abortion || 0} L:${p.living || 0}
            ${p.cs_count ? `(قيصري: ${p.cs_count})` : ''}
          </small>
        </td>
        <td>
          <span class="badge badge-booked">${p.visits_count || 0} كشف</span>
        </td>
        <td>
          <div class="action-btns">
            <button class="btn-icon view" onclick="window.viewPatientProfile(${p.id})" title="عرض الملف الكامل">
              <i class="fa-regular fa-eye"></i>
            </button>
            <button class="btn-icon" onclick="window.openNewVisitModalForPatient(${p.id})" title="كشف جديد">
              <i class="fa-solid fa-stethoscope"></i>
            </button>
            <button class="btn-icon rx" onclick="window.openNewRxModalForPatient(${p.id})" title="روشتة جديدة">
              <i class="fa-solid fa-prescription"></i>
            </button>
            <button class="btn-icon edit" onclick="window.editPatient(${p.id})" title="تعديل البيانات">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
            <button class="btn-icon delete" onclick="window.deletePatient(${p.id})" title="حذف ملف المريضة">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function populatePatientDropdowns(patients) {
    const selects = [
      document.getElementById('appPatientSelect'),
      document.getElementById('visitPatientSelect'),
      document.getElementById('rxPatientSelect')
    ];

    selects.forEach(sel => {
      if (!sel) return;
      const currentVal = sel.value;
      sel.innerHTML = `<option value="">-- اختر مريضة من القائمة --</option>` + 
        patients.map(p => `
          <option value="${p.id}" ${p.id == currentVal ? 'selected' : ''}>
            ${escapeHtml(p.full_name)} (${escapeHtml(p.patient_code)} - ${escapeHtml(p.phone)})
          </option>
        `).join('');
    });
  }

  // --------------------------------------------------------------------------
  // 8. Appointments Management
  // --------------------------------------------------------------------------
  async function loadAppointments(customDate = null) {
    try {
      const q = appointmentSearchInput ? appointmentSearchInput.value.trim() : '';
      const status = filterApptStatus ? filterApptStatus.value : 'all';
      const isPaid = filterApptPayment ? filterApptPayment.value : 'all';
      const type = filterApptType ? filterApptType.value : 'all';

      let dateVal;
      if (customDate !== null) {
        dateVal = customDate;
      } else if (state.apptDateMode === 'all') {
        dateVal = 'all';
      } else {
        dateVal = appointmentsDatePicker?.value || state.currentDate;
      }

      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (dateVal) params.append('date', dateVal);
      if (status && status !== 'all') params.append('status', status);
      if (isPaid && isPaid !== 'all') params.append('is_paid', isPaid);
      if (type && type !== 'all') params.append('type', type);

      const url = `/api/appointments${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) return;

      state.appointments = json.data || [];
      renderAppointmentsTable(state.appointments);
      if (appointmentFilterCount) {
        appointmentFilterCount.textContent = `عرض ${state.appointments.length} موعد`;
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
    }
  }

  function renderAppointmentsTable(appointments) {
    if (!appointmentsTableBody) return;
    if (appointments.length === 0) {
      appointmentsTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center p-4">لا توجد حجوزات في هذا التاريخ.</td>
        </tr>
      `;
      return;
    }

    appointmentsTableBody.innerHTML = appointments.map(a => `
      <tr>
        <td><strong>#${a.queue_number}</strong></td>
        <td>
          <strong>${escapeHtml(a.patient_name || '--')}</strong>
          <small style="display:block; color:#64748b;">${escapeHtml(a.patient_code || '')}</small>
        </td>
        <td dir="ltr" class="text-right">${escapeHtml(a.patient_phone || '--')}</td>
        <td>${a.appointment_time ? a.appointment_time.slice(0, 5) : '--'}</td>
        <td><span class="badge badge-booked">${escapeHtml(a.type)}</span></td>
        <td>${parseFloat(a.fee || 0).toFixed(0)} ج.م</td>
        <td>
          <button class="btn btn-sm ${a.is_paid ? 'btn-emerald' : 'btn-outline'}" 
                  onclick="window.togglePayment(${a.id}, ${!a.is_paid})">
            ${a.is_paid ? 'مدفوع ✓' : 'غير مدفوع'}
          </button>
        </td>
        <td>
          <select class="form-control form-control-sm" style="width: auto; padding: 4px 8px;" onchange="window.changeAppStatus(${a.id}, this.value)">
            <option value="محجوز" ${a.status === 'محجوز' ? 'selected' : ''}>محجوز</option>
            <option value="في الانتظار" ${a.status === 'في الانتظار' ? 'selected' : ''}>في الانتظار</option>
            <option value="جاري الكشف" ${a.status === 'جاري الكشف' ? 'selected' : ''}>جاري الكشف</option>
            <option value="مكتمل" ${a.status === 'مكتمل' ? 'selected' : ''}>مكتمل</option>
            <option value="ملغي" ${a.status === 'ملغي' ? 'selected' : ''}>ملغي</option>
          </select>
        </td>
        <td>
          <div class="action-btns">
            <button class="btn-icon" onclick="window.startExamination(${a.patient_id}, ${a.id})" title="تسجيل كشف فوري">
              <i class="fa-solid fa-stethoscope"></i>
            </button>
            <button class="btn-icon edit" onclick="window.editAppointment(${a.id})" title="تعديل الموعد">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon delete" onclick="window.deleteAppointment(${a.id})" title="إلغاء الموعد">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // --------------------------------------------------------------------------
  // 9. Visits & Diagnosis Management (with exact timestamps)
  // --------------------------------------------------------------------------
  async function loadVisits() {
    try {
      const q = visitSearchInput ? visitSearchInput.value.trim() : '';
      const type = filterVisitType ? filterVisitType.value : 'all';
      const hasRx = filterVisitHasRx ? filterVisitHasRx.value : 'all';
      const date = filterVisitDate ? filterVisitDate.value : '';

      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (type && type !== 'all') params.append('type', type);
      if (hasRx && hasRx !== 'all') params.append('has_prescription', hasRx);
      if (date) params.append('date', date);

      const url = `/api/visits${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) return;

      state.visits = json.data || [];
      renderVisitsTable(state.visits);
      if (visitFilterCount) {
        visitFilterCount.textContent = `عرض ${state.visits.length} كشف`;
      }
    } catch (err) {
      console.error('Failed to load visits:', err);
    }
  }

  function renderVisitsTable(visits) {
    if (!visitsTableBody) return;
    if (visits.length === 0) {
      visitsTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center p-4">لا توجد كشوفات مسجلة مطابقة.</td>
        </tr>
      `;
      return;
    }

    visitsTableBody.innerHTML = visits.map(v => `
      <tr>
        <td>
          <strong>${formatDate(v.visit_date)}</strong>
          <span style="display:block; font-size:0.75rem; color:#64748b;">
            <i class="fa-regular fa-clock"></i> ${v.visit_time ? v.visit_time.slice(0, 5) : '--'}
          </span>
        </td>
        <td>
          <strong>${escapeHtml(v.patient_name || '--')}</strong>
          <small style="display:block; color:#64748b;">${escapeHtml(v.patient_code || '')}</small>
        </td>
        <td><span class="badge badge-booked">${escapeHtml(v.visit_type)}</span></td>
        <td>
          BP: <strong>${v.blood_pressure || '--'}</strong><br>
          <small>وزن: ${v.weight_kg ? v.weight_kg + ' كجم' : '--'}</small>
        </td>
        <td>
          ${v.gestational_age_weeks ? `<strong>${v.gestational_age_weeks} أسبوع</strong>` : '--'}
          ${v.fetal_heart_rate ? `<span style="display:block; font-size:0.75rem; color:#e11d48;">نبض: ${v.fetal_heart_rate} bpm</span>` : ''}
        </td>
        <td>
          <strong style="color: #0f766e;">${escapeHtml(v.diagnosis)}</strong>
          ${v.ultrasound_findings ? `<p style="font-size:0.75rem; color:#64748b; margin:2px 0 0 0;">سونار: ${escapeHtml(v.ultrasound_findings)}</p>` : ''}
        </td>
        <td>
          ${v.prescriptions_count > 0 
            ? `<span class="badge badge-completed"><i class="fa-solid fa-check"></i> روشتة صادرة</span>`
            : `<button class="btn btn-sm btn-outline" onclick="window.openNewRxModalForVisit(${v.id})">+ تحرير روشتة</button>`}
        </td>
        <td>
          <div class="action-btns">
            <button class="btn-icon view" onclick="window.viewVisitDetails(${v.id})" title="عرض التفاصيل">
              <i class="fa-regular fa-eye"></i>
            </button>
            <button class="btn-icon edit" onclick="window.editVisit(${v.id})" title="تعديل الكشف">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon delete" onclick="window.deleteVisit(${v.id})" title="حذف الكشف">
              <i class="fa-regular fa-trash-can"></i>
            </button>
            <button class="btn-icon" onclick="window.viewPatientProfile(${v.patient_id})" title="ملف المريضة">
              <i class="fa-regular fa-user"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // --------------------------------------------------------------------------
  // 10. Prescriptions Management & Printing
  // --------------------------------------------------------------------------
  async function loadPrescriptions() {
    try {
      const q = prescriptionSearchInput ? prescriptionSearchInput.value.trim() : '';
      const date = filterRxDate ? filterRxDate.value : '';

      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (date) params.append('date', date);

      const url = `/api/prescriptions${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) return;

      state.prescriptions = json.data || [];
      renderPrescriptionsTable(state.prescriptions);
      if (prescriptionFilterCount) {
        prescriptionFilterCount.textContent = `عرض ${state.prescriptions.length} روشتة`;
      }
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    }
  }

  function renderPrescriptionsTable(prescriptions) {
    if (!prescriptionsTableBody) return;
    if (prescriptions.length === 0) {
      prescriptionsTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center p-4">لا توجد روشتات صادرة حتى الآن.</td>
        </tr>
      `;
      return;
    }

    prescriptionsTableBody.innerHTML = prescriptions.map(pr => `
      <tr>
        <td><strong>${escapeHtml(pr.prescription_code)}</strong></td>
        <td>
          <strong>${formatDate(pr.issue_date)}</strong>
          <small style="display:block; color:#64748b;">${pr.issue_time ? pr.issue_time.slice(0, 5) : ''}</small>
        </td>
        <td>
          <strong>${escapeHtml(pr.patient_name || '--')}</strong>
          <small style="display:block; color:#64748b;">${escapeHtml(pr.patient_code || '')}</small>
        </td>
        <td>${pr.patient_age ? pr.patient_age + ' سنة' : '--'}</td>
        <td>${escapeHtml(pr.diagnosis_summary || 'متابعة نساء وتوليد')}</td>
        <td><span class="badge badge-booked">${pr.items_count || (pr.items ? pr.items.length : 0)} أدوية</span></td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-primary" onclick="window.previewAndPrintRx(${pr.id})" title="طباعة">
              <i class="fa-solid fa-print"></i>
              <span>طباعة</span>
            </button>
            <button class="btn-icon edit" onclick="window.editPrescription(${pr.id})" title="تعديل الروشتة">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon delete" onclick="window.deletePrescription(${pr.id})" title="حذف الروشتة">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  async function loadDrugsCatalog() {
    try {
      const res = await fetch('/api/prescriptions/catalog/drugs');
      const json = await res.json();
      if (!json.success) return;

      state.drugsCatalog = json.data || [];
      renderDrugPills(state.drugsCatalog);
    } catch (err) {
      console.error('Failed to load drugs catalog:', err);
    }
  }

  function renderDrugPills(drugs) {
    if (!drugPresetPills) return;
    drugPresetPills.innerHTML = drugs.map(d => `
      <button type="button" class="drug-pill-btn" onclick="window.addDrugFromPresetById(${d.id})">
        <i class="fa-solid fa-plus"></i>
        <span>${escapeHtml(d.name)}</span>
      </button>
    `).join('');
  }

  function setupPrescriptionBuilder() {
    if (btnAddRxItemRow) {
      btnAddRxItemRow.addEventListener('click', () => {
        addRxItemRow();
      });
    }

    if (btnPrintActual) {
      btnPrintActual.addEventListener('click', () => {
        window.print();
      });
    }
  }

  function addRxItemRow(drugData = null) {
    if (!rxItemsContainer) return;
    const row = document.createElement('div');
    row.className = 'rx-item-row';
    row.innerHTML = `
      <div class="col-name form-group mb-0">
        <label>اسم الدواء *</label>
        <input type="text" class="form-control rx-med-name-input" required 
               value="${escapeHtml(drugData?.name || drugData?.medication_name || '')}" 
               placeholder="مثال: Folic Acid 5mg">
      </div>
      <div class="col-dose form-group mb-0">
        <label>الجرعة</label>
        <input type="text" class="form-control rx-med-dose-input" 
               value="${escapeHtml(drugData?.default_dosage || drugData?.dosage || '')}" 
               placeholder="قرص واحد / 500mg">
      </div>
      <div class="col-freq form-group mb-0">
        <label>التكرار</label>
        <input type="text" class="form-control rx-med-freq-input" 
               value="${escapeHtml(drugData?.default_frequency || drugData?.frequency || '')}" 
               placeholder="مرتين يومياً بعد الأكل">
      </div>
      <div class="col-dur form-group mb-0">
        <label>المدة</label>
        <input type="text" class="form-control rx-med-dur-input" 
               value="${escapeHtml(drugData?.default_duration || drugData?.duration || '')}" 
               placeholder="لمدة شهر">
      </div>
      <div class="col-act form-group mb-0">
        <label>&nbsp;</label>
        <button type="button" class="btn-icon delete w-100" title="حذف الدواء" onclick="this.closest('.rx-item-row').remove()">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    rxItemsContainer.appendChild(row);
  }

  // Window helper to add drug from catalog pills
  window.addDrugFromPresetById = (drugId) => {
    const drug = state.drugsCatalog.find(d => d.id === parseInt(drugId, 10));
    if (drug) {
      addRxItemRow(drug);
      showToast(`تمت إضافة ${drug.name} إلى الروشتة`);
    }
  };

  window.addDrugFromPreset = (drug) => {
    if (!drug) return;
    addRxItemRow(drug);
    showToast(`تمت إضافة ${drug.name} إلى الروشتة`);
  };

  // --------------------------------------------------------------------------
  // 11. Obstetric Pregnancy Calculators (Naegele's Rule & GA)
  // --------------------------------------------------------------------------
  function setupCalculators() {
    // Mini Dashboard Calculator
    if (btnCalculatePregnancy && dashCalcLmp) {
      btnCalculatePregnancy.addEventListener('click', () => {
        const lmpVal = dashCalcLmp.value;
        if (!lmpVal) {
          alert('يرجى تحديد تاريخ آخر دورة شهرية (LMP)');
          return;
        }
        const calc = calculateObstetrics(lmpVal);
        if (resEddDate) resEddDate.textContent = calc.eddFormatted;
        if (resGaWeeks) resGaWeeks.textContent = `${calc.weeks} أسابيع و ${calc.days} أيام`;
        if (resTrimester) resTrimester.textContent = calc.trimester;
        if (resDaysLeft) resDaysLeft.textContent = `${calc.daysLeft} يوماً`;
        if (calcResultsBox) calcResultsBox.classList.remove('d-none');
      });
    }

    // Detailed Calculator View
    if (btnRunFullCalc && fullCalcLmp) {
      btnRunFullCalc.addEventListener('click', () => {
        const lmpVal = fullCalcLmp.value;
        const cycleDays = parseInt(fullCalcCycle.value || 28, 10);
        if (!lmpVal) {
          alert('يرجى تحديد تاريخ أول يوم لآخر دورة شهرية');
          return;
        }
        const calc = calculateObstetrics(lmpVal, cycleDays);
        document.getElementById('detConception').textContent = calc.conceptionFormatted;
        document.getElementById('detGa').textContent = `${calc.weeks} أسبوع و ${calc.days} يوم`;
        document.getElementById('detEdd').textContent = calc.eddFormatted;
        document.getElementById('detTrimester').textContent = calc.trimester;
        document.getElementById('detWeeksLeft').textContent = `${Math.max(0, 40 - calc.weeks)} أسبوع`;
        document.getElementById('detRecommendedTests').textContent = calc.recommendedTests;
      });
    }

    // Auto calculate EDD in Patient Form
    const patientLmpInput = document.getElementById('patientLmp');
    const patientEddInput = document.getElementById('patientEdd');
    const patientIsPregnant = document.getElementById('patientIsPregnant');

    if (patientLmpInput && patientEddInput) {
      patientLmpInput.addEventListener('change', () => {
        if (patientLmpInput.value) {
          const c = calculateObstetrics(patientLmpInput.value);
          patientEddInput.value = c.eddRaw;
          if (patientIsPregnant) patientIsPregnant.checked = true;
        }
      });
    }

    // Auto calculate EDD and Gestational Age in Visit Form (Doctor's Examination Screen)
    const visitLmpInput = document.getElementById('visitLmp');
    const visitEddInput = document.getElementById('visitEdd');
    const visitIsPregnantInput = document.getElementById('visitIsPregnant');
    const visitGaWeeksInput = document.getElementById('visitGaWeeks');

    if (visitLmpInput && visitEddInput) {
      visitLmpInput.addEventListener('change', () => {
        if (visitLmpInput.value) {
          const c = calculateObstetrics(visitLmpInput.value);
          if (c) {
            visitEddInput.value = c.eddRaw;
            if (visitIsPregnantInput) visitIsPregnantInput.checked = true;
            if (visitGaWeeksInput) {
              visitGaWeeksInput.value = c.weeks || '';
            }
          }
        }
      });
    }
  }

  function calculateObstetrics(lmpStr, cycleDays = 28) {
    if (!lmpStr) return null;
    const parts = lmpStr.split('-').map(Number);
    // Create local midnight date (prevents UTC timezone skew)
    const lmpDate = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Naegele's rule adjusted for cycle length: LMP + 280 days + (cycleDays - 28)
    const totalDurationDays = 280 + (cycleDays - 28);
    const eddDate = new Date(lmpDate);
    eddDate.setDate(eddDate.getDate() + totalDurationDays);
    
    // Conception approx: LMP + (cycleDays - 14)
    const conceptionDate = new Date(lmpDate);
    conceptionDate.setDate(conceptionDate.getDate() + (cycleDays - 14));

    // Gestational Age in days
    const diffMs = today.getTime() - lmpDate.getTime();
    const totalDays = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;

    // Remaining days to EDD
    const msLeft = eddDate.getTime() - today.getTime();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

    let trimester = 'الثلث الأول (1 - 13 أسبوع)';
    let recommendedTests = 'فحص كيس الحمل وسونار النبض، صورة دم كاملة CBC، فصيلة الدم وعامل ريزوس Rh، تحليل بول وسكر، حمض الفوليك.';
    if (weeks >= 14 && weeks <= 27) {
      trimester = 'الثلث الثاني (14 - 27 أسبوع)';
      recommendedTests = 'سونار تفصيلي لتشوهات الجنين (Anomaly Scan 18-22 أسبوع)، تحليل سكر الحمل OGTT، فحص عنق الرحم، مكملات الحديد والكالسيوم.';
    } else if (weeks >= 28) {
      trimester = 'الثلث الثالث (28 - 40 أسبوع)';
      recommendedTests = 'سونار تقدير وزن الجنين وحركته وكمية السائل الأمنيوسي، تخطيط نبض الجنين CTG، فحص وضعية الجنين والاستعداد للولادة.';
    }

    const eddYear = eddDate.getFullYear();
    const eddMonth = String(eddDate.getMonth() + 1).padStart(2, '0');
    const eddDay = String(eddDate.getDate()).padStart(2, '0');
    const eddRaw = `${eddYear}-${eddMonth}-${eddDay}`;

    return {
      eddRaw,
      eddFormatted: eddDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
      conceptionFormatted: conceptionDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
      weeks,
      days,
      daysLeft,
      trimester,
      recommendedTests
    };
  }

  // --------------------------------------------------------------------------
  // 12. Form Submissions
  // --------------------------------------------------------------------------
  function setupForms() {
    // Form Patient
    if (formPatient) {
      formPatient.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('patientFormId').value;
        const payload = {
          full_name: document.getElementById('patientFullName').value.trim(),
          age: parseInt(document.getElementById('patientAge').value, 10),
          blood_group: document.getElementById('patientBloodGroup').value,
          phone: document.getElementById('patientPhone').value.trim(),
          phone_alt: document.getElementById('patientPhoneAlt').value.trim(),
          husband_name: document.getElementById('patientHusband').value.trim(),
          address: document.getElementById('patientAddress').value.trim(),
          allergies: document.getElementById('patientAllergies').value.trim(),
          chronic_diseases: document.getElementById('patientChronic').value.trim(),
          gravida: parseInt(document.getElementById('patientGravida').value || 0, 10),
          para: parseInt(document.getElementById('patientPara').value || 0, 10),
          abortion: parseInt(document.getElementById('patientAbortion').value || 0, 10),
          living: parseInt(document.getElementById('patientLiving').value || 0, 10),
          cs_count: parseInt(document.getElementById('patientCs').value || 0, 10),
          normal_delivery_count: parseInt(document.getElementById('patientNormalDeliv').value || 0, 10),
          is_pregnant: document.getElementById('patientIsPregnant').checked,
          lmp: document.getElementById('patientLmp').value || null,
          edd: document.getElementById('patientEdd').value || null,
          notes: document.getElementById('patientNotes').value.trim()
        };

        try {
          const url = id ? `/api/patients/${id}` : '/api/patients';
          const method = id ? 'PUT' : 'POST';
          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const json = await res.json();
          if (json.success) {
            closeModal(modalPatient);
            formPatient.reset();
            document.getElementById('patientFormId').value = '';
            showToast(id ? 'تم تحديث بيانات المريضة بنجاح' : 'تم تسجيل المريضة الجديدة بنجاح');
            loadPatients();
            loadDashboardStats();
          } else {
            alert(json.message || 'حدث خطأ أثناء حفظ البيانات');
          }
        } catch (err) {
          console.error(err);
          alert('تعذر الاتصال بالخادم');
        }
      });
    }

    // Form Appointment (Add or Edit)
    if (formAppointment) {
      formAppointment.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('appFormId')?.value;
        const payload = {
          patient_id: document.getElementById('appPatientSelect').value,
          appointment_date: document.getElementById('appDate').value,
          appointment_time: document.getElementById('appTime').value,
          type: document.getElementById('appType').value,
          fee: parseFloat(document.getElementById('appFee').value || 0),
          notes: document.getElementById('appNotes').value.trim()
        };

        try {
          const url = id ? `/api/appointments/${id}` : '/api/appointments';
          const method = id ? 'PUT' : 'POST';
          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const json = await res.json();
          if (json.success) {
            closeModal(modalAppointment);
            formAppointment.reset();
            const formIdInput = document.getElementById('appFormId');
            if (formIdInput) formIdInput.value = '';
            showToast(id ? 'تم تحديث بيانات الموعد بنجاح' : 'تم حجز الموعد بنجاح وإضافته لقائمة الانتظار');
            loadAppointments(payload.appointment_date);
            loadDashboardStats();
          } else {
            alert(json.message || 'تعذر حفظ الموعد');
          }
        } catch (err) {
          alert('تعذر الاتصال بالخادم');
        }
      });
    }

    // Form Clinical Visit (Add or Edit with live timestamp recording)
    const visitPatientSelect = document.getElementById('visitPatientSelect');
    if (visitPatientSelect) {
      visitPatientSelect.addEventListener('change', () => {
        populateVisitPatientClinicalData(visitPatientSelect.value);
      });
    }

    if (formVisit) {
      formVisit.addEventListener('submit', async (e) => {
        e.preventDefault();
        const visitFormId = document.getElementById('visitFormId')?.value;
        const patientId = document.getElementById('visitPatientSelect').value;
        const apptId = document.getElementById('visitAppointmentId').value;
        const diagnosis = document.getElementById('visitDiagnosis').value.trim();
        const createRxNow = document.getElementById('chkCreateRxNow').checked;

        const payload = {
          patient_id: patientId,
          appointment_id: apptId || null,
          visit_date: document.getElementById('visitDate').value,
          visit_time: document.getElementById('visitTime').value,
          visit_type: document.getElementById('visitType').value,
          chief_complaint: document.getElementById('visitComplaint').value.trim(),
          blood_pressure: document.getElementById('visitBp').value.trim(),
          weight_kg: document.getElementById('visitWeight').value || null,
          temperature: document.getElementById('visitTemp').value || null,
          gestational_age_weeks: document.getElementById('visitGaWeeks').value || null,
          fetal_heart_rate: document.getElementById('visitFhr').value || null,
          ultrasound_findings: document.getElementById('visitUltrasound').value.trim(),
          diagnosis: diagnosis,
          clinical_notes: document.getElementById('visitClinicalNotes').value.trim(),
          next_visit_date: document.getElementById('visitNextDate').value || null,
          // Doctor's recorded clinical & obstetric history:
          allergies: document.getElementById('visitAllergies')?.value.trim() || 'لا توجد حساسية معروفة',
          chronic_diseases: document.getElementById('visitChronic')?.value.trim() || null,
          gravida: parseInt(document.getElementById('visitGravida')?.value || 0, 10),
          para: parseInt(document.getElementById('visitPara')?.value || 0, 10),
          abortion: parseInt(document.getElementById('visitAbortion')?.value || 0, 10),
          living: parseInt(document.getElementById('visitLiving')?.value || 0, 10),
          cs_count: parseInt(document.getElementById('visitCs')?.value || 0, 10),
          normal_delivery_count: parseInt(document.getElementById('visitNormalDeliv')?.value || 0, 10),
          is_pregnant: Boolean(document.getElementById('visitIsPregnant')?.checked),
          lmp: document.getElementById('visitLmp')?.value || null,
          edd: document.getElementById('visitEdd')?.value || null
        };

        try {
          const url = visitFormId ? `/api/visits/${visitFormId}` : '/api/visits';
          const method = visitFormId ? 'PUT' : 'POST';
          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const json = await res.json();
          if (json.success) {
            const savedVisit = json.data;
            closeModal(modalVisit);
            formVisit.reset();
            resetVisitClinicalFields();
            const formIdInput = document.getElementById('visitFormId');
            if (formIdInput) formIdInput.value = '';
            showToast(visitFormId ? 'تم تحديث بيانات الكشف وسجل المريضة بنجاح' : 'تم حفظ الكشف والتشخيص وسجل المريضة بنجاح');
            await loadPatients();
            await loadVisits();
            await loadAppointments();
            await loadDashboardStats();

            // If checked, immediately open prescription modal prefilled with this visit!
            if (createRxNow && !visitFormId) {
              window.openNewRxModalForVisit(savedVisit.id, patientId, diagnosis);
            }
          } else {
            alert(json.message || 'تعذر حفظ الكشف');
          }
        } catch (err) {
          alert('تعذر الاتصال بالخادم');
        }
      });
    }

    // Form Prescription
    if (formPrescription) {
      formPrescription.addEventListener('submit', async (e) => {
        e.preventDefault();
        savePrescriptionAction(false);
      });

      if (btnSaveAndPrintRx) {
        btnSaveAndPrintRx.addEventListener('click', (e) => {
          e.preventDefault();
          if (formPrescription.reportValidity()) {
            savePrescriptionAction(true);
          }
        });
      }
    }
  }

  async function savePrescriptionAction(andPrint = false) {
    const rxFormId = document.getElementById('rxFormId')?.value;
    const patientId = document.getElementById('rxPatientSelect').value;
    const visitId = document.getElementById('rxVisitId').value;
    const diagnosisSummary = document.getElementById('rxDiagnosisSummary').value.trim();
    const generalAdvice = document.getElementById('rxGeneralAdvice').value.trim();

    // Extract item rows
    const itemRows = document.querySelectorAll('.rx-item-row');
    const items = [];
    itemRows.forEach(row => {
      const name = row.querySelector('.rx-med-name-input')?.value.trim();
      const dose = row.querySelector('.rx-med-dose-input')?.value.trim();
      const freq = row.querySelector('.rx-med-freq-input')?.value.trim();
      const dur = row.querySelector('.rx-med-dur-input')?.value.trim();
      if (name) {
        items.push({
          medication_name: name,
          dosage: dose,
          frequency: freq,
          duration: dur,
          instructions: `${dose ? dose + ' - ' : ''}${freq} ${dur ? ' (' + dur + ')' : ''}`
        });
      }
    });

    if (items.length === 0) {
      alert('يرجى إضافة دواء واحد على الأقل للروشتة');
      return;
    }

    const payload = {
      patient_id: patientId,
      visit_id: visitId || null,
      diagnosis_summary: diagnosisSummary,
      general_advice: generalAdvice,
      items
    };

    try {
      const url = rxFormId ? `/api/prescriptions/${rxFormId}` : '/api/prescriptions';
      const method = rxFormId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        const savedRx = json.data;
        closeModal(modalPrescription);
        formPrescription.reset();
        const formIdInput = document.getElementById('rxFormId');
        if (formIdInput) formIdInput.value = '';
        rxItemsContainer.innerHTML = '';
        showToast(rxFormId ? 'تم تحديث الروشتة الطبية بنجاح' : 'تم حفظ الروشتة الإلكترونية بنجاح');
        loadPrescriptions();
        loadDashboardStats();

        if (andPrint) {
          window.previewAndPrintRx(savedRx.id);
        }
      } else {
        alert(json.message || 'تعذر حفظ الروشتة');
      }
    } catch (err) {
      alert('تعذر الاتصال بالخادم');
    }
  }

  // --------------------------------------------------------------------------
  // 13. Real-Time Search & Multi-Criteria Filtering Engine
  // --------------------------------------------------------------------------
  function escapeRegex(str) {
    return str.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
  }

  function highlightMatch(text, query) {
    if (!text) return '';
    const str = String(text);
    if (!query) return escapeHtml(str);
    const trimmed = query.trim();
    if (!trimmed) return escapeHtml(str);
    const escapedText = escapeHtml(str);
    const cleanQ = escapeRegex(escapeHtml(trimmed));
    const regex = new RegExp(`(${cleanQ})`, 'gi');
    return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  function setupSearches() {
    // ----------------------------------------------------
    // A. Patients View Real-Time Search & Filters
    // ----------------------------------------------------
    let patientDebounce;
    if (patientSearchInput) {
      patientSearchInput.addEventListener('input', () => {
        clearTimeout(patientDebounce);
        patientDebounce = setTimeout(() => {
          loadPatients();
        }, 200);
      });
    }

    [filterPatientPregnant, filterPatientBlood, filterPatientHistory, filterPatientSort].forEach(el => {
      if (el) {
        el.addEventListener('change', () => loadPatients());
      }
    });

    if (btnResetPatientFilters) {
      btnResetPatientFilters.addEventListener('click', () => {
        if (patientSearchInput) patientSearchInput.value = '';
        if (filterPatientPregnant) filterPatientPregnant.value = 'all';
        if (filterPatientBlood) filterPatientBlood.value = 'all';
        if (filterPatientHistory) filterPatientHistory.value = 'all';
        if (filterPatientSort) filterPatientSort.value = 'newest';
        loadPatients();
        showToast('تمت إعادة ضبط فلاتر المريضات');
      });
    }

    // ----------------------------------------------------
    // B. Appointments View Real-Time Search & Filters
    // ----------------------------------------------------
    let apptDebounce;
    if (appointmentSearchInput) {
      appointmentSearchInput.addEventListener('input', () => {
        clearTimeout(apptDebounce);
        apptDebounce = setTimeout(() => {
          loadAppointments();
        }, 200);
      });
    }

    if (appointmentsDatePicker) {
      appointmentsDatePicker.addEventListener('change', () => {
        state.apptDateMode = 'single';
        [btnApptDateToday, btnApptDateTomorrow, btnApptDateAll].forEach(b => b?.classList.remove('active'));
        loadAppointments();
      });
    }

    if (btnApptDateToday) {
      btnApptDateToday.addEventListener('click', () => {
        if (appointmentsDatePicker) appointmentsDatePicker.value = state.currentDate;
        state.apptDateMode = 'today';
        btnApptDateToday.classList.add('active');
        btnApptDateTomorrow?.classList.remove('active');
        btnApptDateAll?.classList.remove('active');
        loadAppointments();
      });
    }

    if (btnApptDateTomorrow) {
      btnApptDateTomorrow.addEventListener('click', () => {
        const tmrw = new Date();
        tmrw.setDate(tmrw.getDate() + 1);
        const tmrwStr = getLocalDateString(tmrw);
        if (appointmentsDatePicker) appointmentsDatePicker.value = tmrwStr;
        state.apptDateMode = 'tomorrow';
        btnApptDateTomorrow.classList.add('active');
        btnApptDateToday?.classList.remove('active');
        btnApptDateAll?.classList.remove('active');
        loadAppointments(tmrwStr);
      });
    }

    if (btnApptDateAll) {
      btnApptDateAll.addEventListener('click', () => {
        if (appointmentsDatePicker) appointmentsDatePicker.value = '';
        state.apptDateMode = 'all';
        btnApptDateAll.classList.add('active');
        btnApptDateToday?.classList.remove('active');
        btnApptDateTomorrow?.classList.remove('active');
        loadAppointments('all');
      });
    }

    [filterApptStatus, filterApptPayment, filterApptType].forEach(el => {
      if (el) {
        el.addEventListener('change', () => loadAppointments());
      }
    });

    if (btnResetApptFilters) {
      btnResetApptFilters.addEventListener('click', () => {
        if (appointmentSearchInput) appointmentSearchInput.value = '';
        if (filterApptStatus) filterApptStatus.value = 'all';
        if (filterApptPayment) filterApptPayment.value = 'all';
        if (filterApptType) filterApptType.value = 'all';
        if (appointmentsDatePicker) appointmentsDatePicker.value = state.currentDate;
        state.apptDateMode = 'today';
        btnApptDateToday?.classList.add('active');
        btnApptDateTomorrow?.classList.remove('active');
        btnApptDateAll?.classList.remove('active');
        loadAppointments();
        showToast('تمت إعادة ضبط فلاتر المواعيد');
      });
    }

    // ----------------------------------------------------
    // C. Visits View Real-Time Search & Filters
    // ----------------------------------------------------
    let visitDebounce;
    if (visitSearchInput) {
      visitSearchInput.addEventListener('input', () => {
        clearTimeout(visitDebounce);
        visitDebounce = setTimeout(() => {
          loadVisits();
        }, 200);
      });
    }

    [filterVisitType, filterVisitHasRx, filterVisitDate].forEach(el => {
      if (el) {
        el.addEventListener('change', () => loadVisits());
      }
    });

    if (btnResetVisitFilters) {
      btnResetVisitFilters.addEventListener('click', () => {
        if (visitSearchInput) visitSearchInput.value = '';
        if (filterVisitType) filterVisitType.value = 'all';
        if (filterVisitHasRx) filterVisitHasRx.value = 'all';
        if (filterVisitDate) filterVisitDate.value = '';
        loadVisits();
        showToast('تمت إعادة ضبط فلاتر الكشوفات');
      });
    }

    // ----------------------------------------------------
    // D. Prescriptions View Real-Time Search & Filters
    // ----------------------------------------------------
    let rxDebounce;
    if (prescriptionSearchInput) {
      prescriptionSearchInput.addEventListener('input', () => {
        clearTimeout(rxDebounce);
        rxDebounce = setTimeout(() => {
          loadPrescriptions();
        }, 200);
      });
    }

    if (filterRxDate) {
      filterRxDate.addEventListener('change', () => loadPrescriptions());
    }

    if (btnResetRxFilters) {
      btnResetRxFilters.addEventListener('click', () => {
        if (prescriptionSearchInput) prescriptionSearchInput.value = '';
        if (filterRxDate) filterRxDate.value = '';
        loadPrescriptions();
        showToast('تمت إعادة ضبط فلاتر الروشتات');
      });
    }

    // ----------------------------------------------------
    // E. Dashboard Today Queue Pills Filter
    // ----------------------------------------------------
    if (dashboardQueueFilterPills) {
      dashboardQueueFilterPills.addEventListener('click', (e) => {
        const btn = e.target.closest('.queue-pill');
        if (!btn) return;
        dashboardQueueFilterPills.querySelectorAll('.queue-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.queueFilter = btn.dataset.queueFilter || 'all';
        applyDashboardQueueFilter();
      });
    }

    // ----------------------------------------------------
    // F. Global Instant Real-Time Search Bar (Topbar)
    // ----------------------------------------------------
    let globalDebounce;
    if (globalSearchInput && globalSearchDropdown && searchDropdownContent) {
      globalSearchInput.addEventListener('input', () => {
        clearTimeout(globalDebounce);
        const q = globalSearchInput.value.trim();

        if (!q) {
          btnClearGlobalSearch?.classList.add('d-none');
          globalSearchDropdown.classList.add('d-none');
          searchDropdownContent.innerHTML = '';
          return;
        }

        btnClearGlobalSearch?.classList.remove('d-none');

        if (q.length < 2) {
          globalSearchDropdown.classList.remove('d-none');
          searchDropdownContent.innerHTML = `
            <div class="search-empty-state">
              <i class="fa-solid fa-magnifying-glass text-primary"></i>
              <p>أدخل حرفين أو رقماً على الأقل للبحث السريع في كامل النظام...</p>
            </div>
          `;
          return;
        }

        searchDropdownContent.innerHTML = `
          <div class="search-empty-state">
            <i class="fa-solid fa-spinner fa-spin text-primary"></i>
            <p>جاري البحث السريع في كامل النظام...</p>
          </div>
        `;
        globalSearchDropdown.classList.remove('d-none');

        globalDebounce = setTimeout(async () => {
          try {
            const res = await fetch(`/api/stats/global-search?q=${encodeURIComponent(q)}`);
            const json = await res.json();
            if (!json.success) return;

            renderGlobalSearchResults(json.results, q);
          } catch (err) {
            searchDropdownContent.innerHTML = `
              <div class="search-empty-state">
                <i class="fa-solid fa-circle-exclamation text-rose"></i>
                <p>تعذر إجراء البحث السريع حالياً.</p>
              </div>
            `;
          }
        }, 200);
      });

      if (btnClearGlobalSearch) {
        btnClearGlobalSearch.addEventListener('click', () => {
          globalSearchInput.value = '';
          btnClearGlobalSearch.classList.add('d-none');
          globalSearchDropdown.classList.add('d-none');
          searchDropdownContent.innerHTML = '';
          globalSearchInput.focus();
        });
      }

      globalSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          globalSearchDropdown.classList.add('d-none');
        }
      });

      document.addEventListener('click', (e) => {
        if (globalSearchContainer && !globalSearchContainer.contains(e.target)) {
          globalSearchDropdown.classList.add('d-none');
        }
      });
    }
  }

  function renderGlobalSearchResults(results, query) {
    if (!searchDropdownContent) return;
    const { patients = [], appointments = [], visits = [], prescriptions = [] } = results || {};
    const totalCount = patients.length + appointments.length + visits.length + prescriptions.length;

    if (totalCount === 0) {
      searchDropdownContent.innerHTML = `
        <div class="search-empty-state">
          <i class="fa-regular fa-folder-open text-slate-400"></i>
          <p>لا توجد نتائج مطابقة لـ "<strong>${escapeHtml(query)}</strong>"</p>
          <small class="text-slate-400">تأكد من كتابة الاسم أو رقم الهاتف أو كود الملف بشكل صحيح</small>
        </div>
      `;
      return;
    }

    let html = '';

    // 1. Patients
    if (patients.length > 0) {
      html += `
        <div class="search-section-header">
          <span><i class="fa-solid fa-users text-primary"></i> المريضات</span>
          <span class="search-section-badge">${patients.length}</span>
        </div>
      `;
      patients.forEach(p => {
        html += `
          <div class="search-dropdown-item" onclick="window.handleGlobalSelectPatient(${p.id})">
            <div class="search-item-info">
              <div class="search-item-main">
                <span class="search-item-title">${highlightMatch(p.full_name, query)}</span>
                <span class="badge badge-booked">${highlightMatch(p.patient_code, query)}</span>
                ${p.is_pregnant ? '<span class="badge badge-pregnant"><i class="fa-solid fa-person-pregnant"></i> حامل</span>' : ''}
              </div>
              <div class="search-item-sub">
                <span dir="ltr"><i class="fa-solid fa-phone"></i> ${highlightMatch(p.phone, query)}</span>
                ${p.husband_name ? `<span><i class="fa-solid fa-user"></i> الزوج: ${highlightMatch(p.husband_name, query)}</span>` : ''}
                ${p.blood_group ? `<span>فصيلة: <strong>${p.blood_group}</strong></span>` : ''}
              </div>
            </div>
            <div class="search-item-actions" onclick="event.stopPropagation()">
              <button class="btn btn-sm btn-outline" onclick="window.viewPatientProfile(${p.id}); window.closeGlobalSearch();" title="الملف الطبي">
                <i class="fa-regular fa-id-badge"></i> الملف
              </button>
              <button class="btn btn-sm btn-accent" onclick="window.openNewVisitModalForPatient(${p.id}); window.closeGlobalSearch();" title="كشف جديد">
                <i class="fa-solid fa-stethoscope"></i> كشف
              </button>
            </div>
          </div>
        `;
      });
    }

    // 2. Appointments
    if (appointments.length > 0) {
      html += `
        <div class="search-section-header">
          <span><i class="fa-solid fa-calendar-check text-primary"></i> المواعيد والحجوزات</span>
          <span class="search-section-badge">${appointments.length}</span>
        </div>
      `;
      appointments.forEach(a => {
        html += `
          <div class="search-dropdown-item" onclick="window.handleGlobalSelectAppt('${formatDate(a.appointment_date)}')">
            <div class="search-item-info">
              <div class="search-item-main">
                <span class="search-item-title">${highlightMatch(a.patient_name, query)}</span>
                ${a.queue_number ? `<span class="badge badge-booked">#${a.queue_number}</span>` : ''}
                <span class="badge badge-booked">${escapeHtml(a.type)}</span>
              </div>
              <div class="search-item-sub">
                <span><i class="fa-regular fa-calendar"></i> ${formatDate(a.appointment_date)}</span>
                <span><i class="fa-regular fa-clock"></i> ${a.appointment_time ? a.appointment_time.slice(0, 5) : '--'}</span>
                <span>الحالة: <strong>${escapeHtml(a.status)}</strong></span>
              </div>
            </div>
            <div class="search-item-actions" onclick="event.stopPropagation()">
              <button class="btn btn-sm btn-primary" onclick="window.handleGlobalSelectAppt('${formatDate(a.appointment_date)}')">
                <i class="fa-regular fa-calendar-days"></i> عرض
              </button>
            </div>
          </div>
        `;
      });
    }

    // 3. Clinical Visits
    if (visits.length > 0) {
      html += `
        <div class="search-section-header">
          <span><i class="fa-solid fa-stethoscope text-primary"></i> الكشوفات والتشخيصات</span>
          <span class="search-section-badge">${visits.length}</span>
        </div>
      `;
      visits.forEach(v => {
        html += `
          <div class="search-dropdown-item" onclick="window.viewVisitDetails(${v.id}); window.closeGlobalSearch();">
            <div class="search-item-info">
              <div class="search-item-main">
                <span class="search-item-title">${highlightMatch(v.patient_name, query)}</span>
                <span class="badge badge-booked">${escapeHtml(v.visit_type)}</span>
              </div>
              <div class="search-item-sub">
                <span style="color:#0f766e; font-weight:700;"><i class="fa-solid fa-notes-medical"></i> ${highlightMatch(v.diagnosis, query)}</span>
                <span><i class="fa-regular fa-calendar"></i> ${formatDate(v.visit_date)}</span>
              </div>
            </div>
            <div class="search-item-actions" onclick="event.stopPropagation()">
              <button class="btn btn-sm btn-outline" onclick="window.viewVisitDetails(${v.id}); window.closeGlobalSearch();">
                <i class="fa-regular fa-eye"></i> تفاصيل
              </button>
            </div>
          </div>
        `;
      });
    }

    // 4. Prescriptions
    if (prescriptions.length > 0) {
      html += `
        <div class="search-section-header">
          <span><i class="fa-solid fa-file-prescription text-emerald"></i> الروشتات الطبية</span>
          <span class="search-section-badge">${prescriptions.length}</span>
        </div>
      `;
      prescriptions.forEach(pr => {
        html += `
          <div class="search-dropdown-item" onclick="window.previewAndPrintRx(${pr.id}); window.closeGlobalSearch();">
            <div class="search-item-info">
              <div class="search-item-main">
                <span class="search-item-title">${highlightMatch(pr.patient_name, query)}</span>
                <span class="badge badge-booked">${highlightMatch(pr.prescription_code, query)}</span>
                <span class="badge badge-completed">${pr.items_count || 0} أدوية</span>
              </div>
              <div class="search-item-sub">
                ${pr.medications_summary ? `<span style="color:#059669;"><i class="fa-solid fa-pills"></i> ${highlightMatch(pr.medications_summary, query)}</span>` : ''}
                <span><i class="fa-regular fa-calendar"></i> ${formatDate(pr.issue_date)}</span>
              </div>
            </div>
            <div class="search-item-actions" onclick="event.stopPropagation()">
              <button class="btn btn-sm btn-emerald" onclick="window.previewAndPrintRx(${pr.id}); window.closeGlobalSearch();">
                <i class="fa-solid fa-print"></i> طباعة
              </button>
            </div>
          </div>
        `;
      });
    }

    searchDropdownContent.innerHTML = html;
  }

  // Global search window helper actions
  window.closeGlobalSearch = () => {
    if (globalSearchDropdown) globalSearchDropdown.classList.add('d-none');
  };

  window.handleGlobalSelectPatient = (patientId) => {
    window.closeGlobalSearch();
    window.viewPatientProfile(patientId);
  };

  window.handleGlobalSelectAppt = (dateStr) => {
    window.closeGlobalSearch();
    if (window.location.pathname.toLowerCase().includes('/appointments')) {
      if (appointmentsDatePicker) appointmentsDatePicker.value = dateStr;
      state.apptDateMode = 'single';
      [btnApptDateToday, btnApptDateTomorrow, btnApptDateAll].forEach(b => b?.classList.remove('active'));
      loadAppointments(dateStr);
    } else {
      window.location.href = `/appointments?date=${encodeURIComponent(dateStr)}`;
    }
  };

  // --------------------------------------------------------------------------
  // 14. Global Action Helpers (Available on window object)
  // --------------------------------------------------------------------------
  window.openNewAppointmentModal = () => {
    formAppointment.reset();
    const appFormId = document.getElementById('appFormId');
    if (appFormId) appFormId.value = '';
    const modalTitle = document.getElementById('modalAppointmentTitle');
    if (modalTitle) modalTitle.innerHTML = '<i class="fa-regular fa-calendar-plus text-primary"></i> حجز موعد جديد';
    const submitText = document.getElementById('btnAppSubmitText');
    if (submitText) submitText.textContent = 'تأكيد الحجز وإضافة للطابور';
    document.getElementById('appDate').value = state.currentDate;
    document.getElementById('appTime').value = '18:00';
    openModal(modalAppointment);
  };

  window.editAppointment = (appId) => {
    const a = state.appointments.find(item => item.id === parseInt(appId, 10));
    if (!a) return;
    formAppointment.reset();
    const appFormId = document.getElementById('appFormId');
    if (appFormId) appFormId.value = a.id;
    const modalTitle = document.getElementById('modalAppointmentTitle');
    if (modalTitle) modalTitle.innerHTML = `<i class="fa-regular fa-calendar-check text-primary"></i> تعديل بيانات الموعد: ${escapeHtml(a.patient_name || '')}`;
    const submitText = document.getElementById('btnAppSubmitText');
    if (submitText) submitText.textContent = 'تحديث بيانات الموعد';

    const pSel = document.getElementById('appPatientSelect');
    if (pSel) pSel.value = a.patient_id;
    document.getElementById('appDate').value = a.appointment_date ? a.appointment_date.split('T')[0] : state.currentDate;
    document.getElementById('appTime').value = a.appointment_time ? a.appointment_time.slice(0, 5) : '18:00';
    document.getElementById('appType').value = a.type || 'كشف جديد';
    document.getElementById('appFee').value = a.fee || 300;
    document.getElementById('appNotes').value = a.notes || '';

    openModal(modalAppointment);
  };

  async function populateVisitPatientClinicalData(patientId) {
    if (!patientId) {
      resetVisitClinicalFields();
      return;
    }
    try {
      let patient = (state.allPatients || []).find(p => p.id === parseInt(patientId, 10)) ||
                    (state.patients || []).find(p => p.id === parseInt(patientId, 10));
      if (!patient || patient.allergies === undefined || patient.gravida === undefined) {
        const res = await fetch(`/api/patients/${patientId}`);
        const json = await res.json();
        if (json.success) patient = json.data;
      }
      if (patient) {
        const allergiesInput = document.getElementById('visitAllergies');
        const chronicInput = document.getElementById('visitChronic');
        const gravidaInput = document.getElementById('visitGravida');
        const paraInput = document.getElementById('visitPara');
        const abortionInput = document.getElementById('visitAbortion');
        const livingInput = document.getElementById('visitLiving');
        const csInput = document.getElementById('visitCs');
        const normalDelivInput = document.getElementById('visitNormalDeliv');
        const isPregnantInput = document.getElementById('visitIsPregnant');
        const lmpInput = document.getElementById('visitLmp');
        const eddInput = document.getElementById('visitEdd');
        const gaWeeksInput = document.getElementById('visitGaWeeks');

        if (allergiesInput) allergiesInput.value = patient.allergies || 'لا توجد حساسية معروفة';
        if (chronicInput) chronicInput.value = patient.chronic_diseases || '';
        if (gravidaInput) gravidaInput.value = patient.gravida !== undefined && patient.gravida !== null ? patient.gravida : 0;
        if (paraInput) paraInput.value = patient.para !== undefined && patient.para !== null ? patient.para : 0;
        if (abortionInput) abortionInput.value = patient.abortion !== undefined && patient.abortion !== null ? patient.abortion : 0;
        if (livingInput) livingInput.value = patient.living !== undefined && patient.living !== null ? patient.living : 0;
        if (csInput) csInput.value = patient.cs_count !== undefined && patient.cs_count !== null ? patient.cs_count : 0;
        if (normalDelivInput) normalDelivInput.value = patient.normal_delivery_count !== undefined && patient.normal_delivery_count !== null ? patient.normal_delivery_count : 0;
        if (isPregnantInput) isPregnantInput.checked = Boolean(patient.is_pregnant);
        if (lmpInput) lmpInput.value = patient.lmp ? patient.lmp.split('T')[0] : '';
        if (eddInput) eddInput.value = patient.edd ? patient.edd.split('T')[0] : '';

        // If pregnant with LMP, calculate GA weeks if not already set
        if (patient.lmp && gaWeeksInput && (!gaWeeksInput.value || gaWeeksInput.value === '0')) {
          const calc = calculateObstetrics(patient.lmp.split('T')[0]);
          if (calc && calc.weeks !== undefined) {
            gaWeeksInput.value = calc.weeks;
          }
        }
      }
    } catch (err) {
      console.error('Failed to populate patient clinical data:', err);
    }
  }

  function resetVisitClinicalFields() {
    const allergiesInput = document.getElementById('visitAllergies');
    const chronicInput = document.getElementById('visitChronic');
    const gravidaInput = document.getElementById('visitGravida');
    const paraInput = document.getElementById('visitPara');
    const abortionInput = document.getElementById('visitAbortion');
    const livingInput = document.getElementById('visitLiving');
    const csInput = document.getElementById('visitCs');
    const normalDelivInput = document.getElementById('visitNormalDeliv');
    const isPregnantInput = document.getElementById('visitIsPregnant');
    const lmpInput = document.getElementById('visitLmp');
    const eddInput = document.getElementById('visitEdd');

    if (allergiesInput) allergiesInput.value = 'لا توجد حساسية معروفة';
    if (chronicInput) chronicInput.value = '';
    if (gravidaInput) gravidaInput.value = 0;
    if (paraInput) paraInput.value = 0;
    if (abortionInput) abortionInput.value = 0;
    if (livingInput) livingInput.value = 0;
    if (csInput) csInput.value = 0;
    if (normalDelivInput) normalDelivInput.value = 0;
    if (isPregnantInput) isPregnantInput.checked = false;
    if (lmpInput) lmpInput.value = '';
    if (eddInput) eddInput.value = '';
  }

  window.openNewVisitModal = () => {
    formVisit.reset();
    resetVisitClinicalFields();
    const visitFormId = document.getElementById('visitFormId');
    if (visitFormId) visitFormId.value = '';
    const modalTitle = document.getElementById('modalVisitTitle');
    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-stethoscope text-primary"></i> تسجيل كشف وتشخيص إكلينيكي (د. حاتم عواجة)';
    const submitText = document.getElementById('btnVisitSubmitText');
    if (submitText) submitText.textContent = 'حفظ الكشف والتشخيص بالتوقيت';
    const now = new Date();
    document.getElementById('visitDate').value = getLocalDateString(now);
    document.getElementById('visitTime').value = now.toTimeString().split(' ')[0];
    document.getElementById('visitAppointmentId').value = '';
    openModal(modalVisit);
  };

  window.editVisit = async (visitId) => {
    try {
      const res = await fetch(`/api/visits/${visitId}`);
      const json = await res.json();
      if (!json.success) return;
      const v = json.data;

      formVisit.reset();
      const visitFormId = document.getElementById('visitFormId');
      if (visitFormId) visitFormId.value = v.id;
      const modalTitle = document.getElementById('modalVisitTitle');
      if (modalTitle) modalTitle.innerHTML = `<i class="fa-solid fa-stethoscope text-primary"></i> تعديل الكشف: ${escapeHtml(v.patient_name || '')}`;
      const submitText = document.getElementById('btnVisitSubmitText');
      if (submitText) submitText.textContent = 'تحديث بيانات الكشف';

      const pSel = document.getElementById('visitPatientSelect');
      if (pSel) pSel.value = v.patient_id;
      document.getElementById('visitAppointmentId').value = v.appointment_id || '';
      document.getElementById('visitDate').value = v.visit_date ? v.visit_date.split('T')[0] : getLocalDateString();
      document.getElementById('visitTime').value = v.visit_time ? v.visit_time.slice(0, 8) : '';
      document.getElementById('visitType').value = v.visit_type || 'كشف نساء وتوليد';
      document.getElementById('visitComplaint').value = v.chief_complaint || '';
      document.getElementById('visitBp').value = v.blood_pressure || '';
      document.getElementById('visitWeight').value = v.weight_kg || '';
      document.getElementById('visitTemp').value = v.temperature || '37.0';
      document.getElementById('visitGaWeeks').value = v.gestational_age_weeks || '';
      document.getElementById('visitFhr').value = v.fetal_heart_rate || '';
      document.getElementById('visitUltrasound').value = v.ultrasound_findings || '';
      document.getElementById('visitDiagnosis').value = v.diagnosis || '';
      document.getElementById('visitClinicalNotes').value = v.clinical_notes || '';
      document.getElementById('visitNextDate').value = v.next_visit_date ? v.next_visit_date.split('T')[0] : '';
      document.getElementById('chkCreateRxNow').checked = false;

      // Populate doctor's recorded clinical history fields
      const allergiesInput = document.getElementById('visitAllergies');
      const chronicInput = document.getElementById('visitChronic');
      const gravidaInput = document.getElementById('visitGravida');
      const paraInput = document.getElementById('visitPara');
      const abortionInput = document.getElementById('visitAbortion');
      const livingInput = document.getElementById('visitLiving');
      const csInput = document.getElementById('visitCs');
      const normalDelivInput = document.getElementById('visitNormalDeliv');
      const isPregnantInput = document.getElementById('visitIsPregnant');
      const lmpInput = document.getElementById('visitLmp');
      const eddInput = document.getElementById('visitEdd');

      if (allergiesInput) allergiesInput.value = v.allergies || 'لا توجد حساسية معروفة';
      if (chronicInput) chronicInput.value = v.chronic_diseases || '';
      if (gravidaInput) gravidaInput.value = v.gravida !== undefined && v.gravida !== null ? v.gravida : 0;
      if (paraInput) paraInput.value = v.para !== undefined && v.para !== null ? v.para : 0;
      if (abortionInput) abortionInput.value = v.abortion !== undefined && v.abortion !== null ? v.abortion : 0;
      if (livingInput) livingInput.value = v.living !== undefined && v.living !== null ? v.living : 0;
      if (csInput) csInput.value = v.cs_count !== undefined && v.cs_count !== null ? v.cs_count : 0;
      if (normalDelivInput) normalDelivInput.value = v.normal_delivery_count !== undefined && v.normal_delivery_count !== null ? v.normal_delivery_count : 0;
      if (isPregnantInput) isPregnantInput.checked = Boolean(v.is_pregnant);
      if (lmpInput) lmpInput.value = v.lmp ? v.lmp.split('T')[0] : '';
      if (eddInput) eddInput.value = v.edd ? v.edd.split('T')[0] : '';

      openModal(modalVisit);
    } catch (err) {
      alert('تعذر فتح الكشف للتعديل');
    }
  };

  window.deleteVisit = async (visitId) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الكشف؟ سيتم أيضاً حذف أي روشتات مرتبطة به.')) return;
    try {
      const res = await fetch(`/api/visits/${visitId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('تم حذف الكشف بنجاح');
        await loadVisits();
        await loadPrescriptions();
        await loadDashboardStats();
      } else {
        alert(json.message || 'تعذر حذف الكشف');
      }
    } catch (err) {
      alert('تعذر الاتصال بالخادم لحذف الكشف');
    }
  };

  window.openNewVisitModalForPatient = (patientId) => {
    window.openNewVisitModal();
    const sel = document.getElementById('visitPatientSelect');
    if (sel) {
      sel.value = patientId;
      populateVisitPatientClinicalData(patientId);
    }
  };

  window.startExamination = async (patientId, appointmentId) => {
    window.openNewVisitModal();
    const sel = document.getElementById('visitPatientSelect');
    if (sel) {
      sel.value = patientId;
      populateVisitPatientClinicalData(patientId);
    }
    if (sel) sel.value = patientId;
    document.getElementById('visitAppointmentId').value = appointmentId;

    // Update appointment status to 'جاري الكشف'
    try {
      await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'جاري الكشف' })
      });
      loadAppointments(state.currentDate);
      loadDashboardStats();
    } catch (e) {}
  };

  window.openNewRxModal = () => {
    formPrescription.reset();
    const rxFormId = document.getElementById('rxFormId');
    if (rxFormId) rxFormId.value = '';
    const modalTitle = document.getElementById('modalPrescriptionTitle');
    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-prescription text-emerald"></i> تحرير روشتة علاجية - د. حاتم عواجة';
    const submitText = document.getElementById('btnRxSubmitText');
    if (submitText) submitText.textContent = 'حفظ الروشتة';
    document.getElementById('rxVisitId').value = '';
    rxItemsContainer.innerHTML = '';
    addRxItemRow();
    openModal(modalPrescription);
  };

  window.editPrescription = async (rxId) => {
    try {
      const res = await fetch(`/api/prescriptions/${rxId}`);
      const json = await res.json();
      if (!json.success) return;
      const rx = json.data;

      formPrescription.reset();
      const rxFormId = document.getElementById('rxFormId');
      if (rxFormId) rxFormId.value = rx.id;
      const modalTitle = document.getElementById('modalPrescriptionTitle');
      if (modalTitle) modalTitle.innerHTML = `<i class="fa-solid fa-prescription text-emerald"></i> تعديل الروشتة: ${escapeHtml(rx.prescription_code || '')}`;
      const submitText = document.getElementById('btnRxSubmitText');
      if (submitText) submitText.textContent = 'تحديث بيانات الروشتة';

      const pSel = document.getElementById('rxPatientSelect');
      if (pSel) pSel.value = rx.patient_id;
      document.getElementById('rxVisitId').value = rx.visit_id || '';
      document.getElementById('rxDiagnosisSummary').value = rx.diagnosis_summary || '';
      document.getElementById('rxGeneralAdvice').value = rx.general_advice || '';

      rxItemsContainer.innerHTML = '';
      const items = rx.items || [];
      if (items.length > 0) {
        items.forEach(it => {
          addRxItemRow({
            name: it.medication_name,
            default_dosage: it.dosage,
            default_frequency: it.frequency,
            default_duration: it.duration
          });
        });
      } else {
        addRxItemRow();
      }

      openModal(modalPrescription);
    } catch (err) {
      alert('تعذر فتح الروشتة للتعديل');
    }
  };

  window.deletePrescription = async (rxId) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذه الروشتة الطبية نهائياً؟')) return;
    try {
      const res = await fetch(`/api/prescriptions/${rxId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('تم حذف الروشتة بنجاح');
        await loadPrescriptions();
        await loadVisits();
        await loadDashboardStats();
      } else {
        alert(json.message || 'تعذر حذف الروشتة');
      }
    } catch (err) {
      alert('تعذر الاتصال بالخادم لحذف الروشتة');
    }
  };

  window.openNewRxModalForPatient = (patientId) => {
    window.openNewRxModal();
    const sel = document.getElementById('rxPatientSelect');
    if (sel) sel.value = patientId;
  };

  window.openNewRxModalForVisit = (visitId, patientId, diagnosis) => {
    window.openNewRxModal();
    document.getElementById('rxVisitId').value = visitId || '';
    const v = state.visits.find(vis => vis.id === parseInt(visitId, 10));
    const resolvedPatientId = patientId || (v ? v.patient_id : '');
    const resolvedDiagnosis = diagnosis !== undefined ? diagnosis : (v ? v.diagnosis : '');

    const sel = document.getElementById('rxPatientSelect');
    if (sel && resolvedPatientId) sel.value = resolvedPatientId;
    const diagInput = document.getElementById('rxDiagnosisSummary');
    if (diagInput && resolvedDiagnosis) diagInput.value = resolvedDiagnosis;
  };

  window.viewVisitDetails = (visitId) => {
    const v = state.visits.find(vis => vis.id === parseInt(visitId, 10));
    if (v && v.patient_id) {
      window.viewPatientProfile(v.patient_id);
    }
  };

  window.changeAppStatus = async (appId, newStatus) => {
    try {
      const res = await fetch(`/api/appointments/${appId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`تم تغيير الحالة إلى ${newStatus}`);
        loadAppointments(state.currentDate);
        loadDashboardStats();
      }
    } catch (err) {
      alert('تعذر تحديث الحالة');
    }
  };

  window.togglePayment = async (appId, isPaid) => {
    try {
      const res = await fetch(`/api/appointments/${appId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_paid: isPaid })
      });
      const json = await res.json();
      if (json.success) {
        showToast(isPaid ? 'تم تسجيل الدفع بنجاح' : 'تم إلغاء حالة الدفع');
        loadAppointments(state.currentDate);
      }
    } catch (err) {
      alert('تعذر تحديث حالة الدفع');
    }
  };

  window.deleteAppointment = async (appId) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الموعد؟')) return;
    try {
      const res = await fetch(`/api/appointments/${appId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('تم حذف الموعد');
        loadAppointments(state.currentDate);
        loadDashboardStats();
      }
    } catch (err) {
      alert('تعذر حذف الموعد');
    }
  };

  let pendingDeletePatientId = null;
  const modalConfirmDelete = document.getElementById('modalConfirmDelete');
  const confirmDeletePatientName = document.getElementById('confirmDeletePatientName');
  const btnExecuteDeletePatient = document.getElementById('btnExecuteDeletePatient');

  window.deletePatient = (patientId) => {
    const p = state.patients.find(pt => pt.id === parseInt(patientId, 10));
    pendingDeletePatientId = parseInt(patientId, 10);
    if (confirmDeletePatientName) {
      confirmDeletePatientName.textContent = p ? `${p.full_name} (${p.patient_code})` : `المريضة #${patientId}`;
    }
    openModal(modalConfirmDelete);
  };

  if (btnExecuteDeletePatient) {
    btnExecuteDeletePatient.onclick = async () => {
      if (!pendingDeletePatientId) return;
      const idToDelete = pendingDeletePatientId;
      btnExecuteDeletePatient.disabled = true;
      btnExecuteDeletePatient.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>جاري الحذف...</span>';

      try {
        const res = await fetch(`/api/patients/${idToDelete}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          closeModal(modalConfirmDelete);
          showToast('تم حذف ملف المريضة وسجلاتها بنجاح');
          await loadPatients();
          await loadAppointments(state.currentDate);
          await loadVisits();
          await loadPrescriptions();
          await loadDashboardStats();
        } else {
          alert(json.message || 'تعذر حذف المريضة');
        }
      } catch (err) {
        console.error('Error deleting patient:', err);
        alert('تعذر الاتصال بالخادم لحذف المريضة');
      } finally {
        btnExecuteDeletePatient.disabled = false;
        btnExecuteDeletePatient.innerHTML = '<i class="fa-regular fa-trash-can"></i> <span>نعم، حذف الملف الآن</span>';
        pendingDeletePatientId = null;
      }
    };
  }

  window.editPatient = async (patientId) => {
    try {
      const res = await fetch(`/api/patients/${patientId}`);
      const json = await res.json();
      if (!json.success) return;

      const p = json.data;
      document.getElementById('modalPatientTitle').innerHTML = `<i class="fa-solid fa-user-pen text-primary"></i> تعديل بيانات المريضة: ${escapeHtml(p.full_name)}`;
      document.getElementById('patientFormId').value = p.id;
      document.getElementById('patientFullName').value = p.full_name || '';
      document.getElementById('patientAge').value = p.age || '';
      document.getElementById('patientBloodGroup').value = p.blood_group || 'غير محدد';
      document.getElementById('patientPhone').value = p.phone || '';
      document.getElementById('patientPhoneAlt').value = p.phone_alt || '';
      document.getElementById('patientHusband').value = p.husband_name || '';
      document.getElementById('patientAddress').value = p.address || '';
      document.getElementById('patientAllergies').value = p.allergies || 'لا توجد حساسية معروفة';
      document.getElementById('patientChronic').value = p.chronic_diseases || '';
      document.getElementById('patientGravida').value = p.gravida || 0;
      document.getElementById('patientPara').value = p.para || 0;
      document.getElementById('patientAbortion').value = p.abortion || 0;
      document.getElementById('patientLiving').value = p.living || 0;
      document.getElementById('patientCs').value = p.cs_count || 0;
      document.getElementById('patientNormalDeliv').value = p.normal_delivery_count || 0;
      document.getElementById('patientIsPregnant').checked = Boolean(p.is_pregnant);
      document.getElementById('patientLmp').value = p.lmp ? p.lmp.split('T')[0] : '';
      document.getElementById('patientEdd').value = p.edd ? p.edd.split('T')[0] : '';
      document.getElementById('patientNotes').value = p.notes || '';

      openModal(modalPatient);
    } catch (err) {
      alert('تعذر تحميل بيانات المريضة');
    }
  };

  // View Comprehensive Patient Profile Modal
  window.viewPatientProfile = async (patientId) => {
    try {
      const res = await fetch(`/api/patients/${patientId}`);
      const json = await res.json();
      if (!json.success) return;

      const p = json.data;
      const content = document.getElementById('patientProfileContent');

      content.innerHTML = `
        <div class="patient-profile-header">
          <div class="profile-avatar">
            <i class="fa-solid fa-person-dress"></i>
          </div>
          <div class="profile-info">
            <h3>${escapeHtml(p.full_name)}</h3>
            <div class="profile-chips">
              <span class="profile-chip">كود: <strong>${escapeHtml(p.patient_code)}</strong></span>
              <span class="profile-chip">السن: <strong>${p.age} سنة</strong></span>
              <span class="profile-chip">الهاتف: <strong>${escapeHtml(p.phone)}</strong></span>
              ${p.husband_name ? `<span class="profile-chip">الزوج: <strong>${escapeHtml(p.husband_name)}</strong></span>` : ''}
              <span class="profile-chip">فصيلة الدم: <strong>${escapeHtml(p.blood_group || 'غير محدد')}</strong></span>
              <span class="profile-chip ${p.is_pregnant ? 'badge-pregnant' : ''}">
                ${p.is_pregnant ? 'حامل حالياً 🤰' : 'غير حامل'}
              </span>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group col-6">
            <div class="glass-card p-3 mb-0">
              <h4 style="font-size: 0.95rem; font-weight:700; color:#0f766e; margin-bottom: 8px;">
                <i class="fa-solid fa-baby"></i> التاريخ التوليدي والنسائي (Obstetric History)
              </h4>
              <p style="font-size: 0.88rem; line-height: 1.8;">
                <strong>مرات الحمل (G):</strong> ${p.gravida || 0} &nbsp;|&nbsp;
                <strong>مرات الولادة (P):</strong> ${p.para || 0} &nbsp;|&nbsp;
                <strong>الإجهاض (A):</strong> ${p.abortion || 0} &nbsp;|&nbsp;
                <strong>الأطفال الأحياء (L):</strong> ${p.living || 0}<br>
                <strong>الولادات القيصرية (CS):</strong> ${p.cs_count || 0} &nbsp;|&nbsp;
                <strong>الولادات الطبيعية:</strong> ${p.normal_delivery_count || 0}<br>
                ${p.lmp ? `<strong>تاريخ آخر دورة (LMP):</strong> ${p.lmp.split('T')[0]}<br>` : ''}
                ${p.edd ? `<strong>الموعد المتوقع للولادة (EDD):</strong> ${p.edd.split('T')[0]}<br>` : ''}
              </p>
            </div>
          </div>

          <div class="form-group col-6">
            <div class="glass-card p-3 mb-0">
              <h4 style="font-size: 0.95rem; font-weight:700; color:#be123c; margin-bottom: 8px;">
                <i class="fa-solid fa-notes-medical"></i> الحساسية والأمراض المزمنة
              </h4>
              <p style="font-size: 0.88rem; line-height: 1.8;">
                <strong>حساسية الأدوية:</strong> ${escapeHtml(p.allergies || 'لا توجد')}<br>
                <strong>الأمراض المزمنة:</strong> ${escapeHtml(p.chronic_diseases || 'لا يوجد')}<br>
                <strong>العنوان:</strong> ${escapeHtml(p.address || 'غير مسجل')}<br>
                <strong>ملاحظات الطبيب:</strong> ${escapeHtml(p.notes || 'لا توجد')}
              </p>
            </div>
          </div>
        </div>

        <h4 class="form-section-title mt-4">
          <i class="fa-solid fa-clock-rotate-left text-primary"></i> سجل الكشوفات والتشخيصات السابقة بالتوقيتات (${(p.visits || []).length})
        </h4>
        <div class="table-responsive">
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
              ${(p.visits || []).length === 0 ? `<tr><td colspan="7" class="text-center p-3">لا توجد كشوفات سابقة مسجلة</td></tr>` : 
                (p.visits || []).map(v => `
                  <tr>
                    <td><strong>${formatDate(v.visit_date)}</strong><br><small>${v.visit_time ? v.visit_time.slice(0, 5) : ''}</small></td>
                    <td>${escapeHtml(v.visit_type)}</td>
                    <td>${v.blood_pressure || '--'} / ${v.weight_kg ? v.weight_kg + ' كجم' : '--'}</td>
                    <td>${v.gestational_age_weeks ? v.gestational_age_weeks + ' أسبوع' : '--'} ${v.fetal_heart_rate ? `(${v.fetal_heart_rate} bpm)` : ''}</td>
                    <td><strong style="color: #0f766e;">${escapeHtml(v.diagnosis)}</strong></td>
                    <td><small>${escapeHtml(v.ultrasound_findings || '--')}</small></td>
                    <td>
                      <div class="action-btns">
                        <button class="btn-icon edit" onclick="window.closePatientProfileModal(); window.editVisit(${v.id})" title="تعديل الكشف">
                          <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon delete" onclick="window.closePatientProfileModal(); window.deleteVisit(${v.id})" title="حذف الكشف">
                          <i class="fa-regular fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>

        <h4 class="form-section-title mt-4">
          <i class="fa-solid fa-prescription text-emerald"></i> الروشتات الصادرة للمريضة (${(p.prescriptions || []).length})
        </h4>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>كود الروشتة</th>
                <th>التاريخ</th>
                <th>التشخيص</th>
                <th>الإجراءات والطباعة</th>
              </tr>
            </thead>
            <tbody>
              ${(p.prescriptions || []).length === 0 ? `<tr><td colspan="4" class="text-center p-3">لا توجد روشتات مسجلة</td></tr>` :
                (p.prescriptions || []).map(pr => `
                  <tr>
                    <td><strong>${escapeHtml(pr.prescription_code)}</strong></td>
                    <td>${formatDate(pr.issue_date)}</td>
                    <td>${escapeHtml(pr.diagnosis_summary || '--')}</td>
                    <td>
                      <div class="action-btns">
                        <button class="btn btn-sm btn-primary" onclick="window.previewAndPrintRx(${pr.id})" title="طباعة">
                          <i class="fa-solid fa-print"></i> طباعة
                        </button>
                        <button class="btn-icon edit" onclick="window.closePatientProfileModal(); window.editPrescription(${pr.id})" title="تعديل الروشتة">
                          <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon delete" onclick="window.closePatientProfileModal(); window.deletePrescription(${pr.id})" title="حذف الروشتة">
                          <i class="fa-regular fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      `;

      window.closePatientProfileModal = () => {
        closeModal(modalPatientProfile);
      };

      // Set action buttons in profile modal footer
      document.getElementById('btnProfileNewVisit').onclick = () => {
        closeModal(modalPatientProfile);
        window.openNewVisitModalForPatient(p.id);
      };
      document.getElementById('btnProfileNewRx').onclick = () => {
        closeModal(modalPatientProfile);
        window.openNewRxModalForPatient(p.id);
      };
      const btnDel = document.getElementById('btnProfileDeletePatient');
      if (btnDel) {
        btnDel.onclick = () => {
          closeModal(modalPatientProfile);
          window.deletePatient(p.id);
        };
      }

      openModal(modalPatientProfile);
    } catch (err) {
      alert('تعذر فتح ملف المريضة');
    }
  };

  // Preview & Print Official Prescription Modal
  window.previewAndPrintRx = async (prescriptionId) => {
    try {
      const res = await fetch(`/api/prescriptions/${prescriptionId}`);
      const json = await res.json();
      if (!json.success) return;

      const rx = json.data;

      // Populate print elements
      document.getElementById('printPtName').textContent = rx.patient_name || '--';
      document.getElementById('printPtAge').textContent = rx.patient_age ? `${rx.patient_age} سنة` : '--';
      document.getElementById('printRxDate').textContent = `${formatDate(rx.issue_date)} (${rx.issue_time ? rx.issue_time.slice(0, 5) : ''})`;
      document.getElementById('printRxCode').textContent = rx.prescription_code || '--';
      document.getElementById('printDiagnosisSummary').textContent = rx.diagnosis_summary || 'كشف ومتابعة نساء وتوليد';
      
      const gaBox = document.getElementById('printGaBox');
      if (rx.gestational_age_weeks) {
        gaBox.style.display = 'flex';
        document.getElementById('printGaValue').textContent = `${rx.gestational_age_weeks} أسبوع`;
      } else {
        gaBox.style.display = 'none';
      }

      document.getElementById('printBloodGroup').textContent = rx.blood_group || 'غير محدد';

      // Medications List
      const medList = document.getElementById('printMedicationsList');
      const items = rx.items || [];
      if (items.length === 0) {
        medList.innerHTML = `<p class="p-3 text-slate-400">لا توجد أدوية مسجلة في هذه الروشتة</p>`;
      } else {
        medList.innerHTML = items.map((item, idx) => `
          <div class="rx-med-item">
            <div class="rx-med-num">${idx + 1}</div>
            <div class="rx-med-details">
              <div class="rx-med-name-row">
                <span class="rx-med-name">${escapeHtml(item.medication_name)}</span>
                ${item.dosage ? `<span class="rx-med-dosage">${escapeHtml(item.dosage)}</span>` : ''}
              </div>
              <div class="rx-med-instruction">
                <i class="fa-solid fa-angle-left"></i>
                <span>${escapeHtml(item.frequency || '')} ${item.duration ? ' — ' + escapeHtml(item.duration) : ''}</span>
              </div>
            </div>
          </div>
        `).join('');
      }

      // Advice / Instructions
      const adviceBox = document.getElementById('printInstructionsBox');
      const adviceText = document.getElementById('printAdviceText');
      if (rx.general_advice) {
        adviceBox.style.display = 'block';
        adviceText.textContent = rx.general_advice;
      } else {
        adviceBox.style.display = 'none';
      }

      openModal(modalPrintRx);
    } catch (err) {
      alert('تعذر فتح الروشتة للطباعة');
    }
  };

  // Helper escape
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --------------------------------------------------------------------------
  // 15. Backups Management & Database Safety
  // --------------------------------------------------------------------------
  async function loadBackups() {
    const tableBody = document.getElementById('backupsTableBody');
    if (!tableBody) return;

    try {
      const res = await fetch('/api/backups/list');
      const json = await res.json();
      if (!json.success) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-rose p-4">تعذر تحميل قائمة النسخ الاحتياطية</td></tr>`;
        return;
      }

      const backups = json.backups || [];
      const statBackupCount = document.getElementById('statBackupCount');
      const statLastBackupDate = document.getElementById('statLastBackupDate');
      const statBackupTotalSize = document.getElementById('statBackupTotalSize');
      const statDbEngine = document.getElementById('statDbEngine');

      if (statBackupCount) statBackupCount.textContent = backups.length;

      let totalBytes = 0;
      backups.forEach(b => totalBytes += (b.sizeBytes || 0));
      if (statBackupTotalSize) {
        statBackupTotalSize.textContent = totalBytes > 1048576 
          ? (totalBytes / 1048576).toFixed(1) + ' MB' 
          : (totalBytes / 1024).toFixed(1) + ' KB';
      }

      if (statLastBackupDate) {
        if (backups.length > 0) {
          const d = new Date(backups[0].createdAt);
          statLastBackupDate.textContent = d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } else {
          statLastBackupDate.textContent = 'لا توجد نسخ بعد';
        }
      }

      if (statDbEngine) {
        try {
          const hRes = await fetch('/api/health');
          const hJson = await hRes.json();
          statDbEngine.textContent = hJson.database?.engine || 'PostgreSQL 16';
        } catch (e) {
          statDbEngine.textContent = 'قاعدة البيانات النشطة';
        }
      }

      if (backups.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center p-4 text-muted">
              <i class="fa-solid fa-folder-open font-lg mb-2"></i>
              <p>لم يتم إنشاء أي نسخ احتياطية بعد. اضغط على "إنشاء نسخة احتياطية جديدة" للبدء.</p>
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = backups.map((b, idx) => {
        const dateObj = new Date(b.createdAt);
        const formattedDate = dateObj.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        let countsHtml = '<span class="text-muted">نسخة كاملة</span>';
        if (b.metadata) {
          countsHtml = `
            <div class="backup-counts-badge">
              ${b.metadata.patientsCount !== null ? `<span class="count-chip"><strong>${b.metadata.patientsCount}</strong> مريضة</span>` : ''}
              ${b.metadata.visitsCount !== null ? `<span class="count-chip"><strong>${b.metadata.visitsCount}</strong> كشف</span>` : ''}
              ${b.metadata.prescriptionsCount !== null ? `<span class="count-chip"><strong>${b.metadata.prescriptionsCount}</strong> روشتة</span>` : ''}
            </div>
          `;
        }

        return `
          <tr>
            <td class="font-bold">${idx + 1}</td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <i class="fa-solid fa-file-code text-primary font-lg"></i>
                <div>
                  <strong style="direction: ltr; display: inline-block;">${escapeHtml(b.filename)}</strong>
                </div>
              </div>
            </td>
            <td>${formattedDate}</td>
            <td><span class="badge badge-info">${b.sizeFormatted}</span></td>
            <td>${countsHtml}</td>
            <td class="text-center">
              <div class="table-actions justify-content-center">
                <a href="/api/backups/download/${encodeURIComponent(b.filename)}" class="btn-action edit" title="تنزيل لجهازك" download>
                  <i class="fa-solid fa-download"></i>
                </a>
                <button type="button" class="btn-action view text-amber" title="استعادة هذه النسخة" onclick="window.promptRestoreBackup('${escapeHtml(b.filename)}')">
                  <i class="fa-solid fa-rotate-left"></i>
                </button>
                <button type="button" class="btn-action delete text-rose" title="حذف النسخة" onclick="window.deleteBackupFile('${escapeHtml(b.filename)}')">
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading backups:', err);
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-rose p-4">حدث خطأ أثناء الاتصال بقائمة النسخ</td></tr>`;
    }
  }

  function setupBackups() {
    const btnCreate = document.getElementById('btnCreateBackup');
    const noteInput = document.getElementById('backupNoteInput');
    const btnRefresh = document.getElementById('btnRefreshBackups');
    const dropzone = document.getElementById('backupDropzone');
    const inputFile = document.getElementById('inputRestoreFile');
    const btnTriggerUpload = document.getElementById('btnTriggerUploadRestore');
    const dropzoneText = document.getElementById('dropzonePromptText');
    const btnExecuteRestore = document.getElementById('btnExecuteRestore');

    // Create backup button
    btnCreate?.addEventListener('click', async () => {
      const origText = btnCreate.innerHTML;
      btnCreate.disabled = true;
      btnCreate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>جاري حفظ النسخة...</span>';

      try {
        const note = noteInput ? noteInput.value.trim() : '';
        const res = await fetch('/api/backups/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note })
        });
        const json = await res.json();
        if (json.success) {
          showToast('تم إنشاء النسخة الاحتياطية وحفظها بنجاح!');
          if (noteInput) noteInput.value = '';
          loadBackups();
        } else {
          alert(json.error || 'تعذر إنشاء النسخة');
        }
      } catch (err) {
        alert('حدث خطأ في الاتصال بالسيرفر أثناء أخذ النسخة');
      } finally {
        btnCreate.disabled = false;
        btnCreate.innerHTML = origText;
      }
    });

    // Refresh backups button
    btnRefresh?.addEventListener('click', () => {
      loadBackups();
      showToast('تم تحديث قائمة النسخ');
    });

    // Dropzone click -> trigger hidden file input
    dropzone?.addEventListener('click', () => {
      inputFile?.click();
    });

    // File selected handler
    inputFile?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.name.endsWith('.json')) {
        alert('يرجى اختيار ملف نسخة احتياطية بصيغة .json');
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        try {
          const parsed = JSON.parse(loadEvt.target.result);
          if (!parsed.data) {
            alert('الملف المختار ليس ملف نسخة احتياطية متوافق (لا يحتوي على حزمة data)');
            return;
          }

          state.pendingUploadedJson = parsed;
          state.pendingRestoreFile = null;

          if (dropzoneText) {
            dropzoneText.innerHTML = `<strong>تم تحديد:</strong> ${escapeHtml(file.name)} (${(file.size / 1024).toFixed(1)} KB)`;
          }
          if (btnTriggerUpload) {
            btnTriggerUpload.disabled = false;
            btnTriggerUpload.classList.remove('btn-outline');
            btnTriggerUpload.classList.add('btn-primary');
          }
        } catch (parseErr) {
          alert('تعذر قراءة الملف المختار كـ JSON صالح');
        }
      };
      reader.readAsText(file);
    });

    // Trigger Upload Restore Button
    btnTriggerUpload?.addEventListener('click', () => {
      if (!state.pendingUploadedJson) return;

      const counts = state.pendingUploadedJson.metadata?.counts || {};
      const targetLabel = document.getElementById('confirmRestoreFileName');
      const metaBox = document.getElementById('confirmRestoreMetaBox');

      if (targetLabel) targetLabel.textContent = 'ملف مرفوع من جهازك';
      if (metaBox) {
        metaBox.innerHTML = `
          <strong>محتوى الملف المرفوع:</strong><br>
          • عدد المريضات: <b>${counts.patients ?? state.pendingUploadedJson.data?.patients?.length ?? 0}</b><br>
          • عدد الكشوفات: <b>${counts.visits ?? state.pendingUploadedJson.data?.visits?.length ?? 0}</b><br>
          • عدد الحجوزات: <b>${counts.appointments ?? state.pendingUploadedJson.data?.appointments?.length ?? 0}</b><br>
          • عدد الروشتات: <b>${counts.prescriptions ?? state.pendingUploadedJson.data?.prescriptions?.length ?? 0}</b>
        `;
      }

      openModal(document.getElementById('modalConfirmRestore'));
    });

    // Confirm & Execute Restore
    btnExecuteRestore?.addEventListener('click', async () => {
      const origText = btnExecuteRestore.innerHTML;
      btnExecuteRestore.disabled = true;
      btnExecuteRestore.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>جاري الاستعادة الآن...</span>';

      try {
        let res, json;
        if (state.pendingRestoreFile) {
          res = await fetch(`/api/backups/restore/${encodeURIComponent(state.pendingRestoreFile)}`, {
            method: 'POST'
          });
          json = await res.json();
        } else if (state.pendingUploadedJson) {
          res = await fetch('/api/backups/upload-restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.pendingUploadedJson)
          });
          json = await res.json();
        }

        if (json && json.success) {
          closeModal(document.getElementById('modalConfirmRestore'));
          showToast('تمت استعادة البيانات بنجاح في كامل النظام!');
          state.pendingRestoreFile = null;
          state.pendingUploadedJson = null;

          // Reload all state caches
          loadHealth();
          loadPatients();
          loadBackups();
        } else {
          alert(json?.error || 'فشلت عملية الاستعادة');
        }
      } catch (err) {
        alert('حدث خطأ أثناء استعادة البيانات: ' + err.message);
      } finally {
        btnExecuteRestore.disabled = false;
        btnExecuteRestore.innerHTML = origText;
      }
    });
  }

  // Global Helpers for Backups
  window.promptRestoreBackup = (filename) => {
    state.pendingRestoreFile = filename;
    state.pendingUploadedJson = null;

    const targetLabel = document.getElementById('confirmRestoreFileName');
    const metaBox = document.getElementById('confirmRestoreMetaBox');

    if (targetLabel) targetLabel.textContent = filename;
    if (metaBox) {
      metaBox.innerHTML = `سيتم استرجاع كامل بيانات وجداول العيادة المخزنة داخل ملف النسخة: <b>${escapeHtml(filename)}</b>`;
    }

    openModal(document.getElementById('modalConfirmRestore'));
  };

  window.deleteBackupFile = async (filename) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف ملف النسخة الاحتياطية:\n${filename}؟`)) {
      return;
    }

    try {
      const res = await fetch(`/api/backups/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        showToast('تم حذف النسخة الاحتياطية');
        loadBackups();
      } else {
        alert(json.error || 'تعذر حذف النسخة');
      }
    } catch (e) {
      alert('خطأ في الاتصال أثناء حذف النسخة');
    }
  };

  // Run initialization
  init();
});
