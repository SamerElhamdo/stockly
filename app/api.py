from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Count, Sum, Q, Max
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime, timedelta
from .models import Product, Customer, Invoice, InvoiceItem, Category
from .decorators import api_admin_required

@api_view(["GET"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_products(request):
    q = request.GET.get("query","")
    qs = Product.objects.select_related('category')
    if q: qs = qs.filter(name__icontains=q) | qs.filter(sku__icontains=q)
    return Response([{
        "id":p.id,"sku":p.sku,"name":p.name,"price":float(p.price),"stock_qty":p.stock_qty,
        "category_name":p.category.name if p.category else None
    } for p in qs[:50]])

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_admin_required
def api_invoice_session(request):
    name = request.data.get("customer_name","عميل نقدي")
    customer, _ = Customer.objects.get_or_create(name=name)
    inv = Invoice.objects.create(customer=customer)
    return Response({"session_id": inv.id, "customer_id": customer.id})

@api_view(["GET"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_get_invoice(request, session_id:int):
    inv = Invoice.objects.select_related("customer").get(pk=session_id)
    return Response({
        "id": inv.id,
        "customer": {"id": inv.customer.id, "name": inv.customer.name, "phone": inv.customer.phone},
        "status": inv.status,
        "created_at": inv.created_at.isoformat(),
        "items": [{
            "id":it.id,"name":it.product.name,"sku":it.product.sku,
            "qty":float(it.qty),"price":float(it.price_at_add),"line_total":float(it.line_total)
        } for it in inv.items.all()],
        "total_amount": float(inv.total_amount)
    })

@api_view(["POST"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
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
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
@transaction.atomic
def api_confirm(request, session_id:int):
    inv = Invoice.objects.select_for_update().get(pk=session_id, status=Invoice.DRAFT)
    for it in inv.items.select_related("product"):
        it.product.stock_qty -= int(it.qty); it.product.save(update_fields=["stock_qty"])
    inv.status = Invoice.CONFIRMED; inv.save(update_fields=["status"])
    return Response({"invoice_id": inv.id, "status": inv.status, "pdf_url": f"/invoice/{inv.id}/pdf"})

# Additional API endpoints for the new pages

@api_view(["GET"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_customers(request):
    customers = Customer.objects.annotate(
        invoices_count=Count('invoices')
    ).order_by('-created_at')
    return Response([{
        "id": c.id, "name": c.name, "phone": c.phone, "email": c.email,
        "address": c.address, "invoices_count": c.invoices_count,
        "last_purchase": None  # Simplified for now
    } for c in customers])

@api_view(["POST"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_add_customer(request):
    name = request.data.get("name")
    if not name:
        return Response({"error": "name_required"}, status=400)
    
    customer = Customer.objects.create(
        name=name,
        phone=request.data.get("phone", ""),
        email=request.data.get("email", ""),
        address=request.data.get("address", "")
    )
    return Response({"id": customer.id, "name": customer.name})

@api_view(["GET"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_categories(request):
    categories = Category.objects.all()
    return Response([{"id": c.id, "name": c.name} for c in categories])

@api_view(["POST"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_add_product(request):
    name = request.data.get("name")
    sku = request.data.get("sku")
    category_id = request.data.get("category")
    price = request.data.get("price")
    stock_qty = request.data.get("stock_qty")
    
    if not all([name, sku, category_id, price, stock_qty]):
        return Response({"error": "missing_fields"}, status=400)
    
    try:
        category = Category.objects.get(id=category_id)
        product = Product.objects.create(
            name=name, sku=sku, category=category,
            price=float(price), stock_qty=int(stock_qty)
        )
        return Response({"id": product.id, "name": product.name})
    except Category.DoesNotExist:
        return Response({"error": "category_not_found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(["GET"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_invoices_list(request):
    invoices = Invoice.objects.select_related('customer').order_by('-created_at')
    return Response([{
        "id": inv.id, "customer_name": inv.customer.name,
        "total_amount": float(inv.total_amount), "status": inv.status,
        "created_at": inv.created_at.isoformat()
    } for inv in invoices])

@api_view(["GET"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_recent_invoices(request):
    invoices = Invoice.objects.select_related('customer').order_by('-created_at')[:10]
    return Response([{
        "id": inv.id, "customer_name": inv.customer.name,
        "total_amount": float(inv.total_amount), "status": inv.status,
        "created_at": inv.created_at.isoformat()
    } for inv in invoices])

@api_view(["GET"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_dashboard_stats(request):
    today = timezone.now().date()
    today_invoices = Invoice.objects.filter(created_at__date=today).count()
    total_sales = Invoice.objects.filter(status=Invoice.CONFIRMED).aggregate(
        total=Sum('total_amount'))['total'] or 0
    low_stock_items = Product.objects.filter(stock_qty__lt=5).count()
    
    return Response({
        "today_invoices": today_invoices,
        "total_sales": float(total_sales),
        "low_stock_items": low_stock_items
    })

# Delete endpoints
@api_view(["DELETE"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_delete_category(request, category_id):
    try:
        category = Category.objects.get(id=category_id)
        category.delete()
        return Response({"success": True})
    except Category.DoesNotExist:
        return Response({"error": "category_not_found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(["DELETE"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_delete_product(request, product_id):
    try:
        product = Product.objects.get(id=product_id)
        product.delete()
        return Response({"success": True})
    except Product.DoesNotExist:
        return Response({"error": "product_not_found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(["DELETE"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_delete_customer(request, customer_id):
    try:
        customer = Customer.objects.get(id=customer_id)
        customer.delete()
        return Response({"success": True})
    except Customer.DoesNotExist:
        return Response({"error": "customer_not_found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

# Add category endpoint
@api_view(["POST"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_add_category(request):
    name = request.data.get("name")
    parent_id = request.data.get("parent")
    
    if not name:
        return Response({"error": "name_required"}, status=400)
    
    try:
        parent = None
        if parent_id:
            parent = Category.objects.get(id=parent_id)
        
        category = Category.objects.create(
            name=name,
            parent=parent
        )
        return Response({"id": category.id, "name": category.name})
    except Category.DoesNotExist:
        return Response({"error": "parent_category_not_found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)
