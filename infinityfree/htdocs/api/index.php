<?php
/**
 * REST API Router for Dr. Hatem Awaja Clinic System
 * InfinityFree PHP + MySQL Edition
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
$config = require __DIR__ . '/config.php';

// Helper response functions
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// Determine requested endpoint
$endpoint = isset($_GET['endpoint']) ? trim($_GET['endpoint'], '/') : '';
if (empty($endpoint)) {
    // Fallback: parse from REQUEST_URI
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (preg_match('#/api/(.*)$#i', $uri, $matches)) {
        $endpoint = trim($matches[1], '/');
    }
}

$method = strtoupper($_SERVER['REQUEST_METHOD']);
$segments = explode('/', $endpoint);
$resource = $segments[0] ?? '';
$id = $segments[1] ?? null;
$subAction = $segments[2] ?? null;

$db = getDB();

try {
    // =========================================================================
    // 1. HEALTH CHECK (/api/health)
    // =========================================================================
    if ($resource === 'health') {
        jsonResponse([
            'status' => 'online',
            'clinic' => $config['clinic_name'],
            'specialty' => $config['clinic_specialty'],
            'database' => [
                'connected' => true,
                'engine' => 'MySQL / MariaDB (InfinityFree)'
            ],
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z')
        ]);
    }

    // =========================================================================
    // 2. DASHBOARD STATS (/api/stats/dashboard)
    // =========================================================================
    if ($resource === 'stats' && $id === 'dashboard') {
        $today = date('Y-m-d');

        $totalPatients = $db->query("SELECT COUNT(*) FROM patients")->fetchColumn();
        $pregnantPatients = $db->query("SELECT COUNT(*) FROM patients WHERE is_pregnant = 1")->fetchColumn();

        $stmt = $db->prepare("SELECT COUNT(*) FROM appointments WHERE appointment_date = ?");
        $stmt->execute([$today]);
        $todayAppointments = $stmt->fetchColumn();

        $stmt = $db->prepare("SELECT COUNT(*) FROM appointments WHERE appointment_date = ? AND status = 'في الانتظار'");
        $stmt->execute([$today]);
        $waitingCount = $stmt->fetchColumn();

        $stmt = $db->prepare("SELECT COUNT(*) FROM appointments WHERE appointment_date = ? AND status = 'جاري الكشف'");
        $stmt->execute([$today]);
        $inProgressCount = $stmt->fetchColumn();

        $stmt = $db->prepare("SELECT COUNT(*) FROM appointments WHERE appointment_date = ? AND status = 'مكتمل'");
        $stmt->execute([$today]);
        $completedCount = $stmt->fetchColumn();

        $totalVisits = $db->query("SELECT COUNT(*) FROM visits")->fetchColumn();
        $totalPrescriptions = $db->query("SELECT COUNT(*) FROM prescriptions")->fetchColumn();

        $stmt = $db->prepare("
            SELECT a.*, p.full_name as patient_name, p.phone as patient_phone, p.patient_code
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.appointment_date = ?
            ORDER BY a.queue_number ASC
            LIMIT 100
        ");
        $stmt->execute([$today]);
        $todayQueue = $stmt->fetchAll();

        // Convert boolean flags
        foreach ($todayQueue as &$row) {
            $row['is_paid'] = (bool)$row['is_paid'];
        }

        jsonResponse([
            'success' => true,
            'stats' => [
                'totalPatients' => (int)$totalPatients,
                'pregnantPatients' => (int)$pregnantPatients,
                'todayAppointments' => (int)$todayAppointments,
                'waitingCount' => (int)$waitingCount,
                'inProgressCount' => (int)$inProgressCount,
                'completedCount' => (int)$completedCount,
                'totalVisits' => (int)$totalVisits,
                'totalPrescriptions' => (int)$totalPrescriptions
            ],
            'todayQueue' => $todayQueue,
            'databaseStatus' => [
                'isPostgres' => false,
                'mode' => 'MySQL / MariaDB (InfinityFree)'
            ]
        ]);
    }

    // =========================================================================
    // 3. PATIENTS (/api/patients)
    // =========================================================================
    if ($resource === 'patients') {
        if (!$id) {
            if ($method === 'GET') {
                $q = trim($_GET['q'] ?? '');
                $isPregnant = $_GET['is_pregnant'] ?? '';
                $bloodGroup = $_GET['blood_group'] ?? '';
                $history = $_GET['history'] ?? '';
                $sort = $_GET['sort'] ?? 'newest';

                $where = [];
                $params = [];

                if (!empty($q)) {
                    $where[] = "(full_name LIKE ? OR phone LIKE ? OR patient_code LIKE ? OR husband_name LIKE ?)";
                    $term = "%{$q}%";
                    $params[] = $term;
                    $params[] = $term;
                    $params[] = $term;
                    $params[] = $term;
                }

                if ($isPregnant === 'true') {
                    $where[] = "is_pregnant = 1";
                } elseif ($isPregnant === 'false') {
                    $where[] = "is_pregnant = 0";
                }

                if (!empty($bloodGroup) && $bloodGroup !== 'all') {
                    $where[] = "blood_group = ?";
                    $params[] = $bloodGroup;
                }

                if ($history === 'cs') {
                    $where[] = "cs_count > 0";
                } elseif ($history === 'abortion') {
                    $where[] = "abortion > 0";
                }

                $whereClause = count($where) > 0 ? "WHERE " . implode(' AND ', $where) : "";

                $orderClause = "ORDER BY id DESC";
                if ($sort === 'oldest') $orderClause = "ORDER BY id ASC";
                if ($sort === 'name_asc') $orderClause = "ORDER BY full_name ASC";
                if ($sort === 'age_desc') $orderClause = "ORDER BY age DESC";

                $sql = "
                    SELECT p.*,
                           (SELECT COUNT(*) FROM visits v WHERE v.patient_id = p.id) as visits_count
                    FROM patients p
                    {$whereClause}
                    {$orderClause}
                ";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $rows = $stmt->fetchAll();

                foreach ($rows as &$r) {
                    $r['is_pregnant'] = (bool)$r['is_pregnant'];
                    $r['visits_count'] = (int)$r['visits_count'];
                }

                jsonResponse(['success' => true, 'data' => $rows]);
            }

            if ($method === 'POST') {
                $data = getJsonInput();
                $code = trim($data['patient_code'] ?? '');
                if (empty($code)) {
                    $maxId = (int)$db->query("SELECT COALESCE(MAX(id), 0) + 1 FROM patients")->fetchColumn();
                    $code = str_pad($maxId, 4, '0', STR_PAD_LEFT);
                }

                $sql = "
                    INSERT INTO patients 
                    (patient_code, full_name, age, phone, phone_alt, husband_name, address, blood_group, allergies, chronic_diseases, gravida, para, abortion, living, cs_count, normal_delivery_count, is_pregnant, lmp, edd, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ";
                $stmt = $db->prepare($sql);
                $stmt->execute([
                    $code,
                    $data['full_name'] ?? '',
                    (int)($data['age'] ?? 0),
                    $data['phone'] ?? '',
                    $data['phone_alt'] ?? null,
                    $data['husband_name'] ?? null,
                    $data['address'] ?? null,
                    $data['blood_group'] ?? 'غير محدد',
                    $data['allergies'] ?? 'لا توجد حساسية معروفة',
                    $data['chronic_diseases'] ?? null,
                    (int)($data['gravida'] ?? 0),
                    (int)($data['para'] ?? 0),
                    (int)($data['abortion'] ?? 0),
                    (int)($data['living'] ?? 0),
                    (int)($data['cs_count'] ?? 0),
                    (int)($data['normal_delivery_count'] ?? 0),
                    !empty($data['is_pregnant']) ? 1 : 0,
                    !empty($data['lmp']) ? $data['lmp'] : null,
                    !empty($data['edd']) ? $data['edd'] : null,
                    $data['notes'] ?? null
                ]);

                $newId = $db->lastInsertId();
                $saved = $db->query("SELECT * FROM patients WHERE id = {$newId}")->fetch();
                $saved['is_pregnant'] = (bool)$saved['is_pregnant'];

                jsonResponse(['success' => true, 'data' => $saved], 201);
            }
        } else {
            // /api/patients/{id}
            $patientId = (int)$id;

            if ($method === 'GET') {
                $stmt = $db->prepare("SELECT * FROM patients WHERE id = ?");
                $stmt->execute([$patientId]);
                $patient = $stmt->fetch();

                if (!$patient) {
                    jsonResponse(['success' => false, 'message' => 'المريضة غير موجودة'], 404);
                }

                $patient['is_pregnant'] = (bool)$patient['is_pregnant'];

                // Visits
                $stmt = $db->prepare("
                    SELECT v.*, 
                           (SELECT COUNT(*) FROM prescriptions pr WHERE pr.visit_id = v.id) as prescriptions_count
                    FROM visits v
                    WHERE v.patient_id = ?
                    ORDER BY v.visit_date DESC, v.visit_time DESC
                ");
                $stmt->execute([$patientId]);
                $visits = $stmt->fetchAll();

                // Attachments for each visit
                foreach ($visits as &$v) {
                    $stmtAtt = $db->prepare("SELECT * FROM visit_attachments WHERE visit_id = ? ORDER BY id ASC");
                    $stmtAtt->execute([$v['id']]);
                    $v['attachments'] = $stmtAtt->fetchAll();
                }

                // Prescriptions
                $stmt = $db->prepare("SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY issue_date DESC, issue_time DESC");
                $stmt->execute([$patientId]);
                $prescriptions = $stmt->fetchAll();

                // All Patient Attachments
                $stmt = $db->prepare("SELECT * FROM visit_attachments WHERE patient_id = ? ORDER BY created_at DESC");
                $stmt->execute([$patientId]);
                $allAttachments = $stmt->fetchAll();

                $patient['visits'] = $visits;
                $patient['prescriptions'] = $prescriptions;
                $patient['attachments'] = $allAttachments;

                jsonResponse(['success' => true, 'data' => $patient]);
            }

            if ($method === 'PUT') {
                $data = getJsonInput();
                $sql = "
                    UPDATE patients SET
                    full_name = ?, age = ?, phone = ?, phone_alt = ?, husband_name = ?, address = ?, blood_group = ?, allergies = ?, chronic_diseases = ?,
                    gravida = ?, para = ?, abortion = ?, living = ?, cs_count = ?, normal_delivery_count = ?, is_pregnant = ?, lmp = ?, edd = ?, notes = ?
                    WHERE id = ?
                ";
                $stmt = $db->prepare($sql);
                $stmt->execute([
                    $data['full_name'] ?? '',
                    (int)($data['age'] ?? 0),
                    $data['phone'] ?? '',
                    $data['phone_alt'] ?? null,
                    $data['husband_name'] ?? null,
                    $data['address'] ?? null,
                    $data['blood_group'] ?? 'غير محدد',
                    $data['allergies'] ?? 'لا توجد حساسية معروفة',
                    $data['chronic_diseases'] ?? null,
                    (int)($data['gravida'] ?? 0),
                    (int)($data['para'] ?? 0),
                    (int)($data['abortion'] ?? 0),
                    (int)($data['living'] ?? 0),
                    (int)($data['cs_count'] ?? 0),
                    (int)($data['normal_delivery_count'] ?? 0),
                    !empty($data['is_pregnant']) ? 1 : 0,
                    !empty($data['lmp']) ? $data['lmp'] : null,
                    !empty($data['edd']) ? $data['edd'] : null,
                    $data['notes'] ?? null,
                    $patientId
                ]);

                $updated = $db->query("SELECT * FROM patients WHERE id = {$patientId}")->fetch();
                $updated['is_pregnant'] = (bool)$updated['is_pregnant'];

                jsonResponse(['success' => true, 'data' => $updated]);
            }

            if ($method === 'DELETE') {
                $stmt = $db->prepare("DELETE FROM patients WHERE id = ?");
                $stmt->execute([$patientId]);
                jsonResponse(['success' => true, 'message' => 'تم حذف ملف المريضة وكافة سجلاتها']);
            }
        }
    }

    // =========================================================================
    // 4. APPOINTMENTS (/api/appointments)
    // =========================================================================
    if ($resource === 'appointments') {
        if (!$id) {
            if ($method === 'GET') {
                $filterDate = $_GET['date'] ?? date('Y-m-d');
                $search = trim($_GET['q'] ?? '');
                $status = trim($_GET['status'] ?? '');
                $isPaid = isset($_GET['is_paid']) && $_GET['is_paid'] !== '' ? ($_GET['is_paid'] === 'true' ? 1 : 0) : null;
                $type = trim($_GET['type'] ?? '');

                $where = [];
                $params = [];

                if ($filterDate !== 'all') {
                    $where[] = "a.appointment_date = ?";
                    $params[] = $filterDate;
                }

                if (!empty($search)) {
                    $where[] = "(p.full_name LIKE ? OR p.phone LIKE ? OR p.patient_code LIKE ? OR a.notes LIKE ?)";
                    $term = "%{$search}%";
                    $params[] = $term;
                    $params[] = $term;
                    $params[] = $term;
                    $params[] = $term;
                }

                if (!empty($status) && $status !== 'all') {
                    $where[] = "a.status = ?";
                    $params[] = $status;
                }

                if ($isPaid !== null) {
                    $where[] = "a.is_paid = ?";
                    $params[] = $isPaid;
                }

                if (!empty($type) && $type !== 'all') {
                    $where[] = "a.type = ?";
                    $params[] = $type;
                }

                $whereClause = count($where) > 0 ? "WHERE " . implode(' AND ', $where) : "";

                $sql = "
                    SELECT a.*, 
                           p.full_name as patient_name, 
                           p.phone as patient_phone, 
                           p.patient_code,
                           p.age as patient_age,
                           p.is_pregnant,
                           p.blood_group
                    FROM appointments a
                    JOIN patients p ON a.patient_id = p.id
                    {$whereClause}
                    ORDER BY a.appointment_date DESC, a.queue_number ASC, a.appointment_time ASC
                ";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $rows = $stmt->fetchAll();

                foreach ($rows as &$r) {
                    $r['is_paid'] = (bool)$r['is_paid'];
                    $r['is_pregnant'] = (bool)$r['is_pregnant'];
                }

                jsonResponse(['success' => true, 'date' => $filterDate, 'data' => $rows]);
            }

            if ($method === 'POST') {
                $data = getJsonInput();
                $date = $data['appointment_date'] ?? date('Y-m-d');

                // Compute next queue number for this day
                $stmt = $db->prepare("SELECT COALESCE(MAX(queue_number), 0) + 1 FROM appointments WHERE appointment_date = ?");
                $stmt->execute([$date]);
                $nextQueue = (int)$stmt->fetchColumn();

                $sql = "
                    INSERT INTO appointments 
                    (patient_id, appointment_date, appointment_time, queue_number, type, status, fee, is_paid, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ";
                $stmt = $db->prepare($sql);
                $stmt->execute([
                    (int)$data['patient_id'],
                    $date,
                    $data['appointment_time'] ?? '18:00:00',
                    $nextQueue,
                    $data['type'] ?? 'كشف جديد',
                    $data['status'] ?? 'محجوز',
                    (float)($data['fee'] ?? 300),
                    !empty($data['is_paid']) ? 1 : 0,
                    $data['notes'] ?? null
                ]);

                $newId = $db->lastInsertId();
                $saved = $db->query("SELECT * FROM appointments WHERE id = {$newId}")->fetch();
                $saved['is_paid'] = (bool)$saved['is_paid'];

                jsonResponse(['success' => true, 'data' => $saved], 201);
            }
        } else {
            // Subactions: /api/appointments/{id}/status and /payment
            $appId = (int)$id;

            if ($subAction === 'status') {
                $data = getJsonInput();
                $stmt = $db->prepare("UPDATE appointments SET status = ? WHERE id = ?");
                $stmt->execute([$data['status'] ?? 'محجوز', $appId]);
                jsonResponse(['success' => true, 'message' => 'تم تحديث حالة الموعد']);
            }

            if ($subAction === 'payment') {
                $data = getJsonInput();
                $stmt = $db->prepare("UPDATE appointments SET is_paid = ? WHERE id = ?");
                $stmt->execute([!empty($data['is_paid']) ? 1 : 0, $appId]);
                jsonResponse(['success' => true, 'message' => 'تم تحديث حالة السداد']);
            }

            if ($method === 'GET') {
                $stmt = $db->prepare("SELECT * FROM appointments WHERE id = ?");
                $stmt->execute([$appId]);
                $app = $stmt->fetch();
                if (!$app) jsonResponse(['success' => false, 'message' => 'الموعد غير موجود'], 404);
                $app['is_paid'] = (bool)$app['is_paid'];
                jsonResponse(['success' => true, 'data' => $app]);
            }

            if ($method === 'PUT') {
                $data = getJsonInput();
                $sql = "
                    UPDATE appointments SET
                    patient_id = ?, appointment_date = ?, appointment_time = ?, type = ?, fee = ?, notes = ?
                    WHERE id = ?
                ";
                $stmt = $db->prepare($sql);
                $stmt->execute([
                    (int)$data['patient_id'],
                    $data['appointment_date'] ?? date('Y-m-d'),
                    $data['appointment_time'] ?? '18:00:00',
                    $data['type'] ?? 'كشف جديد',
                    (float)($data['fee'] ?? 300),
                    $data['notes'] ?? null,
                    $appId
                ]);
                jsonResponse(['success' => true, 'message' => 'تم تحديث بيانات الموعد']);
            }

            if ($method === 'DELETE') {
                $stmt = $db->prepare("DELETE FROM appointments WHERE id = ?");
                $stmt->execute([$appId]);
                jsonResponse(['success' => true, 'message' => 'تم حذف الموعد بنجاح']);
            }
        }
    }

    // =========================================================================
    // 5. VISITS (/api/visits)
    // =========================================================================
    if ($resource === 'visits') {
        if (!$id) {
            if ($method === 'GET') {
                $date = $_GET['date'] ?? '';
                $search = trim($_GET['q'] ?? '');
                $type = trim($_GET['type'] ?? '');
                $hasRx = $_GET['has_rx'] ?? '';

                $where = [];
                $params = [];

                if (!empty($date)) {
                    $where[] = "v.visit_date = ?";
                    $params[] = $date;
                }

                if (!empty($search)) {
                    $where[] = "(p.full_name LIKE ? OR p.phone LIKE ? OR p.patient_code LIKE ? OR v.diagnosis LIKE ? OR v.chief_complaint LIKE ?)";
                    $term = "%{$search}%";
                    $params[] = $term; $params[] = $term; $params[] = $term; $params[] = $term; $params[] = $term;
                }

                if (!empty($type) && $type !== 'all') {
                    $where[] = "v.visit_type = ?";
                    $params[] = $type;
                }

                $whereClause = count($where) > 0 ? "WHERE " . implode(' AND ', $where) : "";

                $sql = "
                    SELECT v.*,
                           p.full_name as patient_name,
                           p.phone as patient_phone,
                           p.patient_code,
                           (SELECT COUNT(*) FROM prescriptions pr WHERE pr.visit_id = v.id) as prescriptions_count,
                           (SELECT COUNT(*) FROM visit_attachments va WHERE va.visit_id = v.id) as attachments_count
                    FROM visits v
                    JOIN patients p ON v.patient_id = p.id
                    {$whereClause}
                    ORDER BY v.visit_date DESC, v.visit_time DESC
                ";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $rows = $stmt->fetchAll();

                if ($hasRx === 'true') {
                    $rows = array_values(array_filter($rows, fn($r) => $r['prescriptions_count'] > 0));
                } elseif ($hasRx === 'false') {
                    $rows = array_values(array_filter($rows, fn($r) => $r['prescriptions_count'] == 0));
                }

                jsonResponse(['success' => true, 'data' => $rows]);
            }

            if ($method === 'POST') {
                $data = getJsonInput();
                $db->beginTransaction();

                $sql = "
                    INSERT INTO visits 
                    (patient_id, appointment_id, visit_date, visit_time, visit_type, chief_complaint, blood_pressure, weight_kg, temperature, gestational_age_weeks, gestational_age_days, fetal_heart_rate, ultrasound_findings, diagnosis, clinical_notes, next_visit_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ";
                $stmt = $db->prepare($sql);
                $stmt->execute([
                    (int)$data['patient_id'],
                    !empty($data['appointment_id']) ? (int)$data['appointment_id'] : null,
                    $data['visit_date'] ?? date('Y-m-d'),
                    $data['visit_time'] ?? date('H:i:s'),
                    $data['visit_type'] ?? 'كشف نساء وتوليد',
                    $data['chief_complaint'] ?? '',
                    $data['blood_pressure'] ?? null,
                    !empty($data['weight_kg']) ? (float)$data['weight_kg'] : null,
                    !empty($data['temperature']) ? (float)$data['temperature'] : null,
                    !empty($data['gestational_age_weeks']) ? (int)$data['gestational_age_weeks'] : null,
                    !empty($data['gestational_age_days']) ? (int)$data['gestational_age_days'] : null,
                    !empty($data['fetal_heart_rate']) ? (int)$data['fetal_heart_rate'] : null,
                    $data['ultrasound_findings'] ?? null,
                    $data['diagnosis'] ?? '',
                    $data['clinical_notes'] ?? null,
                    !empty($data['next_visit_date']) ? $data['next_visit_date'] : null
                ]);

                $visitId = $db->lastInsertId();

                // Insert attachments if present
                if (!empty($data['attachments']) && is_array($data['attachments'])) {
                    $attStmt = $db->prepare("INSERT INTO visit_attachments (visit_id, patient_id, attachment_type, title, file_data) VALUES (?, ?, ?, ?, ?)");
                    foreach ($data['attachments'] as $att) {
                        if (!empty($att['file_data'])) {
                            $attStmt->execute([
                                $visitId,
                                (int)$data['patient_id'],
                                $att['attachment_type'] ?? 'سونار',
                                $att['title'] ?? 'مرفق سونار',
                                $att['file_data']
                            ]);
                        }
                    }
                }

                // Update patient clinical/obstetric fields
                $stmtUpPt = $db->prepare("
                    UPDATE patients SET
                    allergies = COALESCE(?, allergies),
                    chronic_diseases = COALESCE(?, chronic_diseases),
                    gravida = COALESCE(?, gravida),
                    para = COALESCE(?, para),
                    abortion = COALESCE(?, abortion),
                    living = COALESCE(?, living),
                    cs_count = COALESCE(?, cs_count),
                    normal_delivery_count = COALESCE(?, normal_delivery_count),
                    is_pregnant = COALESCE(?, is_pregnant),
                    lmp = COALESCE(?, lmp),
                    edd = COALESCE(?, edd)
                    WHERE id = ?
                ");
                $stmtUpPt->execute([
                    $data['allergies'] ?? null,
                    $data['chronic_diseases'] ?? null,
                    isset($data['gravida']) ? (int)$data['gravida'] : null,
                    isset($data['para']) ? (int)$data['para'] : null,
                    isset($data['abortion']) ? (int)$data['abortion'] : null,
                    isset($data['living']) ? (int)$data['living'] : null,
                    isset($data['cs_count']) ? (int)$data['cs_count'] : null,
                    isset($data['normal_delivery_count']) ? (int)$data['normal_delivery_count'] : null,
                    isset($data['is_pregnant']) ? ($data['is_pregnant'] ? 1 : 0) : null,
                    !empty($data['lmp']) ? $data['lmp'] : null,
                    !empty($data['edd']) ? $data['edd'] : null,
                    (int)$data['patient_id']
                ]);

                // If appointment linked, set status to 'مكتمل'
                if (!empty($data['appointment_id'])) {
                    $db->prepare("UPDATE appointments SET status = 'مكتمل' WHERE id = ?")->execute([(int)$data['appointment_id']]);
                }

                $db->commit();
                $saved = $db->query("SELECT * FROM visits WHERE id = {$visitId}")->fetch();
                jsonResponse(['success' => true, 'data' => $saved], 201);
            }
        } else {
            // /api/visits/{id}
            $visitId = (int)$id;

            if ($method === 'GET') {
                $stmt = $db->prepare("SELECT * FROM visits WHERE id = ?");
                $stmt->execute([$visitId]);
                $visit = $stmt->fetch();
                if (!$visit) jsonResponse(['success' => false, 'message' => 'الكشف غير موجود'], 404);

                $stmtAtt = $db->prepare("SELECT * FROM visit_attachments WHERE visit_id = ? ORDER BY id ASC");
                $stmtAtt->execute([$visitId]);
                $visit['attachments'] = $stmtAtt->fetchAll();

                jsonResponse(['success' => true, 'data' => $visit]);
            }

            if ($method === 'PUT') {
                $data = getJsonInput();
                $db->beginTransaction();

                $sql = "
                    UPDATE visits SET
                    patient_id = ?, visit_date = ?, visit_time = ?, visit_type = ?, chief_complaint = ?,
                    blood_pressure = ?, weight_kg = ?, temperature = ?, gestational_age_weeks = ?, fetal_heart_rate = ?,
                    ultrasound_findings = ?, diagnosis = ?, clinical_notes = ?, next_visit_date = ?
                    WHERE id = ?
                ";
                $stmt = $db->prepare($sql);
                $stmt->execute([
                    (int)$data['patient_id'],
                    $data['visit_date'] ?? date('Y-m-d'),
                    $data['visit_time'] ?? date('H:i:s'),
                    $data['visit_type'] ?? 'كشف نساء وتوليد',
                    $data['chief_complaint'] ?? '',
                    $data['blood_pressure'] ?? null,
                    !empty($data['weight_kg']) ? (float)$data['weight_kg'] : null,
                    !empty($data['temperature']) ? (float)$data['temperature'] : null,
                    !empty($data['gestational_age_weeks']) ? (int)$data['gestational_age_weeks'] : null,
                    !empty($data['fetal_heart_rate']) ? (int)$data['fetal_heart_rate'] : null,
                    $data['ultrasound_findings'] ?? null,
                    $data['diagnosis'] ?? '',
                    $data['clinical_notes'] ?? null,
                    !empty($data['next_visit_date']) ? $data['next_visit_date'] : null,
                    $visitId
                ]);

                // Update attachments if sent
                if (isset($data['attachments']) && is_array($data['attachments'])) {
                    $db->prepare("DELETE FROM visit_attachments WHERE visit_id = ?")->execute([$visitId]);
                    $attStmt = $db->prepare("INSERT INTO visit_attachments (visit_id, patient_id, attachment_type, title, file_data) VALUES (?, ?, ?, ?, ?)");
                    foreach ($data['attachments'] as $att) {
                        if (!empty($att['file_data'])) {
                            $attStmt->execute([
                                $visitId,
                                (int)$data['patient_id'],
                                $att['attachment_type'] ?? 'سونار',
                                $att['title'] ?? 'مرفق سونار',
                                $att['file_data']
                            ]);
                        }
                    }
                }

                $db->commit();
                $updated = $db->query("SELECT * FROM visits WHERE id = {$visitId}")->fetch();
                jsonResponse(['success' => true, 'data' => $updated]);
            }

            if ($method === 'DELETE') {
                $stmt = $db->prepare("DELETE FROM visits WHERE id = ?");
                $stmt->execute([$visitId]);
                jsonResponse(['success' => true, 'message' => 'تم حذف الكشف']);
            }
        }
    }

    // =========================================================================
    // 6. PRESCRIPTIONS (/api/prescriptions)
    // =========================================================================
    if ($resource === 'prescriptions') {
        // Subroute: /api/prescriptions/catalog/drugs
        if ($id === 'catalog' && $subAction === 'drugs') {
            $drugs = $db->query("SELECT * FROM drugs_catalog ORDER BY category, name")->fetchAll();
            jsonResponse(['success' => true, 'data' => $drugs]);
        }

        if (!$id) {
            if ($method === 'GET') {
                $q = trim($_GET['q'] ?? '');
                $date = $_GET['date'] ?? '';

                $where = [];
                $params = [];

                if (!empty($date)) {
                    $where[] = "pr.issue_date = ?";
                    $params[] = $date;
                }

                if (!empty($q)) {
                    $where[] = "(pr.prescription_code LIKE ? OR p.full_name LIKE ? OR p.patient_code LIKE ? OR pr.diagnosis_summary LIKE ?)";
                    $term = "%{$q}%";
                    $params[] = $term; $params[] = $term; $params[] = $term; $params[] = $term;
                }

                $whereClause = count($where) > 0 ? "WHERE " . implode(' AND ', $where) : "";

                $sql = "
                    SELECT pr.*,
                           p.full_name as patient_name,
                           p.phone as patient_phone,
                           p.patient_code,
                           p.age as patient_age,
                           (SELECT COUNT(*) FROM prescription_items pi WHERE pi.prescription_id = pr.id) as items_count,
                           (SELECT GROUP_CONCAT(medication_name SEPARATOR ', ') FROM prescription_items pi WHERE pi.prescription_id = pr.id) as medications_summary
                    FROM prescriptions pr
                    JOIN patients p ON pr.patient_id = p.id
                    {$whereClause}
                    ORDER BY pr.issue_date DESC, pr.issue_time DESC
                ";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $rows = $stmt->fetchAll();

                jsonResponse(['success' => true, 'data' => $rows]);
            }

            if ($method === 'POST') {
                $data = getJsonInput();
                $db->beginTransaction();

                $year = date('Y');
                $maxNum = (int)$db->query("SELECT COALESCE(MAX(id), 0) + 1 FROM prescriptions")->fetchColumn();
                $rxCode = sprintf("RX-DHA-%s-%04d", $year, $maxNum);

                $sql = "
                    INSERT INTO prescriptions 
                    (visit_id, patient_id, prescription_code, issue_date, issue_time, diagnosis_summary, general_advice)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ";
                $stmt = $db->prepare($sql);
                $stmt->execute([
                    !empty($data['visit_id']) ? (int)$data['visit_id'] : null,
                    (int)$data['patient_id'],
                    $rxCode,
                    $data['issue_date'] ?? date('Y-m-d'),
                    $data['issue_time'] ?? date('H:i:s'),
                    $data['diagnosis_summary'] ?? '',
                    $data['general_advice'] ?? null
                ]);

                $rxId = $db->lastInsertId();

                if (!empty($data['items']) && is_array($data['items'])) {
                    $itemStmt = $db->prepare("
                        INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, instructions)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ");
                    foreach ($data['items'] as $item) {
                        $name = trim($item['medication_name'] ?? '');
                        if (!empty($name)) {
                            $itemStmt->execute([
                                $rxId,
                                $name,
                                $item['dosage'] ?? '',
                                $item['frequency'] ?? '',
                                $item['duration'] ?? '',
                                $item['instructions'] ?? ''
                            ]);
                        }
                    }
                }

                $db->commit();
                $saved = $db->query("SELECT * FROM prescriptions WHERE id = {$rxId}")->fetch();
                jsonResponse(['success' => true, 'data' => $saved], 201);
            }
        } else {
            // /api/prescriptions/{id}
            $rxId = (int)$id;

            if ($method === 'GET') {
                $sql = "
                    SELECT pr.*, 
                           p.full_name as patient_name, 
                           p.age as patient_age, 
                           p.blood_group,
                           v.gestational_age_weeks
                    FROM prescriptions pr
                    JOIN patients p ON pr.patient_id = p.id
                    LEFT JOIN visits v ON pr.visit_id = v.id
                    WHERE pr.id = ?
                ";
                $stmt = $db->prepare($sql);
                $stmt->execute([$rxId]);
                $rx = $stmt->fetch();

                if (!$rx) jsonResponse(['success' => false, 'message' => 'الروشتة غير موجودة'], 404);

                $stmtItems = $db->prepare("SELECT * FROM prescription_items WHERE prescription_id = ? ORDER BY id ASC");
                $stmtItems->execute([$rxId]);
                $rx['items'] = $stmtItems->fetchAll();

                jsonResponse(['success' => true, 'data' => $rx]);
            }

            if ($method === 'PUT') {
                $data = getJsonInput();
                $db->beginTransaction();

                $sql = "
                    UPDATE prescriptions SET
                    patient_id = ?, visit_id = ?, diagnosis_summary = ?, general_advice = ?
                    WHERE id = ?
                ";
                $stmt = $db->prepare($sql);
                $stmt->execute([
                    (int)$data['patient_id'],
                    !empty($data['visit_id']) ? (int)$data['visit_id'] : null,
                    $data['diagnosis_summary'] ?? '',
                    $data['general_advice'] ?? null,
                    $rxId
                ]);

                if (isset($data['items']) && is_array($data['items'])) {
                    $db->prepare("DELETE FROM prescription_items WHERE prescription_id = ?")->execute([$rxId]);
                    $itemStmt = $db->prepare("
                        INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, instructions)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ");
                    foreach ($data['items'] as $item) {
                        $name = trim($item['medication_name'] ?? '');
                        if (!empty($name)) {
                            $itemStmt->execute([
                                $rxId,
                                $name,
                                $item['dosage'] ?? '',
                                $item['frequency'] ?? '',
                                $item['duration'] ?? '',
                                $item['instructions'] ?? ''
                            ]);
                        }
                    }
                }

                $db->commit();
                jsonResponse(['success' => true, 'message' => 'تم تحديث الروشتة بنجاح']);
            }

            if ($method === 'DELETE') {
                $stmt = $db->prepare("DELETE FROM prescriptions WHERE id = ?");
                $stmt->execute([$rxId]);
                jsonResponse(['success' => true, 'message' => 'تم حذف الروشتة بنجاح']);
            }
        }
    }

    // =========================================================================
    // 7. BACKUPS (/api/backups)
    // =========================================================================
    if ($resource === 'backups') {
        $backupDir = __DIR__ . '/backups';
        if (!is_dir($backupDir)) {
            @mkdir($backupDir, 0755, true);
        }

        // Subaction: /api/backups/restore
        if ($id === 'restore' && $method === 'POST') {
            $data = getJsonInput();
            $backupContent = null;

            if (!empty($data['filename'])) {
                $filePath = $backupDir . '/' . basename($data['filename']);
                if (file_exists($filePath)) {
                    $backupContent = json_decode(file_get_contents($filePath), true);
                }
            } elseif (!empty($data['payload']) && is_array($data['payload'])) {
                $backupContent = $data['payload'];
            }

            if (!$backupContent || !isset($backupContent['tables'])) {
                jsonResponse(['success' => false, 'error' => 'ملف النسخة الاحتياطية غير صالح'], 400);
            }

            $tables = $backupContent['tables'];
            $db->beginTransaction();
            $db->exec("SET FOREIGN_KEY_CHECKS = 0;");

            // Clear tables
            $clearOrder = ['prescription_items', 'prescriptions', 'visit_attachments', 'visits', 'appointments', 'patients', 'drugs_catalog'];
            foreach ($clearOrder as $t) {
                $db->exec("TRUNCATE TABLE `{$t}`;");
            }

            // Restore in dependency order
            $restoreOrder = ['patients', 'drugs_catalog', 'appointments', 'visits', 'visit_attachments', 'prescriptions', 'prescription_items'];
            foreach ($restoreOrder as $tbl) {
                if (!empty($tables[$tbl]) && is_array($tables[$tbl])) {
                    foreach ($tables[$tbl] as $row) {
                        $cols = array_keys($row);
                        $colList = implode('`, `', $cols);
                        $placeholders = implode(', ', array_fill(0, count($cols), '?'));
                        $sql = "INSERT INTO `{$tbl}` (`{$colList}`) VALUES ({$placeholders})";
                        $stmt = $db->prepare($sql);
                        $stmt->execute(array_values($row));
                    }
                }
            }

            $db->exec("SET FOREIGN_KEY_CHECKS = 1;");
            $db->commit();

            jsonResponse(['success' => true, 'message' => 'تمت استعادة النسخة الاحتياطية بنجاح']);
        }

        // Subaction: /api/backups/download/{filename}
        if ($id === 'download' && !empty($subAction)) {
            $filePath = $backupDir . '/' . basename($subAction);
            if (!file_exists($filePath)) {
                jsonResponse(['success' => false, 'error' => 'الملف غير موجود'], 404);
            }
            header('Content-Type: application/json');
            header('Content-Disposition: attachment; filename="' . basename($subAction) . '"');
            readfile($filePath);
            exit;
        }

        if (!$id) {
            // GET /api/backups (list)
            if ($method === 'GET') {
                $files = glob($backupDir . '/*.json');
                $list = [];
                foreach ($files as $f) {
                    $list[] = [
                        'filename' => basename($f),
                        'size' => filesize($f),
                        'created_at' => date('Y-m-d H:i:s', filemtime($f))
                    ];
                }
                usort($list, fn($a, $b) => strcmp($b['created_at'], $a['created_at']));
                jsonResponse(['success' => true, 'data' => $list]);
            }

            // POST /api/backups (create new backup)
            if ($method === 'POST') {
                $backupData = [
                    'version' => '1.0-mysql',
                    'clinic' => $config['clinic_name'],
                    'timestamp' => date('Y-m-d H:i:s'),
                    'tables' => [
                        'patients' => $db->query("SELECT * FROM patients")->fetchAll(),
                        'appointments' => $db->query("SELECT * FROM appointments")->fetchAll(),
                        'visits' => $db->query("SELECT * FROM visits")->fetchAll(),
                        'visit_attachments' => $db->query("SELECT * FROM visit_attachments")->fetchAll(),
                        'prescriptions' => $db->query("SELECT * FROM prescriptions")->fetchAll(),
                        'prescription_items' => $db->query("SELECT * FROM prescription_items")->fetchAll(),
                        'drugs_catalog' => $db->query("SELECT * FROM drugs_catalog")->fetchAll()
                    ]
                ];

                $filename = 'dha_clinic_backup_' . date('Y-m-d_H-i-s') . '.json';
                file_put_contents($backupDir . '/' . $filename, json_encode($backupData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

                jsonResponse([
                    'success' => true,
                    'message' => 'تم إنشاء النسخة الاحتياطية بنجاح',
                    'filename' => $filename
                ], 201);
            }
        } else {
            // DELETE /api/backups/{filename}
            if ($method === 'DELETE') {
                $filePath = $backupDir . '/' . basename($id);
                if (file_exists($filePath)) {
                    @unlink($filePath);
                    jsonResponse(['success' => true, 'message' => 'تم حذف النسخة الاحتياطية']);
                } else {
                    jsonResponse(['success' => false, 'error' => 'الملف غير موجود'], 404);
                }
            }
        }
    }

    // Default 404 for unknown endpoints
    jsonResponse(['success' => false, 'error' => 'المسار غير معروف (Route not found): ' . $endpoint], 404);

} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    jsonResponse([
        'success' => false,
        'error' => 'حدث خطأ في معالجة الطلب',
        'details' => $e->getMessage()
    ], 500);
}
