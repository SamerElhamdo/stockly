from rest_framework import serializers
from .models import (
    Company, User, Category, Product, Customer,
    Invoice, InvoiceItem, Return, ReturnItem,
    Payment, CustomerBalance
)


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'code', 'email', 'phone', 'address', 'created_at', 'is_active', 'phone_verified']


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

    class Meta:
        model = InvoiceItem
        fields = ['id', 'product', 'product_name', 'product_sku', 'qty', 'price_at_add', 'line_total', 'created_at']


class InvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    items = InvoiceItemSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = ['id', 'company', 'customer', 'customer_name', 'status', 'created_at', 'total_amount', 'items']
        read_only_fields = ['company', 'status', 'created_at', 'total_amount']


class ReturnItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = ReturnItem
        fields = ['id', 'original_item', 'product', 'product_name', 'product_sku', 'qty_returned', 'unit_price', 'line_total', 'created_at']
        read_only_fields = ['line_total']


class ReturnSerializer(serializers.ModelSerializer):
    items = ReturnItemSerializer(many=True, read_only=True)

    class Meta:
        model = Return
        fields = [
            'id', 'company', 'original_invoice', 'customer', 'return_number', 'return_date',
            'status', 'notes', 'total_amount', 'created_by', 'approved_by', 'approved_at', 'items'
        ]
        read_only_fields = ['company', 'return_number', 'return_date', 'status', 'total_amount', 'approved_by', 'approved_at']


class PaymentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'company', 'customer', 'customer_name', 'invoice', 'amount', 'payment_method', 'payment_date', 'notes', 'created_by']
        read_only_fields = ['company', 'payment_date', 'created_by']


class CustomerBalanceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = CustomerBalance
        fields = ['id', 'company', 'customer', 'customer_name', 'total_invoiced', 'total_paid', 'total_returns', 'balance', 'last_updated']
        read_only_fields = ['company', 'total_invoiced', 'total_paid', 'total_returns', 'balance', 'last_updated']


