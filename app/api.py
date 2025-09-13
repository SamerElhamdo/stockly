from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Count, Q, Sum, Q, Max
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from datetime import datetime, timedelta
from .models import Product, Customer, Invoice, InvoiceItem, Category, Company, User, OTPVerification, Return, ReturnItem, Payment, CustomerBalance, company_queryset, can_manage_company
from .decorators import api_company_owner_required, api_company_staff_required
import requests
import random
import uuid

@api_view(["GET"])
@api_company_staff_required
def api_products(request):
    if not can_manage_company(request.user):
        return Response({"error": "Unauthorized"}, status=403)
    
    q = request.GET.get("query","")
    qs = company_queryset(Product, request.user).select_related('category')
    if q: qs = qs.filter(name__icontains=q) | qs.filter(sku__icontains=q)
    return Response([{
        "id":p.id,"sku":p.sku,"name":p.name,"price":float(p.price),"stock_qty":p.stock_qty,
        "category_id":p.category.id if p.category else None,
        "category_name":p.category.name if p.category else None,
        "unit":p.unit,
        "unit_display":p.get_unit_display() if p.unit else None,
        "measurement":p.measurement,
        "description":p.description,
        "cost_price":float(p.cost_price) if p.cost_price else None,
        "wholesale_price":float(p.wholesale_price) if p.wholesale_price else None,
        "retail_price":float(p.retail_price) if p.retail_price else None
    } for p in qs[:50]])

@api_view(["POST"])
@api_company_owner_required
def api_invoice_session(request):
    # Check if user is company owner (only owners can create invoices)
    if request.user.account_type != 'company_owner':
        return Response({"error": "Only company owners can create invoices"}, status=403)
    if not can_manage_company(request.user):
        return Response({"error": "Unauthorized"}, status=403)
    
    name = request.data.get("customer_name","عميل نقدي")
    customer, _ = Customer.objects.get_or_create(
        name=name, 
        company=request.user.company,
        defaults={'phone': '', 'email': '', 'address': ''}
    )
    inv = Invoice.objects.create(customer=customer, company=request.user.company)
    return Response({"session_id": inv.id, "customer_id": customer.id})

@api_view(["GET"])
@api_company_staff_required
def api_get_invoice(request, session_id:int):
    if not can_manage_company(request.user):
        return Response({"error": "Unauthorized"}, status=403)
    
    try:
        inv = company_queryset(Invoice, request.user).select_related("customer").get(pk=session_id)
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
    except Invoice.DoesNotExist:
        return Response({"error": "Invoice not found"}, status=404)

@api_view(["POST"])
@api_company_owner_required
def api_add_item(request, session_id:int):
    # Check if user is company owner (only owners can add items to invoices)
    if request.user.account_type != 'company_owner':
        return Response({"error": "Only company owners can add items to invoices"}, status=403)
    try:
        inv = company_queryset(Invoice, request.user).get(pk=session_id, status=Invoice.DRAFT)
        qty = float(request.data.get("qty", 1))
        
        # Check if product_id is provided (new method)
        if "product_id" in request.data:
            product_id = request.data.get("product_id")
            try:
                p = company_queryset(Product, request.user).get(id=product_id)
            except Product.DoesNotExist:
                return Response({"error": "product_not_found"}, status=404)
        else:
            # Fallback to old method with product_query
            product_query = request.data.get("product_query")
            if not product_query:
                return Response({"error": "product_query_required"}, status=400)
            p = company_queryset(Product, request.user).filter(sku__iexact=product_query).first() or company_queryset(Product, request.user).filter(name__icontains=product_query).first()
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
@api_company_owner_required
@transaction.atomic
def api_confirm(request, session_id:int):
    # Check if user is company owner (only owners can confirm invoices)
    if request.user.account_type != 'company_owner':
        return Response({"error": "Only company owners can confirm invoices"}, status=403)
    try:
        inv = company_queryset(Invoice, request.user).select_for_update().get(pk=session_id, status=Invoice.DRAFT)
        
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
        
        # Update customer balance after invoice confirmation
        update_customer_balance(inv.customer, request.user.company)
        
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
@api_company_staff_required
def api_customers(request):
    customers = company_queryset(Customer, request.user).annotate(
        invoices_count=Count('invoices', distinct=True),
        returns_count=Count('invoices__returns', filter=Q(invoices__returns__status='approved'), distinct=True)
    ).order_by('-created_at')
    
    # Get customer balances and calculate if not exists
    customer_balances = {}
    for customer in customers:
        try:
            balance = CustomerBalance.objects.get(customer=customer, company=request.user.company)
            customer_balances[customer.id] = float(balance.balance)
        except CustomerBalance.DoesNotExist:
            # Calculate balance if not exists
            update_customer_balance(customer, request.user.company)
            balance = CustomerBalance.objects.get(customer=customer, company=request.user.company)
            customer_balances[customer.id] = float(balance.balance)
    
    return Response([{
        "id": c.id, "name": c.name, "phone": c.phone, "email": c.email,
        "address": c.address, "invoices_count": c.invoices_count,
        "returns_count": c.returns_count,
        "balance": customer_balances.get(c.id, 0.0),
        "last_purchase": None  # Simplified for now
    } for c in customers])

