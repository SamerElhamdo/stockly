from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django.db import transaction
from django.db.models import Sum

from .models import (
    Company, CompanyProfile, User, Category, Product, Customer,
    Invoice, InvoiceItem, Return, ReturnItem, Payment,
    CustomerBalance, company_queryset
)
from .serializers import (
    CompanySerializer, CompanyProfileSerializer, UserSerializer, CategorySerializer, ProductSerializer,
    CustomerSerializer, InvoiceSerializer, InvoiceItemSerializer,
    ReturnSerializer, ReturnItemSerializer, PaymentSerializer,
    CustomerBalanceSerializer
)
from .permissions import IsCompanyOwner, IsCompanyStaff, ReadOnlyOrOwner
from .api import api_send_otp, api_verify_otp, api_reset_password
from . import views as legacy_views
from .api import update_customer_balance


class CompanyScopedQuerysetMixin:
    def get_queryset(self):
        model = self.queryset.model if hasattr(self, 'queryset') and self.queryset is not None else self.serializer_class.Meta.model
        return company_queryset(model, self.request.user)

    def perform_create(self, serializer):
        company = getattr(self.request.user, 'company', None)
        # Derive company from related objects if user has no company (e.g., superuser)
        if not company:
            try:
                customer = serializer.validated_data.get('customer')
                if customer and hasattr(customer, 'company'):
                    company = customer.company
            except Exception:
                pass
        serializer.save(company=company)


