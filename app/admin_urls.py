from django.urls import path
from .admin_api import (
    admin_system_stats, admin_search_products, admin_get_invoice_details,
    admin_get_company_by_phone, admin_get_company_products_by_phone,
    admin_get_company_customers_by_phone, admin_get_company_invoices_by_phone,
    admin_get_company_returns_by_phone, admin_get_company_payments_by_phone,
    admin_get_company_users_by_phone, admin_get_company_categories_by_phone
)

urlpatterns = [
    # System Management
    path('admin/system/stats/', admin_system_stats, name='admin_system_stats'),
    
    # Products Search
    path('admin/products/search/', admin_search_products, name='admin_search_products'),
    
    # Invoice Details
    path('admin/invoices/<int:invoice_id>/', admin_get_invoice_details, name='admin_get_invoice_details'),
    
    # Phone-based endpoints
    path('admin/company/by-phone/', admin_get_company_by_phone, name='admin_get_company_by_phone'),
    path('admin/company/products/by-phone/', admin_get_company_products_by_phone, name='admin_get_company_products_by_phone'),
    path('admin/company/customers/by-phone/', admin_get_company_customers_by_phone, name='admin_get_company_customers_by_phone'),
    path('admin/company/invoices/by-phone/', admin_get_company_invoices_by_phone, name='admin_get_company_invoices_by_phone'),
    path('admin/company/returns/by-phone/', admin_get_company_returns_by_phone, name='admin_get_company_returns_by_phone'),
    path('admin/company/payments/by-phone/', admin_get_company_payments_by_phone, name='admin_get_company_payments_by_phone'),
    path('admin/company/users/by-phone/', admin_get_company_users_by_phone, name='admin_get_company_users_by_phone'),
    path('admin/company/categories/by-phone/', admin_get_company_categories_by_phone, name='admin_get_company_categories_by_phone'),
]
