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
    CustomerBalance, Conversation, Agent
)

logger = logging.getLogger(__name__)

class AgentManager:
    """مدير الوكلاء الذكيين"""
    
    def __init__(self):
        self.available_tools = {
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
            }
        }
    
    def get_available_agents(self) -> List[Agent]:
        """الحصول على الوكلاء المتاحة"""
        return Agent.objects.filter(is_active=True).order_by('-is_primary', 'name')
    
    def get_primary_agent(self) -> Optional[Agent]:
        """الحصول على الوكيل الرئيسي"""
        return Agent.objects.filter(is_active=True, is_primary=True).first()
    
    def get_company_from_phone(self, phone_number: str) -> Optional[Company]:
        """الحصول على الشركة من رقم الهاتف"""
        try:
            clean_phone = phone_number.replace('+', '').replace(' ', '').replace('-', '')
            
            # Find company by phone
            company = Company.objects.filter(phone__icontains=clean_phone).first()
            if not company:
                # Try with different phone formats
                for phone_format in [f"+{clean_phone}", f"0{clean_phone}", clean_phone]:
                    company = Company.objects.filter(phone__icontains=phone_format).first()
                    if company:
                        break
            
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
                         confirmation_data: Dict = None):
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
        """تحليل الرسالة باستخدام الذكاء الاصطناعي"""
        try:
            if not agent.gemini_api_key or agent.gemini_api_key.strip() == '':
                return {
                    "tool": "unknown",
                    "requires_confirmation": False,
                    "response": "❌ مفتاح Gemini API غير محدد. يرجى إعداد المفتاح من صفحة إعدادات الوكيل.",
                    "confirmation_message": None
                }
            
            # Configure Gemini
            genai.configure(api_key=agent.gemini_api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            # Prepare context
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
            
            response = model.generate_content(context)
            
            # Try to parse JSON response
            try:
                response_text = response.text.strip()
                
                # Remove markdown code blocks if present
                if response_text.startswith('```json'):
                    response_text = response_text[7:]  # Remove ```json
                if response_text.startswith('```'):
                    response_text = response_text[3:]   # Remove ```
                if response_text.endswith('```'):
                    response_text = response_text[:-3]  # Remove trailing ```
                
                result = json.loads(response_text.strip())
                logger.info(f"AI Response: {result}")
                return result
            except json.JSONDecodeError as e:
                logger.error(f"خطأ في تحليل JSON: {e}")
                logger.error(f"Response text: {response.text}")
                return {
                    "tool": "unknown",
                    "requires_confirmation": False,
                    "response": f"❓ لم أفهم طلبك: {message}",
                    "confirmation_message": None
                }
            
        except Exception as e:
            logger.error(f"خطأ في تحليل الرسالة بالذكاء الاصطناعي: {e}")
            return {
                "tool": "unknown",
                "requires_confirmation": False,
                "response": f"❌ حدث خطأ في معالجة طلبك: {str(e)[:100]}...",
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
                        if result.get('success'):
                            response = result.get('data', response)
                        else:
                            response = f"❌ خطأ: {result.get('error', 'خطأ غير معروف')}"
                    
                    # Save conversation
                    self.save_conversation(company, phone_number, message, response, tool_name)
                    
                    # Send WhatsApp message
                    if agent.whatsapp_webhook_url and agent.whatsapp_webhook_url.strip():
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
