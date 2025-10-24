from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Count, Q, Sum, Max, F, Case, When, DecimalField
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from datetime import datetime, timedelta
from .models import Product, Customer, Invoice, InvoiceItem, Category, Company, User, OTPVerification, Return, ReturnItem, Payment, CustomerBalance
from .api_v1 import update_customer_balance
from django.http import JsonResponse
from functools import wraps

def api_superuser_required(view_func):
    """
    Decorator for API views that requires superuser access only
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        # Check for token authentication
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Token '):
            return JsonResponse({'error': 'Token authentication required'}, status=401)
        
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
        except Token.DoesNotExist:
            return JsonResponse({'error': 'Invalid token'}, status=401)
        
        # Check if user is superuser
        if not user.is_superuser:
            return JsonResponse({'error': 'Superuser access required'}, status=403)
        
        # Set the user on the request
        request.user = user
        
        return view_func(request, *args, **kwargs)
    return _wrapped_view

# ==================== COMPANY MANAGEMENT ====================

# ==================== PRODUCTS MANAGEMENT ====================

@api_view(["GET"])
@api_superuser_required
def admin_search_products(request):
    """Search products across all companies (superuser only)"""
    query = request.GET.get("query", "").strip()
    company_id = request.GET.get("company_id")
    
    products = Product.objects.select_related('category', 'company').filter(archived=False)
    
    if company_id:
        try:
            company = Company.objects.get(id=company_id)
            products = products.filter(company=company)
        except Company.DoesNotExist:
            return Response({"error": "Company not found"}, status=404)
    
    if query:
        products = products.filter(
            Q(name__icontains=query) | 
            Q(sku__icontains=query) |
            Q(description__icontains=query)
        )
    
    return Response([{
        "id": p.id,
        "sku": p.sku,
        "name": p.name,
        "price": float(p.price),
        "stock_qty": p.stock_qty,
        "category_name": p.category.name if p.category else None,
        "company": p.company.name,
        "company_id": p.company.id
    } for p in products[:50]])

# ==================== CUSTOMERS MANAGEMENT ====================

# ==================== INVOICES MANAGEMENT ====================

@api_view(["GET"])
@api_superuser_required
def admin_get_invoice_details(request, invoice_id):
    """Get detailed information about a specific invoice (superuser only)"""
    try:
        invoice = Invoice.objects.select_related('customer', 'company').get(id=invoice_id)
        
        return Response({
            "id": invoice.id,
            "customer": {
                "id": invoice.customer.id,
                "name": invoice.customer.name,
                "phone": invoice.customer.phone
            },
            "company": {
                "id": invoice.company.id,
                "name": invoice.company.name
            },
            "status": invoice.status,
            "status_display": invoice.get_status_display(),
            "created_at": invoice.created_at.isoformat(),
            "items": [{
                "id": it.id,
                "name": it.product.name,
                "sku": it.product.sku,
                "qty": float(it.qty),
                "price": float(it.price_at_add),
                "line_total": float(it.line_total),
                "unit": it.product.unit,
                "unit_display": it.product.get_unit_display() if it.product.unit else None
            } for it in invoice.items.all()],
            "total_amount": float(invoice.total_amount)
        })
    except Invoice.DoesNotExist:
        return Response({"error": "Invoice not found"}, status=404)

# ==================== RETURNS MANAGEMENT ====================

# ==================== PAYMENTS MANAGEMENT ====================

@api_view(["GET"])
@api_superuser_required
def admin_get_company_payments_by_phone(request):
    """Get all payments for a company by phone number (superuser only)"""
    phone = request.GET.get('phone', '').strip()
    
    if not phone:
        return Response({"error": "Phone number is required"}, status=400)
    
    # Clean phone number
    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    
    try:
        company = Company.objects.get(phone=clean_phone)
        payments = Payment.objects.filter(company=company).select_related('customer', 'invoice', 'created_by')
        
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
            "created_by": p.created_by.username,
            "company": company.name,
            "company_phone": company.phone
        } for p in payments])
    except Company.DoesNotExist:
        return Response({"error": "Company not found with this phone number"}, status=404)

@api_view(["POST"])
@api_superuser_required
def admin_add_payment_by_phone(request):
    """Add payment for a company by phone number (superuser only)"""
    data = request.data
    phone = str(data.get('phone', '')).strip()
    customer_id = data.get('customer_id')
    customer_name = str(data.get('customer_name', '')).strip()
    amount = data.get('amount')
    payment_method = data.get('payment_method', 'cash')
    invoice_id = data.get('invoice_id')
    notes = str(data.get('notes', '')).strip()

    if not phone or not amount:
        return Response({"error": "phone_and_amount_required"}, status=400)

    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')

    try:
        company = Company.objects.get(phone=clean_phone)
    except Company.DoesNotExist:
        return Response({"error": "company_not_found"}, status=404)

    # Find customer
    customer = None
    if customer_id:
        try:
            customer = Customer.objects.get(id=customer_id, company=company)
        except Customer.DoesNotExist:
            return Response({"error": "customer_not_found"}, status=404)
    elif customer_name:
        customer = Customer.objects.filter(company=company, name__iexact=customer_name).first()
        if not customer:
            return Response({"error": "customer_not_found"}, status=404)
    else:
        return Response({"error": "customer_id_or_name_required"}, status=400)

    # Find invoice if provided
    invoice = None
    if invoice_id:
        try:
            invoice = Invoice.objects.get(id=invoice_id, company=company)
        except Invoice.DoesNotExist:
            return Response({"error": "invoice_not_found"}, status=404)

    # Get superuser for created_by
    superuser = request.user

    payment = Payment.objects.create(
        company=company,
        customer=customer,
        invoice=invoice,
        amount=float(amount),
        payment_method=payment_method,
        notes=notes,
        created_by=superuser
    )

    # Update customer balance
    try:
        update_customer_balance(customer, company)
    except Exception as e:
        print(f"Error updating customer balance: {e}")

    return Response({
        "id": payment.id,
        "amount": float(payment.amount),
        "payment_method": payment.payment_method,
        "payment_method_display": payment.get_payment_method_display(),
        "customer_name": customer.name,
        "invoice_id": invoice.id if invoice else None,
        "company": company.name
    }, status=201)

@api_view(["POST"])
@api_superuser_required
def admin_withdraw_payment_by_phone(request):
    """Withdraw/refund payment for a company by phone number (superuser only)"""
    data = request.data
    phone = str(data.get('phone', '')).strip()
    customer_name = str(data.get('customer_name', '')).strip()
    amount = data.get('amount')
    payment_method = data.get('payment_method', 'cash')
    notes = str(data.get('notes', '')).strip()

    if not phone or not customer_name or not amount:
        return Response({"error": "phone_customer_name_and_amount_required"}, status=400)

    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')

    try:
        company = Company.objects.get(phone=clean_phone)
    except Company.DoesNotExist:
        return Response({"error": "company_not_found"}, status=404)

    # Find customer by name
    customer = Customer.objects.filter(company=company, name__iexact=customer_name).first()
    if not customer:
        return Response({"error": "customer_not_found"}, status=404)

    # Create withdrawal payment (negative amount)
    withdrawal_payment = Payment.objects.create(
        company=company,
        customer=customer,
        invoice=None,  # Withdrawals are not tied to specific invoices
        amount=-float(amount),  # Negative amount for withdrawal
        payment_method=payment_method,  # Use provided payment method
        notes=f"سحب من رصيد العميل {customer_name}" + (f": {notes}" if notes else ""),
        created_by=request.user
    )

    # Update customer balance
    try:
        update_customer_balance(customer, company)
    except Exception as e:
        print(f"Error updating customer balance: {e}")

    return Response({
        "id": withdrawal_payment.id,
        "amount": float(withdrawal_payment.amount),
        "payment_method": withdrawal_payment.payment_method,
        "payment_method_display": withdrawal_payment.get_payment_method_display(),
        "customer_name": customer.name,
        "customer_id": customer.id,
        "notes": notes,
        "company": company.name
    }, status=201)

# ==================== USERS MANAGEMENT ====================

# ==================== SYSTEM STATISTICS ====================

#@api_view(["GET"])
#@api_superuser_required
#def admin_system_stats(request):
    # """Get system-wide statistics (superuser only)"""
    # total_companies = Company.objects.count()
    # total_users = User.objects.filter(account_type__in=['company_owner', 'company_staff']).count()
    # total_products = Product.objects.count()
    # total_customers = Customer.objects.count()
    # total_invoices = Invoice.objects.count()
    # total_sales = Invoice.objects.filter(status='confirmed').aggregate(
    #     total=Sum('total_amount'))['total'] or 0
    
    # # Get recent activity
    # recent_invoices = Invoice.objects.select_related('company', 'customer').order_by('-created_at')[:10]
    
    # return Response({
    #     "system_stats": {
    #         "total_companies": total_companies,
    #         "total_users": total_users,
    #         "total_products": total_products,
    #         "total_customers": total_customers,
    #         "total_invoices": total_invoices,
    #         "total_sales": float(total_sales)
    #     },
    #     "recent_activity": [{
    #         "id": inv.id,
    #         "company": inv.company.name,
    #         "customer": inv.customer.name,
    #         "amount": float(inv.total_amount),
    #         "status": inv.status,
    #         "created_at": inv.created_at.isoformat()
    #     } for inv in recent_invoices]
    # })

# ==================== CATEGORIES MANAGEMENT ====================

# ==================== PHONE-BASED ENDPOINTS ====================

@api_view(["POST"])
@api_superuser_required
def admin_add_category_by_phone(request):
    """Add category for a company by phone number (superuser only)"""
    phone = str(request.data.get('phone', '')).strip()
    name = str(request.data.get('name', '')).strip()
    parent_id = request.data.get('parent_id')
    parent_name = str(request.data.get('parent_name', '')).strip()

    if not phone or not name:
        return Response({"error": "phone_and_name_required"}, status=400)

    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')

    try:
        company = Company.objects.get(phone=clean_phone)
    except Company.DoesNotExist:
        return Response({"error": "company_not_found"}, status=404)

    parent = None
    if parent_id:
        try:
            parent = Category.objects.get(id=parent_id, company=company)
        except Category.DoesNotExist:
            return Response({"error": "parent_category_not_found"}, status=404)
    elif parent_name:
        parent = Category.objects.filter(company=company, name__iexact=parent_name).first()

    category = Category.objects.create(company=company, name=name, parent=parent)
    return Response({
        "id": category.id,
        "name": category.name,
        "parent_id": category.parent.id if category.parent else None,
        "company": company.name
    }, status=201)

@api_view(["POST"])
@api_superuser_required
def admin_add_product_by_phone(request):
    """Add product for a company by phone number (superuser only)"""
    data = request.data
    phone = str(data.get('phone', '')).strip()
    name = str(data.get('name', '')).strip()
    price = data.get('price')
    stock_qty = data.get('stock_qty')
    category_id = data.get('category_id')
    category_name = str(data.get('category_name', '')).strip()

    # Print received data for debugging
    print(f"[DEBUG] Received data: {data}")
    print(f"[DEBUG] Phone: {phone}, Name: {name}, Price: {price}, Stock: {stock_qty}")
    print(f"[DEBUG] Category ID: {category_id}, Category Name: {category_name}")

    if not phone or not name or price is None or stock_qty is None:
        return Response({"error": "missing_required_fields"}, status=400)

    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    print(f"[DEBUG] Clean phone: {clean_phone}")

    try:
        company = Company.objects.get(phone=clean_phone)
        print(f"[DEBUG] Found company: {company.name} (ID: {company.id})")
    except Company.DoesNotExist:
        print(f"[DEBUG] Company not found with phone: {clean_phone}")
        return Response({"error": "company_not_found"}, status=404)

    category = None
    if category_id:
        try:
            category = Category.objects.get(id=category_id, company=company)
            print(f"[DEBUG] Found category by ID: {category.name} (ID: {category.id})")
        except Category.DoesNotExist:
            print(f"[DEBUG] Category not found with ID: {category_id}")
            return Response({"error": "category_not_found"}, status=404)
    elif category_name:
        category = Category.objects.filter(company=company, name__iexact=category_name).first()
        if category:
            print(f"[DEBUG] Found category by name: {category.name} (ID: {category.id})")
        else:
            print(f"[DEBUG] Category not found with name: {category_name}")
            return Response({"error": "category_not_found"}, status=404)
    else:
        print(f"[DEBUG] No category specified - category is required")
        return Response({"error": "category_required"}, status=400)

    product_data = {
        "company": company,
        "name": name,
        "price": float(price),
        "stock_qty": int(stock_qty),
        "category": category  # Category is required
    }

    # Optional fields
    for opt in ["sku", "unit", "measurement", "description"]:
        if data.get(opt) not in [None, ""]:
            product_data[opt] = data.get(opt)
    for opt_num in ["cost_price", "wholesale_price", "retail_price"]:
        if data.get(opt_num) not in [None, ""]:
            product_data[opt_num] = float(data.get(opt_num))

    print(f"[DEBUG] Product data to create: {product_data}")

    try:
        product = Product.objects.create(**product_data)
        print(f"[DEBUG] Product created successfully with ID: {product.id}")
        return Response({
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
            "price": float(product.price),
            "stock_qty": product.stock_qty,
            "category": {"id": product.category.id, "name": product.category.name} if product.category else None,
            "company": company.name
        }, status=201)
    except Exception as e:
        print(f"[ERROR] Failed to create product: {str(e)}")
        print(f"[ERROR] Product data was: {product_data}")
        return Response({"error": f"Failed to create product: {str(e)}"}, status=500)

@api_view(["POST"])
@api_superuser_required
def admin_add_customer_by_phone(request):
    """Add customer for a company by phone number (superuser only)"""
    data = request.data
    phone = str(data.get('phone', '')).strip()
    name = str(data.get('name', '')).strip()

    if not phone or not name:
        return Response({"error": "phone_and_name_required"}, status=400)

    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')

    try:
        company = Company.objects.get(phone=clean_phone)
    except Company.DoesNotExist:
        return Response({"error": "company_not_found"}, status=404)

    customer = Customer.objects.create(
        company=company,
        name=name,
        phone=str(data.get('customer_phone', '')).strip(),
        email=str(data.get('email', '')).strip(),
        address=str(data.get('address', '')).strip()
    )
    return Response({
        "id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "company": company.name
    }, status=201)

@api_view(["GET"])
@api_superuser_required
def admin_get_company_by_phone(request):
    """Get company by phone number (superuser only)"""
    phone = request.GET.get('phone', '').strip()
    
    if not phone:
        return Response({"error": "Phone number is required"}, status=400)
    
    # Clean phone number
    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    
    try:
        company = Company.objects.get(phone=clean_phone)
        return Response({
            "id": company.id,
            "name": company.name,
            "code": company.code,
            "email": company.email,
            "phone": company.phone,
            "address": company.address,
            "is_active": company.is_active,
            "phone_verified": company.phone_verified,
            "created_at": company.created_at.isoformat(),
            "users_count": company.users.count(),
            "products_count": company.products.count(),
            "invoices_count": company.invoices.count()
        })
    except Company.DoesNotExist:
        return Response({"error": "Company not found with this phone number"}, status=404)
    except Company.MultipleObjectsReturned:
        return Response({"error": "Multiple companies found with this phone number"}, status=400)

@api_view(["GET"])
@api_superuser_required
def admin_get_company_products_by_phone(request):
    """Get all products for a company by phone number (superuser only)"""
    phone = request.GET.get('phone', '').strip()
    
    if not phone:
        return Response({"error": "Phone number is required"}, status=400)
    
    # Clean phone number
    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    
    try:
        company = Company.objects.get(phone=clean_phone)
        products = company.products.select_related('category').filter(archived=False)
        
        return Response([{
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "price": float(p.price),
            "stock_qty": p.stock_qty,
            "category_id": p.category.id if p.category else None,
            "category_name": p.category.name if p.category else None,
            "unit": p.unit,
            "unit_display": p.get_unit_display() if p.unit else None,
            "measurement": p.measurement,
            "description": p.description,
            "cost_price": float(p.cost_price) if p.cost_price else None,
            "wholesale_price": float(p.wholesale_price) if p.wholesale_price else None,
            "retail_price": float(p.retail_price) if p.retail_price else None,
            "archived": p.archived,
            "company": company.name,
            "company_phone": company.phone
        } for p in products])
    except Company.DoesNotExist:
        return Response({"error": "Company not found with this phone number"}, status=404)

@api_view(["GET"])
@api_superuser_required
def admin_get_company_customers_by_phone(request):
    """Get all customers for a company by phone number (superuser only)"""
    phone = request.GET.get('phone', '').strip()
    
    if not phone:
        return Response({"error": "Phone number is required"}, status=400)
    
    # Clean phone number
    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    
    try:
        company = Company.objects.get(phone=clean_phone)
        customers = company.customers.filter(archived=False).annotate(
            invoices_count=Count('invoices', distinct=True),
            returns_count=Count('invoices__returns', filter=Q(invoices__returns__status='approved'), distinct=True)
        ).order_by('-created_at')
        
        return Response([{
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "email": c.email,
            "address": c.address,
            "invoices_count": c.invoices_count,
            "returns_count": c.returns_count,
            "archived": c.archived,
            "company": company.name,
            "company_phone": company.phone
        } for c in customers])
    except Company.DoesNotExist:
        return Response({"error": "Company not found with this phone number"}, status=404)

@api_view(["GET"])
@api_superuser_required
def admin_get_customer_details_by_phone(request):
    """Get comprehensive customer details including balance, invoices, returns, and payments (superuser only)"""
    phone = request.GET.get('phone', '').strip()
    customer_name = request.GET.get('customer_name', '').strip()
    
    if not phone:
        return Response({"error": "Phone number is required"}, status=400)
    
    if not customer_name:
        return Response({"error": "customer_name is required"}, status=400)
    
    # Clean phone number
    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    
    try:
        company = Company.objects.get(phone=clean_phone)
    except Company.DoesNotExist:
        return Response({"error": "Company not found with this phone number"}, status=404)
    
    # Find customer by name
    customer = Customer.objects.filter(company=company, name__iexact=customer_name).first()
    if not customer:
        return Response({"error": "Customer not found"}, status=404)
    
    # Get customer balance
    try:
        balance = CustomerBalance.objects.get(customer=customer, company=company)
    except CustomerBalance.DoesNotExist:
        balance = CustomerBalance.objects.create(
            customer=customer,
            company=company,
            total_invoiced=0,
            total_paid=0,
            total_returns=0,
            balance=0
        )
    
    # Get invoices
    invoices = customer.invoices.filter(company=company).order_by('-created_at')
    invoices_data = [{
        "id": inv.id,
        "total_amount": float(inv.total_amount),
        "status": inv.status,
        "status_display": inv.get_status_display(),
        "created_at": inv.created_at.isoformat(),
        "items_count": inv.items.count()
    } for inv in invoices]
    
    # Get payments
    payments = Payment.objects.filter(customer=customer, company=company).order_by('-payment_date')
    payments_data = [{
        "id": p.id,
        "amount": float(p.amount),
        "payment_method": p.payment_method,
        "payment_method_display": p.get_payment_method_display(),
        "payment_date": p.payment_date.isoformat(),
        "invoice_id": p.invoice.id if p.invoice else None,
        "notes": p.notes
    } for p in payments]
    
    # Get returns
    returns = Return.objects.filter(customer=customer, company=company).order_by('-return_date')
    returns_data = [{
        "id": r.id,
        "return_number": r.return_number,
        "original_invoice_id": r.original_invoice.id,
        "total_amount": float(r.total_amount),
        "status": r.status,
        "status_display": r.get_status_display(),
        "return_date": r.return_date.isoformat(),
        "notes": r.notes
    } for r in returns]
    
    return Response({
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "phone": customer.phone,
            "email": customer.email,
            "address": customer.address,
            "company": company.name
        },
        "balance": {
            "total_invoiced": float(balance.total_invoiced),
            "total_paid": float(balance.total_paid),
            "total_withdrawn": float(balance.total_withdrawn),
            "total_returns": float(balance.total_returns),
            "current_balance": float(balance.balance),
            "last_updated": balance.last_updated.isoformat()
        },
        "invoices": invoices_data,
        "payments": payments_data,
        "returns": returns_data,
        "summary": {
            "total_invoices": len(invoices_data),
            "total_payments": len(payments_data),
            "total_returns": len(returns_data),
            "total_invoiced_amount": sum(inv["total_amount"] for inv in invoices_data),
            "total_paid_amount": float(balance.total_paid),
            "total_withdrawn_amount": float(balance.total_withdrawn),
            "total_returned_amount": sum(r["total_amount"] for r in returns_data)
        }
    })

@api_view(["GET"])
@api_superuser_required
def admin_get_company_financial_details_by_phone(request):
    """Get comprehensive company financial details including profits, sales, inventory value (superuser only)"""
    phone = request.GET.get('phone', '').strip()
    
    if not phone:
        return Response({"error": "Phone number is required"}, status=400)
    
    # Clean phone number
    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    
    try:
        company = Company.objects.get(phone=clean_phone)
    except Company.DoesNotExist:
        return Response({"error": "Company not found with this phone number"}, status=404)
    
    # Calculate sales statistics
    confirmed_invoices = company.invoices.filter(status='confirmed')
    total_sales = confirmed_invoices.aggregate(total=Sum('total_amount'))['total'] or 0
    
    # Calculate inventory value (cost and retail)
    products = company.products.filter(archived=False)
    inventory_value_cost = products.exclude(cost_price=None).aggregate(
        total=Sum(F('cost_price') * F('stock_qty'))
    )['total'] or 0
    
    inventory_value_retail = products.aggregate(
        total=Sum(F('price') * F('stock_qty'))
    )['total'] or 0
    
    # Calculate profits (retail value - cost value)
    total_profit_potential = inventory_value_retail - inventory_value_cost
    
    # Calculate payments received
    total_payments = Payment.objects.filter(company=company).aggregate(
        total=Sum('amount')
    )['total'] or 0
    
    # Calculate outstanding receivables
    outstanding_receivables = CustomerBalance.objects.filter(company=company).aggregate(
        total=Sum(
            Case(
                When(balance__gt=0, then='balance'),
                default=0,
                output_field=DecimalField(max_digits=14, decimal_places=4)
            )
        )
    )['total'] or 0
    
    # Get recent activity
    recent_invoices = confirmed_invoices.select_related('customer').order_by('-created_at')[:10]
    recent_invoices_data = [{
        "id": inv.id,
        "customer_name": inv.customer.name,
        "total_amount": float(inv.total_amount),
        "created_at": inv.created_at.isoformat()
    } for inv in recent_invoices]
    
    # Get low stock products
    low_stock_products = products.filter(stock_qty__lt=5)
    low_stock_data = [{
        "id": p.id,
        "name": p.name,
        "sku": p.sku,
        "stock_qty": p.stock_qty,
        "price": float(p.price)
    } for p in low_stock_products]
    
    return Response({
        "company": {
            "id": company.id,
            "name": company.name,
            "code": company.code,
            "phone": company.phone,
            "email": company.email,
            "address": company.address,
            "created_at": company.created_at.isoformat()
        },
        "financial_summary": {
            "total_sales": float(total_sales),
            "total_payments_received": float(total_payments),
            "outstanding_receivables": float(outstanding_receivables),
            "inventory_value_cost": float(inventory_value_cost),
            "inventory_value_retail": float(inventory_value_retail),
            "total_profit_potential": float(total_profit_potential),
            "profit_margin_percentage": round((total_profit_potential / inventory_value_retail * 100) if inventory_value_retail > 0 else 0, 2)
        },
        "inventory": {
            "total_products": products.count(),
            "low_stock_count": low_stock_products.count(),
            "low_stock_products": low_stock_data,
            "total_stock_value_cost": float(inventory_value_cost),
            "total_stock_value_retail": float(inventory_value_retail)
        },
        "sales": {
            "total_invoices": confirmed_invoices.count(),
            "total_sales_amount": float(total_sales),
            "recent_invoices": recent_invoices_data
        },
        "customers": {
            "total_customers": company.customers.filter(archived=False).count(),
            "customers_with_balance": CustomerBalance.objects.filter(company=company, balance__gt=0).count()
        }
    })

@api_view(["GET"])
@api_superuser_required
def admin_get_company_invoices_by_phone(request):
    """Get all invoices for a company by phone number (superuser only)"""
    phone = request.GET.get('phone', '').strip()
    
    if not phone:
        return Response({"error": "Phone number is required"}, status=400)
    
    # Clean phone number
    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    
    try:
        company = Company.objects.get(phone=clean_phone)
        invoices = company.invoices.select_related('customer').order_by('-created_at')
        
        return Response([{
            "id": inv.id,
            "customer_name": inv.customer.name,
            "customer_id": inv.customer.id,
            "total_amount": float(inv.total_amount),
            "status": inv.status,
            "status_display": inv.get_status_display(),
            "created_at": inv.created_at.isoformat(),
            "company": company.name,
            "company_phone": company.phone
        } for inv in invoices])
    except Company.DoesNotExist:
        return Response({"error": "Company not found with this phone number"}, status=404)

@api_view(["GET"])
@api_superuser_required
def admin_get_company_returns_by_phone(request):
    """Get all returns for a company by phone number (superuser only)"""
    phone = request.GET.get('phone', '').strip()
    
    if not phone:
        return Response({"error": "Phone number is required"}, status=400)
    
    # Clean phone number
    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    
    try:
        company = Company.objects.get(phone=clean_phone)
        returns = Return.objects.filter(company=company).select_related('original_invoice', 'customer', 'created_by')
        
        return Response([{
            "id": r.id,
            "return_number": r.return_number,
            "original_invoice": f"فاتورة #{r.original_invoice.id}",
            "customer_name": r.customer.name,
            "status": r.status,
            "status_display": r.get_status_display(),
            "total_amount": float(r.total_amount),
            "return_date": r.return_date.isoformat(),
            "created_by": r.created_by.username,
            "company": company.name,
            "company_phone": company.phone
        } for r in returns])
    except Company.DoesNotExist:
        return Response({"error": "Company not found with this phone number"}, status=404)

@api_view(["GET"])
@api_superuser_required
def admin_get_company_payments_by_phone(request):
    """Get all payments for a company by phone number (superuser only)"""
    phone = request.GET.get('phone', '').strip()
    
    if not phone:
        return Response({"error": "Phone number is required"}, status=400)
    
    # Clean phone number
    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    
    try:
        company = Company.objects.get(phone=clean_phone)
        payments = Payment.objects.filter(company=company).select_related('customer', 'invoice', 'created_by')
        
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
            "created_by": p.created_by.username,
            "company": company.name,
            "company_phone": company.phone
        } for p in payments])
    except Company.DoesNotExist:
        return Response({"error": "Company not found with this phone number"}, status=404)

@api_view(["GET"])
@api_superuser_required
def admin_get_company_users_by_phone(request):
    """Get all users for a company by phone number (superuser only)"""
    phone = request.GET.get('phone', '').strip()
    
    if not phone:
        return Response({"error": "Phone number is required"}, status=400)
    
    # Clean phone number
    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    
    try:
        company = Company.objects.get(phone=clean_phone)
        users = company.users.all().order_by('-created_at')
        
        return Response([{
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "account_type": user.account_type,
            "role": user.role,
            "is_active": user.is_active,
            "is_staff": user.is_staff,
            "created_at": user.created_at.isoformat(),
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "company": company.name,
            "company_phone": company.phone
        } for user in users])
    except Company.DoesNotExist:
        return Response({"error": "Company not found with this phone number"}, status=404)

@api_view(["GET"])
@api_superuser_required
def admin_get_company_categories_by_phone(request):
    """Get all categories for a company by phone number (superuser only)"""
    phone = request.GET.get('phone', '').strip()

    if not phone:
        return Response({"error": "Phone number is required"}, status=400)

    # Clean phone number
    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')

    try:
        company = Company.objects.get(phone=clean_phone)
        categories = company.categories.all()

        return Response([{
            "id": c.id,
            "name": c.name,
            "parent_id": c.parent.id if c.parent else None,
            "parent_name": c.parent.name if c.parent else None,
            "products_count": c.products.count(),
            "company": company.name,
            "company_phone": company.phone
        } for c in categories])
    except Company.DoesNotExist:
        return Response({"error": "Company not found with this phone number"}, status=404)

@api_view(["GET"])
@api_superuser_required
def admin_api_docs(request):
    """Get documentation for all admin API endpoints (superuser only)"""
    base_url = "https://stockly.encryptosystem.com/api/api-admin/"
    docs = {
        "api_documentation": {
            "description": "Documentation for all admin API endpoints. All endpoints require superuser authentication via Token header.",
            "authentication": "Use 'Authorization: Token <your_token>' in headers. User must be superuser.",
            "endpoints": {
                f"{base_url}products/search/": {
                    "method": "GET",
                    "description": "Search products across all companies or filter by company.",
                    "parameters": {
                        "required": [],
                        "optional": ["query", "company_id"]
                    }
                },
                f"{base_url}invoices/<int:invoice_id>/": {
                    "method": "GET",
                    "description": "Get detailed information about a specific invoice.",
                    "parameters": {
                        "required": ["invoice_id"],
                        "optional": []
                    }
                },
                f"{base_url}company/by-phone/": {
                    "method": "GET",
                    "description": "Get company information by phone number.",
                    "parameters": {
                        "required": ["phone"],
                        "optional": []
                    }
                },
                f"{base_url}company/products/by-phone/": {
                    "method": "GET",
                    "description": "Get all products for a company by phone number.",
                    "parameters": {
                        "required": ["phone"],
                        "optional": []
                    }
                },
                f"{base_url}company/customers/by-phone/": {
                    "method": "GET",
                    "description": "Get all customers for a company by phone number.",
                    "parameters": {
                        "required": ["phone"],
                        "optional": []
                    }
                },
                f"{base_url}company/invoices/by-phone/": {
                    "method": "GET",
                    "description": "Get all invoices for a company by phone number.",
                    "parameters": {
                        "required": ["phone"],
                        "optional": []
                    }
                },
                f"{base_url}company/returns/by-phone/": {
                    "method": "GET",
                    "description": "Get all returns for a company by phone number.",
                    "parameters": {
                        "required": ["phone"],
                        "optional": []
                    }
                },
                f"{base_url}company/payments/by-phone/": {
                    "method": "GET",
                    "description": "Get all payments for a company by phone number.",
                    "parameters": {
                        "required": ["phone"],
                        "optional": []
                    }
                },
                f"{base_url}company/users/by-phone/": {
                    "method": "GET",
                    "description": "Get all users for a company by phone number.",
                    "parameters": {
                        "required": ["phone"],
                        "optional": []
                    }
                },
                f"{base_url}company/categories/by-phone/": {
                    "method": "GET",
                    "description": "Get all categories for a company by phone number.",
                    "parameters": {
                        "required": ["phone"],
                        "optional": []
                    }
                },
                f"{base_url}company/category/add/": {
                    "method": "POST",
                    "description": "Add a new category for a company by phone number.",
                    "parameters": {
                        "required": ["phone", "name"],
                        "optional": ["parent_id", "parent_name"]
                    }
                },
                f"{base_url}company/product/add/": {
                    "method": "POST",
                    "description": "Add a new product for a company by phone number.",
                    "parameters": {
                        "required": ["phone", "name", "price", "stock_qty", "category_id or category_name"],
                        "optional": ["sku", "unit", "measurement", "description", "cost_price", "wholesale_price", "retail_price"]
                    }
                },
                f"{base_url}company/customer/add/": {
                    "method": "POST",
                    "description": "Add a new customer for a company by phone number.",
                    "parameters": {
                        "required": ["phone", "name"],
                        "optional": ["customer_phone", "email", "address"]
                    }
                },
                f"{base_url}company/payment/add/": {
                    "method": "POST",
                    "description": "Add a new payment for a company by phone number.",
                    "parameters": {
                        "required": ["phone", "amount", "customer_id or customer_name"],
                        "optional": ["payment_method", "invoice_id", "notes"]
                    }
                },
                f"{base_url}company/payment/withdraw/": {
                    "method": "POST",
                    "description": "Withdraw/refund payment for a company by phone number.",
                    "parameters": {
                        "required": ["phone", "customer_name", "amount"],
                        "optional": ["payment_method", "notes"]
                    }
                },
                f"{base_url}company/customer/details/": {
                    "method": "GET",
                    "description": "Get comprehensive customer details including balance, invoices, returns, and payments.",
                    "parameters": {
                        "required": ["phone", "customer_name"],
                        "optional": []
                    }
                },
                f"{base_url}company/financial-details/": {
                    "method": "GET",
                    "description": "Get comprehensive company financial details including profits, sales, inventory value.",
                    "parameters": {
                        "required": ["phone"],
                        "optional": []
                    }
                }
            }
        }
    }
    return Response(docs)
