from django.http import JsonResponse

def backend_home(request):
    return JsonResponse({'status': 'ok', 'message': 'Backend is running'})