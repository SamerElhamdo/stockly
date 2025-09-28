from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django.db import transaction
from django.db.models import Sum, Q, F, Case, When, DecimalField
import random
import requests

from .models import (
    Company, CompanyProfile, User, Category, Product, Customer,
    Invoice, InvoiceItem, Return, ReturnItem, Payment,
    CustomerBalance, OTPVerification, company_queryset
)
from .serializers import (
    CompanySerializer, CompanyProfileSerializer, UserSerializer, CategorySerializer, ProductSerializer,
    CustomerSerializer, InvoiceSerializer, InvoiceItemSerializer,
    ReturnSerializer, ReturnItemSerializer, PaymentSerializer,
    CustomerBalanceSerializer
)
from .permissions import IsCompanyOwner, IsCompanyStaff, ReadOnlyOrOwner
from django.utils import timezone


def update_customer_balance(customer, company):
    """Update customer balance (moved from legacy api.py)"""
    try:
        balance, created = CustomerBalance.objects.get_or_create(
            customer=customer,
            company=company,
            defaults={
                'total_invoiced': 0,
                'total_paid': 0,
                'total_returns': 0,
                'balance': 0
            }
        )

        total_invoiced = sum(inv.total_amount for inv in customer.invoices.filter(company=company, status='confirmed'))
        total_paid = sum(pay.amount for pay in Payment.objects.filter(customer=customer, company=company))
        total_returns = sum(ret.total_amount for ret in Return.objects.filter(customer=customer, company=company, status='approved'))

        balance.total_invoiced = total_invoiced
        balance.total_paid = total_paid
        balance.total_returns = total_returns
        balance.calculate_balance()
    except Exception as e:
        print(f"Error updating customer balance: {e}")


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

    def get_queryset(self):
        qs = super().get_queryset().select_related('customer')
        search = (self.request.query_params.get('search') or '').strip()
        if search:
            try:
                search_id = int(search)
            except ValueError:
                search_id = None
            q = Q(customer__name__icontains=search)
            if search_id is not None:
                q |= Q(id=search_id)
            qs = qs.filter(q)
        return qs

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

    # Removed PDF action; printing/export is handled on the frontend


