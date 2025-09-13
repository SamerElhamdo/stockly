from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from app.models import AgentSettings
import json

@login_required
def agent_settings(request):
    # Only superuser can access agent settings
    if not request.user.is_superuser:
        messages.error(request, 'ليس لديك صلاحية للوصول إلى إعدادات الوكيل الذكي')
        return redirect('dashboard')
    """صفحة إعدادات الوكيل الذكي"""
    try:
        # For superuser, we'll use a global settings approach
        # Get the first company's settings or create default settings
        from app.models import Company
        first_company = Company.objects.first()
        
        if not first_company:
            messages.error(request, 'لا توجد شركات في النظام')
            return redirect('dashboard')
        
        # Get or create agent settings for the first company (global settings)
        settings, created = AgentSettings.objects.get_or_create(
            company=first_company,
            defaults={
                'whatsapp_webhook_url': 'https://n8n.srv772321.hstgr.cloud/webhook/whatsapp-msg',
                'gemini_api_key': '',
                'is_active': True,
                'max_conversation_history': 20,
                'confirmation_required': True
            }
        )
        
        if request.method == 'POST':
            # Update settings
            settings.whatsapp_webhook_url = request.POST.get('whatsapp_webhook_url', settings.whatsapp_webhook_url)
            settings.gemini_api_key = request.POST.get('gemini_api_key', settings.gemini_api_key)
            settings.is_active = request.POST.get('is_active') == 'on'
            settings.max_conversation_history = int(request.POST.get('max_conversation_history', 20))
            settings.confirmation_required = request.POST.get('confirmation_required') == 'on'
            settings.custom_system_message = request.POST.get('custom_system_message', '')
            settings.save()
            
            messages.success(request, 'تم حفظ الإعدادات بنجاح')
            return redirect('agent_settings')
        
        return render(request, 'whatsapp_agent/settings.html', {
            'settings': settings,
            'company': first_company
        })
        
    except Exception as e:
        messages.error(request, f'خطأ في تحميل الإعدادات: {str(e)}')
        return render(request, 'whatsapp_agent/settings.html', {
            'settings': None,
            'company': None
        })

@login_required
def conversation_history(request):
    # Only superuser can access conversation history
    if not request.user.is_superuser:
        messages.error(request, 'ليس لديك صلاحية للوصول إلى تاريخ المحادثات')
        return redirect('dashboard')
    """صفحة تاريخ المحادثات"""
    try:
        from app.models import Conversation, Company
        
        # Get all conversations from all companies for superuser
        conversations = Conversation.objects.all().order_by('-created_at')[:50]
        
        return render(request, 'whatsapp_agent/conversations.html', {
            'conversations': conversations,
            'company': None  # Show all companies for superuser
        })
        
    except Exception as e:
        messages.error(request, f'خطأ في تحميل المحادثات: {str(e)}')
        return render(request, 'whatsapp_agent/conversations.html', {
            'conversations': [],
            'company': None
        })

@login_required
def test_agent(request):
    # Only superuser can access test agent
    if not request.user.is_superuser:
        messages.error(request, 'ليس لديك صلاحية للوصول إلى اختبار الوكيل')
        return redirect('dashboard')
    """صفحة اختبار الوكيل"""
    if request.method == 'POST':
        try:
            from .smart_agent import smart_agent
            from app.models import Company
            
            phone_number = request.POST.get('phone_number')
            message = request.POST.get('message')
            
            if not phone_number or not message:
                return JsonResponse({
                    'success': False,
                    'error': 'رقم الهاتف والرسالة مطلوبان'
                })
            
            # Use first company phone if not provided
            if not phone_number or phone_number.strip() == '':
                first_company = Company.objects.first()
                if first_company:
                    phone_number = first_company.phone
                else:
                    return JsonResponse({
                        'success': False,
                        'error': 'لا توجد شركات في النظام'
                    })
            
            # Process message
            result = smart_agent.process_message(phone_number, message)
            
            return JsonResponse(result)
            
        except Exception as e:
            import traceback
            print(f"Error in test_agent: {e}")
            print(traceback.format_exc())
            return JsonResponse({
                'success': False,
                'error': f'خطأ في معالجة الرسالة: {str(e)}'
            })
    
    # Get all companies for display
    from app.models import Company
    companies = Company.objects.all().order_by('name')
    
    return render(request, 'whatsapp_agent/test.html', {
        'companies': companies
    })
