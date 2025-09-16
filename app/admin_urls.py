from django.urls import path
from .admin_api import (
    admin_get_companies, admin_get_company_details,
    admin_get_company_products, admin_search_products,
    admin_get_company_customers, admin_get_company_invoices,
    admin_get_invoice_details, admin_get_company_returns,
    admin_get_company_payments, admin_get_company_users,
    admin_system_stats, admin_get_company_categories
)

urlpatterns = [
    # System Management
    path('admin/system/stats/', admin_system_stats, name='admin_system_stats'),
    
    # Company Management
    path('admin/companies/', admin_get_companies, name='admin_get_companies'),
    path('admin/companies/<int:company_id>/', admin_get_company_details, name='admin_get_company_details'),
    
    # Products Management
    path('admin/companies/<int:company_id>/products/', admin_get_company_products, name='admin_get_company_products'),
    path('admin/products/search/', admin_search_products, name='admin_search_products'),
    
    # Customers Management
    path('admin/companies/<int:company_id>/customers/', admin_get_company_customers, name='admin_get_company_customers'),
    
    # Invoices Management
    path('admin/companies/<int:company_id>/invoices/', admin_get_company_invoices, name='admin_get_company_invoices'),
    path('admin/invoices/<int:invoice_id>/', admin_get_invoice_details, name='admin_get_invoice_details'),
    
    # Returns Management
    path('admin/companies/<int:company_id>/returns/', admin_get_company_returns, name='admin_get_company_returns'),
    
    # Payments Management
    path('admin/companies/<int:company_id>/payments/', admin_get_company_payments, name='admin_get_company_payments'),
    
    # Users Management
    path('admin/companies/<int:company_id>/users/', admin_get_company_users, name='admin_get_company_users'),
    
    # Categories Management
    path('admin/companies/<int:company_id>/categories/', admin_get_company_categories, name='admin_get_company_categories'),
]
