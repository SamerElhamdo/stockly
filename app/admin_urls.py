from django.urls import path
from .admin_api import (
    admin_search_products, admin_get_invoice_details,
    admin_get_company_by_phone, admin_get_company_products_by_phone,
    admin_get_company_customers_by_phone, admin_get_company_invoices_by_phone,
    admin_get_company_returns_by_phone, admin_get_company_payments_by_phone,
    admin_get_company_users_by_phone, admin_get_company_categories_by_phone,
    admin_add_category_by_phone, admin_add_product_by_phone, admin_add_customer_by_phone,
    admin_add_payment_by_phone, admin_withdraw_payment_by_phone,
    admin_get_customer_details_by_phone, admin_get_company_financial_details_by_phone,
    admin_api_docs
)

urlpatterns = [
    # System Management
    # path('system/stats/', admin_system_stats, name='admin_system_stats'),
    
    # Products Search
    path('products/search/', admin_search_products, name='admin_search_products'),
    
    # Invoice Details
    path('invoices/<int:invoice_id>/', admin_get_invoice_details, name='admin_get_invoice_details'),

    # AIP documentation
    path('docs/', admin_api_docs, name='admin_api_docs'),
    
    # Phone-based endpoints
    path('company/by-phone/', admin_get_company_by_phone, name='admin_get_company_by_phone'),
    path('company/products/by-phone/', admin_get_company_products_by_phone, name='admin_get_company_products_by_phone'),
    path('company/customers/by-phone/', admin_get_company_customers_by_phone, name='admin_get_company_customers_by_phone'),
    path('company/invoices/by-phone/', admin_get_company_invoices_by_phone, name='admin_get_company_invoices_by_phone'),
    path('company/returns/by-phone/', admin_get_company_returns_by_phone, name='admin_get_company_returns_by_phone'),
    path('company/payments/by-phone/', admin_get_company_payments_by_phone, name='admin_get_company_payments_by_phone'),
    path('company/users/by-phone/', admin_get_company_users_by_phone, name='admin_get_company_users_by_phone'),
    path('company/categories/by-phone/', admin_get_company_categories_by_phone, name='admin_get_company_categories_by_phone'),

    # Create by phone (POST)
    path('company/category/add/', admin_add_category_by_phone, name='admin_add_category_by_phone'),
    path('company/product/add/', admin_add_product_by_phone, name='admin_add_product_by_phone'),
    path('company/customer/add/', admin_add_customer_by_phone, name='admin_add_customer_by_phone'),
    
    # Payment management
    path('company/payment/add/', admin_add_payment_by_phone, name='admin_add_payment_by_phone'),
    path('company/payment/withdraw/', admin_withdraw_payment_by_phone, name='admin_withdraw_payment_by_phone'),
    
    # Detailed endpoints
    path('company/customer/details/', admin_get_customer_details_by_phone, name='admin_get_customer_details_by_phone'),
    path('company/financial-details/', admin_get_company_financial_details_by_phone, name='admin_get_company_financial_details_by_phone'),
]
