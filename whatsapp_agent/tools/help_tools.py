"""
أدوات المساعدة
"""
from typing import Dict, Any
from app.models import Company
from .base_tool import BaseTool


class HelpTool(BaseTool):
    """أداة المساعدة"""
    
    def __init__(self):
        super().__init__()
        self.name = "المساعدة"
        self.description = "عرض جميع الأوامر المتاحة"
        self.keywords = ["مساعدة", "help", "أوامر", "commands", "تعليمات", "instructions", "ماذا يمكنني", "what can i"]
        self.requires_confirmation = False
    
    def execute(self, company: Company, **kwargs) -> Dict[str, Any]:
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
        
        return self.format_response(response)


class CompanyInfoTool(BaseTool):
    """أداة معلومات الشركة"""
    
    def __init__(self):
        super().__init__()
        self.name = "معلومات الشركة"
        self.description = "عرض معلومات الشركة"
        self.keywords = ["معلومات الشركة", "company info", "بيانات الشركة", "company data", "معلومات", "info"]
        self.requires_confirmation = False
    
    def execute(self, company: Company, **kwargs) -> Dict[str, Any]:
        response = f"🏢 *معلومات الشركة:*\n"
        response += f"• الاسم: {company.name}\n"
        response += f"• الكود: {company.code}\n"
        response += f"• الهاتف: {company.phone}\n"
        response += f"• البريد: {company.email or 'غير محدد'}\n"
        response += f"• العنوان: {company.address or 'غير محدد'}\n"
        response += f"• تاريخ الإنشاء: {company.created_at.strftime('%Y-%m-%d')}\n"
        
        return self.format_response(response)


class HelpTools:
    """مجموعة أدوات المساعدة"""
    
    def __init__(self):                         
        self.tools = {
            "help": HelpTool(),
            "company_info": CompanyInfoTool(),
        }
    
    def get_tool(self, tool_name: str) -> BaseTool:
        return self.tools.get(tool_name)
    
    def get_all_tools(self) -> Dict[str, BaseTool]:
        return self.tools
