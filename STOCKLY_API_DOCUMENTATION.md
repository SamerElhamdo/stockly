# Stockly API Documentation
## وثائق API لنظام Stockly

### نظرة عامة
نظام Stockly هو نظام إدارة مخزون وفواتير متقدم مكتوب بـ Django REST Framework. يوفر API شامل لإدارة الشركات، العملاء، المنتجات، الفواتير، المدفوعات، والمرتجعات.

### معلومات أساسية
- **Base URL**: `https://stockly.encryptosystem.com`
- **API Version**: v1
- **Authentication**: Token Authentication
- **Content Type**: `application/json`
- **Language Support**: Arabic & English

---

## 🔐 المصادقة (Authentication)

### الحصول على API Token
```http
POST /api/get-token/
Content-Type: application/json

{
    "username": "your_username",
    "password": "your_password"
}
```

**Response:**
```json
{
    "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
    "user": {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "account_type": "company_owner"
    }
}
```

### استخدام API Token
```http
Authorization: Token your_token_here
```

---

## 🏢 إدارة الشركات (Company Management)

### تسجيل شركة جديدة
```http
POST /api/register-company/
Content-Type: application/json

{
    "company_name": "اسم الشركة",
    "company_code": "COMP001",
    "phone": "+966501234567",
    "email": "company@example.com",
    "address": "العنوان",
    "owner_name": "اسم المالك",
    "owner_username": "owner_username",
    "owner_password": "password123"
}
```

### تسجيل موظف جديد
```http
POST /api/register-staff/
Content-Type: application/json

{
    "company_code": "COMP001",
    "username": "staff_username",
    "password": "password123",
    "email": "staff@example.com",
    "phone": "+966501234567"
}
```

### إرسال OTP
```http
POST /api/send-otp/
Content-Type: application/json

{
    "phone": "+966501234567",
    "verification_type": "company_registration"
}
```

### التحقق من OTP
```http
POST /api/verify-otp/
Content-Type: application/json

{
    "phone": "+966501234567",
    "otp_code": "123456"
}
```

---

## 👥 إدارة العملاء (Customer Management)

### الحصول على قائمة العملاء
```http
GET /api/customers/
Authorization: Token your_token_here
```

**Query Parameters:**
- `search` (optional): نص البحث في اسم العميل

**Response:**
```json
[
    {
        "id": 1,
        "name": "اسم العميل",
        "phone": "+966501234567",
        "email": "customer@example.com",
        "address": "العنوان",
        "created_at": "2024-12-19T10:00:00Z"
    }
]
```

### إضافة عميل جديد
```http
POST /api/customers/add/
Authorization: Token your_token_here
Content-Type: application/json

{
    "name": "اسم العميل",
    "phone": "+966501234567",
    "email": "customer@example.com",
    "address": "العنوان"
}
```

### تحديث بيانات العميل
```http
PUT /api/customers/{customer_id}/update/
Authorization: Token your_token_here
Content-Type: application/json

{
    "name": "الاسم الجديد",
    "phone": "+966501234567",
    "email": "new_email@example.com",
    "address": "العنوان الجديد"
}
```

### حذف العميل
```http
DELETE /api/customers/{customer_id}/
Authorization: Token your_token_here
```

### الحصول على مدفوعات العميل
```http
GET /api/customers/{customer_id}/payments/
Authorization: Token your_token_here
```

### الحصول على فواتير العميل
```http
GET /api/customers/{customer_id}/invoices/
Authorization: Token your_token_here
```

---

## 📦 إدارة المنتجات (Product Management)

### الحصول على قائمة المنتجات
```http
GET /api/products/
Authorization: Token your_token_here
```

**Query Parameters:**
- `query` (optional): نص البحث في اسم المنتج أو SKU

**Response:**
```json
[
    {
        "id": 1,
        "sku": "COMP-PRD-001",
        "name": "اسم المنتج",
        "price": 100.00,
        "stock_qty": 50,
        "category_id": 1,
        "category_name": "فئة المنتج",
        "unit": "piece",
        "unit_display": "عدد",
        "measurement": "1x1x1",
        "description": "وصف المنتج",
        "cost_price": 80.00,
        "wholesale_price": 90.00,
        "retail_price": 100.00
    }
]
```

### إضافة منتج جديد
```http
POST /api/products/add/
Authorization: Token your_token_here
Content-Type: application/json

{
    "name": "اسم المنتج",
    "category_id": 1,
    "price": 100.00,
    "stock_qty": 50,
    "unit": "piece",
    "measurement": "1x1x1",
    "description": "وصف المنتج",
    "cost_price": 80.00,
    "wholesale_price": 90.00,
    "retail_price": 100.00
}
```

