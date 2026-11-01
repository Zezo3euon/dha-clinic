const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Determine pool configuration (Render DATABASE_URL or Local / Docker)
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5435', 10),
      user: process.env.DB_USER || 'dha_admin',
      password: process.env.DB_PASSWORD || 'dha_secure_pass_2026',
      database: process.env.DB_NAME || 'dha_clinic',
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('⚠️ Unexpected idle client error on PostgreSQL pool:', err.message);
  isConnected = false;
});

let isConnected = false;
let fallbackStore = null;

// Initialize in-memory fallback store from seed script if DB is temporarily unreachable
function initMemoryStore() {
  if (fallbackStore) return fallbackStore;
  
  fallbackStore = {
    patients: [
      {
        id: 1,
        patient_code: '0001',
        full_name: 'مريم أحمد عبد الرحمن',
        age: 28,
        phone: '01012345678',
        phone_alt: '01212345678',
        husband_name: 'محمد إبراهيم',
        address: 'القاهرة - المعادي شارع النصر',
        blood_group: 'A+',
        allergies: 'لا توجد',
        chronic_diseases: 'لا يوجد',
        gravida: 2,
        para: 1,
        abortion: 0,
        living: 1,
        cs_count: 1,
        normal_delivery_count: 0,
        is_pregnant: true,
        lmp: '2026-06-15',
        edd: '2027-03-22',
        notes: 'حمل ثاني بعد قيصرية سابقة قبل سنتين، الحمل سليم ومستقر',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        patient_code: '0002',
        full_name: 'سارة محمود الخولي',
        age: 32,
        phone: '01198765432',
        phone_alt: '01598765432',
        husband_name: 'أحمد سامي',
        address: 'الجيزة - الدقي',
        blood_group: 'O+',
        allergies: 'حساسية البنسلين',
        chronic_diseases: 'خمول بسيط في الغدة الدرقية',
        gravida: 3,
        para: 1,
        abortion: 1,
        living: 1,
        cs_count: 0,
        normal_delivery_count: 1,
        is_pregnant: true,
        lmp: '2026-04-10',
        edd: '2027-01-15',
        notes: 'تاريخ إجهاض في الشهر الثاني سابقاً، تتناول إيروثيروكس 50 ومثبتات',
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        patient_code: '0003',
        full_name: 'نوران كريم الشناوي',
        age: 24,
        phone: '01234567890',
        phone_alt: '01034567890',
        husband_name: 'عمر فاروق',
        address: 'القاهرة - التجمع الخامس',
        blood_group: 'B+',
        allergies: 'لا توجد',
        chronic_diseases: 'لا يوجد',
        gravida: 1,
        para: 0,
        abortion: 0,
        living: 0,
        cs_count: 0,
        normal_delivery_count: 0,
        is_pregnant: true,
        lmp: '2026-08-01',
        edd: '2027-05-08',
        notes: 'بكرية - متابعة حمل في الثلث الأول، تشكو من غثيان صباحي',
        created_at: new Date().toISOString()
      },
      {
        id: 4,
        patient_code: '0004',
        full_name: 'هدى مصطفى رضوان',
        age: 39,
        phone: '01055566677',
        phone_alt: '01155566677',
        husband_name: 'طارق حسن',
        address: 'القاهرة - مدينة نصر',
        blood_group: 'AB+',
        allergies: 'لا توجد',
        chronic_diseases: 'ارتفاع ضغط دم معتدل',
        gravida: 4,
        para: 3,
        abortion: 0,
        living: 3,
        cs_count: 2,
        normal_delivery_count: 1,
        is_pregnant: false,
        lmp: null,
        edd: null,
        notes: 'استشارة لتركيب لولب هرموني لمنع الحمل وتنظيم الدورة',
        created_at: new Date().toISOString()
      },
      {
        id: 5,
        patient_code: '0005',
        full_name: 'ياسمين وائل الشريف',
        age: 29,
        phone: '01544433322',
        phone_alt: '01244433322',
        husband_name: 'كريم عادل',
        address: 'القاهرة - مصر الجديدة',
        blood_group: 'O-',
        allergies: 'لا توجد',
        chronic_diseases: 'أنيميا نقص الحديد',
        gravida: 2,
        para: 0,
        abortion: 1,
        living: 0,
        cs_count: 0,
        normal_delivery_count: 0,
        is_pregnant: true,
        lmp: '2026-07-20',
        edd: '2027-04-26',
        notes: 'سلبية العامل الريزوسي (Rh-)، تحتاج حقنة Anti-D ومتابعة التجلط',
        created_at: new Date().toISOString()
      }
    ],
    appointments: [
      {
        id: 1,
        patient_id: 1,
        patient_name: 'مريم أحمد عبد الرحمن',
        patient_phone: '01012345678',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '17:30:00',
        queue_number: 1,
        type: 'متابعة حمل دورية',
        status: 'جاري الكشف',
        fee: 350.00,
        is_paid: true,
        notes: 'فحص سونار تفصيلي للشهر الخامس'
      },
      {
        id: 2,
        patient_id: 2,
        patient_name: 'سارة محمود الخولي',
        patient_phone: '01198765432',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '18:15:00',
        queue_number: 2,
        type: 'متابعة حمل دورية',
        status: 'في الانتظار',
        fee: 300.00,
        is_paid: true,
        notes: 'متابعة حركة الجنين ونبضه'
      },
      {
        id: 3,
        patient_id: 3,
        patient_name: 'نوران كريم الشناوي',
        patient_phone: '01234567890',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '19:00:00',
        queue_number: 3,
        type: 'كشف جديد',
        status: 'محجوز',
        fee: 400.00,
        is_paid: false,
        notes: 'كشف بكرية أول زيارة وتأكيد كيس الحمل'
      },
      {
        id: 4,
        patient_id: 4,
        patient_name: 'هدى مصطفى رضوان',
        patient_phone: '01055566677',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '19:45:00',
        queue_number: 4,
        type: 'إعادة واستشارة',
        status: 'محجوز',
        fee: 200.00,
        is_paid: false,
        notes: 'تركيب لولب هرموني Mirena'
      },
      {
        id: 5,
        patient_id: 5,
        patient_name: 'ياسمين وائل الشريف',
        patient_phone: '01544433322',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '20:30:00',
        queue_number: 5,
        type: 'متابعة حمل دورية',
        status: 'محجوز',
        fee: 350.00,
        is_paid: false,
        notes: 'تحليل كومبس وفحص السونار'
      }
    ],
    visits: [
      {
        id: 1,
        patient_id: 1,
        patient_name: 'مريم أحمد عبد الرحمن',
        appointment_id: 1,
        visit_date: new Date().toISOString().split('T')[0],
        visit_time: '17:35:00',
        visit_datetime: new Date().toISOString(),
        visit_type: 'متابعة حمل',
        chief_complaint: 'حركة الجنين جيدة ولا توجد آلام أو نزيف، فحص روتيني للشهر الخامس',
        blood_pressure: '115/75',
        weight_kg: 68.5,
        temperature: 36.8,
        gestational_age_weeks: 20,
        gestational_age_days: 4,
        fetal_heart_rate: 148,
        ultrasound_findings: 'جنين واحد مفرد في وضع رأسي سليم. حركة ونبض طبيعي (FHR: 148 bpm). المشيمة أمامية علوية بعيدة عن عنق الرحم. كمية السائل الأمنيوسي (AFI) طبيعية 14 سم.',
        diagnosis: 'Single viable intrauterine pregnancy at 20 weeks 4 days (حمل مفرد سليم ومستقر في الأسبوع 20)',
        clinical_notes: 'النمو الجنيني متطابق مع التواريخ، لا توجد أي تشوهات واضحة في سونار التشوهات (Anomaly Scan). الاستمرار على الفيتامينات والحديد.',
        next_visit_date: '2026-11-05'
      }
    ],
    prescriptions: [
      {
        id: 1,
        visit_id: 1,
        patient_id: 1,
        patient_name: 'مريم أحمد عبد الرحمن',
        patient_age: 28,
        prescription_code: 'RX-DHA-2026-0001',
        issue_date: new Date().toISOString().split('T')[0],
        issue_time: '17:50:00',
        diagnosis_summary: 'حمل سليم في الشهر الخامس (Single viable pregnancy at 20 weeks) ومتابعة روتينية',
        general_advice: 'الراحة المعتدلة، شرب ما لا يقل عن 2.5 لتر ماء يومياً، المشي الخفيف، تناول وجبات متوازنة غنية بالألياف والخضار، الحضور الفوري في حال حدوث مغص شديد أو أي إفرازات غير طبيعية.',
        items: [
          {
            medication_name: 'Caltrate + Vitamin D (كالسيوم د3)',
            dosage: '600 mg',
            frequency: 'قرص واحد يومياً',
            duration: 'طوال فترة الحمل',
            instructions: 'يؤخذ بعد الغداء بساعة'
          },
          {
            medication_name: 'Feroglobin B12 (حديد وزنك وفوليك)',
            dosage: '1 capsule',
            frequency: 'كبسولة يومياً',
            duration: 'طوال فترة الحمل',
            instructions: 'تؤخذ بعد العشاء مع كوب عصير برتقال'
          },
          {
            medication_name: 'Omega-3 Maternal (زيت سمك نقي)',
            dosage: '1000 mg',
            frequency: 'كبسولة يومياً',
            duration: 'لمدة 3 أشهر',
            instructions: 'بعد الإفطار لدعم تطور الجهاز العصبي للجنين'
          }
        ]
      }
    ],
    drugs: [
      { id: 1, category: 'فيتامينات ومكملات الحمل', name: 'Folic Acid (حمض الفوليك)', default_dosage: '5 mg', default_frequency: 'قرص واحد يومياً', default_duration: 'طوال الشهور الثلاثة الأولى', default_instructions: 'يؤخذ صباحاً بعد الإفطار لمنع التشوهات الجنينية' },
      { id: 2, category: 'مثبتات الحمل', name: 'Duphaston (دوفاستون)', default_dosage: '10 mg', default_frequency: 'قرص مرتين يومياً', default_duration: 'لمدة 3 أسابيع', default_instructions: 'مثبت للحمل يؤخذ بانتظام كل 12 ساعة' },
      { id: 3, category: 'مثبتات الحمل', name: 'Prontogest (برونتوجست لبوس/حقن)', default_dosage: '400 mg', default_frequency: 'تحميلة مهبلية مساءً قبل النوم', default_duration: 'حسب إرشادات الطبيب', default_instructions: 'تثبيت الحمل والراحة التامة' },
      { id: 4, category: 'مكملات الحديد والأنيميا', name: 'Feroglobin / Ferose (حديد)', default_dosage: '1 capsule', default_frequency: 'كبسولة واحدة يومياً', default_duration: 'لمدة 3 أشهر', default_instructions: 'تؤخذ بعد الغداء مع عصير برتقال، تجنب الشاي والقهوة لمدة ساعتين' },
      { id: 5, category: 'مكملات الكالسيوم', name: 'Caltrate + Vitamin D (كالسيوم د3)', default_dosage: '600 mg', default_frequency: 'قرص واحد يومياً', default_duration: 'ابتداءً من الشهر الرابع', default_instructions: 'يؤخذ بعد الغداء ويفصل عن الحديد بـ 4 ساعات' },
      { id: 6, category: 'أدوية القيء والغثيان', name: 'Navidoxine (نافيدوكسين)', default_dosage: '1 tablet', default_frequency: 'قرص قبل النوم', default_duration: 'عند اللزوم', default_instructions: 'لعلاج غثيان وقيء الحمل الصباحي' },
      { id: 7, category: 'مسكنات ومضادات التقلصات', name: 'Viscera / Spasmopyralgin', default_dosage: '1 amp / tab', default_frequency: 'قرص عند اللزوم', default_duration: '3 أيام', default_instructions: 'لعلاج تقلصات وآلام البطن والرحم' },
      { id: 8, category: 'مضادات حيوية آمنة للحمل', name: 'Augmentin (أوجمنتين)', default_dosage: '1 gm', default_frequency: 'قرص كل 12 ساعة', default_duration: 'لمدة 7 أيام', default_instructions: 'بعد الأكل مباشرة لعلاج التهابات المسالك البولية' },
      { id: 9, category: 'مضادات التجلط والسيولة', name: 'Clexane (كلكسان)', default_dosage: '40 mg', default_frequency: 'حقنة تحت الجلد يومياً', default_duration: 'حسب خطة متابعة التجلط', default_instructions: 'تؤخذ في نفس الميعاد يومياً تحت الجلد في البطن' },
      { id: 10, category: 'وسائل تنظيم الأسرة', name: 'Microlut (أقراص الرضاعة)', default_dosage: '0.03 mg', default_frequency: 'قرص يومياً في نفس الساعة', default_duration: 'مستمر طوال فترة الرضاعة', default_instructions: 'لا تؤثر على إدرار حليب الأم' },
      { id: 11, category: 'تحاميل مهبلية ومطهرات', name: 'Gyno-Daktarin (جاينو دكتارين)', default_dosage: '400 mg', default_frequency: 'تحميلة مهبلية مساءً', default_duration: 'لمدة 3 أيام متتالية', default_instructions: 'لعلاج الالتهابات الفطرية المهبلية' },
      { id: 12, category: 'منشطات التبويض', name: 'Clomid (كلوميد)', default_dosage: '50 mg', default_frequency: 'قرصين يومياً من اليوم 2 للدورة', default_duration: 'لمدة 5 أيام', default_instructions: 'يؤخذ بعد استشارة وفحص السونار المهبلي' }
    ],
    attachments: []
  };
  return fallbackStore;
}

