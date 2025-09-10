	•	عندك API كامل (Products, Customers, Invoices).
	•	Dashboard HTML/JS يستهلك الـ API (بدون منطق زائد).
	•	TailwindCSS يضمن واجهة عصرية وخفيفة.

⸻

📄 docs/django-api-dashboard.md

<!--
ROLE: مساعد تقني لمشروع Django (API + Dashboard).
- المطلوب: باك-إند Django + واجهة Dashboard بـ HTML + TailwindCSS + JS خفيف.
- التزم فقط: Models, API Endpoints, Templates (HTML + Tailwind).
- لا تدخل AI أو n8n هنا.
- الهدف: نظام إدارة مخزون + فواتير مع زبائن.
-->

# Django API + Dashboard (Tailwind)

## 🗄️ Models (app/models.py)
```python
from django.db import models
from django.utils import timezone

class Customer(models.Model):
    name = models.CharField(max_length=256)
    phone = models.CharField(max_length=32, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return self.name

class Category(models.Model):
    name = models.CharField(max_length=128)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    def __str__(self): return self.name

class Product(models.Model):
    name = models.CharField(max_length=256)
    sku = models.CharField(max_length=64, unique=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    price = models.DecimalField(max_digits=12, decimal_places=2)
    stock_qty = models.IntegerField(default=0)
    qr_code = models.ImageField(upload_to='qrcodes/', blank=True)
    def __str__(self): return f"{self.sku} - {self.name}"

class Invoice(models.Model):
    DRAFT, CONFIRMED, CANCELLED = 'draft','confirmed','cancelled'
    STATUS = [(DRAFT,'Draft'),(CONFIRMED,'Confirmed'),(CANCELLED,'Cancelled')]
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='invoices')
    status = models.CharField(max_length=16, choices=STATUS, default=DRAFT)
    created_at = models.DateTimeField(default=timezone.now)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    qty = models.DecimalField(max_digits=12, decimal_places=2)
    price_at_add = models.DecimalField(max_digits=12, decimal_places=2)
    @property
    def line_total(self): return self.qty * self.price_at_add


⸻

⚙️ API Endpoints (app/api.py)

from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import transaction
from .models import Product, Customer, Invoice, InvoiceItem

@api_view(["GET"])
def api_products(request):
    q = request.GET.get("query","")
    qs = Product.objects.all()
    if q: qs = qs.filter(name__icontains=q) | qs.filter(sku__icontains=q)
    return Response([{
        "id":p.id,"sku":p.sku,"name":p.name,"price":float(p.price),"stock_qty":p.stock_qty
    } for p in qs[:50]])

@api_view(["POST"])
def api_invoice_session(request):
    name = request.data.get("customer_name","عميل نقدي")
    customer, _ = Customer.objects.get_or_create(name=name)
    inv = Invoice.objects.create(customer=customer)
    return Response({"session_id": inv.id, "customer_id": customer.id})

@api_view(["GET"])
def api_get_invoice(request, session_id:int):
    inv = Invoice.objects.select_related("customer").get(pk=session_id)
    return Response({
        "id": inv.id,
        "customer": {"id": inv.customer.id, "name": inv.customer.name},
        "status": inv.status,
        "items": [{
            "id":it.id,"name":it.product.name,"sku":it.product.sku,
            "qty":float(it.qty),"price":float(it.price_at_add),"line_total":float(it.line_total)
        } for it in inv.items.all()],
        "total_amount": float(inv.total_amount)
    })

@api_view(["POST"])
def api_add_item(request, session_id:int):
    inv = Invoice.objects.get(pk=session_id, status=Invoice.DRAFT)
    product_query = request.data.get("product_query")
    qty = float(request.data.get("qty",1))
    p = Product.objects.filter(sku__iexact=product_query).first() or Product.objects.filter(name__icontains=product_query).first()
    if not p: return Response({"error":"product_not_found"}, status=404)
    InvoiceItem.objects.create(invoice=inv, product=p, qty=qty, price_at_add=p.price)
    inv.total_amount = sum(i.line_total for i in inv.items.all()); inv.save(update_fields=["total_amount"])
    return Response({"ok": True, "total": float(inv.total_amount)})

@api_view(["POST"])
@transaction.atomic
def api_confirm(request, session_id:int):
    inv = Invoice.objects.select_for_update().get(pk=session_id, status=Invoice.DRAFT)
    for it in inv.items.select_related("product"):
        it.product.stock_qty -= int(it.qty); it.product.save(update_fields=["stock_qty"])
    inv.status = Invoice.CONFIRMED; inv.save(update_fields=["status"])
    return Response({"invoice_id": inv.id, "status": inv.status, "pdf_url": f"/invoice/{inv.id}/pdf"})


⸻

🌐 URLs (app/urls.py)

from django.urls import path
from .api import api_products, api_invoice_session, api_get_invoice, api_add_item, api_confirm
from . import views

urlpatterns = [
  # API
  path('api/products/', api_products),
  path('api/invoices/session', api_invoice_session),
  path('api/invoices/<int:session_id>', api_get_invoice),
  path('api/invoices/<int:session_id>/items', api_add_item),
  path('api/invoices/<int:session_id>/confirm', api_confirm),

  # Dashboard Pages
  path('', views.dashboard, name='dashboard'),
  path('invoice/<int:session_id>/', views.invoice_page, name='invoice_page'),
]


⸻

🖥️ Views + Dashboard Templates

# app/views.py
from django.shortcuts import render
def dashboard(request):
    return render(request, "dashboard.html")
def invoice_page(request, session_id):
    return render(request, "invoice.html", {"session_id": session_id})


⸻

🎨 Dashboard with TailwindCSS (templates/dashboard.html)

<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8">
  <title>لوحة التحكم</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 text-gray-900">
  <div class="container mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">🛒 إدارة المخزون والفواتير</h1>
    
    <!-- إنشاء فاتورة -->
    <div class="bg-white shadow p-4 rounded mb-6">
      <h2 class="font-semibold mb-2">إنشاء فاتورة جديدة</h2>
      <input id="customerName" type="text" placeholder="اسم الزبون"
             class="border p-2 w-full mb-2 rounded">
      <button onclick="createInvoice()"
              class="bg-blue-600 text-white px-4 py-2 rounded">بدء فاتورة</button>
    </div>

    <!-- عرض الفواتير الحالية -->
    <div id="invoices" class="space-y-4"></div>
  </div>

<script>
async function createInvoice(){
  const name = document.getElementById("customerName").value || "عميل نقدي";
  const res = await fetch("/api/invoices/session", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({customer_name:name})
  });
  const data = await res.json();
  window.location.href = `/invoice/${data.session_id}/`;
}
</script>
</body>
</html>


⸻

🧾 Invoice Page (templates/invoice.html)

<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
  <div class="container mx-auto p-6">
    <h1 class="text-xl font-bold mb-4">فاتورة #{{ session_id }}</h1>

    <div id="items" class="mb-4"></div>
    <div class="mb-4">
      <input id="productQuery" class="border p-2 rounded" placeholder="اسم المنتج">
      <input id="qty" type="number" value="1" class="border p-2 rounded w-20">
      <button onclick="addItem()" class="bg-green-600 text-white px-4 py-2 rounded">➕ إضافة</button>
    </div>
    <button onclick="confirmInvoice()" class="bg-blue-600 text-white px-4 py-2 rounded">✅ تأكيد</button>
  </div>

<script>
const sessionId = "{{ session_id }}";
async function loadInvoice(){
  const res = await fetch(`/api/invoices/${sessionId}`);
  const inv = await res.json();
  let html = `<h2 class="font-semibold mb-2">الزبون: ${inv.customer.name}</h2><ul class="list-disc ml-6">`;
  inv.items.forEach(i=>{
    html += `<li>${i.name} × ${i.qty} = ${i.line_total}</li>`;
  });
  html += `</ul><p class="mt-2 font-bold">الإجمالي: ${inv.total_amount}</p>`;
  document.getElementById("items").innerHTML = html;
}
async function addItem(){
  const q = document.getElementById("productQuery").value;
  const qty = document.getElementById("qty").value;
  await fetch(`/api/invoices/${sessionId}/items`,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({product_query:q, qty:qty})
  });
  loadInvoice();
}
async function confirmInvoice(){
  const res = await fetch(`/api/invoices/${sessionId}/confirm`,{method:"POST"});
  const data = await res.json();
  alert("تم تأكيد الفاتورة ✅");
  window.location.href = data.pdf_url;
}
loadInvoice();
</script>
</body>
</html>


⸻

✅ ملاحظات
	•	API + Dashboard موحد: نفس المشروع.
	•	TailwindCSS للستايل بدون CSS يدوي.
	•	JS بسيط لاستدعاء API وتحديث الواجهة.
	•	Customer Model مدمج، والفواتير مرتبطة به.
	•	لاحقًا تضيف:
	•	توليد PDF.
	•	تحسين UI (Autocomplete للمنتجات).
	•	حماية Auth/Admin.

---

