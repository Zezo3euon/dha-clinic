<?php
/**
 * أداة فك الضغط والتثبيت السريع لنظام عيادة د. حاتم عواجة
 * Quick Unzip & Auto-Installer for InfinityFree / Shared Hosting
 */

header('Content-Type: text/html; charset=utf-8');

$zipFile = 'infinityfree_htdocs.zip';
// If default not found, search for any .zip in current directory
if (!file_exists($zipFile)) {
    $foundZips = glob('*.zip');
    if (!empty($foundZips)) {
        $zipFile = $foundZips[0];
    }
}

$action = $_GET['action'] ?? '';
$message = '';
$status = '';
$extractedFiles = [];

// Handle Self-Deletion for Security
if ($action === 'cleanup') {
    $deletedFiles = [];
    if (file_exists($zipFile)) {
        @unlink($zipFile);
        $deletedFiles[] = $zipFile;
    }
    @unlink(__FILE__);
    $deletedFiles[] = basename(__FILE__);
    
    echo '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تم التنظيف</title>';
    echo '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap">';
    echo '<style>body{font-family:"Cairo",sans-serif;background:#f0f4f8;padding:40px;text-align:center;color:#0f172a;}' .
         '.card{max-width:500px;margin:0 auto;background:#fff;padding:30px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.05);}' .
         '.btn{display:inline-block;padding:10px 24px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;margin-top:20px;}' .
         '</style></head><body><div class="card">';
    echo '<h2 style="color:#059669;">🛡️ تم تنظيف الملفات بنجاح!</h2>';
    echo '<p>تم حذف ملف فك الضغط وملف الـ ZIP لحماية موقعك.</p>';
    echo '<a href="index.html" class="btn">🚀 الانتقال لنظام العيادة الآن</a>';
    echo '</div></body></html>';
    exit;
}

// Handle Database Config Update
if ($action === 'save_config' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $dbHost = trim($_POST['db_host'] ?? '');
    $dbName = trim($_POST['db_name'] ?? '');
    $dbUser = trim($_POST['db_user'] ?? '');
    $dbPass = trim($_POST['db_pass'] ?? '');

    $configFile = __DIR__ . '/api/config.php';
    if (file_exists($configFile)) {
        $configContent = "<?php\n" .
            "/**\n * إعدادات الاتصال بقاعدة بيانات MySQL - تم الحفظ تلقائياً عبر مثبت العيادة\n */\n" .
            "return [\n" .
            "    'db_host' => " . var_export($dbHost, true) . ",\n" .
            "    'db_name' => " . var_export($dbName, true) . ",\n" .
            "    'db_user' => " . var_export($dbUser, true) . ",\n" .
            "    'db_pass' => " . var_export($dbPass, true) . ",\n" .
            "    'db_charset' => 'utf8mb4',\n" .
            "    'clinic_name' => 'عيادة الدكتور حاتم عواجة',\n" .
            "    'clinic_specialty' => 'استشاري أمراض النساء والتوليد وجراحة المناظير وعلاج العقم'\n" .
            "];\n";
        file_put_contents($configFile, $configContent);
        $message = 'تم حفظ إعدادات قاعدة البيانات بنجاح في ملف api/config.php!';
        $status = 'success';
    } else {
        $message = 'يرجى فك الضغط أولاً قبل حفظ بيانات الاتصال.';
        $status = 'error';
    }
}

// Handle Extraction
if ($action === 'extract') {
    if (!class_exists('ZipArchive')) {
        $message = 'خطأ: مكتبة ZipArchive غير مفعلة في سيرفر PHP هذا.';
        $status = 'error';
    } elseif (!file_exists($zipFile)) {
        $message = 'خطأ: لم يتم العثور على ملف الـ ZIP (' . htmlspecialchars($zipFile) . ') في هذا المجلد.';
        $status = 'error';
    } else {
        $zip = new ZipArchive();
        $res = $zip->open($zipFile);
        if ($res === TRUE) {
            $count = $zip->numFiles;
            for ($i = 0; $i < $count; $i++) {
                $extractedFiles[] = $zip->getNameIndex($i);
            }
            $zip->extractTo(__DIR__);
            $zip->close();
            $message = "تم فك ضغط جميع ملفات النظام بنجاح! (إجمالي الملفات المستخرجة: {$count} ملف)";
            $status = 'success';
        } else {
            $message = 'تعذر فتح ملف الـ ZIP. كود الخطأ: ' . $res;
            $status = 'error';
        }
    }
}

