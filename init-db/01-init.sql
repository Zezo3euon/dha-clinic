-- ============================================================================
-- نظام إدارة عيادة الدكتور حاتم عواجة - استشاري النساء والتوليد
-- Dr. Hatem Awaja Clinic Management System Database Schema (PostgreSQL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    patient_code VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    age INT NOT NULL,
    phone VARCHAR(30) NOT NULL,
    phone_alt VARCHAR(30),
    husband_name VARCHAR(150),
    address TEXT,
    blood_group VARCHAR(10) DEFAULT 'غير محدد',
    allergies TEXT DEFAULT 'لا توجد حساسية معروفة',
    chronic_diseases TEXT,
    -- التاريخ الولادي والنسائي (Obstetric History)
    gravida INT DEFAULT 0,              -- إجمالي مرات الحمل
    para INT DEFAULT 0,                 -- إجمالي الولادات
    abortion INT DEFAULT 0,             -- الإجهاض
    living INT DEFAULT 0,               -- عدد الأطفال الأحياء
    cs_count INT DEFAULT 0,             -- عدد الولادات القيصرية
    normal_delivery_count INT DEFAULT 0,-- عدد الولادات الطبيعية
    -- متابعة الحمل الحالي
    is_pregnant BOOLEAN DEFAULT false,  -- هل المريضة حامل حالياً
    lmp DATE,                           -- تاريخ آخر دورة (Last Menstrual Period)
    edd DATE,                           -- الموعد المتوقع للولادة (Estimated Due Date)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    appointment_time TIME NOT NULL DEFAULT '18:00:00',
    queue_number INT NOT NULL DEFAULT 1,
    type VARCHAR(60) NOT NULL DEFAULT 'كشف جديد',
    status VARCHAR(30) NOT NULL DEFAULT 'محجوز', -- 'محجوز', 'في الانتظار', 'جاري الكشف', 'مكتمل', 'ملغي'
    fee NUMERIC(10, 2) DEFAULT 300.00,
    is_paid BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visits (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id INT REFERENCES appointments(id) ON DELETE SET NULL,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    visit_time TIME NOT NULL DEFAULT CURRENT_TIME,
    visit_datetime TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    visit_type VARCHAR(60) NOT NULL DEFAULT 'كشف نساء وتوليد',
    chief_complaint TEXT NOT NULL,
    blood_pressure VARCHAR(20),
    weight_kg NUMERIC(5, 2),
    temperature NUMERIC(4, 1),
    gestational_age_weeks INT,
    gestational_age_days INT,
    fetal_heart_rate INT,
    ultrasound_findings TEXT,
    diagnosis TEXT NOT NULL,
    clinical_notes TEXT,
    next_visit_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id SERIAL PRIMARY KEY,
    visit_id INT REFERENCES visits(id) ON DELETE CASCADE,
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    prescription_code VARCHAR(40) UNIQUE NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    issue_time TIME NOT NULL DEFAULT CURRENT_TIME,
    diagnosis_summary TEXT,
    general_advice TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescription_items (
    id SERIAL PRIMARY KEY,
    prescription_id INT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medication_name VARCHAR(150) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    instructions TEXT
);

CREATE TABLE IF NOT EXISTS drugs_catalog (
    id SERIAL PRIMARY KEY,
    category VARCHAR(80) NOT NULL,
    name VARCHAR(150) NOT NULL,
    default_dosage VARCHAR(100),
    default_frequency VARCHAR(100),
    default_duration VARCHAR(100),
    default_instructions TEXT
);

-- ============================================================================
-- فهارس للسرعة وتحسين الأداء
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);

-- ============================================================================
-- بيانات أولية لدليل الأدوية الشائعة لعيادة د. حاتم عواجة (نساء وتوليد)
-- ============================================================================
INSERT INTO drugs_catalog (category, name, default_dosage, default_frequency, default_duration, default_instructions) VALUES
('فيتامينات ومكملات الحمل', 'Folic Acid (حمض الفوليك)', '5 mg', 'قرص واحد يومياً', 'طوال الشهور الثلاثة الأولى', 'يؤخذ صباحاً بعد الإفطار لمنع التشوهات الجنينية'),
('مثبتات الحمل', 'Duphaston (دوفاستون)', '10 mg', 'قرص مرتين يومياً', 'لمدة 3 أسابيع', 'مثبت للحمل يؤخذ بانتظام كل 12 ساعة'),
('مثبتات الحمل', 'Prontogest (برونتوجست لبوس/حقن)', '400 mg', 'تحميلة مهبلية مساءً قبل النوم', 'حسب إرشادات الطبيب', 'تثبيت الحمل والراحة التامة'),
('مكملات الحديد والأنيميا', 'Feroglobin / Ferose (حديد)', '1 capsule', 'كبسولة واحدة يومياً', 'لمدة 3 أشهر', 'تؤخذ بعد الغداء مع عصير برتقال، تجنب الشاي والقهوة لمدة ساعتين'),
('مكملات الكالسيوم', 'Caltrate + Vitamin D (كالسيوم د3)', '600 mg', 'قرص واحد يومياً', 'ابتداءً من الشهر الرابع', 'يؤخذ بعد الغداء ويفصل عن الحديد بـ 4 ساعات'),
('أدوية القيء والغثيان', 'Navidoxine (نافيدوكسين)', '1 tablet', 'قرص قبل النوم', 'عند اللزوم', 'لعلاج غثيان وقيء الحمل الصباحي'),
('مسكنات ومضادات التقلصات', 'Viscera / Spasmopyralgin', '1 amp / tab', 'قرص عند اللزوم', '3 أيام', 'لعلاج تقلصات وآلام البطن والرحم'),
('مضادات حيوية آمنة للحمل', 'Augmentin (أوجمنتين)', '1 gm', 'قرص كل 12 ساعة', 'لمدة 7 أيام', 'بعد الأكل مباشرة لعلاج التهابات المسالك البولية'),
('مضادات التجلط والسيولة', 'Clexane (كلكسان)', '40 mg', 'حقنة تحت الجلد يومياً', 'حسب خطة متابعة التجلط', 'تؤخذ في نفس الميعاد يومياً تحت الجلد في البطن'),
('وسائل تنظيم الأسرة', 'Microlut (أقراص الرضاعة)', '0.03 mg', 'قرص يومياً في نفس الساعة', 'مستمر طوال فترة الرضاعة', 'لا تؤثر على إدرار حليب الأم'),
('تحاميل مهبلية ومطهرات', 'Gyno-Daktarin (جاينو دكتارين)', '400 mg', 'تحميلة مهبلية مساءً', 'لمدة 3 أيام متتالية', 'لعلاج الالتهابات الفطرية المهبلية'),
('منشطات التبويض', 'Clomid (كلوميد)', '50 mg', 'قرصين يومياً من اليوم 2 للدورة', 'لمدة 5 أيام', 'يؤخذ بعد استشارة وفحص السونار المهبلي');

-- ============================================================================
-- عينة بيانات واقعية مسبقة للمريضات والكشوفات والروشتات
-- ============================================================================
INSERT INTO patients (patient_code, full_name, age, phone, phone_alt, husband_name, address, blood_group, allergies, chronic_diseases, gravida, para, abortion, living, cs_count, normal_delivery_count, is_pregnant, lmp, edd, notes)
VALUES
('0001', 'مريم أحمد عبد الرحمن', 28, '01012345678', '01212345678', 'محمد إبراهيم', 'القاهرة - المعادي شارع النصر', 'A+', 'لا توجد', 'لا يوجد', 2, 1, 0, 1, 1, 0, true, '2026-06-15', '2027-03-22', 'حمل ثاني بعد قيصرية سابقة قبل سنتين، الحمل سليم ومستقر'),
('0002', 'سارة محمود الخولي', 32, '01198765432', '01598765432', 'أحمد سامي', 'الجيزة - الدقي', 'O+', 'حساسية البنسلين', 'خمول بسيط في الغدة الدرقية', 3, 1, 1, 1, 0, 1, true, '2026-04-10', '2027-01-15', 'تاريخ إجهاض في الشهر الثاني سابقاً، تتناول إيروثيروكس 50 ومثبتات'),
('0003', 'نوران كريم الشناوي', 24, '01234567890', '01034567890', 'عمر فاروق', 'القاهرة - التجمع الخامس', 'B+', 'لا توجد', 'لا يوجد', 1, 0, 0, 0, 0, 0, true, '2026-08-01', '2027-05-08', 'بكرية - متابعة حمل في الثلث الأول، تشكو من غثيان صباحي'),
('0004', 'هدى مصطفى رضوان', 39, '01055566677', '01155566677', 'طارق حسن', 'القاهرة - مدينة نصر', 'AB+', 'لا توجد', 'ارتفاع ضغط دم معتدل', 4, 3, 0, 3, 2, 1, false, NULL, NULL, 'استشارة لتركيب لولب هرموني لمنع الحمل وتنظيم الدورة'),
('0005', 'ياسمين وائل الشريف', 29, '01544433322', '01244433322', 'كريم عادل', 'القاهرة - مصر الجديدة', 'O-', 'لا توجد', 'أنيميا نقص الحديد', 2, 0, 1, 0, 0, 0, true, '2026-07-20', '2027-04-26', 'سلبية العامل الريزوسي (Rh-)، تحتاج حقنة Anti-D ومتابعة التجلط');

-- مواعيد اليوم والانتظار
INSERT INTO appointments (patient_id, appointment_date, appointment_time, queue_number, type, status, fee, is_paid, notes)
VALUES
(1, CURRENT_DATE, '17:30:00', 1, 'متابعة حمل دورية', 'جاري الكشف', 350.00, true, 'فحص سونار تفصيلي للشهر الخامس'),
(2, CURRENT_DATE, '18:15:00', 2, 'متابعة حمل دورية', 'في الانتظار', 300.00, true, 'متابعة حركة الجنين ونبضه'),
(3, CURRENT_DATE, '19:00:00', 3, 'كشف جديد', 'محجوز', 400.00, false, 'كشف بكرية أول زيارة وتأكيد كيس الحمل'),
(4, CURRENT_DATE, '19:45:00', 4, 'إعادة واستشارة', 'محجوز', 200.00, false, 'تركيب لولب هرموني Mirena'),
(5, CURRENT_DATE, '20:30:00', 5, 'متابعة حمل دورية', 'محجوز', 350.00, false, 'تحليل كومبس وفحص السونار');

-- زيارات وتشخيصات سابقة بالتوقيتات
INSERT INTO visits (patient_id, appointment_id, visit_date, visit_time, visit_type, chief_complaint, blood_pressure, weight_kg, temperature, gestational_age_weeks, gestational_age_days, fetal_heart_rate, ultrasound_findings, diagnosis, clinical_notes, next_visit_date)
VALUES
(1, 1, CURRENT_DATE, '17:35:00', 'متابعة حمل', 'حركة الجنين جيدة ولا توجد آلام أو نزيف، فحص روتيني للشهر الخامس', '115/75', 68.5, 36.8, 20, 4, 148, 'جنين واحد مفرد في وضع رأسي سليم. حركة ونبض طبيعي (FHR: 148 bpm). المشيمة أمامية علوية بعيدة عن عنق الرحم. كمية السائل الأمنيوسي (AFI) طبيعية 14 سم.', 'Single viable intrauterine pregnancy at 20 weeks 4 days (حمل مفرد سليم ومستقر في الأسبوع 20)', 'النمو الجنيني متطابق مع التواريخ، لا توجد أي تشوهات واضحة في سونار التشوهات (Anomaly Scan). الاستمرار على الفيتامينات والحديد.', CURRENT_DATE + INTERVAL '4 weeks'),
(2, 2, CURRENT_DATE - INTERVAL '15 days', '18:30:00', 'متابعة حمل دورية', 'إرهاق خفيف مع تسارع ضربات القلب عند بذل مجهود', '110/70', 74.0, 37.0, 24, 2, 142, 'جنين سليم، قياسات BPD و FL متوافقة مع الأسبوع 24. وزن الجنين التقديري 650 جرام. المشيمة خلفية طبيعية.', 'Moderate Iron Deficiency Anemia in Pregnancy (أنيميا نقص حديد معتدلة أثناء الحمل - هيموجلوبين 9.8)', 'تم فحص التحاليل وتبين نقص مخزون الحديد. ينصح برفع جرعة الحديد وإعادة تحليل صورة الدم بعد شهر.', CURRENT_DATE);

-- روشتة لزيارة مريم أحمد
INSERT INTO prescriptions (visit_id, patient_id, prescription_code, issue_date, issue_time, diagnosis_summary, general_advice)
VALUES
(1, 1, 'RX-DHA-2026-0001', CURRENT_DATE, '17:50:00', 'حمل سليم في الشهر الخامس (Single viable pregnancy at 20 weeks) ومتابعة روتينية', 'الراحة المعتدلة، شرب ما لا يقل عن 2.5 لتر ماء يومياً، المشي الخفيف، تناول وجبات متوازنة غنية بالألياف والخضار، الحضور الفوري في حال حدوث مغص شديد أو أي إفرازات غير طبيعية.');

INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, instructions)
VALUES
(1, 'Caltrate + Vitamin D (كالسيوم د3)', '600 mg', 'قرص واحد يومياً', 'طوال فترة الحمل', 'يؤخذ بعد الغداء بساعة'),
(1, 'Feroglobin B12 (حديد وزنك وفوليك)', '1 capsule', 'كبسولة يومياً', 'طوال فترة الحمل', 'تؤخذ بعد العشاء مع كوب عصير برتقال'),
(1, 'Omega-3 Maternal (زيت سمك نقي)', '1000 mg', 'كبسولة يومياً', 'لمدة 3 أشهر', 'بعد الإفطار لدعم تطور الجهاز العصبي للجنين');

-- ============================================================================
-- مرفقات الزيارات وصور السونار والتحاليل
-- ============================================================================
CREATE TABLE IF NOT EXISTS visit_attachments (
    id SERIAL PRIMARY KEY,
    visit_id INT REFERENCES visits(id) ON DELETE CASCADE,
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    attachment_type VARCHAR(50) DEFAULT 'سونار', -- 'سونار', 'تحليل دم', 'سكر', 'غدة', 'أخرى'
    title VARCHAR(150),
    file_data TEXT NOT NULL, -- Base64 Data URI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attachments_visit ON visit_attachments(visit_id);
CREATE INDEX IF NOT EXISTS idx_attachments_patient ON visit_attachments(patient_id);
