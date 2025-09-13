#!/usr/bin/env python3
"""
WhatsApp Agent API - واجهة برمجية للوكيل الذكي
"""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
import json
import logging

from .smart_agent import smart_agent

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["POST"])
def process_whatsapp_message(request):
    """
    API endpoint لمعالجة رسائل الواتساب
    
    JSON Input:
    {
        "message": "نص الرسالة",
        "phone_number": "رقم الهاتف"
    }
    
    JSON Output:
    {
        "success": true/false,
        "response": "الرد",
        "webhook_url": "رابط الإرسال"
    }
    """
    try:
        # Parse JSON data
        data = json.loads(request.body)
        message = data.get('message', '').strip()
        phone_number = data.get('phone_number', '').strip()
        
        # Validate input
        if not message or not phone_number:
            return JsonResponse({
                "success": False,
                "error": "message و phone_number مطلوبان"
            }, status=400)
        
        # Process message with smart agent
        result = smart_agent.process_message(phone_number, message)
        
        # Send WhatsApp message if successful
        if result.get('success') and result.get('webhook_url'):
            webhook_url = result['webhook_url']
            response_text = result['response']
            
            # Send message via WhatsApp
            send_success = smart_agent.send_whatsapp_message(
                webhook_url, phone_number, response_text
            )
            
            if not send_success:
                logger.error(f"فشل في إرسال الرسالة إلى {phone_number}")
        
        return JsonResponse(result)
        
    except json.JSONDecodeError:
        return JsonResponse({
            "success": False,
            "error": "JSON غير صحيح"
        }, status=400)
    except Exception as e:
        logger.error(f"خطأ في معالجة الرسالة: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_agent_status(request):
    """الحصول على حالة الوكيل"""
    try:
        return JsonResponse({
            "success": True,
            "status": "active",
            "message": "الوكيل الذكي نشط"
        })
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def send_whatsapp_message(request):
    """
    API endpoint لإرسال رسالة عبر الواتساب
    
    JSON Input:
    {
        "to": "رقم الهاتف",
        "message": "نص الرسالة",
        "webhook_url": "رابط الواتساب"
    }
    """
    try:
        data = json.loads(request.body)
        to_number = data.get('to', '').strip()
        message = data.get('message', '').strip()
        webhook_url = data.get('webhook_url', '').strip()
        
        if not to_number or not message or not webhook_url:
            return JsonResponse({
                "success": False,
                "error": "to و message و webhook_url مطلوبان"
            }, status=400)
        
        # Send message
        success = smart_agent.send_whatsapp_message(webhook_url, to_number, message)
        
        if success:
            return JsonResponse({
                "success": True,
                "message": "تم إرسال الرسالة بنجاح"
            })
        else:
            return JsonResponse({
                "success": False,
                "error": "فشل في إرسال الرسالة"
            }, status=500)
            
    except json.JSONDecodeError:
        return JsonResponse({
            "success": False,
            "error": "JSON غير صحيح"
        }, status=400)
    except Exception as e:
        logger.error(f"خطأ في إرسال الرسالة: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)
