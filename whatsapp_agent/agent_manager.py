#!/usr/bin/env python3
"""
مدير الوكلاء الذكيين - Agent Manager
يدير الوكلاء المتعددة مع نظام fallback
"""

import json
import logging
import requests
import google.generativeai as genai
from typing import Dict, List, Any, Optional
from django.db.models import Q
from app.models import (
    User, Company, Product, Customer, Invoice, Return, Payment, 
    CustomerBalance, Conversation, Agent, APIKey
)

logger = logging.getLogger('whatsapp_agent.agent_manager')

class AgentManager:
    """مدير الوكلاء الذكيين"""
    
    def __init__(self)
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
    
    def get_available_agents(self) -> List[Agent]:
        """الحصول على الوكلاء المتاحة"""
        agents = Agent.objects.filter(is_active=True).order_by('-is_primary', 'name')
        logger.info(f"🤖 [GET_AGENTS] عدد الوكلاء المتاحة: {len(agents)}")
        for agent in agents:
            logger.info(f"🤖 [GET_AGENTS] - {agent.name} {'(رئيسي)' if agent.is_primary else ''}")
        return agents
    
    def get_primary_agent(self) -> Optional[Agent]:
        """الحصول على الوكيل الرئيسي"""
        return Agent.objects.filter(is_active=True, is_primary=True).first()
    
    def get_active_api_key(self) -> Optional[APIKey]:
        """الحصول على مفتاح API نشط مع نظام fallback"""
        logger.info(f"🔑 [GET_API_KEY] البحث عن مفتاح API نشط")
        
        # أولاً: محاولة الحصول على المفتاح الرئيسي
        primary_key = APIKey.objects.filter(
            is_active=True, 
            is_primary=True,
            provider='gemini'
        ).first()
        
        if primary_key:
            logger.info(f"🔑 [GET_API_KEY] وجدت المفتاح الرئيسي: {primary_key.name}")
            if not primary_key.is_quota_exceeded()
                logger.info(f"✅ [GET_API_KEY] المفتاح الرئيسي صالح")
                return primary_key
            else:
                logger.warning(f"⚠️ [GET_API_KEY] المفتاح الرئيسي تجاوز الحد المسموح")
        else:
            logger.warning(f"❌ [GET_API_KEY] لم أجد مفتاح رئيسي")
        
        # ثانياً: البحث عن مفتاح بديل إذا تجاوز المفتاح الرئيسي الحد المسموح
        fallback_key = APIKey.objects.filter(
            is_active=True,
            provider='gemini'
        ).exclude(id=primary_key.id if primary_key else None).first()
        
        if fallback_key:
            logger.info(f"🔑 [GET_API_KEY] وجدت مفتاح بديل: {fallback_key.name}")
            if not fallback_key.is_quota_exceeded()
                logger.info(f"✅ [GET_API_KEY] استخدام المفتاح البديل: {fallback_key.name}")
                return fallback_key
            else:
                logger.warning(f"⚠️ [GET_API_KEY] المفتاح البديل تجاوز الحد المسموح")
        else:
            logger.warning(f"❌ [GET_API_KEY] لم أجد مفتاح بديل")
        
        # ثالثاً: إذا لم يوجد مفتاح صالح، إرجاع المفتاح الرئيسي حتى لو تجاوز الحد
        if primary_key:
            logger.warning(f"⚠️ [GET_API_KEY] استخدام المفتاح الرئيسي رغم تجاوز الحد: {primary_key.name}")
            return primary_key
        
        logger.error("❌ [GET_API_KEY] لا يوجد مفتاح API نشط متاح")
        return None
    
    def get_company_from_phone(self, phone_number: str) -> Optional[Company]:
        """الحصول على الشركة من رقم الهاتف"""
        logger.info(f"🔍 [GET_COMPANY] البحث عن الشركة برقم: {phone_number}")
        
        try:
            clean_phone = phone_number.replace('+', '').replace(' ', '').replace('-', '')
            logger.info(f"🔍 [GET_COMPANY] رقم الهاتف المنظف: {clean_phone}")
            
            # Find company by phone
            company = Company.objects.filter(phone__icontains=clean_phone).first()
            if not company:
                logger.info(f"🔍 [GET_COMPANY] لم أجد شركة بالرقم المنظف، جرب تنسيقات أخرى")
                # Try with different phone formats
                for phone_format in [f"+{clean_phone}", f"0{clean_phone}", clean_phone]:
                    logger.info(f"🔍 [GET_COMPANY] جرب تنسيق: {phone_format}")
                    company = Company.objects.filter(phone__icontains=phone_format).first()
                    if company:
                        logger.info(f"✅ [GET_COMPANY] وجدت شركة: {company.name}")
                        break
            
            if company:
                logger.info(f"✅ [GET_COMPANY] الشركة الموجودة: {company.name}")
            else:
                logger.warning(f"❌ [GET_COMPANY] لم أجد أي شركة مطابقة")
            
            return company
        except Exception as e:
            logger.error(f"خطأ في البحث عن الشركة: {e}")
            return None
    
    def get_conversation_history(self, company: Company, phone_number: str, limit: int = 20) -> List[Dict]:
        """الحصول على تاريخ المحادثة"""
        try:
            conversations = Conversation.objects.filter(
                company=company,
                phone_number=phone_number
            ).order_by('-created_at')[:limit]
            
            history = []
            for conv in conversations:
                history.append({
                    "role": "user",
                    "content": conv.message
                })
                history.append({
                    "role": "assistant", 
                    "content": conv.response
                })
            
            return history
        except Exception as e:
            logger.error(f"خطأ في الحصول على تاريخ المحادثة: {e}")
            return []
    
    def save_conversation(self, company: Company, phone_number: str, message: str, 
                         response: str, tool_used: str = None, is_confirmation: bool = False,
                         confirmation_data: Dict = None)
        """حفظ المحادثة في قاعدة البيانات"""
        try:
            Conversation.objects.create(
                company=company,
                phone_number=phone_number,
                message=message,
                response=response,
                tool_used=tool_used,
                is_confirmation=is_confirmation,
                confirmation_data=confirmation_data
            )
        except Exception as e:
            logger.error(f"خطأ في حفظ المحادثة: {e}")
    
    def analyze_message_with_ai(self, message: str, conversation_history: List[Dict], 
                               agent: Agent) -> Dict[str, Any]:
        """تحليل الرسالة باستخدام الذكاء الاصطناعي مع نظام مفاتيح API متعددة"""
        
        # 🔍 Log الرسالة الواردة
        logger.info(f"🔍 [ANALYZE] رسالة المستخدم: '{message}'")
        logger.info(f"🔍 [ANALYZE] تاريخ المحادثة: {len(conversation_history)} رسالة")
        logger.info(f"🔍 [ANALYZE] الوكيل المستخدم: {agent.name}")
        
        # 📋 عرض الأدوات المتاحة
        logger.info(f"📋 [TOOLS] الأدوات المتاحة:")
        for tool_name, tool_info in self.available_tools.items()
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
                original_text = response_text
                if response_text.startswith('```json')
                    response_text = response_text[7:]  # Remove ```json
                    logger.info(f"🔍 [PARSE] إزالة ```json من البداية")
                if response_text.startswith('```')
                    response_text = response_text[3:]   # Remove ```
                    logger.info(f"🔍 [PARSE] إزالة ``` من البداية")
                if response_text.endswith('```')
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
        for tool_name, tool_info in self.available_tools.items()
            keywords = tool_info.get('keywords', [])
            logger.info(f"🔄 [FALLBACK] فحص أداة {tool_name} مع الكلمات: {keywords}")
            
            if any(keyword.lower() in message_lower for keyword in keywords)
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
    
    def execute_tool(self, tool_name: str, company: Company, **kwargs) -> Dict[str, Any]:
        """تنفيذ أداة محددة"""
        try:
            if tool_name == "list_products":
                products = Product.objects.filter(company=company)[:10]
                if not products:
                    return {"success": True, "data": "📦 لا توجد منتجات في النظام"}
                
                response = "📦 *قائمة المنتجات:*\n"
                for product in products:
                    response += f"• {product.name} - {product.price} ر.س (المخزون: {product.stock_qty})\n"
                
                return {"success": True, "data": response}
            
            elif tool_name == "list_customers":
                customers = Customer.objects.filter(company=company)[:10]
                if not customers:
                    return {"success": True, "data": "👥 لا يوجد عملاء في النظام"}
                
                response = "👥 *قائمة العملاء:*\n"
                for customer in customers:
                    try:
                        balance = CustomerBalance.objects.get(customer=customer)
                        balance_text = f" (المستحقات: {balance.balance} ر.س)" if balance.balance > 0 else ""
                    except:
                        balance_text = ""
                    
                    response += f"• {customer.name}{balance_text}\n"
                
                return {"success": True, "data": response}
            
            elif tool_name == "list_invoices":
                invoices = Invoice.objects.filter(company=company).order_by('-created_at')[:10]
                if not invoices:
                    return {"success": True, "data": "🧾 لا توجد فواتير في النظام"}
                
                response = "🧾 *قائمة الفواتير:*\n"
                for invoice in invoices:
                    status_text = "✅ مؤكدة" if invoice.status == 'confirmed' else "⏳ مسودة"
                    response += f"• فاتورة #{invoice.id} - {invoice.customer.name} - {invoice.total_amount} ر.س {status_text}\n"
                
                return {"success": True, "data": response}
            
            elif tool_name == "get_stats":
                from django.db.models import Sum
                from django.utils import timezone
                
                today = timezone.now().date()
                today_invoices = Invoice.objects.filter(company=company, created_at__date=today).count()
                total_sales = Invoice.objects.filter(company=company, status='confirmed').aggregate(
                    total=Sum('total_amount'))['total'] or 0
                low_stock_items = Product.objects.filter(company=company, stock_qty__lt=5).count()
                total_customers = Customer.objects.filter(company=company).count()
                
                response = "📊 *إحصائيات لوحة التحكم:*\n"
                response += f"• فواتير اليوم: {today_invoices}\n"
                response += f"• إجمالي المبيعات: {total_sales} ر.س\n"
                response += f"• منتجات قليلة المخزون: {low_stock_items}\n"
                response += f"• إجمالي العملاء: {total_customers}\n"
                
                return {"success": True, "data": response}
            
            # أدوات البحث والفلترة
            elif tool_name == "search_products":
                search_term = kwargs.get('search_term', '')
                if not search_term:
                    return {"success": False, "error": "يرجى تحديد كلمة البحث"}
                
                products = Product.objects.filter(
                    company=company,
                    Q(name__icontains=search_term) | 
                    Q(code__icontains=search_term) |
                    Q(category__name__icontains=search_term)
                )[:10]
                
                if not products:
                    return {"success": True, "data": f"🔍 لم أجد منتجات مطابقة لـ '{search_term}'"}
                
                response = f"🔍 *نتائج البحث عن '{search_term}':*\n"
                for product in products:
                    response += f"• {product.name} - {product.price} ر.س (المخزون: {product.stock_qty})\n"
                
                return {"success": True, "data": response}
            
            elif tool_name == "search_customers":
                search_term = kwargs.get('search_term', '')
                if not search_term:
                    return {"success": False, "error": "يرجى تحديد كلمة البحث"}
                
                customers = Customer.objects.filter(
                    company=company,
                    Q(name__icontains=search_term) | 
                    Q(phone__icontains=search_term) |
                    Q(email__icontains=search_term)
                )[:10]
                
                if not customers:
                    return {"success": True, "data": f"🔍 لم أجد عملاء مطابقين لـ '{search_term}'"}
                
                response = f"🔍 *نتائج البحث عن '{search_term}':*\n"
                for customer in customers:
                    try:
                        balance = CustomerBalance.objects.get(customer=customer)
                        balance_text = f" (المستحقات: {balance.balance} ر.س)" if balance.balance > 0 else ""
                    except:
                        balance_text = ""
                    
                    response += f"• {customer.name}{balance_text}\n"
                
                return {"success": True, "data": response}
            
            elif tool_name == "search_invoices":
                search_term = kwargs.get('search_term', '')
                if not search_term:
                    return {"success": False, "error": "يرجى تحديد كلمة البحث"}
                
                invoices = Invoice.objects.filter(
                    company=company,
                    Q(id__icontains=search_term) |
                    Q(customer__name__icontains=search_term)
                ).order_by('-created_at')[:10]
                
                if not invoices:
                    return {"success": True, "data": f"🔍 لم أجد فواتير مطابقة لـ '{search_term}'"}
                
                response = f"🔍 *نتائج البحث عن '{search_term}':*\n"
                for invoice in invoices:
                    status_text = "✅ مؤكدة" if invoice.status == 'confirmed' else "⏳ مسودة"
                    response += f"• فاتورة #{invoice.id} - {invoice.customer.name} - {invoice.total_amount} ر.س {status_text}\n"
                
                return {"success": True, "data": response}
            
            # أدوات إضافة البيانات
            elif tool_name == "add_customer":
                name = kwargs.get('name', '')
                phone = kwargs.get('phone', '')
                email = kwargs.get('email', '')
                
                if not name or not phone:
                    return {"success": False, "error": "يرجى تحديد اسم العميل ورقم الهاتف"}
                
                customer = Customer.objects.create(
                    company=company,
                    name=name,
                    phone=phone,
                    email=email or ''
                )
                
                # إنشاء رصيد للعميل
                CustomerBalance.objects.create(customer=customer, balance=0)
                
                return {"success": True, "data": f"✅ تم إضافة العميل '{name}' بنجاح"}
            
            elif tool_name == "add_product":
                name = kwargs.get('name', '')
                price = kwargs.get('price', 0)
                stock_qty = kwargs.get('stock_qty', 0)
                category_name = kwargs.get('category', '')
                
                if not name or price <= 0:
                    return {"success": False, "error": "يرجى تحديد اسم المنتج والسعر"}
                
                # البحث عن الفئة أو إنشاؤها
                category = None
                if category_name:
                    category, created = Category.objects.get_or_create(
                        name=category_name,
                        company=company,
                        defaults={'description': f'فئة {category_name}'}
                    )
                
                product = Product.objects.create(
                    company=company,
                    name=name,
                    price=price,
                    stock_qty=stock_qty,
                    category=category
                )
                
                return {"success": True, "data": f"✅ تم إضافة المنتج '{name}' بنجاح"}
            
            elif tool_name == "add_category":
                name = kwargs.get('name', '')
                description = kwargs.get('description', '')
                
                if not name:
                    return {"success": False, "error": "يرجى تحديد اسم الفئة"}
                
                category = Category.objects.create(
                    company=company,
                    name=name,
                    description=description or f'فئة {name}'
                )
                
                return {"success": True, "data": f"✅ تم إضافة الفئة '{name}' بنجاح"}
            
            # أدوات الرصيد والدفع
            elif tool_name == "customer_balance":
                customer_name = kwargs.get('customer_name', '')
                if not customer_name:
                    return {"success": False, "error": "يرجى تحديد اسم العميل"}
                
                try:
                    customer = Customer.objects.get(company=company, name__icontains=customer_name)
                    balance = CustomerBalance.objects.get(customer=customer)
                    
                    response = f"💰 *رصيد العميل {customer.name}:*\n"
                    response += f"• الرصيد الحالي: {balance.balance} ر.س\n"
                    response += f"• آخر تحديث: {balance.updated_at.strftime('%Y-%m-%d %H:%M')}\n"
                    
                    return {"success": True, "data": response}
                except Customer.DoesNotExist:
                    return {"success": False, "error": f"لم أجد عميل باسم '{customer_name}'"}
                except CustomerBalance.DoesNotExist:
                    return {"success": True, "data": f"💰 العميل '{customer_name}' ليس له رصيد مسجل"}
            
            elif tool_name == "list_payments":
                payments = Payment.objects.filter(company=company).order_by('-created_at')[:10]
                if not payments:
                    return {"success": True, "data": "💳 لا توجد مدفوعات في النظام"}
                
                response = "💳 *قائمة المدفوعات:*\n"
                for payment in payments:
                    response += f"• {payment.customer.name} - {payment.amount} ر.س - {payment.payment_method}\n"
                
                return {"success": True, "data": response}
            
            elif tool_name == "add_payment":
                customer_name = kwargs.get('customer_name', '')
                amount = kwargs.get('amount', 0)
                payment_method = kwargs.get('payment_method', 'نقد')
                
                if not customer_name or amount <= 0:
                    return {"success": False, "error": "يرجى تحديد اسم العميل ومبلغ الدفع"}
                
                try:
                    customer = Customer.objects.get(company=company, name__icontains=customer_name)
                    
                    payment = Payment.objects.create(
                        company=company,
                        customer=customer,
                        amount=amount,
                        payment_method=payment_method
                    )
                    
                    # تحديث رصيد العميل
                    balance, created = CustomerBalance.objects.get_or_create(
                        customer=customer,
                        defaults={'balance': 0}
                    )
                    balance.balance -= amount  # تقليل المديونية
                    balance.save()
                    
                    return {"success": True, "data": f"✅ تم تسجيل دفعة {amount} ر.س للعميل '{customer.name}'"}
                except Customer.DoesNotExist:
                    return {"success": False, "error": f"لم أجد عميل باسم '{customer_name}'"}
            
            # أدوات الإرجاع
            elif tool_name == "list_returns":
                returns = Return.objects.filter(company=company).order_by('-created_at')[:10]
                if not returns:
                    return {"success": True, "data": "🔄 لا توجد طلبات إرجاع في النظام"}
                
                response = "🔄 *قائمة طلبات الإرجاع:*\n"
                for return_obj in returns:
                    status_text = "✅ معتمد" if return_obj.status == 'approved' else "⏳ في الانتظار"
                    response += f"• إرجاع #{return_obj.id} - {return_obj.customer.name} - {status_text}\n"
                
                return {"success": True, "data": response}
            
            elif tool_name == "create_return":
                customer_name = kwargs.get('customer_name', '')
                invoice_id = kwargs.get('invoice_id', '')
                reason = kwargs.get('reason', '')
                
                if not customer_name or not invoice_id:
                    return {"success": False, "error": "يرجى تحديد اسم العميل ورقم الفاتورة"}
                
                try:
                    customer = Customer.objects.get(company=company, name__icontains=customer_name)
                    invoice = Invoice.objects.get(company=company, id=invoice_id, customer=customer)
                    
                    return_obj = Return.objects.create(
                        company=company,
                        customer=customer,
                        invoice=invoice,
                        reason=reason or 'طلب إرجاع'
                    )
                    
                    return {"success": True, "data": f"✅ تم إنشاء طلب إرجاع #{return_obj.id} للعميل '{customer.name}'"}
                except Customer.DoesNotExist:
                    return {"success": False, "error": f"لم أجد عميل باسم '{customer_name}'"}
                except Invoice.DoesNotExist:
                    return {"success": False, "error": f"لم أجد فاتورة برقم {invoice_id} للعميل '{customer_name}'"}
            
            # أدوات المساعدة
            elif tool_name == "help":
                response = "🤖 *الأوامر المتاحة:*\n\n"
                response += "*الأدوات الأساسية:*\n"
                response += "• عرض المنتجات\n• عرض العملاء\n• عرض الفواتير\n• الإحصائيات\n\n"
                response += "*البحث والفلترة:*\n"
                response += "• بحث منتجات\n• بحث عملاء\n• بحث فواتير\n\n"
                response += "*إضافة البيانات:*\n"
                response += "• إضافة عميل\n• إضافة منتج\n• إضافة فئة\n\n"
                response += "*الرصيد والدفع:*\n"
                response += "• رصيد العميل\n• عرض المدفوعات\n• إضافة دفعة\n\n"
                response += "*الإرجاع:*\n"
                response += "• عرض الإرجاعات\n• إنشاء إرجاع\n\n"
                response += "*المساعدة:*\n"
                response += "• المساعدة\n• معلومات الشركة\n\n"
                response += "💡 *مثال:* 'ابحث عن منتج لابتوب' أو 'أضف عميل جديد'"
                
                return {"success": True, "data": response}
            
            elif tool_name == "company_info":
                response = f"🏢 *معلومات الشركة:*\n"
                response += f"• الاسم: {company.name}\n"
                response += f"• الكود: {company.code}\n"
                response += f"• الهاتف: {company.phone}\n"
                response += f"• البريد: {company.email or 'غير محدد'}\n"
                response += f"• العنوان: {company.address or 'غير محدد'}\n"
                response += f"• تاريخ الإنشاء: {company.created_at.strftime('%Y-%m-%d')}\n"
                
                return {"success": True, "data": response}
            
            else:
                return {"success": False, "error": f"أداة غير معروفة: {tool_name}"}
                
        except Exception as e:
            logger.error(f"خطأ في تنفيذ الأداة {tool_name}: {e}")
            return {"success": False, "error": f"خطأ في تنفيذ الأداة: {str(e)}"}
    
    def send_whatsapp_message(self, webhook_url: str, to_number: str, message: str) -> bool:
        """إرسال رسالة عبر الواتساب"""
        try:
            data = {
                "to": to_number,
                "message": message
            }
            
            logger.info(f"إرسال رسالة إلى {to_number} عبر {webhook_url}")
            logger.info(f"محتوى الرسالة: {message[:100]}...")
            
            response = requests.post(
                webhook_url, 
                json=data, 
                timeout=30,
                verify=False,  # Disable SSL verification
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': 'Stockly-WhatsApp-Agent/1.0'
                }
            )
            
            logger.info(f"استجابة الويب هوك: {response.status_code}")
            if response.status_code != 200:
                logger.error(f"خطأ في الويب هوك: {response.text}")
                return False
            
            logger.info("تم إرسال الرسالة بنجاح")
            return True
            
        except Exception as e:
            logger.error(f"خطأ في إرسال الرسالة: {e}")
            return False
    
    def process_message(self, phone_number: str, message: str) -> Dict[str, Any]:
        """معالجة الرسالة الرئيسية"""
        logger.info(f"🚀 [PROCESS_MESSAGE] بدء معالجة الرسالة")
        logger.info(f"🚀 [PROCESS_MESSAGE] رقم الهاتف: {phone_number}")
        logger.info(f"🚀 [PROCESS_MESSAGE] الرسالة: '{message}'")
        
        try:
            # Get company from phone
            company = self.get_company_from_phone(phone_number)
            if not company:
                return {
                    "success": False,
                    "response": "❌ لا يمكن العثور على الشركة المرتبطة برقم الهاتف هذا"
                }
            
            # Get conversation history
            history = self.get_conversation_history(company, phone_number)
            
            # Try agents in order (primary first, then others)
            agents = self.get_available_agents()
            if not agents:
                return {
                    "success": False,
                    "response": "❌ لا توجد وكلاء نشطة في النظام"
                }
            
            last_error = None
            for agent in agents:
                try:
                    logger.info(f"محاولة استخدام الوكيل: {agent.name}")
                    
                    # Analyze message with AI
                    ai_result = self.analyze_message_with_ai(message, history, agent)
                    
                    tool_name = ai_result.get('tool')
                    requires_confirmation = ai_result.get('requires_confirmation', False)
                    response = ai_result.get('response', '❓ لم أفهم طلبك')
                    
                    # If AI couldn't understand, try next agent
                    if tool_name == 'unknown' or not tool_name:
                        logger.warning(f"الوكيل {agent.name} لم يفهم الرسالة")
                        last_error = response
                        continue
                    
                    # Execute tool if no confirmation needed
                    if not requires_confirmation:
                        result = self.execute_tool(tool_name, company)
                        if result.get('success')
                            response = result.get('data', response)
                        else:
                            response = f"❌ خطأ: {result.get('error', 'خطأ غير معروف')}"
                    
                    # Save conversation
                    self.save_conversation(company, phone_number, message, response, tool_name)
                    
                    # Send WhatsApp message
                    if agent.whatsapp_webhook_url and agent.whatsapp_webhook_url.strip()
                        send_success = self.send_whatsapp_message(agent.whatsapp_webhook_url, phone_number, response)
                        if not send_success:
                            response += "\n\n⚠️ ملاحظة: قد لا تصل الرسالة عبر الواتساب بسبب مشكلة تقنية."
                    
                    return {
                        "success": True,
                        "response": response,
                        "webhook_url": agent.whatsapp_webhook_url,
                        "agent_used": agent.name
                    }
                    
                except Exception as e:
                    logger.error(f"خطأ في الوكيل {agent.name}: {e}")
                    last_error = f"خطأ في الوكيل {agent.name}: {str(e)}"
                    continue
            
            # If all agents failed, return error
            return {
                "success": False,
                "response": last_error or "❌ فشل جميع الوكلاء في معالجة الرسالة"
            }
            
        except Exception as e:
            logger.error(f"خطأ في معالجة الرسالة: {e}")
            return {
                "success": False,
                "response": f"❌ حدث خطأ في معالجة طلبك: {str(e)}"
            }

# Global agent manager instance
agent_manager = AgentManager()
