<?php
/**
 * إعدادات الاتصال بقاعدة بيانات MySQL - موقع InfinityFree
 * ضع هنا بيانات قاعدة البيانات الخاصة بك من لوحة تحكم حسابك على InfinityFree (vPanel)
 */

return [
    // اسم السيرفر (تأكد من نسخه من InfinityFree، عادة يكون مثل sql123.infinityfree.com وليس localhost)
    'db_host' => 'sqlXXX.infinityfree.com', 

    // اسم قاعدة البيانات (مثال: if0_12345678_dha_clinic)
    'db_name' => 'if0_XXXXXXXX_dha_clinic',

    // اسم مستخدم قاعدة البيانات (غالباً يبدأ بـ if0_XXXXXXXX)
    'db_user' => 'if0_XXXXXXXX',

    // كلمة مرور حساب الاستضافة vPanel
    'db_pass' => 'YOUR_INFINITYFREE_PASSWORD',

    // الترميز
    'db_charset' => 'utf8mb4',

    // معلومات العيادة
    'clinic_name' => 'عيادة الدكتور حاتم عواجة',
    'clinic_specialty' => 'استشاري أمراض النساء والتوليد وجراحة المناظير وعلاج العقم'
];
