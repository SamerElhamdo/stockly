from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, csrf_protect, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.views.decorators.http import require_http_methods
from .forms import LoginForm, UserRegistrationForm
from .decorators import admin_required, api_admin_required
from .models import User
import json

# Authentication Views
@ensure_csrf_cookie
def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    
    if request.method == 'POST':
        form = LoginForm(data=request.POST)
        if form.is_valid():
            user = form.get_user()
            if user and user.is_authenticated:
                login(request, user)
                messages.success(request, f'مرحباً {user.first_name or user.username}!')
                return redirect('dashboard')
            else:
                messages.error(request, 'اسم المستخدم أو كلمة المرور غير صحيحة')
    else:
        form = LoginForm()
    
    return render(request, 'login.html', {'form': form})

def logout_view(request):
    logout(request)
    messages.info(request, 'تم تسجيل الخروج بنجاح')
    return redirect('login')

# Protected Views
@admin_required
def dashboard(request):
    return render(request, "dashboard.html")

@admin_required
def customers(request):
    return render(request, "customers.html")

@admin_required
def products(request):
    return render(request, "products.html")

@admin_required
def categories(request):
    return render(request, "categories.html")

@admin_required
def invoices(request):
    return render(request, "invoices.html")

@admin_required
def invoice_page(request, session_id):
    return render(request, "invoice.html", {"session_id": session_id})

# User Management Views
@admin_required
def user_management(request):
    users = User.objects.all().order_by('-created_at')
    return render(request, 'user_management.html', {'users': users})

@admin_required
def add_user(request):
    if request.method == 'POST':
        form = UserRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            messages.success(request, f'تم إنشاء المستخدم {user.username} بنجاح')
            return redirect('user_management')
    else:
        form = UserRegistrationForm()
    
    return render(request, 'add_user.html', {'form': form})