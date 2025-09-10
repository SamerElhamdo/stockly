from django.urls import path
from .api import (api_products, api_invoice_session, api_get_invoice, api_add_item, api_confirm,
                  api_customers, api_add_customer, api_categories, api_add_product,
                  api_invoices_list, api_recent_invoices, api_dashboard_stats,
                  api_delete_category, api_delete_product, api_delete_customer, api_add_category,
                  api_update_category, api_update_product, api_update_customer)
from . import views

urlpatterns = [
  # Authentication
  path('login/', views.login_view, name='login'),
  path('logout/', views.logout_view, name='logout'),
  
  # User Management
  path('users/', views.user_management, name='user_management'),
  path('users/add/', views.add_user, name='add_user'),
  
  # API
  path('api/products/', api_products),
  path('api/invoices/session', api_invoice_session),
  path('api/invoices/<int:session_id>', api_get_invoice),
  path('api/invoices/<int:session_id>/items', api_add_item),
  path('api/invoices/<int:session_id>/confirm', api_confirm),
  path('api/customers/', api_customers),
  path('api/customers/add/', api_add_customer),
  path('api/customers/<int:customer_id>/', api_delete_customer),
  path('api/customers/<int:customer_id>/update/', api_update_customer),
  path('api/categories/', api_categories),
  path('api/categories/<int:category_id>/', api_delete_category),
  path('api/categories/<int:category_id>/update/', api_update_category),
  path('api/categories/add/', api_add_category),
  path('api/products/add/', api_add_product),
  path('api/products/<int:product_id>/', api_delete_product),
  path('api/products/<int:product_id>/update/', api_update_product),
  path('api/invoices/', api_invoices_list),
  path('api/invoices/<int:invoice_id>/confirm', api_confirm),
  path('api/invoices/recent', api_recent_invoices),
  path('api/dashboard/stats', api_dashboard_stats),

  # Dashboard Pages
  path('', views.dashboard, name='dashboard'),
  path('customers/', views.customers, name='customers'),
  path('products/', views.products, name='products'),
  path('categories/', views.categories, name='categories'),
  path('invoices/', views.invoices, name='invoices'),
  path('invoice/<int:session_id>/', views.invoice_page, name='invoice_page'),
  
  # PDF Generation
  path('invoice/<int:invoice_id>/pdf/', views.invoice_pdf, name='invoice_pdf'),
]
