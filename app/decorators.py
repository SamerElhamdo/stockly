from functools import wraps
from django.shortcuts import redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

def admin_required(view_func):
    """
    Decorator that requires the user to be logged in and be an admin
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            if request.headers.get('Content-Type') == 'application/json':
                return JsonResponse({'error': 'Authentication required'}, status=401)
            return redirect('login')
        
        if request.user.user_type != 'admin':
            if request.headers.get('Content-Type') == 'application/json':
                return JsonResponse({'error': 'Admin access required'}, status=403)
            return redirect('login')
        
        return view_func(request, *args, **kwargs)
    return _wrapped_view

def api_admin_required(view_func):
    """
    Decorator for API views that requires admin access
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Authentication required'}, status=401)
        
        if request.user.user_type != 'admin':
            return JsonResponse({'error': 'Admin access required'}, status=403)
        
        return view_func(request, *args, **kwargs)
    return _wrapped_view