// Function to test and initialize database connection
async function connectDB() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL Database successfully!');
    isConnected = true;
    
    // Check if tables exist; if not, initialize them from init script
    const tableRes = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'patients'
      );
    `);
    
    if (!tableRes.rows[0].exists) {
      console.log('⚡ Initializing database schema from init-db/01-init.sql...');
      const sqlPath = path.join(__dirname, '..', 'init-db', '01-init.sql');
      if (fs.existsSync(sqlPath)) {
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await client.query(sql);
        console.log('✅ Database schema and seed data loaded successfully!');
      }
    }

    // Ensure visit_attachments table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS visit_attachments (
          id SERIAL PRIMARY KEY,
          visit_id INT REFERENCES visits(id) ON DELETE CASCADE,
          patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          attachment_type VARCHAR(50) DEFAULT 'سونار',
          title VARCHAR(150),
          file_data TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_attachments_visit ON visit_attachments(visit_id);
      CREATE INDEX IF NOT EXISTS idx_attachments_patient ON visit_attachments(patient_id);
    `);
    client.release();
    return true;
  } catch (err) {
    console.warn(`⚠️ PostgreSQL connection attempt failed (${err.message}). Using resilient in-memory mode until Docker container is ready.`);
    isConnected = false;
    initMemoryStore();
    return false;
  }
}

