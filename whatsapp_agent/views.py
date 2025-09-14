from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from app.models import AgentSettings, APIKey
import json

@login_required
def agent_settings(request):
    """صفحة إعدادات الوكيل الذكي الموحدة مع إدارة مفاتيح API"""
    if not request.user.is_superuser:
        messages.error(request, 'ليس لديك صلاحية للوصول إلى إعدادات الوكيل الذكي')
        return redirect('dashboard')
    
    try:
        from app.models import Company, Agent
        
        # Get the primary agent
        primary_agent = Agent.objects.filter(is_primary=True).first()
        if not primary_agent:
            # Create a default primary agent if none exists
            primary_agent = Agent.objects.create(
                name="الوكيل الرئيسي",
                whatsapp_webhook_url="https://n8n.srv772321.hstgr.cloud/webhook/whatsapp-msg",
                gemini_api_key="",
                is_active=True,
                is_primary=True,
                max_conversation_history=20,
                confirmation_required=True,
                custom_system_message=""
            )
        
        # Get all API keys
        api_keys = APIKey.objects.all().order_by('-is_primary', '-created_at')
        
        if request.method == 'POST':
            action = request.POST.get('action')
            
            if action == 'update_agent':
                # Update agent settings
                primary_agent.whatsapp_webhook_url = request.POST.get('whatsapp_webhook_url', '')
                primary_agent.is_active = request.POST.get('is_active') == 'on'
                primary_agent.max_conversation_history = int(request.POST.get('max_conversation_history', 20))
                primary_agent.confirmation_required = request.POST.get('confirmation_required') == 'on'
                primary_agent.custom_system_message = request.POST.get('custom_system_message', '')
                primary_agent.save()
                messages.success(request, 'تم تحديث إعدادات الوكيل بنجاح')
            
            elif action == 'add_api_key':
                # Add new API key
                name = request.POST.get('name')
                key = request.POST.get('key')
                provider = request.POST.get('provider', 'gemini')
                is_primary = request.POST.get('is_primary') == 'on'
                max_requests = int(request.POST.get('max_requests_per_day', 1000))
                
                if not name or not key:
                    messages.error(request, 'اسم المفتاح والمفتاح مطلوبان')
                else:
                    try:
                        APIKey.objects.create(
                            name=name,
                            key=key,
                            provider=provider,
                            is_primary=is_primary,
                            max_requests_per_day=max_requests
                        )
                        messages.success(request, f'تم إضافة مفتاح API "{name}" بنجاح')
                    except Exception as e:
                        messages.error(request, f'خطأ في إضافة المفتاح: {str(e)}')
            
            elif action == 'toggle_api_key':
                # Toggle API key status
                key_id = request.POST.get('key_id')
                try:
                    api_key = APIKey.objects.get(id=key_id)
                    api_key.is_active = not api_key.is_active
                    api_key.save()
                    status = 'نشط' if api_key.is_active else 'غير نشط'
                    messages.success(request, f'تم تغيير حالة المفتاح إلى {status}')
                except APIKey.DoesNotExist:
                    messages.error(request, 'المفتاح غير موجود')
            
            elif action == 'set_primary_api_key':
                # Set primary API key
                key_id = request.POST.get('key_id')
                try:
                    api_key = APIKey.objects.get(id=key_id)
                    api_key.is_primary = True
                    api_key.save()
                    messages.success(request, f'تم تعيين "{api_key.name}" كمفتاح رئيسي')
                except APIKey.DoesNotExist:
                    messages.error(request, 'المفتاح غير موجود')
            
            elif action == 'delete_api_key':
                # Delete API key
                key_id = request.POST.get('key_id')
                try:
                    api_key = APIKey.objects.get(id=key_id)
                    api_key.delete()
                    messages.success(request, f'تم حذف المفتاح "{api_key.name}"')
                except APIKey.DoesNotExist:
                    messages.error(request, 'المفتاح غير موجود')
            
            return redirect('agent_settings')
        
        # Get all companies for context
        companies = Company.objects.all().order_by('name')
        
        return render(request, 'whatsapp_agent/unified_settings.html', {
            'agent': primary_agent,
            'api_keys': api_keys,
            'companies': companies
        })
        
    except Exception as e:
        messages.error(request, f'خطأ في تحميل الإعدادات: {str(e)}')
        return render(request, 'whatsapp_agent/unified_settings.html', {
            'agent': None,
            'api_keys': [],
            'companies': []
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

