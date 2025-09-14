"""
أدوات الدفع والرصيد
"""
from typing import Dict, Any
from app.models import Company, Customer, Payment, CustomerBalance
from .base_tool import BaseTool


class CustomerBalanceTool(BaseTool):
    """أداة عرض رصيد العميل"""
    
    def __init__(self):
        super().__init__()
        self.name = "رصيد العميل"
        self.description = "عرض رصيد العميل"
        self.keywords = ["رصيد العميل", "customer balance", "رصيد", "balance", "مديونية", "debt"]
        self.requires_confirmation = False
    
    def execute(self, company: Company, **kwargs) -> Dict[str, Any]:
        customer_name = kwargs.get('customer_name', '')
        if not customer_name:
            return self.format_response("يرجى تحديد اسم العميل", False)
        
        try:
            customer = Customer.objects.get(company=company, name__icontains=customer_name)
            balance = CustomerBalance.objects.get(customer=customer)
            
            response = f"💰 *رصيد العميل {customer.name}:*\n"
            response += f"• الرصيد الحالي: {balance.balance} ر.س\n"
            response += f"• آخر تحديث: {balance.updated_at.strftime('%Y-%m-%d %H:%M')}\n"
            
            return self.format_response(response)
        except Customer.DoesNotExist:
            return self.format_response(f"لم أجد عميل باسم '{customer_name}'", False)
        except CustomerBalance.DoesNotExist:
            return self.format_response(f"💰 العميل '{customer_name}' ليس له رصيد مسجل")


class ListPaymentsTool(BaseTool):
    """أداة عرض المدفوعات"""
    
    def __init__(self):
        super().__init__()
        self.name = "عرض المدفوعات"
        self.description = "عرض قائمة المدفوعات"
        self.keywords = ["مدفوعات", "payments", "عرض المدفوعات", "قائمة المدفوعات", "دفعات", "دفع"]
        self.requires_confirmation = False
    
    def execute(self, company: Company, **kwargs) -> Dict[str, Any]:
        payments = Payment.objects.filter(company=company).order_by('-created_at')[:10]
        if not payments:
            return self.format_response("💳 لا توجد مدفوعات في النظام")
        
        response = "💳 *قائمة المدفوعات:*\n"
        for payment in payments:
            response += f"• {payment.customer.name} - {payment.amount} ر.س - {payment.payment_method}\n"
        
        return self.format_response(response)


class AddPaymentTool(BaseTool):
    """أداة إضافة دفعة"""
    
    def __init__(self):
        super().__init__()
        self.name = "إضافة دفعة"
        self.description = "إضافة دفعة جديدة"
        self.keywords = ["إضافة دفعة", "add payment", "دفعة جديدة", "new payment", "تسجيل دفعة", "register payment"]
        self.requires_confirmation = True
    
    def execute(self, company: Company, **kwargs) -> Dict[str, Any]:
        validation = self.validate_required_fields(['customer_name', 'amount'], **kwargs)
        if not validation['success']:
            return validation
        
        customer_name = kwargs.get('customer_name', '')
        amount = float(kwargs.get('amount', 0))
        payment_method = kwargs.get('payment_method', 'نقد')
        
        if amount <= 0:
            return self.format_response("يرجى تحديد مبلغ صحيح", False)
        
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
            
            return self.format_response(f"✅ تم تسجيل دفعة {amount} ر.س للعميل '{customer.name}'")
        except Customer.DoesNotExist:
            return self.format_response(f"لم أجد عميل باسم '{customer_name}'", False)


class PaymentTools:
    """مجموعة أدوات الدفع والرصيد"""
    
    def __init__(self):                     
        self.tools = {
            "customer_balance": CustomerBalanceTool(),
            "list_payments": ListPaymentsTool(),
            "add_payment": AddPaymentTool(),
        }
    
    def get_tool(self, tool_name: str) -> BaseTool:
        return self.tools.get(tool_name)
    
    def get_all_tools(self) -> Dict[str, BaseTool]:
        return self.tools
