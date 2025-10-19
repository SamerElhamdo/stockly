from rest_framework import serializers

from .models import (
    Company, CompanyProfile, User, Category, Product, Customer,
    Invoice, InvoiceItem, Return, ReturnItem,
    Payment, CustomerBalance, AppConfig
)


class CompanyProfileSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_code = serializers.CharField(source='company.code', read_only=True)
    company_email = serializers.CharField(source='company.email', read_only=True, allow_blank=True, allow_null=True)
    company_phone = serializers.CharField(source='company.phone', read_only=True, allow_blank=True, allow_null=True)
    company_address = serializers.CharField(source='company.address', read_only=True, allow_blank=True, allow_null=True)

    class Meta:
        model = CompanyProfile
        fields = [
            'id', 'company', 'company_name', 'company_code', 'company_email', 'company_phone', 'company_address',
            'logo', 'logo_url', 'return_policy', 'payment_policy', 'language', 'navbar_message', 'dashboard_cards',
            'primary_currency', 'secondary_currency', 'secondary_per_usd', 'price_display_mode', 'products_label',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'company', 'company_name', 'company_code', 'company_email',
            'company_phone', 'company_address', 'logo_url', 'created_at', 'updated_at'
        ]

    def get_logo_url(self, obj):
        request = self.context.get('request') if hasattr(self, 'context') else None
        if obj.logo and hasattr(obj.logo, 'url'):
            url = obj.logo.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None

    def update(self, instance, validated_data):
        request = self.context.get('request') if hasattr(self, 'context') else None
        remove_logo = False
        if request is not None:
            remove_logo = str(request.data.get('remove_logo', '')).lower() in ['1', 'true', 'on', 'yes']

        logo = validated_data.pop('logo', None)
        if remove_logo and instance.logo:
            instance.logo.delete(save=False)
            instance.logo = None

        # Coerce dashboard_cards if sent as JSON string via multipart
        if request is not None and 'dashboard_cards' in request.data:
            raw_cards = request.data.get('dashboard_cards')
            if isinstance(raw_cards, str):
                import json
                try:
                    validated_data['dashboard_cards'] = json.loads(raw_cards)
                except Exception:
                    pass

        for attr in ['return_policy', 'payment_policy', 'language', 'navbar_message', 'dashboard_cards', 'secondary_currency', 'secondary_per_usd', 'price_display_mode', 'products_label']:
            if attr in validated_data:
                setattr(instance, attr, validated_data[attr])

        if logo is not None:
            if instance.logo:
                instance.logo.delete(save=False)
            instance.logo = logo

        instance.save()
        return instance


class CompanySerializer(serializers.ModelSerializer):
    profile = CompanyProfileSerializer(read_only=True)

    class Meta:
        model = Company
        fields = ['id', 'name', 'code', 'email', 'phone', 'address', 'created_at', 'is_active', 'phone_verified', 'profile']


class UserSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'phone',
            'account_type', 'role', 'is_active', 'is_staff', 'created_at', 'last_login',
            'company'
        ]
        read_only_fields = ['is_staff', 'created_at', 'last_login']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'parent']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    unit_display = serializers.CharField(source='get_unit_display', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'price', 'stock_qty', 'category', 'category_name',
            'unit', 'unit_display', 'measurement', 'description', 'archived',
            'cost_price', 'wholesale_price', 'retail_price', 'created_at'
        ]


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'email', 'address', 'archived', 'created_at']


class InvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    line_total = serializers.DecimalField(max_digits=12, decimal_places=4, read_only=True)
    unit_display = serializers.SerializerMethodField()
    measurement = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'product', 'product_name', 'product_sku', 'qty', 'price_at_add',
            'line_total', 'unit_display', 'measurement', 'created_at'
        ]

    def get_unit_display(self, obj):
        try:
            if obj.product and obj.product.unit:
                return obj.product.get_unit_display()
        except Exception:
            return None
        return None

    def get_measurement(self, obj):
        if obj.product:
            return obj.product.measurement
        return None


class InvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True, allow_blank=True, allow_null=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True, allow_blank=True, allow_null=True)
    customer_address = serializers.CharField(source='customer.address', read_only=True, allow_blank=True, allow_null=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_code = serializers.CharField(source='company.code', read_only=True)
    items = InvoiceItemSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'company', 'company_name', 'company_code', 'customer', 'customer_name',
            'customer_phone', 'customer_email', 'customer_address', 'status', 'created_at', 'total_amount', 'items'
        ]
        read_only_fields = ['company', 'status', 'created_at', 'total_amount']


class ReturnItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    unit_display = serializers.SerializerMethodField()

    class Meta:
        model = ReturnItem
        fields = [
            'id', 'original_item', 'product', 'product_name', 'product_sku',
            'unit_display', 'qty_returned', 'unit_price', 'line_total', 'created_at'
        ]
        read_only_fields = ['line_total']

    def get_unit_display(self, obj):
        try:
            if obj.product and obj.product.unit:
                return obj.product.get_unit_display()
        except Exception:
            return None
        return None


class ReturnSerializer(serializers.ModelSerializer):
    items = ReturnItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    invoice_id = serializers.IntegerField(source='original_invoice.id', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True, allow_null=True)

    class Meta:
        model = Return
        fields = [
            'id', 'company', 'original_invoice', 'invoice_id', 'customer', 'customer_name',
            'return_number', 'return_date', 'status', 'notes', 'total_amount',
            'created_by', 'created_by_name', 'approved_by', 'approved_by_name', 'approved_at', 'items'
        ]
        read_only_fields = [
            'company', 'invoice_id', 'customer_name', 'return_number', 'return_date',
            'status', 'total_amount', 'created_by_name', 'approved_by', 'approved_by_name', 'approved_at'
        ]


class PaymentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'company', 'customer', 'customer_name', 'invoice', 'amount',
            'payment_method', 'payment_method_display', 'payment_date', 'notes', 'created_by'
        ]
        read_only_fields = ['company', 'payment_date', 'created_by']


class CustomerBalanceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = CustomerBalance
        fields = ['id', 'company', 'customer', 'customer_name', 'total_invoiced', 'total_paid', 'total_returns', 'balance', 'last_updated']
        read_only_fields = ['company', 'total_invoiced', 'total_paid', 'total_returns', 'balance', 'last_updated']


class AppConfigSerializer(serializers.ModelSerializer):
    """
    Serializer لإعدادات التطبيق - يعرض رابط تحميل APK فقط
    """
    class Meta:
        model = AppConfig
        fields = ['apk_download_url']
        read_only_fields = ['apk_download_url']
