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
        "category_name":p.category.name if p.category else None,
        "unit":p.unit,
        "unit_display":p.get_unit_display() if p.unit else None,
        "measurement":p.measurement,
        "description":p.description
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
            "qty":float(it.qty),"price":float(it.price_at_add),"line_total":float(it.line_total),
            "unit":it.product.unit,
            "unit_display":it.product.get_unit_display() if it.product.unit else None,
            "measurement":it.product.measurement,
            "description":it.product.description
        } for it in inv.items.all()],
        "total_amount": float(inv.total_amount)
    })

@api_view(["POST"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_add_item(request, session_id:int):
    try:
        inv = Invoice.objects.get(pk=session_id, status=Invoice.DRAFT)
        qty = float(request.data.get("qty", 1))
        
        # Check if product_id is provided (new method)
        if "product_id" in request.data:
            product_id = request.data.get("product_id")
            try:
                p = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                return Response({"error": "product_not_found"}, status=404)
        else:
            # Fallback to old method with product_query
            product_query = request.data.get("product_query")
            if not product_query:
                return Response({"error": "product_query_required"}, status=400)
            p = Product.objects.filter(sku__iexact=product_query).first() or Product.objects.filter(name__icontains=product_query).first()
            if not p: 
                return Response({"error": "product_not_found"}, status=404)
        
        # Check stock availability - calculate remaining stock after this addition
        # Get current quantity already in this invoice for this product
        existing_qty = sum(float(item.qty) for item in inv.items.filter(product=p))
        total_required = existing_qty + qty
        
        if p.stock_qty < total_required:
            available_after_existing = p.stock_qty - existing_qty
            return Response({
                "error": "insufficient_stock", 
                "available": p.stock_qty,
                "already_in_invoice": existing_qty,
                "can_add": max(0, available_after_existing)
            }, status=400)
        
        # Create invoice item
        InvoiceItem.objects.create(invoice=inv, product=p, qty=qty, price_at_add=p.price)
        
        # Update total amount
        inv.total_amount = sum(i.line_total for i in inv.items.all())
        inv.save(update_fields=["total_amount"])
        
        return Response({
            "ok": True, 
            "total": float(inv.total_amount),
            "product_name": p.name,
            "qty": qty,
            "line_total": float(qty * float(p.price))
        })
    except Invoice.DoesNotExist:
        return Response({"error": "invoice_not_found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(["POST"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
@transaction.atomic
def api_confirm(request, session_id:int):
    try:
        inv = Invoice.objects.select_for_update().get(pk=session_id, status=Invoice.DRAFT)
        
        # Check stock availability before confirming
        insufficient_products = []
        for it in inv.items.select_related("product"):
            if it.product.stock_qty < it.qty:
                insufficient_products.append({
                    "product_name": it.product.name,
                    "required": float(it.qty),
                    "available": it.product.stock_qty
                })
        
        if insufficient_products:
            return Response({
                "error": "insufficient_stock_for_confirmation",
                "products": insufficient_products
            }, status=400)
        
        # Update stock quantities
        for it in inv.items.select_related("product"):
            it.product.stock_qty -= int(it.qty)
            it.product.save(update_fields=["stock_qty"])
        
        inv.status = Invoice.CONFIRMED
        inv.save(update_fields=["status"])
        
        return Response({
            "invoice_id": inv.id, 
            "status": inv.status, 
            "pdf_url": f"/invoice/{inv.id}/pdf"
        })
    except Invoice.DoesNotExist:
        return Response({"error": "invoice_not_found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

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
    
    # New optional fields
    unit = request.data.get("unit", "piece")
    measurement = request.data.get("measurement", "")
    description = request.data.get("description", "")
    
    if not all([name, category_id, price, stock_qty]):
        return Response({"error": "missing_fields"}, status=400)
    
    try:
        category = Category.objects.get(id=category_id)
        
        # Prepare product data
        product_data = {
            "name": name, 
            "category": category,
            "price": float(price), 
            "stock_qty": int(stock_qty),
            "unit": unit if unit else "piece"
        }
        
        # Add SKU only if provided and valid
        if sku and sku.strip():
            import re
            sku_clean = sku.strip()
            # Validate SKU contains only English letters and numbers
            if not re.match(r'^[A-Za-z0-9]+$', sku_clean):
                return Response({"error": "invalid_sku_format"}, status=400)
            product_data["sku"] = sku_clean
        
        # Add optional fields if provided
        if measurement:
            product_data["measurement"] = measurement
        if description:
            product_data["description"] = description
            
        product = Product.objects.create(**product_data)
        
        return Response({
            "id": product.id, 
            "name": product.name,
            "sku": product.sku,
            "unit": product.unit,
            "unit_display": product.get_unit_display(),
            "measurement": product.measurement,
            "description": product.description
        })
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

# Update endpoints
@api_view(["PUT"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_update_category(request, category_id):
    try:
        category = Category.objects.get(id=category_id)
        data = request.data
        
        category.name = data.get('name', category.name)
        category.description = data.get('description', category.description)
        category.save()
        
        return Response({
            "success": True,
            "category": {
                "id": category.id,
                "name": category.name,
                "description": category.description,
                "products_count": category.products.count()
            }
        })
    except Category.DoesNotExist:
        return Response({"error": "category_not_found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(["PUT"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_update_product(request, product_id):
    try:
        product = Product.objects.get(id=product_id)
        data = request.data
        
        # Update basic fields
        product.name = data.get('name', product.name)
        product.sku = data.get('sku', product.sku)
        product.price = data.get('price', product.price)
        product.stock_qty = data.get('stock_qty', product.stock_qty)
        
        # Update new fields
        if 'unit' in data:
            product.unit = data.get('unit', product.unit)
        if 'measurement' in data:
            product.measurement = data.get('measurement', product.measurement)
        if 'description' in data:
            product.description = data.get('description', product.description)
        
        # Update category if provided
        if 'category_id' in data:
            try:
                category = Category.objects.get(id=data['category_id'])
                product.category = category
            except Category.DoesNotExist:
                return Response({"error": "category_not_found"}, status=400)
        
        product.save()
        
        return Response({
            "success": True,
            "product": {
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "price": float(product.price),
                "stock_qty": product.stock_qty,
                "unit": product.unit,
                "unit_display": product.get_unit_display() if product.unit else None,
                "measurement": product.measurement,
                "description": product.description,
                "category": {
                    "id": product.category.id,
                    "name": product.category.name
                } if product.category else None
            }
        })
    except Product.DoesNotExist:
        return Response({"error": "product_not_found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(["PUT"])
@csrf_exempt
@permission_classes([IsAuthenticated])
@api_admin_required
def api_update_customer(request, customer_id):
    try:
        customer = Customer.objects.get(id=customer_id)
        data = request.data
        
        customer.name = data.get('name', customer.name)
        customer.phone = data.get('phone', customer.phone)
        customer.email = data.get('email', customer.email)
        customer.address = data.get('address', customer.address)
        customer.save()
        
        return Response({
            "success": True,
            "customer": {
                "id": customer.id,
                "name": customer.name,
                "phone": customer.phone,
                "email": customer.email,
                "address": customer.address,
                "invoices_count": customer.invoices.count(),
                "last_purchase": customer.invoices.order_by('-created_at').first().created_at.strftime('%Y-%m-%d') if customer.invoices.exists() else None
            }
        })
    except Customer.DoesNotExist:
        return Response({"error": "customer_not_found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)