### تحديث المنتج
```http
PUT /api/products/{product_id}/update/
Authorization: Token your_token_here
Content-Type: application/json

{
    "name": "الاسم الجديد",
    "price": 120.00,
    "stock_qty": 60,
    "description": "الوصف الجديد"
}
```

### حذف المنتج
```http
DELETE /api/products/{product_id}/
Authorization: Token your_token_here
```

---

## 📂 إدارة الفئات (Category Management)

### الحصول على قائمة الفئات
```http
GET /api/categories/
Authorization: Token your_token_here
```

**Response:**
```json
[
    {
        "id": 1,
        "name": "اسم الفئة",
        "parent_id": null,
        "created_at": "2024-12-19T10:00:00Z"
    }
]
```

### إضافة فئة جديدة
```http
POST /api/categories/add/
Authorization: Token your_token_here
Content-Type: application/json

{
    "name": "اسم الفئة",
    "parent_id": null
}
```

### تحديث الفئة
```http
PUT /api/categories/{category_id}/update/
Authorization: Token your_token_here
Content-Type: application/json

{
    "name": "الاسم الجديد",
    "parent_id": 1
}
```

### حذف الفئة
```http
DELETE /api/categories/{category_id}/
Authorization: Token your_token_here
```

---

## 🧾 إدارة الفواتير (Invoice Management)

### إنشاء فاتورة جديدة
```http
POST /api/invoices/session
Authorization: Token your_token_here
Content-Type: application/json

{
    "customer_name": "عميل نقدي"
}
```

**Response:**
```json
{
    "session_id": 123,
    "customer_id": 456
}
```

### الحصول على تفاصيل الفاتورة
```http
GET /api/invoices/{session_id}
Authorization: Token your_token_here
```

**Response:**
```json
{
    "id": 123,
    "customer": {
        "id": 456,
        "name": "اسم العميل",
        "phone": "+966501234567"
    },
    "status": "draft",
    "created_at": "2024-12-19T10:00:00Z",
    "items": [
        {
            "id": 789,
            "name": "اسم المنتج",
            "sku": "COMP-PRD-001",
            "qty": 2.0,
            "price": 100.00,
            "line_total": 200.00,
            "unit": "piece",
            "unit_display": "عدد",
            "measurement": "1x1x1",
            "description": "وصف المنتج"
        }
    ],
    "total_amount": 200.00
}
```

### إضافة منتج للفاتورة
```http
POST /api/invoices/{session_id}/items
Authorization: Token your_token_here
Content-Type: application/json

{
    "product_id": 1,
    "qty": 2
}
```

### تأكيد الفاتورة
```http
POST /api/invoices/{session_id}/confirm
Authorization: Token your_token_here
```

### الحصول على الفواتير الأخيرة
```http
GET /api/invoices/recent
Authorization: Token your_token_here
```

**Query Parameters:**
- `limit` (optional): عدد الفواتير المطلوبة (افتراضي: 10)

### البحث في الفواتير
```http
GET /api/search-invoices/
Authorization: Token your_token_here
```

**Query Parameters:**
- `query`: نص البحث
- `limit` (optional): عدد النتائج المطلوبة

---

## 💳 إدارة المدفوعات (Payment Management)

### الحصول على قائمة المدفوعات
```http
GET /api/payments/
Authorization: Token your_token_here
```

**Query Parameters:**
- `limit` (optional): عدد المدفوعات المطلوبة

### إنشاء دفعة جديدة
```http
POST /api/payments/create/
Authorization: Token your_token_here
Content-Type: application/json

{
    "customer_id": 1,
    "amount": 500.00,
    "payment_method": "cash",
    "invoice_id": 123,
    "notes": "ملاحظات"
}
```

**Payment Methods:**
- `cash`: نقداً
- `bank_transfer`: تحويل بنكي
- `check`: شيك
- `credit_card`: بطاقة ائتمان
- `other`: أخرى

### الحصول على مدفوعات الفاتورة
```http
GET /api/invoices/{invoice_id}/payments/
Authorization: Token your_token_here
```

### الحصول على أرصدة العملاء
```http
GET /api/customer-balances/
Authorization: Token your_token_here
```

---

## 🔄 إدارة المرتجعات (Return Management)

### الحصول على قائمة المرتجعات
```http
GET /api/returns/
Authorization: Token your_token_here
```