$alreadyExtracted = file_exists(__DIR__ . '/index.html') && file_exists(__DIR__ . '/api/config.php');
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فك ضغط ملفات نظام عيادة د. حاتم عواجة</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    :root {
      --primary: #0d9488;
      --primary-hover: #0f766e;
      --dark: #0f172a;
      --slate-700: #334155;
      --slate-500: #64748b;
      --slate-200: #e2e8f0;
      --slate-100: #f1f5f9;
      --emerald: #059669;
      --rose: #e11d48;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo', system-ui, sans-serif;
      background: #f0f4f8;
      background-image: 
        radial-gradient(at 0% 0%, rgba(13, 148, 136, 0.08) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(225, 29, 72, 0.06) 0px, transparent 50%);
      color: var(--dark);
      padding: 30px 16px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .installer-box {
      width: 100%;
      max-width: 680px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      box-shadow: 0 20px 35px -5px rgba(15, 23, 42, 0.1);
      border: 1px solid var(--slate-200);
      overflow: hidden;
    }
    .installer-header {
      background: linear-gradient(135deg, #0d9488, #115e59);
      color: white;
      padding: 24px;
      text-align: center;
    }
    .installer-header h1 {
      font-size: 1.35rem;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .installer-header p {
      font-size: 0.88rem;
      opacity: 0.9;
    }
    .installer-body {
      padding: 24px;
    }
    .alert-banner {
      padding: 14px 18px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.95rem;
      font-weight: 600;
      line-height: 1.5;
    }
    .alert-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .alert-error { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
    
    .file-detect-strip {
      background: var(--slate-100);
      border: 1px solid var(--slate-200);
      padding: 14px 18px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .file-detect-strip strong { color: var(--primary); direction: ltr; font-family: monospace; font-size: 0.95rem; }
    
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 22px;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 700;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .btn-primary { background: var(--primary); color: white; }
    .btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); }
    .btn-emerald { background: var(--emerald); color: white; }
    .btn-emerald:hover { background: #047857; }
    .btn-rose { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .btn-rose:hover { background: #fecaca; }
    .btn-outline { background: white; border: 1px solid var(--slate-200); color: var(--slate-700); }
    .btn-outline:hover { background: var(--slate-100); }
    .btn-lg { width: 100%; padding: 14px 24px; font-size: 1.05rem; }

    .step-card {
      background: white;
      border: 1px solid var(--slate-200);
      border-radius: 14px;
      padding: 18px;
      margin-bottom: 18px;
    }
    .step-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-group {
      margin-bottom: 12px;
    }
    .form-group label {
      display: block;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--slate-700);
      margin-bottom: 4px;
    }
    .form-control {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--slate-200);
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.9rem;
      direction: ltr;
      text-align: right;
    }
    .form-control:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
    }
    .form-control::placeholder {
      direction: rtl;
      color: #94a3b8;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    @media (max-width: 600px) {
      .form-row { grid-template-columns: 1fr; }
    }

    .extracted-list {
      max-height: 140px;
      overflow-y: auto;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      font-family: monospace;
      font-size: 0.78rem;
      direction: ltr;
      text-align: left;
      margin-top: 10px;
    }
    .extracted-list li { margin-left: 20px; color: #475569; }

    .installer-footer {
      padding: 18px 24px;
      background: var(--slate-100);
      border-top: 1px solid var(--slate-200);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }
  </style>
</head>
<body>

<div class="installer-box">
  <div class="installer-header">
    <h1><i class="fa-solid fa-stethoscope"></i> عيادة د. حاتم عواجة (نساء وتوليد)</h1>
    <p>أداة فك الضغط والإعداد السريع على استضافة InfinityFree</p>
  </div>

  <div class="installer-body">

    <?php if (!empty($message)): ?>
      <div class="alert-banner alert-<?= $status ?>">
        <i class="fa-solid <?= $status === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation' ?>"></i>
        <span><?= htmlspecialchars($message) ?></span>
      </div>
    <?php endif; ?>

    <!-- STEP 1: Unzip Files -->
    <div class="step-card">
      <div class="step-title">
        <i class="fa-solid fa-file-zipper"></i>
        <span>الخطوة 1: فك ضغط ملفات النظام</span>
      </div>

      <div class="file-detect-strip">
        <div>
          <span style="font-size: 0.88rem; color: #64748b; display: block;">الملف المضغوط المكتشف:</span>
          <strong><?= htmlspecialchars($zipFile) ?></strong>
        </div>
        <span style="font-size: 0.85rem; color: <?= file_exists($zipFile) ? '#059669' : '#e11d48' ?>; font-weight: 700;">
          <i class="fa-solid <?= file_exists($zipFile) ? 'fa-check-circle' : 'fa-times-circle' ?>"></i>
          <?= file_exists($zipFile) ? 'جاهز للفك (' . round(filesize($zipFile)/1024, 1) . ' KB)' : 'الملف غير موجود' ?>
        </span>
      </div>

      <?php if (!$alreadyExtracted || $action === 'extract'): ?>
        <a href="?action=extract" class="btn btn-primary btn-lg">
          <i class="fa-solid fa-box-open"></i>
          <span>اضغط هنا لفك ضغط جميع الملفات الآن (Extract All)</span>
        </a>
      <?php else: ?>
        <div style="display: flex; gap: 10px; align-items: center; justify-content: space-between;">
          <span style="color: #059669; font-weight: 700;">
            <i class="fa-solid fa-circle-check"></i> تم فك ضغط ملفات النظام بنجاح ومتاحة في مجلد الموقع!
          </span>
          <a href="?action=extract" class="btn btn-outline" style="padding: 6px 14px; font-size: 0.85rem;">
            <i class="fa-solid fa-rotate-right"></i> إعادة الفك
          </a>
        </div>
      <?php endif; ?>

      <?php if (!empty($extractedFiles)): ?>
        <div class="extracted-list">
          <ol>
            <?php foreach ($extractedFiles as $f): ?>
              <li><?= htmlspecialchars($f) ?></li>
            <?php endforeach; ?>
          </ol>
        </div>
      <?php endif; ?>
    </div>

    <!-- STEP 2: Database Credentials (Only if extracted) -->
    <?php if ($alreadyExtracted): ?>
      <?php
        $currConfig = file_exists(__DIR__ . '/api/config.php') ? include(__DIR__ . '/api/config.php') : [];
      ?>
      <div class="step-card">
        <div class="step-title">
          <i class="fa-solid fa-database"></i>
          <span>الخطوة 2: ضبط بيانات قاعدة بيانات MySQL</span>
        </div>
        <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 12px;">
          اكتب هنا بيانات MySQL التي ظهرت لك في حسابك على InfinityFree (قسم MySQL Databases)، ثم اضغط حفظ:
        </p>

        <form method="POST" action="?action=save_config">
          <div class="form-row">
            <div class="form-group">
              <label for="db_host">MySQL Host Name (السيرفر):</label>
              <input type="text" id="db_host" name="db_host" class="form-control" required 
                     value="<?= htmlspecialchars($currConfig['db_host'] ?? '') ?>" 
                     placeholder="مثال: sql123.infinityfree.com">
            </div>
            <div class="form-group">
              <label for="db_name">Database Name (اسم القاعدة):</label>
              <input type="text" id="db_name" name="db_name" class="form-control" required 
                     value="<?= htmlspecialchars($currConfig['db_name'] ?? '') ?>" 
                     placeholder="مثال: if0_12345678_dha_clinic">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="db_user">User Name (اسم المستخدم):</label>
              <input type="text" id="db_user" name="db_user" class="form-control" required 
                     value="<?= htmlspecialchars($currConfig['db_user'] ?? '') ?>" 
                     placeholder="مثال: if0_12345678">
            </div>
            <div class="form-group">
              <label for="db_pass">Password (كلمة المرور للـ vPanel):</label>
              <input type="password" id="db_pass" name="db_pass" class="form-control" required 
                     value="<?= htmlspecialchars($currConfig['db_pass'] ?? '') ?>" 
                     placeholder="كلمة مرور حساب الاستضافة">
            </div>
          </div>

          <button type="submit" class="btn btn-emerald" style="width: 100%; margin-top: 6px;">
            <i class="fa-solid fa-floppy-disk"></i>
            <span>حفظ بيانات الاتصال في api/config.php</span>
          </button>
        </form>
      </div>
    <?php endif; ?>

  </div>

  <div class="installer-footer">
    <?php if ($alreadyExtracted): ?>
      <a href="index.html" class="btn btn-emerald" target="_blank">
        <i class="fa-solid fa-arrow-up-right-from-square"></i>
        <span>فتح موقع العيادة (Live App)</span>
      </a>
      <a href="?action=cleanup" class="btn btn-rose" onclick="return confirm('هل أنت متأكد من حذف ملف فك الضغط (unzip.php) وملف الـ ZIP لحماية الموقع؟');">
        <i class="fa-solid fa-trash-can"></i>
        <span>حذف ملفات التثبيت للأمان (Clean Up)</span>
      </a>
    <?php else: ?>
      <span style="font-size: 0.85rem; color: #64748b;">
        <i class="fa-solid fa-circle-info"></i> قم بفك الضغط أولاً لعرض خيارات التشغيل والحفظ.
      </span>
    <?php endif; ?>
  </div>
</div>

</body>
</html>
