"""
معالج Fallback للوكيل الذكي
"""
import logging
from typing import Dict, Any

logger = logging.getLogger('whatsapp_agent.agent_manager')


class FallbackHandler:
    """معالج Fallback للوكيل الذكي"""
    
    def __init__(self):
        self.fallback_responses = {
            "greeting": [
                "مرحباً! كيف يمكنني مساعدتك اليوم؟",
                "أهلاً وسهلاً! ما الذي تريد معرفته؟",
                "مرحباً بك! أنا هنا لمساعدتك في إدارة المخزون والفواتير."
            ],
            "help": [
                "يمكنني مساعدتك في: عرض المنتجات، العملاء، الفواتير، والإحصائيات",
                "أمثلة على الأوامر: 'عرض المنتجات'، 'بحث عن عميل'، 'إضافة منتج جديد'",
                "اكتب 'مساعدة' لرؤية جميع الأوامر المتاحة"
            ],
            "unknown": [
                "❓ لم أفهم طلبك، جرب: عرض المنتجات، العملاء، الفواتير، أو الإحصائيات",
                "عذراً، لم أتمكن من فهم طلبك. يمكنك كتابة 'مساعدة' لرؤية الأوامر المتاحة",
                "لم أتمكن من معالجة طلبك. يرجى المحاولة مرة أخرى أو كتابة 'مساعدة'"
            ],
            "error": [
                "عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى",
                "حدث خطأ غير متوقع. يرجى المحاولة لاحقاً",
                "عذراً، واجهت مشكلة تقنية. يرجى المحاولة مرة أخرى"
            ]
        }
    
    def handle_fallback(self, message: str, error_type: str = "unknown") -> Dict[str, Any]:
        """معالجة Fallback"""
        logger.info(f"🔄 [FALLBACK] معالجة fallback للرسالة: '{message}'")
        logger.info(f"🔄 [FALLBACK] نوع الخطأ: {error_type}")
        
        # تحديد نوع الاستجابة
        if any(word in message.lower() for word in ["مرحبا", "أهلا", "سلام", "hello", "hi"]):
            response_type = "greeting"
        elif any(word in message.lower() for word in ["مساعدة", "help", "ماذا", "what"]):                   
            response_type = "help"
        else:
            response_type = error_type
        
        # اختيار رد عشوائي
        import random
        responses = self.fallback_responses.get(response_type, self.fallback_responses["unknown"])
        selected_response = random.choice(responses)
        
        logger.info(f"🔄 [FALLBACK] الرد المختار: {selected_response}")
        
        return {
            "tool": "unknown",
            "requires_confirmation": False,
            "response": selected_response,
            "confirmation_message": None
        }
    
    def handle_ai_failure(self, message: str, error: Exception) -> Dict[str, Any]:
        """معالجة فشل الذكاء الاصطناعي"""
        logger.error(f"❌ [AI_FAILURE] فشل في تحليل الرسالة: {message}")
        logger.error(f"❌ [AI_FAILURE] نوع الخطأ: {type(error).__name__}")
        logger.error(f"❌ [AI_FAILURE] رسالة الخطأ: {str(error)}")
        
        return self.handle_fallback(message, "error")
    
    def handle_json_parse_error(self, message: str, raw_response: str) -> Dict[str, Any]:
        """معالجة خطأ تحليل JSON"""
        logger.error(f"❌ [JSON_PARSE_ERROR] خطأ في تحليل JSON للرسالة: {message}")
        logger.error(f"❌ [JSON_PARSE_ERROR] الاستجابة الخام: {raw_response[:200]}...")
        
        return self.handle_fallback(message, "error")
