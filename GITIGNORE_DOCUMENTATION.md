# ملف .gitignore - توثيق شامل

## نظرة عامة
تم إنشاء ملف `.gitignore` شامل لمشروع Stockly لإدارة الملفات التي يجب تجاهلها في Git.

## الأقسام الرئيسية

### 1. ملفات Python & Django
- `__pycache__/` - ملفات Python المترجمة
- `*.py[cod]` - ملفات Python المترجمة
- `*.log` - ملفات السجلات
- `db.sqlite3` - قاعدة البيانات المحلية
- `local_settings.py` - إعدادات محلية

### 2. الملفات الحساسة والأمان
```gitignore
# Secret key and sensitive files
secret_key.txt
.env
.env.local
.env.production
.env.staging
secrets.json
api_keys.json
credentials.json
config.json
settings_local.py
```

### 3. ملفات PDF (مهم جداً!)
```gitignore
# PDF files (generated invoices and reports)
*.pdf
test_*.pdf
invoice_*.pdf
reports/
pdf_output/
generated_pdfs/
```

### 4. ملفات قاعدة البيانات
```gitignore
*.db
*.sqlite
*.sqlite3
```

### 5. ملفات IDE والمحررات
```gitignore
.vscode/
.idea/
*.swp
*.swo
*~
```

### 6. ملفات النظام
```gitignore
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
```

### 7. ملفات مؤقتة
```gitignore
tmp/
temp/
*.tmp
*.temp
*.bak
*.backup
*.old
```

### 8. ملفات الاختبار
```gitignore
test_*.py
*_test.py
tests/
htmlcov/
.coverage
coverage.xml
.pytest_cache/
```

### 9. ملفات البيئة الافتراضية
```gitignore
venv/
.venv/
env/
.env/
ENV/
env.bak/
venv.bak/
```

## الملفات المهمة التي تم تجاهلها

### ملفات PDF
- **جميع ملفات PDF** (`*.pdf`)
- **ملفات PDF التجريبية** (`test_*.pdf`)
- **ملفات الفواتير** (`invoice_*.pdf`)
- **مجلدات التقارير** (`reports/`, `pdf_output/`)

### الملفات الحساسة
- **مفاتيح API** (`api_keys.json`)
- **كلمات المرور** (`credentials.json`)
- **ملفات البيئة** (`.env*`)
- **مفاتيح Django** (`secret_key.txt`)

### ملفات قاعدة البيانات
- **قواعد البيانات المحلية** (`*.sqlite3`)
- **ملفات قاعدة البيانات** (`*.db`)

## كيفية الاستخدام

### 1. إضافة ملفات جديدة للتجاهل
```bash
# إضافة ملف محدد
echo "filename.txt" >> .gitignore

# إضافة نمط معين
echo "*.extension" >> .gitignore
```

### 2. التحقق من الملفات المتجاهلة
```bash
# عرض الملفات المتجاهلة
git status --ignored

# التحقق من ملف محدد
git check-ignore filename.pdf
```

### 3. إزالة ملف من التتبع
```bash
# إزالة ملف من Git مع الاحتفاظ به محلياً
git rm --cached filename.pdf
```

## نصائح مهمة

### 1. ملفات PDF
- **لا ترفع ملفات PDF** إلى Git
- **احتفظ بملفات PDF محلياً** فقط
- **استخدم نظام تخزين منفصل** للفواتير

### 2. الملفات الحساسة
- **لا ترفع ملفات البيئة** (`.env`)
- **احتفظ بالمفاتيح محلياً** فقط
- **استخدم متغيرات البيئة** في الإنتاج

### 3. قاعدة البيانات
- **لا ترفع قاعدة البيانات** إلى Git
- **استخدم migrations** لإدارة التغييرات
- **احتفظ بنسخ احتياطية منفصلة**

## التحقق من صحة الملف

```bash
# التحقق من صحة ملف .gitignore
git check-ignore -v filename.pdf

# عرض جميع الملفات المتجاهلة
git ls-files --ignored --exclude-standard
```

## ملاحظات إضافية

- **ملف .gitignore يعمل على مستوى المشروع**
- **يمكن إضافة ملفات .gitignore فرعية** في المجلدات
- **القواعد الأكثر تحديداً تتفوق على العامة**
- **استخدم `/` في بداية المسار للمجلد الجذر**
