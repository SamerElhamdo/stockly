from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from .api_v1 import (
    CategoryViewSet, ProductViewSet, CustomerViewSet,
    InvoiceViewSet, ReturnViewSet, PaymentViewSet,
    CustomerBalanceViewSet, OTPRequestView, OTPVerifyView, ResetPasswordView
)
from .api import (
    api_whatsapp_webhook,
    api_delete_user, api_dashboard_stats
)
from . import views

router = DefaultRouter()
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

  # Dashboard stats (DRF permissions)
  path('api/dashboard/stats', api_dashboard_stats),

  # Auth/OTP (v1 public)
  path('api/v1/auth/otp/send/', OTPRequestView.as_view()),
  path('api/v1/auth/otp/verify/', OTPVerifyView.as_view()),
  path('api/v1/auth/reset-password/', ResetPasswordView.as_view()),

  # WhatsApp webhook (legacy integration kept)
  path('api/whatsapp-webhook/', api_whatsapp_webhook),

  # User Management (delete)
  path('api/users/<int:user_id>/', api_delete_user),
]