class ReturnViewSet(CompanyScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = ReturnSerializer
    queryset = Return.objects.select_related('customer', 'original_invoice')
    permission_classes = [IsCompanyStaff]
    filterset_fields = ['status', 'customer']
    ordering_fields = ['return_date', 'total_amount']

    def get_queryset(self):
        qs = super().get_queryset().select_related('customer', 'original_invoice')
        search = (self.request.query_params.get('search') or '').strip()
        if search:
            try:
                search_id = int(search)
            except ValueError:
                search_id = None
            q = Q(return_number__icontains=search) | Q(customer__name__icontains=search)
            if search_id is not None:
                q |= Q(original_invoice__id=search_id)
            qs = qs.filter(q)
        return qs

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

    def get_queryset(self):
        qs = super().get_queryset().select_related('customer', 'invoice')
        search = (self.request.query_params.get('search') or '').strip()
        if search:
            try:
                search_id = int(search)
            except ValueError:
                search_id = None
            q = Q(customer__name__icontains=search) | Q(payment_method__icontains=search)
            if search_id is not None:
                q |= Q(invoice__id=search_id)
            qs = qs.filter(q)
        return qs


class CustomerBalanceViewSet(CompanyScopedQuerysetMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = CustomerBalanceSerializer
    queryset = CustomerBalance.objects.select_related('customer')
    permission_classes = [IsCompanyStaff]


class UsersViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    queryset = User.objects.select_related('company')
    permission_classes = [IsCompanyStaff]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'last_login', 'username']

    def get_queryset(self):
        return company_queryset(User, self.request.user)

    def perform_create(self, serializer):
        if not IsCompanyOwner().has_permission(self.request, self):
            raise PermissionDenied('Only company owners can create users')
        company = getattr(self.request.user, 'company', None)
        serializer.save(company=company, account_type='company_staff')

    def destroy(self, request, *args, **kwargs):
        if not IsCompanyOwner().has_permission(request, self):
            raise PermissionDenied('Only company owners can delete users')
        instance = self.get_object()
        # منع حذف مالك الشركة
        if getattr(instance, 'account_type', None) == 'company_owner':
            return Response({'detail': 'cannot_delete_company_owner'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

class OTPRequestView(APIView):
    permission_classes: list = []  # public

    def post(self, request):
        try:
            data = request.data
            phone = data.get('phone', '').strip()
            verification_type = data.get('verification_type', 'company_registration')

            if not phone:
                return Response({"error": "Phone number is required"}, status=400)

            clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
            if len(clean_phone) < 10:
                return Response({"error": "Phone number must be at least 10 digits"}, status=400)

            otp_code = str(random.randint(100000, 999999))

            otp_record = OTPVerification.objects.create(
                phone=clean_phone,
                otp_code=otp_code,
                verification_type=verification_type
            )

            # Debug print to Django console
            try:
                print(f"[OTP DEBUG] phone={clean_phone} code={otp_code} session={otp_record.session_id} type={verification_type}")
            except Exception:
                pass

            if verification_type == 'forgot_password':
                username = request.data.get('username')
                if not username:
                    return Response({"error": "اسم المستخدم مطلوب لإعادة تعيين كلمة المرور"}, status=400)
                try:
                    User.objects.get(username=username, phone=clean_phone)
                except User.DoesNotExist:
                    return Response({"error": "اسم المستخدم أو رقم الهاتف غير صحيح"}, status=400)

            webhook_url = "https://n8n.srv772321.hstgr.cloud/webhook/7d526f0e-36a0-4d77-a05b-e9a0fe46785a"
            try:
                r = requests.post(webhook_url, json={"phone": clean_phone, "otp_code": otp_code}, timeout=5)
                try:
                    print(f"[OTP DEBUG] webhook_status={r.status_code}")
                except Exception:
                    pass
            except Exception:
                pass

            return Response({
                "success": True,
                "message": "OTP sent successfully",
                "session_id": str(otp_record.session_id),
                "expires_in": 300
            })
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class OTPVerifyView(APIView):
    permission_classes: list = []  # public

    def post(self, request):
        try:
            data = request.data
            session_id = data.get('session_id')
            otp_code = data.get('otp_code', '').strip()

            if not session_id or not otp_code:
                return Response({"error": "Session ID and OTP code are required"}, status=400)

            try:
                otp_record = OTPVerification.objects.get(session_id=session_id)
            except OTPVerification.DoesNotExist:
                return Response({"error": "Invalid session ID"}, status=400)

            if otp_record.is_expired():
                return Response({"error": "OTP has expired"}, status=400)

            if otp_record.otp_code != otp_code:
                return Response({"error": "Invalid OTP code"}, status=400)

            return Response({
                "success": True,
                "message": "OTP verified successfully",
                "phone": otp_record.phone,
                "verification_type": otp_record.verification_type
            })
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class ResetPasswordView(APIView):
    permission_classes: list = []  # public

    def post(self, request):
        try:
            username = request.data.get('username')
            phone = request.data.get('phone')
            new_password = request.data.get('new_password')
            otp_session_id = request.data.get('otp_session_id')

            if not all([username, phone, new_password, otp_session_id]):
                return Response({"error": "جميع الحقول مطلوبة"}, status=400)

            clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')

            try:
                otp_record = OTPVerification.objects.get(
                    session_id=otp_session_id,
                    phone=clean_phone,
                    verification_type='forgot_password'
                )
            except OTPVerification.DoesNotExist:
                return Response({"error": "رمز التحقق غير صحيح"}, status=400)

            if not otp_record.is_valid():
                return Response({"error": "رمز التحقق منتهي الصلاحية"}, status=400)

            try:
                user = User.objects.get(username=username, phone=clean_phone)
            except User.DoesNotExist:
                return Response({"error": "اسم المستخدم أو رقم الهاتف غير صحيح"}, status=400)

            user.set_password(new_password)
            user.save()

            otp_record.is_used = True
            otp_record.save()

            return Response({"message": "تم إعادة تعيين كلمة المرور بنجاح"})
        except Exception as e:
            return Response({"error": str(e)}, status=400)



class DashboardStatsView(APIView):
    permission_classes = [IsCompanyStaff]

    def get(self, request):
        today = timezone.now().date()
        start_month = today.replace(day=1)

        invoices_qs = company_queryset(Invoice, request.user)
        products_qs = company_queryset(Product, request.user)
        payments_qs = company_queryset(Payment, request.user)
        returns_qs = company_queryset(Return, request.user)

        today_invoices = invoices_qs.filter(created_at__date=today).count()
        total_sales = invoices_qs.filter(status=Invoice.CONFIRMED).aggregate(total=Sum('total_amount'))['total'] or 0
        low_stock_items = products_qs.filter(stock_qty__lt=5).count()
        recent_invoices = invoices_qs.select_related('customer').order_by('-created_at')[:5]

        sales_today = invoices_qs.filter(status=Invoice.CONFIRMED, created_at__date=today).aggregate(total=Sum('total_amount'))['total'] or 0
        sales_month = invoices_qs.filter(status=Invoice.CONFIRMED, created_at__date__gte=start_month).aggregate(total=Sum('total_amount'))['total'] or 0
        draft_invoices = invoices_qs.filter(status=Invoice.DRAFT).count()
        cancelled_invoices = invoices_qs.filter(status=Invoice.CANCELLED).count()
        payments_today = payments_qs.filter(payment_date__date=today).aggregate(total=Sum('amount'))['total'] or 0
        payments_month = payments_qs.filter(payment_date__date__gte=start_month).aggregate(total=Sum('amount'))['total'] or 0
        returns_today_count = returns_qs.filter(return_date__date=today).count()
        returns_today_amount = returns_qs.filter(return_date__date=today).aggregate(total=Sum('total_amount'))['total'] or 0

        outstanding_receivables = company_queryset(CustomerBalance, request.user).aggregate(
            total=Sum(
                Case(
                    When(balance__gt=0, then='balance'),
                    default=0,
                    output_field=DecimalField(max_digits=14, decimal_places=4)
                )
            )
        )['total'] or 0

        inventory_value_cost = products_qs.exclude(cost_price=None).aggregate(total=Sum(F('cost_price') * F('stock_qty')))['total'] or 0
        inventory_value_retail = products_qs.aggregate(total=Sum(F('price') * F('stock_qty')))['total'] or 0

        missing_cost_qs = products_qs.filter(Q(cost_price__isnull=True))
        missing_cost_count = missing_cost_qs.count()
        missing_cost_estimate = missing_cost_qs.aggregate(total=Sum(F('price') * F('stock_qty')))['total'] or 0

        return Response({
            "today_invoices": today_invoices,
            "total_sales": float(total_sales),
            "low_stock_items": low_stock_items,
            "recent_invoices": [{
                "id": inv.id,
                "customer_name": inv.customer.name,
                "total_amount": float(inv.total_amount),
                "status": inv.status,
                "created_at": inv.created_at.isoformat()
            } for inv in recent_invoices],
            "sales_today": float(sales_today),
            "sales_month": float(sales_month),
            "draft_invoices": draft_invoices,
            "cancelled_invoices": cancelled_invoices,
            "payments_today": float(payments_today),
            "payments_month": float(payments_month),
            "returns_today_count": returns_today_count,
            "returns_today_amount": float(returns_today_amount),
            "inventory_value_cost": float(inventory_value_cost),
            "inventory_value_retail": float(inventory_value_retail),
            "outstanding_receivables": float(outstanding_receivables),
            "missing_cost_count": int(missing_cost_count),
            "missing_cost_estimate": float(missing_cost_estimate),
        })


class CompanyRegisterView(APIView):
    permission_classes: list = []  # public

    def post(self, request):
        try:
            data = request.data
            company_data = data.get('company', {})

            company_phone = company_data.get('phone', '')
            if company_phone:
                company_phone = company_phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')

            if not company_data.get('name'):
                return Response({"error": "Company name is required"}, status=400)
            if not company_data.get('code'):
                return Response({"error": "Company code is required"}, status=400)
            if Company.objects.filter(code=company_data['code']).exists():
                return Response({"error": "Company code already exists"}, status=400)

            otp_session_id = data.get('otp_session_id')
            if not otp_session_id:
                return Response({"error": "OTP verification is required"}, status=400)

            try:
                otp_record = OTPVerification.objects.get(session_id=otp_session_id)
                if otp_record.verification_type != 'company_registration':
                    return Response({"error": "OTP is not valid for company registration"}, status=400)
                if otp_record.is_expired():
                    return Response({"error": "OTP has expired"}, status=400)
                otp_phone_clean = otp_record.phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
                if otp_phone_clean != company_phone:
                    return Response({"error": f"Phone number mismatch: OTP phone ({otp_phone_clean}) != Company phone ({company_phone})"}, status=400)
            except OTPVerification.DoesNotExist:
                return Response({"error": "Invalid OTP session"}, status=400)

            with transaction.atomic():
                company = Company.objects.create(
                    name=company_data['name'],
                    code=company_data['code'],
                    email=company_data.get('email', ''),
                    phone=company_phone,
                    address=company_data.get('address', ''),
                    phone_verified=True
                )

                CompanyProfile.objects.get_or_create(company=company)

                admin_data = data.get('admin', {})
                admin_username = admin_data.get('username')
                admin_password = admin_data.get('password')
                if not admin_username or not admin_password:
                    return Response({"error": "Admin username and password are required"}, status=400)
                if User.objects.filter(username=admin_username).exists():
                    return Response({"error": "Username already exists"}, status=400)

                User.objects.create_user(
                    username=admin_username,
                    password=admin_password,
                    first_name=f"مدير {company_data['name']}",
                    email=company_data.get('email', ''),
                    phone=company_phone,
                    company=company,
                    account_type='company_owner',
                    user_type='admin',
                    role='owner',
                    is_staff=True,
                    is_active=True
                )

                otp_record.is_used = True
                otp_record.save()

                return Response({
                    "success": True,
                    "message": "Company and admin account created successfully",
                })
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class WhatsAppWebhookView(APIView):
    permission_classes: list = []  # public

    def post(self, request):
        try:
            data = request.data
            phone = data.get('phone', '').strip()
            message = data.get('message', '').strip()
            if not phone or not message:
                return Response({"error": "Phone and message are required"}, status=400)
            if 'otp' in message.lower() or 'verify' in message.lower():
                otp_code = str(random.randint(100000, 999999))
                otp_record = OTPVerification.objects.create(
                    phone=phone,
                    otp_code=otp_code,
                    verification_type='company_registration'
                )
                # Debug print to Django console
                try:
                    print(f"[OTP DEBUG] webhook phone={phone} code={otp_code} session={otp_record.session_id} type=company_registration")
                except Exception:
                    pass
                # send via provider here if configured
            return Response({"success": True, "message": "Webhook received"})
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class LegacyDeleteUserView(APIView):
    permission_classes = [IsCompanyStaff]

    def delete(self, request, user_id: int):
        from django.core.exceptions import PermissionDenied
        if not IsCompanyOwner().has_permission(request, self):
            raise PermissionDenied('Only company owners can delete users')
        try:
            if request.user.is_superuser:
                user = User.objects.filter(id=user_id, account_type__in=['company_owner', 'company_staff']).first()
            else:
                user = User.objects.filter(id=user_id, company=request.user.company).first()
            if not user:
                return Response({"error": "User not found"}, status=404)
            if user.is_superuser:
                return Response({"error": "Cannot delete superuser"}, status=403)
            if user.id == request.user.id:
                return Response({"error": "Cannot delete yourself"}, status=403)
            user.delete()
            return Response({"success": True, "message": "User deleted successfully"})
        except Exception as e:
            return Response({"error": str(e)}, status=400)

