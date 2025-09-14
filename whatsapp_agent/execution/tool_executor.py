"""
منفذ أدوات الوكيل
"""
from typing import Dict, Any
from app.models import Company, Product, Customer, Invoice
from .response_formatter import ResponseFormatter


class ToolExecutor:
    """منفذ أدوات الوكيل"""
    
    def __init__(self):         
        self.formatter = ResponseFormatter()
    
    def execute_basic_tools(self, tool_name: str, company: Company, **kwargs) -> Dict[str, Any]:
        """تنفيذ الأدوات الأساسية"""
        try:
            if tool_name == "list_products":
                products = Product.objects.filter(company=company)[:10]
                response = self.formatter.format_products_list(products)
                return {"success": True, "data": response}
            
            elif tool_name == "list_customers":
                customers = Customer.objects.filter(company=company)[:10]
                response = self.formatter.format_customers_list(customers)
                return {"success": True, "data": response}
            
            elif tool_name == "list_invoices":
                invoices = Invoice.objects.filter(company=company).order_by('-created_at')[:10]
                response = self.formatter.format_invoices_list(invoices)
                return {"success": True, "data": response}
            
            elif tool_name == "get_stats":
                response = self.formatter.format_stats(company)
                return {"success": True, "data": response}
            
            else:
                return {"success": False, "error": f"أداة غير معروفة: {tool_name}"}
                
        except Exception as e:
            return {"success": False, "error": f"خطأ في تنفيذ الأداة: {str(e)}"}
    
    def execute_tool(self, tool_name: str, company: Company, **kwargs) -> Dict[str, Any]:
        """تنفيذ أداة محددة"""
        # الأدوات الأساسية
        if tool_name in ["list_products", "list_customers", "list_invoices", "get_stats"]:
            return self.execute_basic_tools(tool_name, company, **kwargs)
        
        # الأدوات الأخرى
        else:
            return {"success": False, "error": f"أداة غير معروفة: {tool_name}"}
