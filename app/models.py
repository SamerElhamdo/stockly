from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.hashers import make_password

class User(AbstractUser):
    USER_TYPE_CHOICES = [
        ('admin', 'مدير النظام'),
        ('user', 'مستخدم عادي'),
    ]
    
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='user')
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_login_ip = models.GenericIPAddressField(blank=True, null=True)
    
    def save(self, *args, **kwargs):
        if not self.pk and self.password:
            self.password = make_password(self.password)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.username} ({self.get_user_type_display()})"

class Customer(models.Model):
    name = models.CharField(max_length=256)
    phone = models.CharField(max_length=32, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return self.name

class Category(models.Model):
    name = models.CharField(max_length=128)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    def __str__(self): return self.name

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
    
    name = models.CharField(max_length=256)
    sku = models.CharField(max_length=64, unique=True, blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    price = models.DecimalField(max_digits=12, decimal_places=2)
    stock_qty = models.IntegerField(default=0)
    qr_code = models.ImageField(upload_to='qrcodes/', blank=True)
    
    # New fields for additional product details
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='piece', blank=True, null=True, help_text='وحدة القياس')
    measurement = models.CharField(max_length=100, blank=True, null=True, help_text='القياس (اختياري)')
    description = models.TextField(blank=True, null=True, help_text='وصف المنتج (اختياري)')
    
    def generate_sku(self):
        """Generate a unique SKU for the product"""
        import uuid
        import time
        import re
        
        # Create a base SKU from product name - English letters only
        # Remove Arabic characters and keep only English letters and numbers
        base_name = re.sub(r'[^a-zA-Z0-9]', '', self.name)[:4].upper()
        
        # If no English letters found, use default prefix
        if not base_name:
            base_name = "PRD"
        
        timestamp = str(int(time.time()))[-6:]  # Last 6 digits of timestamp
        unique_id = str(uuid.uuid4())[:4].upper()
        
        return f"{base_name}{timestamp}{unique_id}"
    
    def save(self, *args, **kwargs):
        # Generate SKU if not provided
        if not self.sku:
            self.sku = self.generate_sku()
            # Ensure uniqueness
            while Product.objects.filter(sku=self.sku).exclude(pk=self.pk).exists():
                self.sku = self.generate_sku()
        
        super().save(*args, **kwargs)
    
    def __str__(self): 
        unit_display = f" - {self.get_unit_display()}" if self.unit else ""
        measurement_display = f" ({self.measurement})" if self.measurement else ""
        return f"{self.sku} - {self.name}{unit_display}{measurement_display}"

class Invoice(models.Model):
    DRAFT, CONFIRMED, CANCELLED = 'draft','confirmed','cancelled'
    STATUS = [(DRAFT,'Draft'),(CONFIRMED,'Confirmed'),(CANCELLED,'Cancelled')]
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='invoices')
    status = models.CharField(max_length=16, choices=STATUS, default=DRAFT)
    created_at = models.DateTimeField(default=timezone.now)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    qty = models.DecimalField(max_digits=12, decimal_places=2)
    price_at_add = models.DecimalField(max_digits=12, decimal_places=2)
    @property
    def line_total(self): return self.qty * self.price_at_add