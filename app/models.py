from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.hashers import make_password

class Company(models.Model):
    name = models.CharField(max_length=256, verbose_name='اسم الشركة')
    code = models.CharField(max_length=50, unique=True, verbose_name='معرف الشركة')
    email = models.EmailField(blank=True, null=True, verbose_name='البريد الإلكتروني')
    phone = models.CharField(max_length=32, verbose_name='رقم الهاتف')
    address = models.TextField(blank=True, null=True, verbose_name='العنوان')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإنشاء')
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    phone_verified = models.BooleanField(default=False, verbose_name='تم التحقق من الهاتف')
    
    class Meta:
        verbose_name = 'شركة'
        verbose_name_plural = 'الشركات'
        ordering = ['name']
    
    def __str__(self):
        return self.name

class User(AbstractUser):
    # Account Types
    ACCOUNT_TYPES = [
        ('superuser', 'مدير النظام العام'),
        ('company_owner', 'مالك الشركة'),
        ('company_staff', 'موظف الشركة'),
    ]
    
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, default='company_staff', verbose_name='نوع الحساب')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='users', null=True, blank=True, verbose_name='الشركة')
    
    # Legacy fields for compatibility
    user_type = models.CharField(max_length=10, default='user')
    role = models.CharField(max_length=10, default='staff')
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_login_ip = models.GenericIPAddressField(blank=True, null=True)
    
    def save(self, *args, **kwargs):
        if not self.pk and self.password and not self.password.startswith('pbkdf2_'):
            self.password = make_password(self.password)
        super().save(*args, **kwargs)
    
    def check_password(self, raw_password):
        """Check password for custom user model"""
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password)
    
    def __str__(self):
        return f"{self.username} ({self.get_account_type_display()})"
    
    def get_account_type_display_arabic(self):
        """Get Arabic display for account type"""
        type_map = {
            'superuser': 'مدير النظام العام',
            'company_owner': 'مالك الشركة',
            'company_staff': 'موظف الشركة'
        }
        return type_map.get(self.account_type, self.account_type)
    
    def is_superuser_account(self):
        """Check if user is superuser account (created via command line)"""
        return self.is_superuser and self.account_type == 'superuser'
    
    def is_company_owner_account(self):
        """Check if user is company owner account"""
        return self.account_type == 'company_owner' and self.company is not None
    
    def is_company_staff_account(self):
        """Check if user is company staff account"""
        return self.account_type == 'company_staff' and self.company is not None
    
    # Legacy methods for compatibility
    @property
    def is_company_owner(self):
        return self.account_type == 'company_owner'
    
    @property
    def is_company_staff(self):
        return self.account_type == 'company_staff'

class Customer(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='customers', verbose_name='الشركة')
    name = models.CharField(max_length=256, verbose_name='اسم العميل')
    phone = models.CharField(max_length=32, blank=True, null=True, verbose_name='رقم الهاتف')
    email = models.EmailField(blank=True, null=True, verbose_name='البريد الإلكتروني')
    address = models.TextField(blank=True, null=True, verbose_name='العنوان')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإنشاء')
    
    class Meta:
        verbose_name = 'عميل'
        verbose_name_plural = 'العملاء'
        ordering = ['name']
    
    def __str__(self): 
        return f"{self.name} ({self.company.name})"

class Category(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='categories', verbose_name='الشركة')
    name = models.CharField(max_length=128, verbose_name='اسم الفئة')
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, verbose_name='الفئة الأب')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإنشاء')
    
    class Meta:
        verbose_name = 'فئة'
        verbose_name_plural = 'الفئات'
        ordering = ['name']
    
    def __str__(self): 
        return f"{self.name} ({self.company.name})"