@api_view(["POST"])
@api_company_owner_required
def api_add_customer(request):
    # Check if user is company owner (only owners can add customers)
    if request.user.account_type != 'company_owner':
        return Response({"error": "Only company owners can add customers"}, status=403)
    name = request.data.get("name")
    if not name:
        return Response({"error": "name_required"}, status=400)
    
    customer = Customer.objects.create(
        company=request.user.company,
        name=name,
        phone=request.data.get("phone", ""),
        email=request.data.get("email", ""),
        address=request.data.get("address", "")
    )
    return Response({"id": customer.id, "name": customer.name})

@api_view(["GET"])
@api_company_staff_required
def api_categories(request):
    categories = company_queryset(Category, request.user)
    return Response([{"id": c.id, "name": c.name} for c in categories])

@api_view(["POST"])
@api_company_owner_required
def api_add_product(request):
    # Check if user is company owner (only owners can add products)
    if request.user.account_type != 'company_owner':
        return Response({"error": "Only company owners can add products"}, status=403)
    name = request.data.get("name")
    sku = request.data.get("sku")
    category_id = request.data.get("category")
    price = request.data.get("price")
    stock_qty = request.data.get("stock_qty")
    
    # New optional fields
    unit = request.data.get("unit", "piece")
    measurement = request.data.get("measurement", "")
    description = request.data.get("description", "")
    
    # Advanced pricing fields
    cost_price = request.data.get("cost_price")
    wholesale_price = request.data.get("wholesale_price")
    retail_price = request.data.get("retail_price")
    
    if not all([name, category_id, price, stock_qty]):
        return Response({"error": "missing_fields"}, status=400)
    
    try:
        category = company_queryset(Category, request.user).get(id=category_id)
        
        # Prepare product data
        product_data = {
            "company": request.user.company,
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
            
        # Add advanced pricing fields if provided
        if cost_price is not None and cost_price != "":
            product_data["cost_price"] = float(cost_price)
        if wholesale_price is not None and wholesale_price != "":
            product_data["wholesale_price"] = float(wholesale_price)
        if retail_price is not None and retail_price != "":
            product_data["retail_price"] = float(retail_price)
            
        product = Product.objects.create(**product_data)
        
        return Response({
            "id": product.id, 
            "name": product.name,
            "sku": product.sku,
            "unit": product.unit,
            "unit_display": product.get_unit_display(),
            "measurement": product.measurement,
            "description": product.description,
            "cost_price": float(product.cost_price) if product.cost_price else None,
            "wholesale_price": float(product.wholesale_price) if product.wholesale_price else None,
            "retail_price": float(product.retail_price) if product.retail_price else None
        })
    except Category.DoesNotExist:
        return Response({"error": "category_not_found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(["GET"])
@api_company_staff_required
def api_invoices_list(request):
    invoices = company_queryset(Invoice, request.user).select_related('customer').order_by('-created_at')
    return Response([{
        "id": inv.id, "customer_name": inv.customer.name,
        "total_amount": float(inv.total_amount), "status": inv.status,
        "created_at": inv.created_at.isoformat()
    } for inv in invoices])

@api_view(["GET"])
@api_company_staff_required
def api_recent_invoices(request):
    invoices = company_queryset(Invoice, request.user).select_related('customer').order_by('-created_at')[:10]
    return Response([{
        "id": inv.id, "customer_name": inv.customer.name,
        "total_amount": float(inv.total_amount), "status": inv.status,
        "created_at": inv.created_at.isoformat()
    } for inv in invoices])

@api_view(["GET"])
@api_company_staff_required
def api_dashboard_stats(request):
    today = timezone.now().date()
    today_invoices = company_queryset(Invoice, request.user).filter(created_at__date=today).count()
    total_sales = company_queryset(Invoice, request.user).filter(status=Invoice.CONFIRMED).aggregate(
        total=Sum('total_amount'))['total'] or 0
    low_stock_items = company_queryset(Product, request.user).filter(stock_qty__lt=5).count()
    
    return Response({
        "today_invoices": today_invoices,
        "total_sales": float(total_sales),
        "low_stock_items": low_stock_items
    })

# Delete endpoints
@api_view(["DELETE"])
@api_company_owner_required
def api_delete_category(request, category_id):
    # Check if user is company owner (only owners can delete categories)
    if request.user.account_type != 'company_owner':
        return Response({"error": "Only company owners can delete categories"}, status=403)
    try:
        category = company_queryset(Category, request.user).get(id=category_id)
        category.delete()
        return Response({"success": True})
    except Category.DoesNotExist:
        return Response({"error": "category_not_found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(["DELETE"])
@api_company_owner_required
def api_delete_product(request, product_id):
    # Check if user is company owner (only owners can delete products)
    if request.user.account_type != 'company_owner':
        return Response({"error": "Only company owners can delete products"}, status=403)
    try:
        product = company_queryset(Product, request.user).get(id=product_id)
        product.delete()
        return Response({"success": True})
    except Product.DoesNotExist:
        return Response({"error": "product_not_found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(["DELETE"])
@api_company_owner_required
def api_delete_customer(request, customer_id):
    # Check if user is company owner (only owners can delete customers)
    if request.user.account_type != 'company_owner':
        return Response({"error": "Only company owners can delete customers"}, status=403)
    try:
        customer = company_queryset(Customer, request.user).get(id=customer_id)
        customer.delete()
        return Response({"success": True})
    except Customer.DoesNotExist:
        return Response({"error": "customer_not_found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

# Add category endpoint
@api_view(["POST"])
@api_company_owner_required
def api_add_category(request):
    # Check if user is company owner (only owners can add categories)
    if request.user.account_type != 'company_owner':
        return Response({"error": "Only company owners can add categories"}, status=403)
    name = request.data.get("name")
    parent_id = request.data.get("parent")
    
    if not name:
        return Response({"error": "name_required"}, status=400)
    
    try:
        parent = None
        if parent_id:
            parent = company_queryset(Category, request.user).get(id=parent_id)
        
        category = Category.objects.create(
            company=request.user.company,
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
@api_company_owner_required
def api_update_category(request, category_id):
    # Check if user is company owner (only owners can update categories)
    if request.user.account_type != 'company_owner':
        return Response({"error": "Only company owners can update categories"}, status=403)
    try:
        category = company_queryset(Category, request.user).get(id=category_id)
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
@api_company_owner_required
def api_update_product(request, product_id):
    # Check if user is company owner (only owners can update products)
    if request.user.account_type != 'company_owner':
        return Response({"error": "Only company owners can update products"}, status=403)
    try:
        product = company_queryset(Product, request.user).get(id=product_id)
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
            
        # Update advanced pricing fields
        if 'cost_price' in data:
            product.cost_price = data.get('cost_price', product.cost_price)
        if 'wholesale_price' in data:
            product.wholesale_price = data.get('wholesale_price', product.wholesale_price)
        if 'retail_price' in data:
            product.retail_price = data.get('retail_price', product.retail_price)
        
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
                "cost_price": float(product.cost_price) if product.cost_price else None,
                "wholesale_price": float(product.wholesale_price) if product.wholesale_price else None,
                "retail_price": float(product.retail_price) if product.retail_price else None,
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
@api_company_owner_required
def api_update_customer(request, customer_id):
    # Check if user is company owner (only owners can update customers)
    if request.user.account_type != 'company_owner':
        return Response({"error": "Only company owners can update customers"}, status=403)
    try:
        customer = company_queryset(Customer, request.user).get(id=customer_id)
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


# Company Registration API
@api_view(["POST"])
@permission_classes([])  # No authentication required
def api_register_company(request):
    """Register a new company"""
    try:
        data = request.data
        company_data = data.get('company', {})
        
        # Clean phone number
        company_phone = company_data.get('phone', '')
        
        if company_phone:
            company_phone = company_phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        
        # Validate required fields
        if not company_data.get('name'):
            return Response({"error": "Company name is required"}, status=400)
        
        if not company_data.get('code'):
            return Response({"error": "Company code is required"}, status=400)
        
        # Check if company code already exists
        if Company.objects.filter(code=company_data['code']).exists():
            return Response({"error": "Company code already exists"}, status=400)
        
        # Verify OTP first
        otp_session_id = data.get('otp_session_id')
        if not otp_session_id:
            return Response({"error": "OTP verification is required"}, status=400)
        
        try:
            otp_record = OTPVerification.objects.get(session_id=otp_session_id)
            print(f"Debug: OTP record found - Phone: {otp_record.phone}, OTP: {otp_record.otp_code}, Type: {otp_record.verification_type}")
            print(f"Debug: Company phone: {company_phone}")
            
            # Check if OTP is for company registration
            if otp_record.verification_type != 'company_registration':
                return Response({"error": "OTP is not valid for company registration"}, status=400)
            
            # Check if OTP is expired (but allow reuse for verification)
            if otp_record.is_expired():
                print(f"Debug: OTP has expired")
                return Response({"error": "OTP has expired"}, status=400)
            
            # Clean the phone number from OTP record for comparison
            otp_phone_clean = otp_record.phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
            print(f"Debug: OTP phone cleaned: {otp_phone_clean}")
            print(f"Debug: Company phone: {company_phone}")
            
            if otp_phone_clean != company_phone:
                return Response({"error": f"Phone number mismatch: OTP phone ({otp_phone_clean}) != Company phone ({company_phone})"}, status=400)
        except OTPVerification.DoesNotExist:
            return Response({"error": "Invalid OTP session"}, status=400)
        
        with transaction.atomic():
            # Create company
            company = Company.objects.create(
                name=company_data['name'],
                code=company_data['code'],
                email=company_data.get('email', ''),
                phone=company_phone,
                address=company_data.get('address', ''),
                phone_verified=True
            )
            
            # Create admin user for the company
            admin_data = data.get('admin', {})
            admin_username = admin_data.get('username')
            admin_password = admin_data.get('password')
            
            if not admin_username or not admin_password:
                return Response({"error": "Admin username and password are required"}, status=400)
            
            # Check if username already exists
            if User.objects.filter(username=admin_username).exists():
                return Response({"error": "Username already exists"}, status=400)
            
            admin_user = User.objects.create_user(
                username=admin_username,
                password=admin_password,
                first_name=f"مدير {company_data['name']}",
                email=company_data.get('email', ''),
                phone=company_phone,
                company=company,
                account_type='company_owner',
                user_type='admin',
                role='owner',
                is_staff=True,
                is_active=True
            )
            
            # Mark OTP as used after successful company registration
            otp_record.is_used = True
            otp_record.save()
            
            return Response({
                "success": True,
                "message": "Company and admin account created successfully",
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "code": company.code,
                    "email": company.email,
                    "phone": company.phone
                },
                "admin": {
                    "username": admin_username,
                    "message": "يمكنك الآن تسجيل الدخول باستخدام هذه البيانات"
                }
            })
            
    except Exception as e:
        return Response({"error": str(e)}, status=400)


# Staff Registration API
@api_view(["POST"])
@api_company_owner_required
def api_register_staff(request):
    # Check if user is company owner (only owners can register staff)
    if request.user.account_type != 'company_owner':
        return Response({"error": "Only company owners can register staff"}, status=403)
    """Register a new staff user for the current company"""
    try:
        if not can_manage_company(request.user):
            return Response({"error": "Unauthorized"}, status=403)
        
        data = request.data
        
        # Clean phone number
        phone = data.get('phone', '')
        if phone:
            phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        
        # Validate required fields
        if not data.get('username') or not data.get('email') or not data.get('password'):
            return Response({"error": "Username, email, and password are required"}, status=400)
        
        # Check if username or email already exists
        if User.objects.filter(username=data['username']).exists():
            return Response({"error": "Username already exists"}, status=400)
        
        if User.objects.filter(email=data['email']).exists():
            return Response({"error": "Email already exists"}, status=400)
        
        # Create staff user
        user = User.objects.create_user(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            phone=phone,
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            company=request.user.company,
            account_type='company_staff',
            role='staff',
            user_type='user',
            is_active=True
        )
        
        return Response({
            "success": True,
            "message": "Staff user created successfully",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "company": user.company.name
            }
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)


# Company Users List API
@api_view(["GET"])
@api_company_owner_required
def api_company_users(request):
    """Get all users for the current company"""
    try:
        if not can_manage_company(request.user):
            return Response({"error": "Unauthorized"}, status=403)
        
        users = company_queryset(User, request.user).exclude(id=request.user.id)
        
        return Response([{
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "role": user.role,
            "role_display": user.get_role_display(),
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat(),
            "last_login": user.last_login.isoformat() if user.last_login else None
        } for user in users])
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)


# OTP Send API
@api_view(["POST"])
@permission_classes([])  # No authentication required
def api_send_otp(request):
    """Send OTP via WhatsApp"""
    try:
        data = request.data
        phone = data.get('phone', '').strip()
        verification_type = data.get('verification_type', 'company_registration')
        
        if not phone:
            return Response({"error": "Phone number is required"}, status=400)
        
        # Clean phone number (remove +, spaces, dashes, parentheses)
        clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        
        # Validate phone number format
        if len(clean_phone) < 10:
            return Response({"error": "Phone number must be at least 10 digits"}, status=400)
        
        # Generate 6-digit OTP
        otp_code = str(random.randint(100000, 999999))
        
        # Create OTP record
        otp_record = OTPVerification.objects.create(
            phone=clean_phone,
            otp_code=otp_code,
            verification_type=verification_type
        )
        
        # For forgot password, verify username exists
        if verification_type == 'forgot_password':
            username = request.data.get('username')
            if not username:
                return Response({"error": "اسم المستخدم مطلوب لإعادة تعيين كلمة المرور"}, status=400)
            
            try:
                user = User.objects.get(username=username, phone=clean_phone)
            except User.DoesNotExist:
                return Response({"error": "اسم المستخدم أو رقم الهاتف غير صحيح"}, status=400)
        webhook_url = f"https://n8n.srv772321.hstgr.cloud/webhook/7d526f0e-36a0-4d77-a05b-e9a0fe46785a"
        requests.post(webhook_url, json={"phone": clean_phone, "otp_code": otp_code})

        print(f"WhatsApp Message to {clean_phone}: Your OTP code is: {otp_code}")
        
        return Response({
            "success": True,
            "message": "OTP sent successfully",
            "session_id": str(otp_record.session_id),
            "expires_in": 300  # 5 minutes in seconds
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)


# OTP Verify API
@api_view(["POST"])
@permission_classes([])  # No authentication required
def api_verify_otp(request):
    """Verify OTP code"""
    try:
        data = request.data
        session_id = data.get('session_id')
        otp_code = data.get('otp_code', '').strip()
        
        if not session_id or not otp_code:
            return Response({"error": "Session ID and OTP code are required"}, status=400)
        
        try:
            otp_record = OTPVerification.objects.get(session_id=session_id)
            print(f"Debug: OTP record found - Phone: {otp_record.phone}, OTP: {otp_record.otp_code}")
            print(f"Debug: Provided OTP: {otp_code}")
        except OTPVerification.DoesNotExist:
            return Response({"error": "Invalid session ID"}, status=400)
        
        # Check if OTP is expired (but allow reuse for verification)
        if otp_record.is_expired():
            print(f"Debug: OTP has expired")
            return Response({"error": "OTP has expired"}, status=400)
        
        # Verify OTP code
        print(f"Debug: Comparing OTP codes - Stored: {otp_record.otp_code}, Provided: {otp_code}")
        if otp_record.otp_code != otp_code:
            return Response({"error": "Invalid OTP code"}, status=400)
        
        # Don't mark OTP as used here - let the specific endpoints handle it
        # This allows the same OTP to be verified for different purposes
        
        return Response({
            "success": True,
            "message": "OTP verified successfully",
            "phone": otp_record.phone,
            "verification_type": otp_record.verification_type
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(["POST"])
@permission_classes([])  # No authentication required
def api_reset_password(request):
    """Reset user password after OTP verification"""
    try:
        username = request.data.get('username')
        phone = request.data.get('phone')
        new_password = request.data.get('new_password')
        otp_session_id = request.data.get('otp_session_id')
        
        if not all([username, phone, new_password, otp_session_id]):
            return Response({"error": "جميع الحقول مطلوبة"}, status=400)
        
        # Clean phone number
        clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        
        # Verify OTP
        try:
            otp_record = OTPVerification.objects.get(
                session_id=otp_session_id,
                phone=clean_phone,
                verification_type='forgot_password'
            )
        except OTPVerification.DoesNotExist:
            return Response({"error": "رمز التحقق غير صحيح"}, status=400)
        
        if not otp_record.is_valid():
            return Response({"error": "رمز التحقق منتهي الصلاحية"}, status=400)
        
        # Find user by username and phone
        try:
            user = User.objects.get(username=username, phone=clean_phone)
        except User.DoesNotExist:
            return Response({"error": "اسم المستخدم أو رقم الهاتف غير صحيح"}, status=400)
        
        # Update password
        user.set_password(new_password)
        user.save()
        
        # Mark OTP as used
        otp_record.is_used = True
        otp_record.save()
        
        return Response({"message": "تم إعادة تعيين كلمة المرور بنجاح"})
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)


# Return Management APIs
@api_view(["GET"])
@api_company_staff_required
def api_returns(request):
    """Get all returns for the company"""
    returns = company_queryset(Return, request.user).select_related('original_invoice', 'customer', 'created_by')
    return Response([{
        "id": r.id,
        "return_number": r.return_number,
        "original_invoice": f"فاتورة #{r.original_invoice.id}",
        "customer_name": r.customer.name,
        "status": r.status,
        "status_display": r.get_status_display(),
        "total_amount": float(r.total_amount),
        "return_date": r.return_date.isoformat(),
        "created_by": r.created_by.username
    } for r in returns])


@api_view(["POST"])
@api_company_owner_required
def api_create_return(request):
    """Create new return"""
    try:
        data = request.data
        invoice_id = data.get('invoice_id')
        notes = data.get('notes', '')
        items = data.get('items', [])
        
        if not all([invoice_id, items]):
            return Response({"error": "جميع الحقول مطلوبة"}, status=400)
        
        # Get original invoice
        try:
            invoice = company_queryset(Invoice, request.user).get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response({"error": "الفاتورة غير موجودة"}, status=404)
        
        # Create return
        return_obj = Return.objects.create(
            company=request.user.company,
            original_invoice=invoice,
            customer=invoice.customer,
            notes=notes,
            created_by=request.user
        )
        
        # Create return items
        total_amount = 0
        for item_data in items:
            original_item_id = item_data.get('original_item_id')
            qty_returned = item_data.get('qty_returned')
            
            try:
                original_item = InvoiceItem.objects.get(id=original_item_id, invoice=invoice)
            except InvoiceItem.DoesNotExist:
                return Response({"error": f"عنصر الفاتورة {original_item_id} غير موجود"}, status=404)
            
            # Validate quantity
            if qty_returned > original_item.qty:
                return Response({"error": f"الكمية المرتجعة ({qty_returned}) أكبر من الكمية المباعة ({original_item.qty})"}, status=400)
            
            return_item = ReturnItem.objects.create(
                return_obj=return_obj,
                original_item=original_item,
                product=original_item.product,
                qty_returned=qty_returned,
                unit_price=original_item.price_at_add
            )
            
            total_amount += float(return_item.line_total)
        
        return_obj.total_amount = total_amount
        return_obj.save()
        
        return Response({
            "id": return_obj.id,
            "return_number": return_obj.return_number,
            "total_amount": float(return_obj.total_amount),
            "status": return_obj.status
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(["GET"])
@api_company_staff_required
def api_return_details(request, return_id):
    """Get return details with items"""
    try:
        return_obj = company_queryset(Return, request.user).get(id=return_id)
        items = return_obj.items.all()
        
        return Response({
            "id": return_obj.id,
            "return_number": return_obj.return_number,
            "original_invoice": f"فاتورة #{return_obj.original_invoice.id}",
            "customer_name": return_obj.customer.name,
            "status": return_obj.status,
            "status_display": return_obj.get_status_display(),
            "total_amount": float(return_obj.total_amount),
            "return_date": return_obj.return_date.isoformat(),
            "notes": return_obj.notes,
            "created_by": return_obj.created_by.username,
            "items": [{
                "id": item.id,
                "product_name": item.product.name,
                "product_sku": item.product.sku,
                "qty_returned": float(item.qty_returned),
                "unit_price": float(item.unit_price),
                "line_total": float(item.line_total)
            } for item in items]
        })
        
    except Return.DoesNotExist:
        return Response({"error": "المرتجع غير موجود"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(["POST"])
@api_company_owner_required
def api_approve_return(request, return_id):
    """Approve return and update inventory"""
    try:
        return_obj = company_queryset(Return, request.user).get(id=return_id)
        
        if return_obj.status != 'pending':
            return Response({"error": "يمكن الموافقة على المرتجعات المعلقة فقط"}, status=400)
        
        # Update return status
        return_obj.status = 'approved'
        return_obj.approved_by = request.user
        return_obj.approved_at = timezone.now()
        return_obj.save()
        
        # Update inventory for each returned item
        for item in return_obj.items.all():
            product = item.product
            product.stock_qty += item.qty_returned
            product.save()
        
        # Update customer balance after return approval
        update_customer_balance(return_obj.customer, request.user.company)
        
        return Response({
            "message": "تم الموافقة على المرتجع بنجاح",
            "status": return_obj.status
        })
        
    except Return.DoesNotExist:
        return Response({"error": "المرتجع غير موجود"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(["POST"])
@api_company_owner_required
def api_reject_return(request, return_id):
    """Reject return"""
    try:
        return_obj = company_queryset(Return, request.user).get(id=return_id)
        
        if return_obj.status != 'pending':
            return Response({"error": "يمكن رفض المرتجعات المعلقة فقط"}, status=400)
        
        return_obj.status = 'rejected'
        return_obj.approved_by = request.user
        return_obj.approved_at = timezone.now()
        return_obj.save()
        
        return Response({
            "message": "تم رفض المرتجع",
            "status": return_obj.status
        })
        
    except Return.DoesNotExist:
        return Response({"error": "المرتجع غير موجود"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(["GET"])
@api_company_staff_required
def api_invoice_returnable_items(request, invoice_id):
    """Get returnable items from an invoice"""
    try:
        invoice = company_queryset(Invoice, request.user).get(id=invoice_id)
        items = invoice.items.all()
        
        returnable_items = []
        for item in items:
            # Calculate already returned quantity
            returned_qty = sum(
                return_item.qty_returned 
                for return_item in ReturnItem.objects.filter(
                    original_item=item,
                    return_obj__status__in=['approved', 'completed']
                )
            )
            
            available_qty = item.qty - returned_qty
            
            if available_qty > 0:
                returnable_items.append({
                    "id": item.id,
                    "product_name": item.product.name,
                    "product_sku": item.product.sku,
                    "qty_sold": float(item.qty),
                    "qty_returned": float(returned_qty),
                    "qty_available": float(available_qty),
                    "unit_price": float(item.price_at_add),
                    "line_total": float(item.line_total)
                })
        
        return Response(returnable_items)
        
    except Invoice.DoesNotExist:
        return Response({"error": "الفاتورة غير موجودة"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)


# WhatsApp Webhook API
@api_view(["POST"])
def api_whatsapp_webhook(request):
    """Webhook to receive WhatsApp messages and process them with the bot"""
    try:
        from .whatsapp_bot import whatsapp_bot
        
        data = request.data
        
        # Check if this is a webhook from WhatsApp (with entry structure)
        if 'entry' in data:
            # Process webhook using the bot
            success = whatsapp_bot.handle_webhook(data)
            if success:
                return Response({"status": "success"})
            else:
                return Response({"error": "Failed to process webhook"}, status=500)
        
        # Check if this is a direct message (phone and message)
        phone = data.get('phone', '').strip()
        message = data.get('message', '').strip()
        
        if not phone or not message:
            return Response({"error": "Phone and message are required"}, status=400)
        
        # Check if this is an OTP request
        if 'otp' in message.lower() or 'verify' in message.lower():
            # Generate and send OTP
            import random
            otp_code = str(random.randint(100000, 999999))
            
            # Create OTP record
            otp_record = OTPVerification.objects.create(
                phone=phone,
                otp_code=otp_code,
                verification_type='company_registration'
            )
            
            # Send OTP via WhatsApp
            whatsapp_message = f"رمز التحقق الخاص بك هو: {otp_code}\n\nهذا الرمز صالح لمدة 5 دقائق.\n\nStockly Team"
            whatsapp_bot.send_message(phone, whatsapp_message)
            
            return Response({
                "success": True,
                "message": "OTP sent via WhatsApp",
                "session_id": str(otp_record.session_id)
            })
        
        # Process regular message with the bot
        response = whatsapp_bot.process_message(phone, message)
        whatsapp_bot.send_message(phone, response)
        
        return Response({
            "success": True,
            "message": "Message processed",
            "response": response
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)

# Get Auth Token API
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def api_get_token(request):
    """Get or create auth token for the current user"""
    try:
        token, created = Token.objects.get_or_create(user=request.user)
        return Response({
            "success": True,
            "token": token.key,
            "created": created
        })
    except Exception as e:
        return Response({"error": str(e)}, status=400)

# User Management APIs
@api_view(["DELETE"])
@api_company_owner_required
def api_delete_user(request, user_id):
    # Check if user is company owner (only owners can delete users)
    if request.user.account_type != 'company_owner':
        return Response({"error": "Only company owners can delete users"}, status=403)
    """Delete a user (only company users, not superuser)"""
    try:
        if not can_manage_company(request.user):
            return Response({"error": "Unauthorized"}, status=403)
        
        # Get user to delete
        if request.user.is_superuser:
            # Superuser can delete any company user
            user = User.objects.filter(id=user_id, account_type__in=['company_owner', 'company_staff']).first()
        else:
            # Company admin can only delete users from their company
            user = User.objects.filter(id=user_id, company=request.user.company).first()
        
        if not user:
            return Response({"error": "User not found"}, status=404)
        
        # Prevent deleting superuser
        if user.is_superuser:
            return Response({"error": "Cannot delete superuser"}, status=403)
        
        # Prevent deleting yourself
        if user.id == request.user.id:
            return Response({"error": "Cannot delete yourself"}, status=403)
        
        user.delete()
        return Response({"success": True, "message": "User deleted successfully"})
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)


# Payment Management APIs
@api_view(["GET"])
@api_company_staff_required
def api_payments(request):
    """Get all payments for the company"""
    payments = company_queryset(Payment, request.user).select_related('customer', 'invoice', 'created_by')
    return Response([{
        "id": p.id,
        "customer_id": p.customer.id,
        "customer_name": p.customer.name,
        "invoice_id": p.invoice.id if p.invoice else None,
        "amount": float(p.amount),
        "payment_method": p.payment_method,
        "payment_method_display": p.get_payment_method_display(),
        "payment_date": p.payment_date.isoformat(),
        "notes": p.notes,
        "created_by": p.created_by.username
    } for p in payments])


@api_view(["POST"])
@api_company_owner_required
def api_create_payment(request):
    """Create new payment"""
    try:
        data = request.data
        customer_id = data.get('customer_id')
        invoice_id = data.get('invoice_id')  # Optional
        amount = data.get('amount')
        payment_method = data.get('payment_method', 'cash')
        notes = data.get('notes', '')
        
        if not all([customer_id, amount]):
            return Response({"error": "معرف العميل والمبلغ مطلوبان"}, status=400)
        
        # Get customer
        try:
            customer = company_queryset(Customer, request.user).get(id=customer_id)
        except Customer.DoesNotExist:
            return Response({"error": "العميل غير موجود"}, status=404)
        
        # Get invoice if provided
        invoice = None
        if invoice_id:
            try:
                invoice = company_queryset(Invoice, request.user).get(id=invoice_id)
            except Invoice.DoesNotExist:
                return Response({"error": "الفاتورة غير موجودة"}, status=404)
        
        # Create payment
        payment = Payment.objects.create(
            company=request.user.company,
            customer=customer,
            invoice=invoice,
            amount=amount,
            payment_method=payment_method,
            notes=notes,
            created_by=request.user
        )
        
        # Update customer balance
        update_customer_balance(customer, request.user.company)
        
        return Response({
            "id": payment.id,
            "amount": float(payment.amount),
            "payment_method": payment.payment_method,
            "payment_date": payment.payment_date.isoformat()
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(["GET"])
@api_company_staff_required
def api_customer_balances(request):
    """Get customer balances"""
    balances = company_queryset(CustomerBalance, request.user).select_related('customer')
    return Response([{
        "customer_id": b.customer.id,
        "customer_name": b.customer.name,
        "total_invoiced": float(b.total_invoiced),
        "total_paid": float(b.total_paid),
        "total_returns": float(b.total_returns),
        "balance": float(b.balance),
        "last_updated": b.last_updated.isoformat()
    } for b in balances])


@api_view(["GET"])
@api_company_staff_required
def api_customer_payments(request, customer_id):
    """Get payments for specific customer"""
    try:
        customer = company_queryset(Customer, request.user).get(id=customer_id)
        payments = company_queryset(Payment, request.user).filter(customer=customer).select_related('invoice', 'created_by')
        
        return Response([{
            "id": p.id,
            "invoice_id": p.invoice.id if p.invoice else None,
            "amount": float(p.amount),
            "payment_method": p.payment_method,
            "payment_method_display": p.get_payment_method_display(),
            "payment_date": p.payment_date.isoformat(),
            "notes": p.notes,
            "created_by": p.created_by.username
        } for p in payments])
        
    except Customer.DoesNotExist:
        return Response({"error": "العميل غير موجود"}, status=404)


@api_view(["GET"])
@api_company_staff_required
def api_customer_invoices(request, customer_id):
    """Get invoices for specific customer"""
    try:
        customer = company_queryset(Customer, request.user).get(id=customer_id)
        invoices = company_queryset(Invoice, request.user).filter(customer=customer, status='confirmed').order_by('-created_at')
        
        return Response([{
            "id": inv.id,
            "invoice_number": f"فاتورة #{inv.id}",
            "customer_name": inv.customer.name,
            "total_amount": float(inv.total_amount),
            "status": inv.status,
            "status_display": inv.get_status_display(),
            "created_at": inv.created_at.strftime('%Y-%m-%d %H:%M')
        } for inv in invoices])
        
    except Customer.DoesNotExist:
        return Response({"error": "العميل غير موجود"}, status=404)


@api_view(["GET"])
@api_company_staff_required
def api_invoice_payments(request, invoice_id):
    """Get payments for specific invoice"""
    try:
        invoice = company_queryset(Invoice, request.user).get(id=invoice_id)
        payments = company_queryset(Payment, request.user).filter(invoice=invoice).select_related('created_by')
        
        total_paid = sum(p.amount for p in payments)
        remaining = float(invoice.total_amount) - float(total_paid)
        
        return Response({
            "invoice_id": invoice.id,
            "total_amount": float(invoice.total_amount),
            "total_paid": float(total_paid),
            "remaining": remaining,
            "payments": [{
                "id": p.id,
                "amount": float(p.amount),
                "payment_method": p.payment_method,
                "payment_method_display": p.get_payment_method_display(),
                "payment_date": p.payment_date.isoformat(),
                "notes": p.notes,
                "created_by": p.created_by.username
            } for p in payments]
        })
        
    except Invoice.DoesNotExist:
        return Response({"error": "الفاتورة غير موجودة"}, status=404)


def update_customer_balance(customer, company):
    """Update customer balance"""
    try:
        balance, created = CustomerBalance.objects.get_or_create(
            customer=customer,
            company=company,
            defaults={
                'total_invoiced': 0,
                'total_paid': 0,
                'total_returns': 0,
                'balance': 0
            }
        )
        
        # Calculate totals
        total_invoiced = sum(inv.total_amount for inv in customer.invoices.filter(company=company, status='confirmed'))
        total_paid = sum(pay.amount for pay in Payment.objects.filter(customer=customer, company=company))
        total_returns = sum(ret.total_amount for ret in Return.objects.filter(customer=customer, company=company, status='approved'))
        
        balance.total_invoiced = total_invoiced
        balance.total_paid = total_paid
        balance.total_returns = total_returns
        balance.calculate_balance()
        
    except Exception as e:
        print(f"Error updating customer balance: {e}")

@api_view(["GET"])
@api_company_staff_required
def api_search_invoices(request):
    """Search invoices for return creation"""
    query = request.GET.get('q', '').strip()
    
    if not query:
        return Response([])
    
    # Search in confirmed invoices only
    invoices = company_queryset(Invoice, request.user).filter(
        status='confirmed',
        id__icontains=query
    ).select_related('customer').order_by('-created_at')[:10]
    
    # Also search by customer name
    customer_invoices = company_queryset(Invoice, request.user).filter(
        status='confirmed',
        customer__name__icontains=query
    ).select_related('customer').order_by('-created_at')[:10]
    
    # Combine and remove duplicates
    all_invoices = list(invoices) + list(customer_invoices)
    unique_invoices = {inv.id: inv for inv in all_invoices}.values()
    
    return Response([{
        "id": inv.id,
        "invoice_number": f"فاتورة #{inv.id}",
        "customer_name": inv.customer.name,
        "total_amount": float(inv.total_amount),
        "created_at": inv.created_at.strftime('%Y-%m-%d %H:%M'),
        "status": inv.status,
        "status_display": inv.get_status_display()
    } for inv in unique_invoices])
