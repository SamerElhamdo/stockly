from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Customer, Category, Product, Invoice, InvoiceItem, Company, CompanyProfile, OTPVerification, Return, ReturnItem, Payment, CustomerBalance

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'account_type', 'company', 'is_active', 'created_at')
    list_filter = ('account_type', 'company', 'is_active', 'is_staff', 'created_at')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'company__name')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'last_login', 'date_joined')
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('معلومات شخصية', {'fields': ('first_name', 'last_name', 'email', 'phone')}),
        ('معلومات الشركة', {'fields': ('company', 'account_type', 'role')}),
        ('الصلاحيات', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('معلومات مهمة', {'fields': ('last_login', 'date_joined', 'created_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'first_name', 'last_name', 'phone', 'company', 'account_type', 'role', 'password1', 'password2'),
        }),
    )

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'email', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'phone', 'email')
    ordering = ('-created_at',)

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent')
    list_filter = ('parent',)
    search_fields = ('name',)
    ordering = ('name',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'category', 'price', 'cost_price', 'wholesale_price', 'retail_price', 'stock_qty')
    list_filter = ('category', 'unit')
    search_fields = ('name', 'sku')
    ordering = ('name',)
    fieldsets = (
        ('معلومات أساسية', {
            'fields': ('company', 'name', 'sku', 'category', 'unit', 'measurement', 'description')
        }),
        ('التسعير', {
            'fields': ('price', 'cost_price', 'wholesale_price', 'retail_price')
        }),
        ('المخزون', {
            'fields': ('stock_qty', 'qr_code')
        }),
    )

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'status', 'total_amount', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('customer__name',)
    ordering = ('-created_at',)

@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'product', 'qty', 'price_at_add', 'line_total')
    list_filter = ('invoice__status',)
    search_fields = ('product__name', 'product__sku')

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'email', 'phone', 'phone_verified', 'created_at')
    list_filter = ('phone_verified', 'created_at')
    search_fields = ('name', 'code', 'email', 'phone')
    ordering = ('-created_at',)

    fieldsets = (
        ('معلومات الشركة', {'fields': ('name', 'code', 'email', 'phone', 'phone_verified')}),
        ('معلومات إضافية', {'fields': ('address', 'created_at')}),
    )

    readonly_fields = ('created_at',)


@admin.register(CompanyProfile)
class CompanyProfileAdmin(admin.ModelAdmin):
    list_display = ('company', 'updated_at')
    search_fields = ('company__name',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('معلومات الشركة', {'fields': ('company',)}),
        ('الشعار والسياسات', {'fields': ('logo', 'return_policy', 'payment_policy')}),
        ('التواريخ', {'fields': ('created_at', 'updated_at')}),
    )

@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    list_display = ('phone', 'otp_code', 'verification_type', 'is_used', 'is_expired_display', 'created_at', 'expires_at')
    list_filter = ('verification_type', 'is_used', 'created_at')
    search_fields = ('phone', 'otp_code')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('معلومات التحقق', {'fields': ('phone', 'otp_code', 'verification_type')}),
        ('حالة التحقق', {'fields': ('is_used', 'created_at', 'expires_at')}),
    )
    
    readonly_fields = ('created_at', 'expires_at')
    
    def is_expired_display(self, obj):
        """Display if OTP is expired"""
        return obj.is_expired()
    is_expired_display.short_description = 'منتهي الصلاحية'
    is_expired_display.boolean = True


@admin.register(Return)
class ReturnAdmin(admin.ModelAdmin):
    list_display = ('return_number', 'original_invoice', 'customer', 'status', 'total_amount', 'return_date', 'created_by')
    list_filter = ('company', 'status', 'return_date', 'created_by')
    search_fields = ('return_number', 'original_invoice__invoice_number', 'customer__name')
    readonly_fields = ('return_number', 'return_date', 'total_amount', 'approved_at')
    fieldsets = (
        ('معلومات أساسية', {
            'fields': ('company', 'original_invoice', 'customer', 'return_number', 'return_date')
        }),
        ('تفاصيل المرتجع', {
            'fields': ('notes', 'total_amount', 'status')
        }),
        ('معلومات الموافقة', {
            'fields': ('created_by', 'approved_by', 'approved_at')
        }),
    )


@admin.register(ReturnItem)
class ReturnItemAdmin(admin.ModelAdmin):
    list_display = ('return_obj', 'product', 'qty_returned', 'unit_price', 'line_total', 'created_at')
    list_filter = ('return_obj__company', 'product__category', 'created_at')
    search_fields = ('product__name', 'return_obj__return_number')
    readonly_fields = ('line_total', 'created_at')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('customer', 'invoice', 'amount', 'payment_method', 'payment_date', 'created_by')
    list_filter = ('company', 'payment_method', 'payment_date', 'created_by')
    search_fields = ('customer__name', 'invoice__id', 'notes')
    readonly_fields = ('payment_date',)
    fieldsets = (
        ('معلومات الدفع', {
            'fields': ('company', 'customer', 'invoice', 'amount', 'payment_method')
        }),
        ('تفاصيل إضافية', {
            'fields': ('notes', 'created_by', 'payment_date')
        }),
    )


@admin.register(CustomerBalance)
class CustomerBalanceAdmin(admin.ModelAdmin):
    list_display = ('customer', 'total_invoiced', 'total_paid', 'total_returns', 'balance', 'last_updated')
    list_filter = ('company', 'last_updated')
    search_fields = ('customer__name',)
    readonly_fields = ('balance', 'last_updated')
    fieldsets = (
        ('معلومات العميل', {
            'fields': ('company', 'customer')
        }),
        ('الحسابات', {
            'fields': ('total_invoiced', 'total_paid', 'total_returns', 'balance', 'last_updated')
        }),
    )