class Product(models.Model):
    UNIT_CHOICES = [
        ('piece', 'عدد'),
        ('meter', 'متر'),
        ('kg', 'كيلو'),
        ('liter', 'لتر'),
        ('box', 'صندوق'),
        ('pack', 'عبوة'),
        ('roll', 'لفة'),
        ('sheet', 'ورقة'),
        ('other', 'أخرى'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='products', verbose_name='الشركة')
    name = models.CharField(max_length=256, verbose_name='اسم المنتج')
    sku = models.CharField(max_length=64, blank=True, null=True, verbose_name='رمز المنتج')
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products', verbose_name='الفئة')
    price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='السعر')
    stock_qty = models.IntegerField(default=0, verbose_name='الكمية في المخزون')
    qr_code = models.ImageField(upload_to='qrcodes/', blank=True, verbose_name='رمز QR')
    
    # New fields for additional product details
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='piece', blank=True, null=True, help_text='وحدة القياس', verbose_name='الوحدة')
    measurement = models.CharField(max_length=100, blank=True, null=True, help_text='القياس (اختياري)', verbose_name='القياس')
    description = models.TextField(blank=True, null=True, help_text='وصف المنتج (اختياري)', verbose_name='الوصف')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإنشاء')
    
    def generate_sku(self):
        """Generate a unique SKU for the product within the company"""
        import uuid
        import time
        import re
        
        # Create a base SKU from product name - English letters only
        # Remove Arabic characters and keep only English letters and numbers
        base_name = re.sub(r'[^a-zA-Z0-9]', '', self.name)[:4].upper()
        
        # If no English letters found, use default prefix
        if not base_name:
            base_name = "PRD"
        
        # Add company prefix (first 3 letters of company name)
        company_prefix = re.sub(r'[^a-zA-Z0-9]', '', self.company.name)[:3].upper() if self.company else "CMP"
        if not company_prefix:
            company_prefix = "CMP"
        
        timestamp = str(int(time.time()))[-4:]  # Last 4 digits of timestamp
        unique_id = str(uuid.uuid4())[:3].upper()
        
        return f"{company_prefix}{base_name}{timestamp}{unique_id}"
    
    def save(self, *args, **kwargs):
        # Generate SKU if not provided
        if not self.sku:
            self.sku = self.generate_sku()
            # Ensure uniqueness within the company
            while Product.objects.filter(company=self.company, sku=self.sku).exclude(pk=self.pk).exists():
                self.sku = self.generate_sku()
        
        super().save(*args, **kwargs)
    
    def __str__(self): 
        unit_display = f" - {self.get_unit_display()}" if self.unit else ""
        measurement_display = f" ({self.measurement})" if self.measurement else ""
        return f"{self.sku} - {self.name}{unit_display}{measurement_display}"

class Invoice(models.Model):
    DRAFT, CONFIRMED, CANCELLED = 'draft','confirmed','cancelled'
    STATUS = [(DRAFT,'Draft'),(CONFIRMED,'Confirmed'),(CANCELLED,'Cancelled')]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='invoices', verbose_name='الشركة')
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='invoices', verbose_name='العميل')
    status = models.CharField(max_length=16, choices=STATUS, default=DRAFT, verbose_name='الحالة')
    created_at = models.DateTimeField(default=timezone.now, verbose_name='تاريخ الإنشاء')
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='المبلغ الإجمالي')
    
    class Meta:
        verbose_name = 'فاتورة'
        verbose_name_plural = 'الفواتير'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"فاتورة #{self.id} - {self.customer.name} ({self.company.name})"

class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items', verbose_name='الفاتورة')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, verbose_name='المنتج')
    qty = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='الكمية')
    price_at_add = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='السعر عند الإضافة')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإنشاء')
    
    class Meta:
        verbose_name = 'عنصر الفاتورة'
        verbose_name_plural = 'عناصر الفاتورة'
        ordering = ['-created_at']
    
    @property
    def line_total(self): 
        return self.qty * self.price_at_add
    
    def __str__(self):
        return f"{self.product.name} x {self.qty} = {self.line_total}"


# Helper Functions for Multi-Tenant Support
def company_queryset(model, user):
    """
    Helper function to filter queryset by company
    Returns queryset filtered by user's company
    """
    if not user:
        return model.objects.none()
    
    # Superuser can see all objects
    if user.is_superuser:
        return model.objects.all()
    
    # Company users can only see their company's objects
    if not user.company:
        return model.objects.none()
    
    return model.objects.filter(company=user.company)

def get_company_objects(model, user):
    """
    Helper function to get all objects for a specific company
    """
    return company_queryset(model, user)

def is_company_owner(user):
    """
    Check if user is company owner
    """
    return user and user.is_authenticated and user.is_company_owner

def is_company_staff(user):
    """
    Check if user is company staff
    """
    return user and user.is_authenticated and user.is_company_staff

def can_manage_company(user):
    """
    Check if user can manage company (owner or staff)
    """
    return user and user.is_authenticated and (user.is_superuser or user.account_type in ['company_owner', 'company_staff'])


class OTPVerification(models.Model):
    """Model for OTP verification via WhatsApp"""
    phone = models.CharField(max_length=32, verbose_name='رقم الهاتف')
    otp_code = models.CharField(max_length=6, verbose_name='رمز التحقق')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإنشاء')
    expires_at = models.DateTimeField(verbose_name='تاريخ الانتهاء')
    is_used = models.BooleanField(default=False, verbose_name='تم الاستخدام')
    verification_type = models.CharField(max_length=20, choices=[
        ('company_registration', 'تسجيل شركة'),
        ('user_registration', 'تسجيل مستخدم'),
        ('password_reset', 'إعادة تعيين كلمة المرور'),
    ], default='company_registration', verbose_name='نوع التحقق')
    
    class Meta:
        verbose_name = 'تحقق OTP'
        verbose_name_plural = 'تحققات OTP'
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        # Set expiration time to 5 minutes from now if not set
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(minutes=5)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"OTP for {self.phone} - {self.otp_code}"
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        return not self.is_expired()
    
    def get_remaining_time(self):
        """Get remaining time in seconds"""
        if self.is_expired():
            return 0
        remaining = self.expires_at - timezone.now()
        return int(remaining.total_seconds())