// Unified query wrapper that seamlessly uses PostgreSQL or Memory Store
async function query(text, params = []) {
  if (isConnected) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.error('Postgres query error:', err.message);
      throw err;
    }
  }
  
  // If not connected to Postgres, provide in-memory database simulation
  return handleInMemoryQuery(text, params);
}

// Helper to handle queries against memory store if postgres is not reachable
function handleInMemoryQuery(text, params) {
  const store = initMemoryStore();
  const lower = text.trim().toLowerCase();

  // Patients Queries
  if (lower.startsWith('select') && lower.includes('from patients')) {
    let rows = [...store.patients];
    if (lower.includes('where id =') || (lower.includes('where') && lower.includes('id = $1'))) {
      const id = parseInt(params[0], 10);
      rows = rows.filter(p => p.id === id);
    } else if (params.length > 0 && typeof params[0] === 'string' && params[0].includes('%')) {
      const q = params[0].replace(/%/g, '').toLowerCase();
      rows = rows.filter(p => 
        (p.full_name && p.full_name.toLowerCase().includes(q)) || 
        (p.phone && p.phone.includes(q)) ||
        (p.patient_code && p.patient_code.toLowerCase().includes(q))
      );
    }
    return { rows, rowCount: rows.length };
  }

  // Appointments Queries
  if (lower.startsWith('select') && lower.includes('from appointments')) {
    let rows = [...store.appointments];
    if (lower.includes('appointment_date = current_date') || lower.includes('where a.appointment_date = $1')) {
      const targetDate = params[0] || new Date().toISOString().split('T')[0];
      rows = rows.filter(a => a.appointment_date === targetDate);
    }
    return { rows, rowCount: rows.length };
  }

  // Visits Queries
  if (lower.startsWith('select') && lower.includes('from visits')) {
    let rows = [...store.visits];
    if (params.length > 0) {
      const pid = parseInt(params[0], 10);
      rows = rows.filter(v => v.patient_id === pid);
    }
    return { rows, rowCount: rows.length };
  }

  // Prescriptions Queries
  if (lower.startsWith('select') && lower.includes('from prescriptions')) {
    let rows = [...store.prescriptions];
    if (lower.includes('where id =') || lower.includes('where p.id = $1')) {
      const id = parseInt(params[0], 10);
      rows = rows.filter(p => p.id === id);
    } else if (params.length > 0) {
      const pid = parseInt(params[0], 10);
      rows = rows.filter(p => p.patient_id === pid);
    }
    return { rows, rowCount: rows.length };
  }

  // Drugs Catalog
  if (lower.startsWith('select') && lower.includes('from drugs_catalog')) {
    return { rows: store.drugs, rowCount: store.drugs.length };
  }

  return { rows: [], rowCount: 0 };
}

module.exports = {
  pool,
  query,
  connectDB,
  isPostgresConnected: () => isConnected,
  getMemoryStore: () => initMemoryStore()
};