class CompanyProfileViewSet(mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = CompanyProfileSerializer
    queryset = CompanyProfile.objects.select_related('company')
    permission_classes = [ReadOnlyOrOwner]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = super().get_queryset()
        company = getattr(self.request.user, 'company', None)
        if self.request.user.is_superuser and not company:
            return qs
        if company:
            return qs.filter(company=company)
        return qs.none()

    def get_object(self):
        pk = self.kwargs.get(self.lookup_field or 'pk')
        queryset = self.get_queryset()
        if pk is not None:
            return queryset.get(pk=pk)
        company = getattr(self.request.user, 'company', None)
        if company:
            profile, _ = CompanyProfile.objects.get_or_create(company=company)
            return profile
        raise PermissionDenied('لا يوجد ملف مرتبط بالمستخدم الحالي')

    def list(self, request, *args, **kwargs):
        profile = self.get_object()
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        profile = self.get_object()
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CategoryViewSet(CompanyScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    queryset = Category.objects.all()
    permission_classes = [ReadOnlyOrOwner]
    filterset_fields = ['name', 'parent']
    search_fields = ['name']
    ordering_fields = ['name', 'id']


class ProductViewSet(CompanyScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    queryset = Product.objects.select_related('category')
    permission_classes = [ReadOnlyOrOwner]
    filterset_fields = ['category', 'archived']
    search_fields = ['name', 'sku', 'description']
    ordering_fields = ['name', 'price', 'stock_qty', 'created_at']

    @action(detail=True, methods=['post'], permission_classes=[IsCompanyOwner])
    def archive(self, request, pk=None):
        product = self.get_object()
        product.archived = True
        product.save(update_fields=['archived'])
        return Response({'success': True, 'archived': True})

    @action(detail=True, methods=['post'], permission_classes=[IsCompanyOwner])
    def restore(self, request, pk=None):
        product = self.get_object()
        product.archived = False
        product.save(update_fields=['archived'])
        return Response({'success': True, 'archived': False})


class CustomerViewSet(CompanyScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    queryset = Customer.objects.all()
    permission_classes = [ReadOnlyOrOwner]
    filterset_fields = ['archived']
    search_fields = ['name', 'phone', 'email']
    ordering_fields = ['name', 'created_at']

    @action(detail=True, methods=['post'], permission_classes=[IsCompanyOwner])
    def archive(self, request, pk=None):
        customer = self.get_object()
        customer.archived = True
        customer.save(update_fields=['archived'])
        return Response({'success': True, 'archived': True})

    @action(detail=True, methods=['post'], permission_classes=[IsCompanyOwner])
    def restore(self, request, pk=None):
        customer = self.get_object()
        customer.archived = False
        customer.save(update_fields=['archived'])
        return Response({'success': True, 'archived': False})


class InvoiceViewSet(CompanyScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    queryset = Invoice.objects.select_related('customer')
    permission_classes = [IsCompanyStaff]
    filterset_fields = ['status', 'customer']
    ordering_fields = ['created_at', 'total_amount']

    def perform_create(self, serializer):
        # Only owners can create invoices
        if not IsCompanyOwner().has_permission(self.request, self):
            raise PermissionDenied('Only company owners can create invoices')
        super().perform_create(serializer)

    @action(detail=True, methods=['post'], permission_classes=[IsCompanyOwner])
    def add_item(self, request, pk=None):
        try:
            invoice = self.get_object()
            if invoice.status != Invoice.DRAFT:
                return Response({'detail': 'Invoice not in draft state'}, status=400)
            product_id = request.data.get('product') or request.data.get('product_id')
            qty = float(request.data.get('qty', 1))
            if not product_id:
                return Response({'detail': 'product is required'}, status=400)
            product = company_queryset(Product, request.user).get(id=product_id)
            existing_qty = sum(float(item.qty) for item in invoice.items.filter(product=product))
            total_required = existing_qty + qty
            if product.stock_qty < total_required:
                can_add = max(0, product.stock_qty - existing_qty)
                return Response({'code': 'insufficient_stock', 'available': product.stock_qty, 'already_in_invoice': existing_qty, 'can_add': can_add}, status=400)
            InvoiceItem.objects.create(invoice=invoice, product=product, qty=qty, price_at_add=product.price)
            invoice.total_amount = sum(i.line_total for i in invoice.items.all())
            invoice.save(update_fields=['total_amount'])
            return Response(InvoiceSerializer(invoice).data)
        except Product.DoesNotExist:
            return Response({'detail': 'product_not_found'}, status=404)

    @action(detail=True, methods=['post'], permission_classes=[IsCompanyOwner])
    @transaction.atomic
    def confirm(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status != Invoice.DRAFT:
            return Response({'detail': 'Invoice not in draft state'}, status=400)
        insufficient = []
        for it in invoice.items.select_related('product'):
            if it.product.stock_qty < it.qty:
                insufficient.append({'product_name': it.product.name, 'required': float(it.qty), 'available': it.product.stock_qty})
        if insufficient:
            return Response({'code': 'insufficient_stock_for_confirmation', 'products': insufficient}, status=400)
        for it in invoice.items.select_related('product'):
            it.product.stock_qty -= int(it.qty)
            it.product.save(update_fields=['stock_qty'])
        invoice.status = Invoice.CONFIRMED
        invoice.save(update_fields=['status'])
        # Update customer balance
        try:
            update_customer_balance(invoice.customer, invoice.company)
        except Exception:
            pass
        return Response({'invoice_id': invoice.id, 'status': invoice.status})

    @action(detail=True, methods=['get'], permission_classes=[IsCompanyStaff])
    def pdf(self, request, pk=None):
        # Reuse existing PDF generator view
        django_request = getattr(request, '_request', request)
        return legacy_views.invoice_pdf(django_request, invoice_id=int(pk))


class ReturnViewSet(CompanyScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = ReturnSerializer
    queryset = Return.objects.select_related('customer', 'original_invoice')
    permission_classes = [IsCompanyStaff]
    filterset_fields = ['status', 'customer']
    ordering_fields = ['return_date', 'total_amount']

    def create(self, request, *args, **kwargs):
        data = request.data
        invoice_id = data.get('original_invoice') or data.get('invoice_id')
        items = data.get('items', [])
        notes = data.get('notes', '')
        if not invoice_id or not items:
            return Response({'detail': 'invoice_id (or original_invoice) and items are required'}, status=400)
        try:
            invoice = company_queryset(Invoice, request.user).get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response({'detail': 'invoice_not_found'}, status=404)
        return_obj = Return.objects.create(
            company=invoice.company,
            original_invoice=invoice,
            customer=invoice.customer,
            notes=notes,
            created_by=request.user
        )
        total_amount = 0
        for item in items:
            original_item_id = item.get('original_item_id') or item.get('original_item')
            qty_returned = item.get('qty_returned') or item.get('qty')
            try:
                original_item = InvoiceItem.objects.get(id=original_item_id, invoice=invoice)
            except InvoiceItem.DoesNotExist:
                return Response({'detail': f'invoice_item_not_found:{original_item_id}'}, status=404)
            if float(qty_returned) > float(original_item.qty):
                return Response({'detail': 'qty_returned_exceeds_sold', 'original_qty': float(original_item.qty)}, status=400)
            ret_item = ReturnItem.objects.create(
                return_obj=return_obj,
                original_item=original_item,
                product=original_item.product,
                qty_returned=qty_returned,
                unit_price=original_item.price_at_add
            )
            total_amount += float(ret_item.line_total)
        return_obj.total_amount = total_amount
        return_obj.save(update_fields=['total_amount'])
        serializer = self.get_serializer(return_obj)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'], permission_classes=[IsCompanyOwner])
    def approve(self, request, pk=None):
        return_obj = self.get_object()
        if return_obj.status != 'pending':
            return Response({'detail': 'Only pending returns can be approved'}, status=400)
        return_obj.status = 'approved'
        return_obj.approved_by = request.user
        return_obj.approved_at = return_obj.approved_at or return_obj.return_date
        return_obj.save()
        for item in return_obj.items.all():
            product = item.product
            product.stock_qty += item.qty_returned
            product.save(update_fields=['stock_qty'])
        try:
            update_customer_balance(return_obj.customer, return_obj.company)
        except Exception:
            pass
        return Response({'status': return_obj.status})

    @action(detail=True, methods=['post'], permission_classes=[IsCompanyOwner])
    def reject(self, request, pk=None):
        return_obj = self.get_object()
        if return_obj.status != 'pending':
            return Response({'detail': 'Only pending returns can be rejected'}, status=400)
        return_obj.status = 'rejected'
        return_obj.approved_by = request.user
        return_obj.approved_at = return_obj.approved_at or return_obj.return_date
        return_obj.save()
        return Response({'status': return_obj.status})


class PaymentViewSet(CompanyScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    queryset = Payment.objects.select_related('customer', 'invoice')
    permission_classes = [ReadOnlyOrOwner]
    filterset_fields = ['customer', 'invoice', 'payment_method']
    ordering_fields = ['payment_date', 'amount']

    def perform_create(self, serializer):
        company = getattr(self.request.user, 'company', None)
        if not company:
            customer = serializer.validated_data.get('customer')
            if customer:
                company = customer.company
        payment = serializer.save(company=company, created_by=self.request.user)
        try:
            update_customer_balance(payment.customer, payment.company)
        except Exception:
            pass


class CustomerBalanceViewSet(CompanyScopedQuerysetMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = CustomerBalanceSerializer
    queryset = CustomerBalance.objects.select_related('customer')
    permission_classes = [IsCompanyStaff]


class OTPRequestView(APIView):
    permission_classes: list = []  # public

    def post(self, request):
        django_request = getattr(request, '_request', request)
        return api_send_otp(django_request)


class OTPVerifyView(APIView):
    permission_classes: list = []  # public

    def post(self, request):
        django_request = getattr(request, '_request', request)
        return api_verify_otp(django_request)


class ResetPasswordView(APIView):
    permission_classes: list = []  # public

    def post(self, request):
        django_request = getattr(request, '_request', request)
        return api_reset_password(django_request)


