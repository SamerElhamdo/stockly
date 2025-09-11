from functools import wraps
from django.shortcuts import redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication

def company_owner_required(view_func):
    """
    Decorator that requires the user to be logged in and be a company owner or superuser
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            if request.headers.get('Content-Type') == 'application/json':
                return JsonResponse({'error': 'Authentication required'}, status=401)
            return redirect('auth')
        
        # Check if user is superuser or company owner
        if not (request.user.is_superuser or request.user.account_type == 'company_owner'):
            if request.headers.get('Content-Type') == 'application/json':
                return JsonResponse({'error': 'Company owner access required'}, status=403)
            return redirect('auth')
        
        return view_func(request, *args, **kwargs)
    return _wrapped_view

def company_staff_required(view_func):
    """
    Decorator that requires the user to be logged in and be a company staff (owner or staff) or superuser
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            if request.headers.get('Content-Type') == 'application/json':
                return JsonResponse({'error': 'Authentication required'}, status=401)
            return redirect('auth')
        
        # Check if user is superuser or company staff (owner or staff)
        if not (request.user.is_superuser or request.user.account_type in ['company_owner', 'company_staff']):
            if request.headers.get('Content-Type') == 'application/json':
                return JsonResponse({'error': 'Company staff access required'}, status=403)
            return redirect('auth')
        
        return view_func(request, *args, **kwargs)
    return _wrapped_view

def api_company_owner_required(view_func):
    """
    Decorator for API views that requires company owner access or superuser
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        # Check for token authentication
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Token '):
            return JsonResponse({'error': 'Token authentication required'}, status=401)
        
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
        except Token.DoesNotExist:
            return JsonResponse({'error': 'Invalid token'}, status=401)
        
        # Check if user is superuser or company owner
        if not (user.is_superuser or user.account_type == 'company_owner'):
            return JsonResponse({'error': 'Company owner access required'}, status=403)
        
        # Set the user on the request
        request.user = user
        
        return view_func(request, *args, **kwargs)
    return _wrapped_view

def api_company_staff_required(view_func):
    """
    Decorator for API views that requires company staff access (owner or staff) or superuser
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        # Check for token authentication
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Token '):
            return JsonResponse({'error': 'Token authentication required'}, status=401)
        
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
        except Token.DoesNotExist:
            return JsonResponse({'error': 'Invalid token'}, status=401)
        
        # Check if user is superuser or company staff (owner or staff)
        if not (user.is_superuser or user.account_type in ['company_owner', 'company_staff']):
            return JsonResponse({'error': 'Company staff access required'}, status=403)
        
        # Set the user on the request
        request.user = user
        
        return view_func(request, *args, **kwargs)
    return _wrapped_view
