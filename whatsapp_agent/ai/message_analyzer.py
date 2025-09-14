"""
محلل الرسائل بالذكاء الاصطناعي
"""
import json
import logging
import google.generativeai as genai
from typing import Dict, List, Any
from app.models import Agent, APIKey

logger = logging.getLogger('whatsapp_agent.agent_manager')


class MessageAnalyzer:
    """محلل الرسائل بالذكاء الاصطناعي"""
    
    def __init__(self):         
        self.available_tools = {
            # الأدوات الأساسية
            "list_products": {
                "name": "عرض المنتجات",
                "description": "عرض قائمة المنتجات",
                "keywords": ["منتجات", "products", "عرض المنتجات", "قائمة المنتجات", "بضائع", "سلع"],
                "requires_confirmation": False
            },
            "list_customers": {
                "name": "عرض العملاء",
                "description": "عرض قائمة العملاء",
                "keywords": ["عملاء", "customers", "عرض العملاء", "قائمة العملاء", "زبائن", "زبون"],
                "requires_confirmation": False
            },
            "list_invoices": {
                "name": "عرض الفواتير",
                "description": "عرض قائمة الفواتير",
                "keywords": ["فواتير", "invoices", "عرض الفواتير", "قائمة الفواتير", "فاتورة"],
                "requires_confirmation": False
            },
            "get_stats": {
                "name": "الإحصائيات",
                "description": "عرض إحصائيات النظام",
                "keywords": ["إحصائيات", "stats", "لوحة التحكم", "dashboard", "تقارير"],
                "requires_confirmation": False
            },
            
            # أدوات البحث والفلترة
            "search_products": {
                "name": "البحث في المنتجات",
                "description": "البحث في المنتجات بالاسم أو الكود أو الفئة",
                "keywords": ["بحث منتجات", "search products", "ابحث عن منتج", "البحث في المنتجات", "منتج", "product search"],
                "requires_confirmation": False
            },
            "search_customers": {
                "name": "البحث في العملاء",
                "description": "البحث في العملاء بالاسم أو الهاتف أو البريد",
                "keywords": ["بحث عملاء", "search customers", "ابحث عن عميل", "البحث في العملاء", "عميل", "customer search"],
                "requires_confirmation": False
            },
            "search_invoices": {
                "name": "البحث في الفواتير",
                "description": "البحث في الفواتير برقم الفاتورة أو التاريخ أو العميل",
                "keywords": ["بحث فواتير", "search invoices", "ابحث عن فاتورة", "البحث في الفواتير", "فاتورة", "invoice search"],
                "requires_confirmation": False
            },
            
            # أدوات إضافة البيانات
            "add_customer": {
                "name": "إضافة عميل",
                "description": "إضافة عميل جديد",
                "keywords": ["إضافة عميل", "add customer", "عميل جديد", "new customer", "تسجيل عميل", "register customer"],
                "requires_confirmation": True
            },
            "add_product": {
                "name": "إضافة منتج",
                "description": "إضافة منتج جديد",
                "keywords": ["إضافة منتج", "add product", "منتج جديد", "new product", "تسجيل منتج", "register product"],
                "requires_confirmation": True
            },
            "add_category": {
                "name": "إضافة فئة",
                "description": "إضافة فئة جديدة",
                "keywords": ["إضافة فئة", "add category", "فئة جديدة", "new category", "تسجيل فئة", "register category"],
                "requires_confirmation": True
            },
            
            # أدوات الرصيد والدفع
            "customer_balance": {
                "name": "رصيد العميل",
                "description": "عرض رصيد العميل",
                "keywords": ["رصيد العميل", "customer balance", "رصيد", "balance", "مديونية", "debt"],
                "requires_confirmation": False
            },
            "list_payments": {
                "name": "عرض المدفوعات",
                "description": "عرض قائمة المدفوعات",
                "keywords": ["مدفوعات", "payments", "عرض المدفوعات", "قائمة المدفوعات", "دفعات", "دفع"],
                "requires_confirmation": False
            },
            "add_payment": {
                "name": "إضافة دفعة",
                "description": "إضافة دفعة جديدة",
                "keywords": ["إضافة دفعة", "add payment", "دفعة جديدة", "new payment", "تسجيل دفعة", "register payment"],
                "requires_confirmation": True
            },
            
            # أدوات الإرجاع
            "list_returns": {
                "name": "عرض الإرجاعات",
                "description": "عرض قائمة طلبات الإرجاع",
                "keywords": ["إرجاعات", "returns", "عرض الإرجاعات", "قائمة الإرجاعات", "مرتجعات", "return"],
                "requires_confirmation": False
            },
            "create_return": {
                "name": "إنشاء إرجاع",
                "description": "إنشاء طلب إرجاع جديد",
                "keywords": ["إنشاء إرجاع", "create return", "إرجاع جديد", "new return", "طلب إرجاع", "return request"],
                "requires_confirmation": True
            },
            
            # أدوات المساعدة
            "help": {
                "name": "المساعدة",
                "description": "عرض جميع الأوامر المتاحة",
                "keywords": ["مساعدة", "help", "أوامر", "commands", "تعليمات", "instructions", "ماذا يمكنني", "what can i"],
                "requires_confirmation": False
            },
            "company_info": {
                "name": "معلومات الشركة",
                "description": "عرض معلومات الشركة",
                "keywords": ["معلومات الشركة", "company info", "بيانات الشركة", "company data", "معلومات", "info"],
                "requires_confirmation": False
            }
        }
    
    def get_active_api_key(self) -> APIKey:
        """الحصول على مفتاح API نشط"""
        logger.info(f"🔑 [GET_API_KEY] البحث عن مفتاح API نشط")
        
        # أولاً: محاولة الحصول على المفتاح الرئيسي
        primary_key = APIKey.objects.filter(
            is_active=True, 
            is_primary=True,
            provider='gemini'
        ).first()
        
        if primary_key:
            logger.info(f"🔑 [GET_API_KEY] وجدت المفتاح الرئيسي: {primary_key.name}")
            if not primary_key.is_quota_exceeded():
                logger.info(f"✅ [GET_API_KEY] المفتاح الرئيسي صالح")
                return primary_key
            else:
                logger.warning(f"⚠️ [GET_API_KEY] المفتاح الرئيسي تجاوز الحد المسموح")
        else:
            logger.warning(f"❌ [GET_API_KEY] لم أجد مفتاح رئيسي")
        
        # ثانياً: البحث عن مفتاح بديل
        fallback_key = APIKey.objects.filter(
            is_active=True,
            provider='gemini'
        ).exclude(id=primary_key.id if primary_key else None).first()
        
        if fallback_key:
            logger.info(f"🔑 [GET_API_KEY] وجدت مفتاح بديل: {fallback_key.name}")
            if not fallback_key.is_quota_exceeded():
                logger.info(f"✅ [GET_API_KEY] استخدام المفتاح البديل: {fallback_key.name}")
                return fallback_key
            else:
                logger.warning(f"⚠️ [GET_API_KEY] المفتاح البديل تجاوز الحد المسموح")
        else:
            logger.warning(f"❌ [GET_API_KEY] لم أجد مفتاح بديل")
        
        # ثالثاً: إرجاع المفتاح الرئيسي حتى لو تجاوز الحد
        if primary_key:
            logger.warning(f"⚠️ [GET_API_KEY] استخدام المفتاح الرئيسي رغم تجاوز الحد: {primary_key.name}")
            return primary_key
        
        logger.error("❌ [GET_API_KEY] لا يوجد مفتاح API نشط متاح")
        return None
    
    def analyze_message_with_ai(self, message: str, conversation_history: List[Dict], 
                               agent: Agent) -> Dict[str, Any]:
        """تحليل الرسالة باستخدام الذكاء الاصطناعي"""
        
        # 🔍 Log الرسالة الواردة
        logger.info(f"🔍 [ANALYZE] رسالة المستخدم: '{message}'")
        logger.info(f"🔍 [ANALYZE] تاريخ المحادثة: {len(conversation_history)} رسالة")
        logger.info(f"🔍 [ANALYZE] الوكيل المستخدم: {agent.name}")
        
        # 📋 عرض الأدوات المتاحة
        logger.info(f"📋 [TOOLS] الأدوات المتاحة:")
        for tool_name, tool_info in self.available_tools.items():
            logger.info(f"   - {tool_name}: {tool_info['description']}")
            logger.info(f"     الكلمات المفتاحية: {tool_info.get('keywords', [])}")
        
        try:
            # 🔑 الحصول على مفتاح API نشط
            api_key_obj = self.get_active_api_key()
            if not api_key_obj:
                logger.error("❌ [ERROR] لا يوجد مفتاح API نشط متاح")
                return {
                    "tool": "unknown",
                    "requires_confirmation": False,
                    "response": "❌ لا يوجد مفتاح API نشط متاح. يرجى إضافة مفتاح API من لوحة الإدارة.",
                    "confirmation_message": None
                }
            
            logger.info(f"🔑 [API_KEY] استخدام مفتاح: {api_key_obj.name}")
            logger.info(f"🔑 [API_KEY] عدد الاستخدامات: {api_key_obj.usage_count}")
            
            # 🤖 Configure Gemini
            genai.configure(api_key=api_key_obj.key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            # 📝 تحضير السياق
            available_tools = list(self.available_tools.keys())
            tools_description = "\n".join([f"- {tool}: {info['description']}" for tool, info in self.available_tools.items()])
            
            context = f"""
أنت وكيل ذكي متخصص لنظام إدارة المخزون والفواتير Stockly.

## مهمتك:
فهم طلبات المستخدم باللغة الطبيعية (العربية أو الإنجليزية) وتحويلها إلى أوامر مناسبة.

## الأدوات المتاحة:
{tools_description}

## تاريخ المحادثة:
{json.dumps(conversation_history, ensure_ascii=False)}

## الرسالة الحالية:
{message}

## تعليمات التحليل:
1. فهم طلب المستخدم بدقة من النص المقدم
2. تحديد الأداة المناسبة من القائمة المتاحة
3. تقييم ما إذا كانت العملية حساسة وتتطلب تأكيد
4. صياغة رد مناسب ومفيد باللغة العربية

## أمثلة على المطابقة:
- "عرض العملاء" أو "أريد رؤية العملاء" أو "شوف لي العملاء" → list_customers
- "عرض المنتجات" أو "أريد رؤية المنتجات" أو "شوف لي المنتجات" → list_products  
- "عرض الفواتير" أو "أريد رؤية الفواتير" أو "شوف لي الفواتير" → list_invoices
- "الإحصائيات" أو "أريد الإحصائيات" أو "شوف لي الإحصائيات" → get_stats

## تنسيق الإجابة:
يجب أن تكون الإجابة بصيغة JSON صحيحة فقط:

{{
    "tool": "اسم الأداة المستخدمة",
    "requires_confirmation": true/false,
    "response": "الرد المناسب باللغة العربية",
    "confirmation_message": "رسالة التأكيد إذا لزم الأمر"
}}
"""
            
            logger.info(f"📝 [CONTEXT] إرسال السياق للذكاء الاصطناعي")
            logger.info(f"📝 [CONTEXT] طول السياق: {len(context)} حرف")
            
            # 🚀 إرسال للذكاء الاصطناعي
            response = model.generate_content(context)
            
            logger.info(f"🚀 [AI_RESPONSE] تم استلام الاستجابة من الذكاء الاصطناعي")
            logger.info(f"🚀 [AI_RESPONSE] طول الاستجابة: {len(response.text)} حرف")
            
            # 🔍 Try to parse JSON response
            try:
                response_text = response.text.strip()
                
                logger.info(f"🔍 [PARSE] النص الخام من AI:")
                logger.info(f"🔍 [PARSE] {response_text[:200]}...")
                
                # Remove markdown code blocks if present
                if response_text.startswith('```json'):
                    response_text = response_text[7:]  # Remove ```json
                    logger.info(f"🔍 [PARSE] إزالة ```json من البداية")
                if response_text.startswith('```'):
                    response_text = response_text[3:]   # Remove ```
                    logger.info(f"🔍 [PARSE] إزالة ``` من البداية")
                if response_text.endswith('```'):
                    response_text = response_text[:-3]  # Remove trailing ```
                    logger.info(f"🔍 [PARSE] إزالة ``` من النهاية")
                
                logger.info(f"🔍 [PARSE] النص بعد التنظيف:")
                logger.info(f"🔍 [PARSE] {response_text}")
                
                # Parse JSON
                result = json.loads(response_text.strip())
                logger.info(f"✅ [SUCCESS] تم تحليل JSON بنجاح:")
                logger.info(f"✅ [SUCCESS] الأداة: {result.get('tool', 'N/A')}")
                logger.info(f"✅ [SUCCESS] يتطلب تأكيد: {result.get('requires_confirmation', 'N/A')}")
                logger.info(f"✅ [SUCCESS] الرد: {result.get('response', 'N/A')[:100]}...")
                
                # تحديث عداد الاستخدام
                api_key_obj.increment_usage()
                
                return result
                
            except json.JSONDecodeError as e:
                logger.error(f"❌ [JSON_ERROR] خطأ في تحليل JSON:")
                logger.error(f"❌ [JSON_ERROR] الخطأ: {e}")
                logger.error(f"❌ [JSON_ERROR] النص الأصلي: {response.text}")
                logger.error(f"❌ [JSON_ERROR] النص بعد التنظيف: {response_text if 'response_text' in locals() else 'N/A'}")
                
                # Fallback: البحث بالكلمات المفتاحية
                logger.info(f"🔄 [FALLBACK] محاولة البحث بالكلمات المفتاحية")
                fallback_result = self.keyword_fallback(message)
                logger.info(f"🔄 [FALLBACK] نتيجة Fallback: {fallback_result}")
                
                return fallback_result
            
        except Exception as e:
            logger.error(f"❌ [EXCEPTION] خطأ في تحليل الرسالة بالذكاء الاصطناعي:")
            logger.error(f"❌ [EXCEPTION] نوع الخطأ: {type(e).__name__}")
            logger.error(f"❌ [EXCEPTION] رسالة الخطأ: {str(e)}")
            
            # Fallback: البحث بالكلمات المفتاحية
            logger.info(f"🔄 [FALLBACK] محاولة البحث بالكلمات المفتاحية")
            fallback_result = self.keyword_fallback(message)
            logger.info(f"🔄 [FALLBACK] نتيجة Fallback: {fallback_result}")
            
            return fallback_result

    def keyword_fallback(self, message: str) -> Dict[str, Any]:
        """نظام fallback بالكلمات المفتاحية"""
        message_lower = message.lower()
        logger.info(f"🔄 [FALLBACK] البحث في الرسالة: '{message_lower}'")
        
        # البحث في كل أداة
        for tool_name, tool_info in self.available_tools.items():
            keywords = tool_info.get('keywords', [])
            logger.info(f"🔄 [FALLBACK] فحص أداة {tool_name} مع الكلمات: {keywords}")
            
            if any(keyword.lower() in message_lower for keyword in keywords):                       
                logger.info(f"✅ [FALLBACK] وجدت مطابقة لأداة: {tool_name}")
                return {
                    "tool": tool_name,
                    "requires_confirmation": tool_info.get('requires_confirmation', False),
                    "response": f"استخدمت البحث بالكلمات المفتاحية: {tool_info['description']}",
                    "confirmation_message": None
                }
        
        logger.info(f"❌ [FALLBACK] لم أجد مطابقة، إرجاع unknown")
        return {
            "tool": "unknown",
            "requires_confirmation": False,
            "response": "❓ لم أفهم طلبك، جرب: عرض المنتجات، العملاء، الفواتير، أو الإحصائيات",
            "confirmation_message": None
        }
