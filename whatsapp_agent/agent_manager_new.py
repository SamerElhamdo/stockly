"""
مدير الوكلاء الذكيين - النسخة الجديدة المنظمة
"""
import logging
import requests
from typing import Dict, List, Any, Optional
from django.db.models import Q
from app.models import (
    User, Company, Product, Customer, Invoice, Return, Payment, 
    CustomerBalance, Conversation, Agent, APIKey
)

# Import the new organized modules
from .tools import SearchTools, AddTools, PaymentTools, ReturnTools, HelpTools
from .execution import ToolExecutor, ResponseFormatter
from .ai import MessageAnalyzer, FallbackHandler
from .utils import setup_logger, DataValidator

logger = setup_logger()


class AgentManager:
    """مدير الوكلاء الذكيين - النسخة الجديدة المنظمة"""
    
    def __init__(self):
        # Initialize tool modules
        self.search_tools = SearchTools()
        self.add_tools = AddTools()
        self.payment_tools = PaymentTools()
        self.return_tools = ReturnTools()
        self.help_tools = HelpTools()
        
        # Initialize execution modules
        self.tool_executor = ToolExecutor()
        self.response_formatter = ResponseFormatter()
        
        # Initialize AI modules
        self.message_analyzer = MessageAnalyzer()
        self.fallback_handler = FallbackHandler()
        
        # Initialize utilities
        self.validator = DataValidator()
        
        # Combine all tools
        self.all_tools = {}
        self.all_tools.update(self.search_tools.get_all_tools())
        self.all_tools.update(self.add_tools.get_all_tools())
        self.all_tools.update(self.payment_tools.get_all_tools())
        self.all_tools.update(self.return_tools.get_all_tools())
        self.all_tools.update(self.help_tools.get_all_tools())
    
    def get_available_agents(self) -> List[Agent]:
        """الحصول على الوكلاء المتاحة"""
        agents = Agent.objects.filter(is_active=True).order_by('-is_primary', 'name')
        logger.info(f"🤖 [GET_AGENTS] عدد الوكلاء المتاحة: {len(agents)}")
        for agent in agents:
            logger.info(f"🤖 [GET_AGENTS] - {agent.name} {'(رئيسي)' if agent.is_primary else ''}")
        return agents
    
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
                    "content": conv.message,
                    "timestamp": conv.created_at.isoformat()
                })
                if conv.response:
                    history.append({
                        "role": "assistant", 
                        "content": conv.response,
                        "timestamp": conv.created_at.isoformat()
                    })
            
            return history
        except Exception as e:
            logger.error(f"خطأ في الحصول على تاريخ المحادثة: {e}")
            return []
    
    def save_conversation(self, company: Company, phone_number: str, message: str, 
                         response: str = None) -> None:
        """حفظ المحادثة"""
        try:
            # حفظ المحادثة مع الرد
            Conversation.objects.create(
                company=company,
                phone_number=phone_number,
                message=message,
                response=response or ""
            )
        except Exception as e:
            logger.error(f"خطأ في حفظ المحادثة: {e}")
    
    def execute_tool(self, tool_name: str, company: Company, **kwargs) -> Dict[str, Any]:
        """تنفيذ أداة محددة"""
        try:
            # البحث عن الأداة في جميع المجموعات
            tool = self.all_tools.get(tool_name)
            if tool:
                return tool.execute(company, **kwargs)
            else:
                # استخدام المنفذ الأساسي للأدوات القديمة
                return self.tool_executor.execute_tool(tool_name, company, **kwargs)
                
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
                verify=False,
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': 'Stockly-WhatsApp-Agent/1.0'
                }
            )
            
            if response.status_code == 200:
                logger.info(f"تم إرسال الرسالة بنجاح: {response.status_code}")
                return True
            else:
                logger.error(f"فشل في إرسال الرسالة: {response.status_code} - {response.text}")
                return False
                
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
            
            # Process with each agent until one succeeds
            for agent in agents:
                try:
                    logger.info(f"🤖 [AGENT] محاولة مع الوكيل: {agent.name}")
                    
                    # Analyze message with AI
                    analysis = self.message_analyzer.analyze_message_with_ai(
                        message, history, agent
                    )
                    
                    tool_name = analysis.get('tool', 'unknown')
                    requires_confirmation = analysis.get('requires_confirmation', False)
                    response = analysis.get('response', '')
                    confirmation_message = analysis.get('confirmation_message')
                    
                    # Execute tool if not unknown
                    if tool_name != 'unknown':
                        tool_result = self.execute_tool(tool_name, company)
                        if tool_result.get('success'):
                            response = tool_result.get('data', response)
                        else:
                            response = tool_result.get('error', response)
                    
                    # Save conversation
                    self.save_conversation(company, phone_number, message, response)
                    
                    # Send WhatsApp message
                    if agent.whatsapp_webhook_url:
                        self.send_whatsapp_message(
                            agent.whatsapp_webhook_url, 
                            phone_number, 
                            response
                        )
                    
                    return {
                        "success": True,
                        "response": response,
                        "agent_used": agent.name,
                        "tool_used": tool_name,
                        "requires_confirmation": requires_confirmation,
                        "confirmation_message": confirmation_message
                    }
                    
                except Exception as e:
                    logger.error(f"خطأ في الوكيل {agent.name}: {e}")
                    continue
            
            # If all agents failed
            fallback_response = self.fallback_handler.handle_fallback(message, "error")
            self.save_conversation(company, phone_number, message, fallback_response['response'])
            
            return {
                "success": False,
                "response": fallback_response['response']
            }
            
        except Exception as e:
            logger.error(f"خطأ في معالجة الرسالة: {e}")
            return {
                "success": False,
                "response": f"❌ حدث خطأ في معالجة طلبك: {str(e)[:100]}..."
            }


# Create global instance
agent_manager = AgentManager()
