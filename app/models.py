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
    name = models.CharField(max_length=256)
    sku = models.CharField(max_length=64, unique=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    price = models.DecimalField(max_digits=12, decimal_places=2)
    stock_qty = models.IntegerField(default=0)
    qr_code = models.ImageField(upload_to='qrcodes/', blank=True)
    def __str__(self): return f"{self.sku} - {self.name}"

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