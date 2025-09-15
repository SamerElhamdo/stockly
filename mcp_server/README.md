# Stockly MCP Server
## محاسب ذكي لنظام Stockly

خادم MCP (Model Context Protocol) يوفر أدوات محاسبية ذكية لنظام Stockly، يمكن للـ n8n AI Agent التفاعل معها.

## المميزات

- 🧮 **أدوات محاسبية شاملة**: فواتير، عملاء، منتجات، مدفوعات
- 🤖 **تكامل مع n8n AI Agent**: دعم كامل لبروتوكول MCP
- 🔒 **أمان متقدم**: مصادقة API Token
- 📊 **تقارير ذكية**: إحصائيات وتحليلات مالية
- 🌐 **دعم اللغة العربية**: واجهة ورسائل باللغة العربية
- ⚡ **أداء عالي**: معالجة سريعة للطلبات

## التثبيت

### 1. تثبيت المتطلبات

```bash
cd mcp_server
pip install -r requirements.txt
```

### 2. إعداد متغيرات البيئة

```bash
# انسخ ملف الإعدادات
cp .env.example .env

# عدّل القيم المطلوبة
nano .env
```

### 3. الحصول على API Token

1. شغّل Django server:
```bash
cd ..
python manage.py runserver
```

2. اذهب إلى Django Admin:
```
http://localhost:8000/admin/
```

3. اذهب إلى "Tokens" وأنشئ token جديد

4. ضع الـ token في ملف `.env`:
```env
API_TOKEN=your_token_here
```

## التشغيل

### تشغيل عادي

```bash
python run_server.py
```

### تشغيل في وضع التصحيح

```bash
python run_server.py --debug
```

### فحص الإعدادات فقط

```bash
python run_server.py --check
```

### استخدام ملف إعدادات مخصص

```bash
python run_server.py --config my_config.env
```

## الأدوات المتاحة

### أدوات الفواتير
- `create_invoice` - إنشاء فاتورة جديدة
- `get_invoice` - الحصول على تفاصيل الفاتورة
- `add_item_to_invoice` - إضافة منتج للفاتورة
- `confirm_invoice` - تأكيد الفاتورة
- `get_recent_invoices` - الفواتير الأخيرة
- `search_invoices` - البحث في الفواتير

### أدوات العملاء
- `get_customers` - قائمة العملاء
- `add_customer` - إضافة عميل جديد
- `update_customer` - تحديث بيانات العميل
- `get_customer_balance` - رصيد العميل
- `get_customer_payments` - مدفوعات العميل
- `get_customer_invoices` - فواتير العميل

### أدوات المنتجات
- `get_products` - قائمة المنتجات
- `add_product` - إضافة منتج جديد
- `update_product` - تحديث المنتج
- `update_product_stock` - تحديث المخزون

### أدوات الفئات
- `get_categories` - قائمة الفئات
- `add_category` - إضافة فئة جديدة
- `update_category` - تحديث الفئة

### أدوات المدفوعات
- `create_payment` - إنشاء دفعة جديدة
- `get_payments` - قائمة المدفوعات
- `get_invoice_payments` - مدفوعات الفاتورة

### أدوات التقارير
- `get_dashboard_stats` - إحصائيات لوحة التحكم
- `get_sales_report` - تقرير المبيعات
- `get_inventory_report` - تقرير المخزون
- `get_customer_balances_report` - تقرير أرصدة العملاء

### أدوات المرتجعات
- `create_return` - إنشاء مرتجع
- `get_returns` - قائمة المرتجعات
- `get_return_details` - تفاصيل المرتجع
- `approve_return` - الموافقة على المرتجع
- `reject_return` - رفض المرتجع
- `get_invoice_returnable_items` - العناصر القابلة للاسترداد

### أدوات مساعدة
- `get_system_info` - معلومات النظام
- `health_check` - فحص صحة النظام

## التكامل مع n8n

### 1. إعداد MCP Client في n8n

1. أضف عقدة "MCP Client Tool" في n8n
2. اضبط الإعدادات:
   - **Server URL**: `http://localhost:3001` (أو المنفذ المخصص)
   - **Tools**: اختر الأدوات المطلوبة

### 2. استخدام في سير العمل

```javascript
// مثال على استخدام أداة إنشاء فاتورة
const invoiceData = {
  customer_name: "عميل جديد",
  // ... بيانات أخرى
};

const result = await mcpClient.callTool('create_invoice', invoiceData);
```

## استكشاف الأخطاء

### مشاكل شائعة

1. **خطأ في الاتصال بـ Django**:
   - تأكد من تشغيل Django server
   - تحقق من صحة API Token
   - تأكد من صحة DJANGO_BASE_URL

2. **خطأ في المصادقة**:
   - تحقق من صحة API Token
   - تأكد من صلاحيات المستخدم

3. **خطأ في الأدوات**:
   - تحقق من السجلات في `mcp_server.log`
   - استخدم `--debug` للتشغيل المفصل

### فحص السجلات

```bash
# عرض السجلات
tail -f mcp_server.log

# عرض السجلات مع التصفية
grep "ERROR" mcp_server.log
```

## التطوير

### إضافة أداة جديدة

1. أضف الدالة في `mcp_server.py`:
```python
def my_new_tool(self, param1: str, param2: int) -> Dict:
    """وصف الأداة الجديدة"""
    # تنفيذ الأداة
    return self._make_request('POST', '/api/my-endpoint/', {
        'param1': param1,
        'param2': param2
    })
```

2. سجل الأداة في `register_all_tools()`:
```python
self.mcp.tool()(self.my_new_tool)
```

### اختبار الأدوات

```python
# اختبار محلي
from mcp_server import StocklyMCPTools
from mcp_server.config import StocklyMCPConfig

config = StocklyMCPConfig()
server = StocklyMCPTools(config)

# اختبار أداة
result = server.create_invoice("عميل تجريبي")
print(result)
```

## المساهمة

1. Fork المشروع
2. أنشئ branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push إلى Branch (`git push origin feature/amazing-feature`)
5. أنشئ Pull Request

## الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## الدعم

للحصول على الدعم:
- أنشئ issue في GitHub
- راسلنا على: support@stockly.com
- راجع الوثائق: [docs.stockly.com](https://docs.stockly.com)

---

**تم تطويره بـ ❤️ لفريق Stockly**
