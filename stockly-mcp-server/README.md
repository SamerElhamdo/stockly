# Stockly MCP Server
## محاسب ذكي لنظام Stockly

خادم MCP (Model Context Protocol) مستقل مكتوب بـ JavaScript/Node.js يوفر أدوات محاسبية ذكية لنظام Stockly. يمكن تشغيله كـ Studio منفصل أو داخل n8n كحزمة. يتصل بـ Django عبر HTTPS ويوفر واجهة برمجية شاملة للمحاسبة.

## المميزات

- 🧮 **أدوات محاسبية شاملة**: فواتير، عملاء، منتجات، مدفوعات، مرتجعات
- 🤖 **تكامل مع n8n AI Agent**: دعم كامل لبروتوكول MCP
- 🔒 **أمان متقدم**: مصادقة API Token و HTTPS
- 📊 **تقارير ذكية**: إحصائيات وتحليلات مالية
- 🌐 **دعم اللغة العربية**: واجهة ورسائل باللغة العربية
- ⚡ **أداء عالي**: معالجة سريعة للطلبات
- 🐳 **Docker Ready**: جاهز للتشغيل في Docker
- 📦 **n8n Integration**: تكامل سلس مع n8n

## التثبيت

### 1. الطريقة السريعة (Docker)

```bash
# استنساخ المشروع
git clone https://github.com/stockly/stockly-mcp-server.git
cd stockly-mcp-server

# إعداد متغيرات البيئة
cp .env.example .env
# عدّل API_TOKEN في ملف .env

# تشغيل مع Docker Compose
docker-compose up -d
```

### 2. التثبيت اليدوي

```bash
# تثبيت المتطلبات
npm install

# إعداد متغيرات البيئة
cp .env.example .env
# عدّل API_TOKEN في ملف .env

# اختبار النظام
npm test

# تشغيل الخادم
npm start
```

### 3. الحصول على API Token

1. اذهب إلى Django Admin:
```
https://stockly.encryptosystem.com/admin/
```

2. اذهب إلى "Tokens" وأنشئ token جديد

3. ضع الـ token في ملف `.env`:
```env
API_TOKEN=your_token_here
```

## التشغيل

### 1. تشغيل MCP Server

```bash
# تشغيل عادي
npm start

# تشغيل في وضع التطوير
npm run dev

# تشغيل مع Docker
docker-compose up stockly-mcp
```

### 2. تشغيل مع n8n

```bash
# تشغيل MCP Server + n8n
docker-compose up

# الوصول إلى n8n
# http://localhost:5678
# Username: admin
# Password: password
```

### 3. النشر

```bash
# بناء Docker Image
docker build -t stockly-mcp-server .

# تشغيل Container
docker run -p 3001:3001 -e API_TOKEN=your_token stockly-mcp-server
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
- `get_customer_balance` - رصيد العميل
- `get_customer_payments` - مدفوعات العميل

### أدوات المنتجات
- `get_products` - قائمة المنتجات
- `add_product` - إضافة منتج جديد
- `update_product_stock` - تحديث المخزون

### أدوات الفئات
- `get_categories` - قائمة الفئات
- `add_category` - إضافة فئة جديدة

### أدوات المدفوعات
- `create_payment` - إنشاء دفعة جديدة
- `get_payments` - قائمة المدفوعات

### أدوات التقارير
- `get_dashboard_stats` - إحصائيات لوحة التحكم
- `get_inventory_report` - تقرير المخزون
- `get_sales_report` - تقرير المبيعات

### أدوات المرتجعات
- `create_return` - إنشاء مرتجع
- `get_returns` - قائمة المرتجعات
- `approve_return` - الموافقة على المرتجع

### أدوات النظام
- `health_check` - فحص صحة النظام
- `get_system_info` - معلومات النظام

## التكامل مع n8n

### 1. إعداد MCP Client في n8n

1. أضف عقدة "MCP Client Tool" في n8n
2. اضبط الإعدادات:
   - **Server URL**: `http://stockly-mcp:3001`
   - **Tools**: اختر الأدوات المطلوبة

### 2. استخدام في سير العمل

```javascript
// مثال: إنشاء فاتورة
const invoiceData = {
  tool: 'create_invoice',
  params: {
    customer_name: 'عميل جديد'
  }
};

const result = await mcpClient.callTool(invoiceData);
```

### 3. مثال سير عمل كامل

```javascript
// 1. إنشاء فاتورة
const invoice = await mcpClient.callTool('create_invoice', {
  customer_name: "عميل جديد"
});

// 2. إضافة منتجات
await mcpClient.callTool('add_item_to_invoice', {
  invoice_id: invoice.invoice_id,
  product_id: 1,
  quantity: 2
});

// 3. تأكيد الفاتورة
await mcpClient.callTool('confirm_invoice', {
  invoice_id: invoice.invoice_id
});
```

## API Endpoints

### MCP Server Endpoints
- `GET /` - معلومات الخادم
- `POST /` - تنفيذ أداة
- `GET /health` - فحص الصحة
- `GET /tools` - قائمة الأدوات

### Django API Endpoints
- `https://stockly.encryptosystem.com/api/...`

## استكشاف الأخطاء

### مشاكل شائعة

1. **خطأ في الاتصال بـ Django**:
   - تحقق من Django URL
   - تحقق من API Token
   - تحقق من الشبكة

2. **خطأ في المصادقة**:
   - تحقق من صحة API Token
   - تأكد من صلاحيات المستخدم

3. **خطأ في الأدوات**:
   - تحقق من السجلات في `logs/`
   - استخدم `npm run dev` للتشغيل المفصل

### فحص السجلات

```bash
# عرض السجلات
docker logs stockly-mcp-server

# أو
tail -f logs/combined.log
```

## التطوير

### إضافة أداة جديدة

1. أضف الدالة في `src/tools/stockly-tools.js`:
```javascript
async myNewTool(args) {
  const { param1, param2 } = args;
  
  const response = await this.httpClient.post('/api/my-endpoint/', {
    param1,
    param2
  });

  return {
    success: true,
    result: response.data
  };
}
```

2. أضف تعريف الأداة في `this.tools`:
```javascript
{
  name: 'my_new_tool',
  description: 'وصف الأداة الجديدة',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'المعامل الأول' },
      param2: { type: 'number', description: 'المعامل الثاني' }
    },
    required: ['param1', 'param2']
  }
}
```

3. أضف case في `executeTool`:
```javascript
case 'my_new_tool':
  return await this.myNewTool(args);
```

### اختبار الأدوات

```bash
# تشغيل الاختبارات
npm test

# اختبار محلي
node src/test.js
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
