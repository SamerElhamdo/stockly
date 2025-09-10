# Django API + Dashboard (Tailwind)

نظام إدارة مخزون وفواتير بسيط باستخدام Django + DRF + TailwindCSS

## المتطلبات

- Python 3.8+
- Django 5.0.7
- Django REST Framework 3.15.2

## التثبيت والتشغيل

1. تفعيل البيئة الافتراضية:
```bash
source .venv/bin/activate
```

2. تثبيت المتطلبات:
```bash
pip install -r requirements.txt
```

3. تشغيل المايجريشن:
```bash
python manage.py makemigrations
python manage.py migrate
```

4. إنشاء مستخدم إداري:
```bash
python manage.py createsuperuser
```

5. تشغيل الخادم:
```bash
python manage.py runserver
```

6. زيارة الموقع:
- لوحة التحكم: http://127.0.0.1:8000/
- لوحة الإدارة: http://127.0.0.1:8000/admin/

## الميزات

- إدارة العملاء والمنتجات والفواتير
- API endpoints للتفاعل مع البيانات
- واجهة مستخدم عصرية باستخدام TailwindCSS
- إدارة المخزون التلقائية عند تأكيد الفواتير

## API Endpoints

- `GET /api/products/` - قائمة المنتجات
- `POST /api/invoices/session` - إنشاء فاتورة جديدة
- `GET /api/invoices/<id>` - عرض تفاصيل الفاتورة
- `POST /api/invoices/<id>/items` - إضافة منتج للفاتورة
- `POST /api/invoices/<id>/confirm` - تأكيد الفاتورة
