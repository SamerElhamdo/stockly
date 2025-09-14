"""
أدوات الإرجاع
"""
from typing import Dict, Any
from app.models import Company, Customer, Invoice, Return
from .base_tool import BaseTool


class ListReturnsTool(BaseTool):
    """أداة عرض الإرجاعات"""
    
    def __init__(self):
        super().__init__()
        self.name = "عرض الإرجاعات"
        self.description = "عرض قائمة طلبات الإرجاع"
        self.keywords = ["إرجاعات", "returns", "عرض الإرجاعات", "قائمة الإرجاعات", "مرتجعات", "return"]
        self.requires_confirmation = False
    
    def execute(self, company: Company, **kwargs) -> Dict[str, Any]:
        returns = Return.objects.filter(company=company).order_by('-created_at')[:10]
        if not returns:
            return self.format_response("🔄 لا توجد طلبات إرجاع في النظام")
        
        response = "🔄 *قائمة طلبات الإرجاع:*\n"
        for return_obj in returns:
            status_text = "✅ معتمد" if return_obj.status == 'approved' else "⏳ في الانتظار"
            response += f"• إرجاع #{return_obj.id} - {return_obj.customer.name} - {status_text}\n"
        
        return self.format_response(response)


class CreateReturnTool(BaseTool):
    """أداة إنشاء إرجاع"""
    
    def __init__(self):
        super().__init__()
        self.name = "إنشاء إرجاع"
        self.description = "إنشاء طلب إرجاع جديد"
        self.keywords = ["إنشاء إرجاع", "create return", "إرجاع جديد", "new return", "طلب إرجاع", "return request"]
        self.requires_confirmation = True
    
    def execute(self, company: Company, **kwargs) -> Dict[str, Any]:
        validation = self.validate_required_fields(['customer_name', 'invoice_id'], **kwargs)
        if not validation['success']:
            return validation
        
        customer_name = kwargs.get('customer_name', '')
        invoice_id = kwargs.get('invoice_id', '')
        reason = kwargs.get('reason', '')
        
        try:
            customer = Customer.objects.get(company=company, name__icontains=customer_name)
            invoice = Invoice.objects.get(company=company, id=invoice_id, customer=customer)
            
            return_obj = Return.objects.create(
                company=company,
                customer=customer,
                invoice=invoice,
                reason=reason or 'طلب إرجاع'
            )
            
            return self.format_response(f"✅ تم إنشاء طلب إرجاع #{return_obj.id} للعميل '{customer.name}'")
        except Customer.DoesNotExist:
            return self.format_response(f"لم أجد عميل باسم '{customer_name}'", False)
        except Invoice.DoesNotExist:
            return self.format_response(f"لم أجد فاتورة برقم {invoice_id} للعميل '{customer_name}'", False)


class ReturnTools:
    """مجموعة أدوات الإرجاع"""
    
    def __init__(self):                 
        self.tools = {
            "list_returns": ListReturnsTool(),
            "create_return": CreateReturnTool(),
        }
    
    def get_tool(self, tool_name: str) -> BaseTool:
        return self.tools.get(tool_name)
    
    def get_all_tools(self) -> Dict[str, BaseTool]:
        return self.tools
