"""
أدوات البحث والفلترة
"""
from typing import Dict, Any
from django.db.models import Q
from app.models import Company, Product, Customer, Invoice
from .base_tool import BaseTool


class SearchProductsTool(BaseTool):
    """أداة البحث في المنتجات"""
    
    def __init__(self):         
        super().__init__()
        self.name = "البحث في المنتجات"
        self.description = "البحث في المنتجات بالاسم أو الكود أو الفئة"
        self.keywords = ["بحث منتجات", "search products", "ابحث عن منتج", "البحث في المنتجات", "منتج", "product search"]
        self.requires_confirmation = False
    
    def execute(self, company: Company, **kwargs) -> Dict[str, Any]:
        search_term = kwargs.get('search_term', '')
        if not search_term:
            return self.format_response("يرجى تحديد كلمة البحث", False)
        
        products = Product.objects.filter(
            company=company
        ).filter(
            Q(name__icontains=search_term) | 
            Q(code__icontains=search_term) |
            Q(category__name__icontains=search_term)
        )[:10]
        
        if not products:
            return self.format_response(f"🔍 لم أجد منتجات مطابقة لـ '{search_term}'")
        
        response = f"🔍 *نتائج البحث عن '{search_term}':*\n"
        for product in products:
            response += f"• {product.name} - {product.price} ر.س (المخزون: {product.stock_qty})\n"
        
        return self.format_response(response)


class SearchCustomersTool(BaseTool):
    """أداة البحث في العملاء"""
    
    def __init__(self):
        super().__init__()
        self.name = "البحث في العملاء"
        self.description = "البحث في العملاء بالاسم أو الهاتف أو البريد"
        self.keywords = ["بحث عملاء", "search customers", "ابحث عن عميل", "البحث في العملاء", "عميل", "customer search"]
        self.requires_confirmation = False
    
    def execute(self, company: Company, **kwargs) -> Dict[str, Any]:
        search_term = kwargs.get('search_term', '')
        if not search_term:
            return self.format_response("يرجى تحديد كلمة البحث", False)
        
        customers = Customer.objects.filter(
            company=company
        ).filter(
            Q(name__icontains=search_term) | 
            Q(phone__icontains=search_term) |
            Q(email__icontains=search_term)
        )[:10]
        
        if not customers:
            return self.format_response(f"🔍 لم أجد عملاء مطابقين لـ '{search_term}'")
        
        response = f"🔍 *نتائج البحث عن '{search_term}':*\n"
        for customer in customers:
            try:
                from app.models import CustomerBalance
                balance = CustomerBalance.objects.get(customer=customer)
                balance_text = f" (المستحقات: {balance.balance} ر.س)" if balance.balance > 0 else ""
            except:
                balance_text = ""
            
            response += f"• {customer.name}{balance_text}\n"
        
        return self.format_response(response)


class SearchInvoicesTool(BaseTool):
    """أداة البحث في الفواتير"""
    
    def __init__(self):
        super().__init__()
        self.name = "البحث في الفواتير"
        self.description = "البحث في الفواتير برقم الفاتورة أو التاريخ أو العميل"
        self.keywords = ["بحث فواتير", "search invoices", "ابحث عن فاتورة", "البحث في الفواتير", "فاتورة", "invoice search"]
        self.requires_confirmation = False
    
    def execute(self, company: Company, **kwargs) -> Dict[str, Any]:
        search_term = kwargs.get('search_term', '')
        if not search_term:
            return self.format_response("يرجى تحديد كلمة البحث", False)
        
        invoices = Invoice.objects.filter(
            company=company
        ).filter(
            Q(id__icontains=search_term) |
            Q(customer__name__icontains=search_term)
        ).order_by('-created_at')[:10]
        
        if not invoices:
            return self.format_response(f"🔍 لم أجد فواتير مطابقة لـ '{search_term}'")
        
        response = f"🔍 *نتائج البحث عن '{search_term}':*\n"
        for invoice in invoices:
            status_text = "✅ مؤكدة" if invoice.status == 'confirmed' else "⏳ مسودة"
            response += f"• فاتورة #{invoice.id} - {invoice.customer.name} - {invoice.total_amount} ر.س {status_text}\n"
        
        return self.format_response(response)


class SearchTools:
    """مجموعة أدوات البحث"""
    
    def __init__(self):
        self.tools = {
            "search_products": SearchProductsTool(),
            "search_customers": SearchCustomersTool(),
            "search_invoices": SearchInvoicesTool(),
        }
    
    def get_tool(self, tool_name: str) -> BaseTool:
        return self.tools.get(tool_name)
    
    def get_all_tools(self) -> Dict[str, BaseTool]:
        return self.tools
