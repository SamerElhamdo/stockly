from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from .api_v1 import (
    CategoryViewSet, ProductViewSet, CustomerViewSet,
    InvoiceViewSet, ReturnViewSet, PaymentViewSet,
    CustomerBalanceViewSet, CompanyProfileViewSet, UsersViewSet,
    OTPRequestView, OTPVerifyView, ResetPasswordView,
    DashboardStatsView, CompanyRegisterView, WhatsAppWebhookView, LegacyDeleteUserView,
    AppConfigView
)
from .views import backend_home
# Note: This app exposes API endpoints only. No server-rendered templates.

router = DefaultRouter()
router.register(r'v1/categories', CategoryViewSet, basename='v1-categories')
router.register(r'v1/products', ProductViewSet, basename='v1-products')
router.register(r'v1/customers', CustomerViewSet, basename='v1-customers')
router.register(r'v1/invoices', InvoiceViewSet, basename='v1-invoices')
router.register(r'v1/returns', ReturnViewSet, basename='v1-returns')
router.register(r'v1/payments', PaymentViewSet, basename='v1-payments')
router.register(r'v1/balances', CustomerBalanceViewSet, basename='v1-balances')
router.register(r'v1/company-profile', CompanyProfileViewSet, basename='v1-company-profile')
router.register(r'v1/users', UsersViewSet, basename='v1-users')

urlpatterns = [

  path('', backend_home, name='backend-home'),

  # DRF v1 API
  path('api/', include(router.urls)),
  path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
  path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
  path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

  # Dashboard stats (moved to APIView)
  path('api/dashboard/stats', DashboardStatsView.as_view()),

  # Auth/OTP (v1 public)
  path('api/v1/auth/otp/send/', OTPRequestView.as_view()),
  path('api/v1/auth/otp/verify/', OTPVerifyView.as_view()),
  path('api/v1/auth/reset-password/', ResetPasswordView.as_view()),
  # Public company registration
  path('api/register-company/', CompanyRegisterView.as_view()),

  # WhatsApp webhook (legacy integration kept via APIView)
  path('api/whatsapp-webhook/', WhatsAppWebhookView.as_view()),

  # Legacy explicit user delete endpoint (kept for backward compatibility)
  path('api/users/<int:user_id>/', LegacyDeleteUserView.as_view()),
  
  # App config endpoint (public - للحصول على رابط تحميل APK)
  path('api/app-config/', AppConfigView.as_view(), name='app-config'),

  # Backend home

]
