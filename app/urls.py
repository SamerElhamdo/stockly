from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from .api_v1 import (
    CompanyProfileViewSet, CategoryViewSet, ProductViewSet, CustomerViewSet,
    InvoiceViewSet, ReturnViewSet, PaymentViewSet,
    CustomerBalanceViewSet
)
from .api import (
    api_send_otp,
    api_verify_otp,
    api_whatsapp_webhook,
    api_delete_user,
    api_reset_password,
    api_dashboard_stats,
    api_register_company,
    api_register_staff,
    api_company_users,
)
from . import views

router = DefaultRouter()
router.register(r'v1/profile', CompanyProfileViewSet, basename='v1-profile')
router.register(r'v1/categories', CategoryViewSet, basename='v1-categories')
router.register(r'v1/products', ProductViewSet, basename='v1-products')
router.register(r'v1/customers', CustomerViewSet, basename='v1-customers')
router.register(r'v1/invoices', InvoiceViewSet, basename='v1-invoices')
router.register(r'v1/returns', ReturnViewSet, basename='v1-returns')
router.register(r'v1/payments', PaymentViewSet, basename='v1-payments')
router.register(r'v1/balances', CustomerBalanceViewSet, basename='v1-balances')

urlpatterns = [
  # DRF v1 API
  path('api/', include(router.urls)),
  path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
  path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
  path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

  # Dashboard stats (for frontend dashboard)
  path('api/dashboard/stats', api_dashboard_stats),

  # Auth/OTP utilities (kept)
  path('api/register/company/', api_register_company),
  path('api/register/staff/', api_register_staff),
  path('api/send-otp/', api_send_otp),
  path('api/verify-otp/', api_verify_otp),
  path('api/reset-password/', api_reset_password),
  path('api/whatsapp-webhook/', api_whatsapp_webhook),

  # User Management (delete)
  path('api/users/<int:user_id>/', api_delete_user),
  path('api/company/users/', api_company_users),

  # PDF Generation as API route
  path('api/invoices/<int:invoice_id>/pdf/', views.invoice_pdf, name='invoice_pdf'),
]