**Query Parameters:**
- `limit` (optional): عدد المرتجعات المطلوبة

### إنشاء مرتجع
```http
POST /api/returns/create/
Authorization: Token your_token_here
Content-Type: application/json

{
    "invoice_id": 123,
    "items": [
        {
            "item_id": 789,
            "qty_returned": 1
        }
    ],
    "notes": "سبب المرتجع"
}
```

### الحصول على تفاصيل المرتجع
```http
GET /api/returns/{return_id}/
Authorization: Token your_token_here
```

### الموافقة على المرتجع
```http
POST /api/returns/{return_id}/approve/
Authorization: Token your_token_here
```

### رفض المرتجع
```http
POST /api/returns/{return_id}/reject/
Authorization: Token your_token_here
```

### الحصول على العناصر القابلة للاسترداد
```http
GET /api/invoices/{invoice_id}/returnable-items/
Authorization: Token your_token_here
```

---

## 📊 التقارير والإحصائيات (Reports & Statistics)

### إحصائيات لوحة التحكم
```http
GET /api/dashboard/stats
Authorization: Token your_token_here
```

**Response:**
```json
{
    "total_invoices": 150,
    "confirmed_invoices": 120,
    "total_customers": 50,
    "total_products": 200,
    "low_stock_products": 15,
    "total_sales": 50000.00,
    "pending_payments": 5000.00
}
```

---

## 👤 إدارة المستخدمين (User Management)

### الحصول على مستخدمي الشركة
```http
GET /api/company-users/
Authorization: Token your_token_here
```

### حذف المستخدم
```http
DELETE /api/users/{user_id}/
Authorization: Token your_token_here
```

---

## 🔧 متطلبات النظام (System Requirements)

### المتطلبات التقنية
- **Python**: 3.8+
- **Django**: 5.0.7
- **Django REST Framework**: 3.15.2
- **Database**: SQLite (قابل للترقية إلى PostgreSQL/MySQL)
- **Authentication**: Token Authentication

### متطلبات الأمان
- **HTTPS**: مطلوب في الإنتاج
- **API Token**: مطلوب لجميع الطلبات
- **CORS**: مُعد للعمل مع نطاقات محددة
- **CSRF Protection**: مفعل

### حدود الطلبات
- **Rate Limiting**: 100 طلب في 15 دقيقة
- **Timeout**: 30 ثانية للطلبات
- **Max File Size**: 10MB للملفات

---

## 📝 أمثلة الاستخدام (Usage Examples)

### مثال 1: إنشاء فاتورة كاملة
```javascript
// 1. إنشاء فاتورة
const invoice = await fetch('https://stockly.encryptosystem.com/api/invoices/session', {
    method: 'POST',
    headers: {
        'Authorization': 'Token your_token_here',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        customer_name: 'عميل جديد'
    })
});

// 2. إضافة منتج
await fetch(`https://stockly.encryptosystem.com/api/invoices/${invoice.session_id}/items`, {
    method: 'POST',
    headers: {
        'Authorization': 'Token your_token_here',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        product_id: 1,
        qty: 2
    })
});

// 3. تأكيد الفاتورة
await fetch(`https://stockly.encryptosystem.com/api/invoices/${invoice.session_id}/confirm`, {
    method: 'POST',
    headers: {
        'Authorization': 'Token your_token_here'
    }
});
```

### مثال 2: الحصول على تقرير المخزون
```javascript
const products = await fetch('https://stockly.encryptosystem.com/api/products/', {
    headers: {
        'Authorization': 'Token your_token_here'
    }
});

const lowStock = products.filter(p => p.stock_qty < 10);
console.log(`منتجات قليلة المخزون: ${lowStock.length}`);
```

---

## ⚠️ رموز الأخطاء (Error Codes)

| الكود | المعنى | الوصف |
|-------|--------|--------|
| 200 | OK | الطلب نجح |
| 201 | Created | تم إنشاء المورد بنجاح |
| 400 | Bad Request | بيانات الطلب غير صحيحة |
| 401 | Unauthorized | غير مصرح بالوصول |
| 403 | Forbidden | ممنوع الوصول |
| 404 | Not Found | المورد غير موجود |
| 500 | Internal Server Error | خطأ في الخادم |

---

## 📞 الدعم والمساعدة

- **GitHub**: [stockly/stockly](https://github.com/stockly/stockly)
- **Email**: support@stockly.com
- **Documentation**: [docs.stockly.com](https://docs.stockly.com)

---

**تم تطويره بـ ❤️ لفريق Stockly**
