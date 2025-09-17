from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Count, Q, Sum, Max
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from datetime import datetime, timedelta
from .models import Product, Customer, Invoice, InvoiceItem, Category, Company, User, OTPVerification, Return, ReturnItem, Payment, CustomerBalance
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

@api_view(["POST"])
@api_superuser_required
def admin_create_product(request):
    """Create a new product (superuser only)"""
    data = request.data
    
    required_fields = ['company_id', 'name', 'category_id', 'price']
    for field in required_fields:
        if field not in data:
            return Response({"error": f"{field} is required"}, status=400)
    
    try:
        company = Company.objects.get(id=data['company_id'])
    except Company.DoesNotExist:
        return Response({"error": "Company not found"}, status=404)
    
    try:
        category = Category.objects.get(id=data['category_id'], company=company)
    except Category.DoesNotExist:
        return Response({"error": "Category not found or does not belong to the company"}, status=404)
    
    product = Product(
        company=company,
        name=data['name'],
        category=category,
        price=data['price'],
        stock_qty=data.get('stock_qty', 0),
        unit=data.get('unit'),
        measurement=data.get('measurement'),
        description=data.get('description'),
        cost_price=data.get('cost_price'),
        wholesale_price=data.get('wholesale_price'),
        retail_price=data.get('retail_price'),
        sku=data.get('sku')  # Will auto-generate if not provided
    )
    
    try:
        product.save()
        return Response({
            "id": product.id,
            "sku": product.sku,
            "name": product.name,
            "price": float(product.price),
            "stock_qty": product.stock_qty,
            "category_name": product.category.name,
            "company": product.company.name
        }, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

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

@api_view(["POST"])
@api_superuser_required
def admin_create_customer(request):
    """Create a new customer (superuser only)"""
    data = request.data
    
    required_fields = ['company_id', 'name']
    for field in required_fields:
        if field not in data:
            return Response({"error": f"{field} is required"}, status=400)
    
    try:
        company = Company.objects.get(id=data['company_id'])
    except Company.DoesNotExist:
        return Response({"error": "Company not found"}, status=404)
    
    customer = Customer(
        company=company,
        name=data['name'],
        phone=data.get('phone'),
        email=data.get('email'),
        address=data.get('address'),
        archived=data.get('archived', False)
    )
    
    try:
        customer.save()
        return Response({
            "id": customer.id,
            "name": customer.name,
            "phone": customer.phone,
            "email": customer.email,
            "address": customer.address,
            "archived": customer.archived,
            "company": customer.company.name
        }, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

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

# ==================== USERS MANAGEMENT ====================

# ==================== SYSTEM STATISTICS ====================

@api_view(["GET"])
@api_superuser_required
def admin_system_stats(request):
    """Get system-wide statistics (superuser only)"""
    total_companies = Company.objects.count()
    total_users = User.objects.filter(account_type__in=['company_owner', 'company_staff']).count()
    total_products = Product.objects.count()
    total_customers = Customer.objects.count()
    total_invoices = Invoice.objects.count()
    total_sales = Invoice.objects.filter(status='confirmed').aggregate(
        total=Sum('total_amount'))['total'] or 0
    
    # Get recent activity
    recent_invoices = Invoice.objects.select_related('company', 'customer').order_by('-created_at')[:10]
    
    return Response({
        "system_stats": {
            "total_companies": total_companies,
            "total_users": total_users,
            "total_products": total_products,
            "total_customers": total_customers,
            "total_invoices": total_invoices,
            "total_sales": float(total_sales)
        },
        "recent_activity": [{
            "id": inv.id,
            "company": inv.company.name,
            "customer": inv.customer.name,
            "amount": float(inv.total_amount),
            "status": inv.status,
            "created_at": inv.created_at.isoformat()
        } for inv in recent_invoices]
    })

# ==================== CATEGORIES MANAGEMENT ====================

@api_view(["POST"])
@api_superuser_required
def admin_create_category(request):
    """Create a new category (superuser only)"""
    data = request.data
    
    required_fields = ['company_id', 'name']
    for field in required_fields:
        if field not in data:
            return Response({"error": f"{field} is required"}, status=400)
    
    try:
        company = Company.objects.get(id=data['company_id'])
    except Company.DoesNotExist:
        return Response({"error": "Company not found"}, status=404)
    
    parent = None
    if 'parent_id' in data and data['parent_id']:
        try:
            parent = Category.objects.get(id=data['parent_id'], company=company)
        except Category.DoesNotExist:
            return Response({"error": "Parent category not found or does not belong to the company"}, status=404)
    
    category = Category(
        company=company,
        name=data['name'],
        parent=parent
    )
    
    try:
        category.save()
        return Response({
            "id": category.id,
            "name": category.name,
            "parent_id": category.parent.id if category.parent else None,
            "parent_name": category.parent.name if category.parent else None,
            "company": category.company.name
        }, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

# ==================== PHONE-BASED ENDPOINTS ====================

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
