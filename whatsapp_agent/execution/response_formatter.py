"""
تنسيق استجابات الوكيل
"""
from typing import Dict, Any, List
from app.models import Company, Product, Customer, Invoice, CustomerBalance
from django.db.models import Sum
from django.utils import timezone


class ResponseFormatter:
    """منسق استجابات الوكيل"""
    
    @staticmethod
    def format_products_list(products: List[Product]) -> str:
        """تنسيق قائمة المنتجات"""
        if not products:
            return "📦 لا توجد منتجات في النظام"
        
        response = "📦 *قائمة المنتجات:*\n"
        for product in products:
            response += f"• {product.name} - {product.price} ر.س (المخزون: {product.stock_qty})\n"
        
        return response
    
    @staticmethod
    def format_customers_list(customers: List[Customer]) -> str:
        """تنسيق قائمة العملاء"""
        if not customers:
            return "👥 لا يوجد عملاء في النظام"
        
        response = "👥 *قائمة العملاء:*\n"
        for customer in customers:
            try:
                balance = CustomerBalance.objects.get(customer=customer)
                balance_text = f" (المستحقات: {balance.balance} ر.س)" if balance.balance > 0 else ""
            except:
                balance_text = ""
            
            response += f"• {customer.name}{balance_text}\n"
        
        return response
    
    @staticmethod
    def format_invoices_list(invoices: List[Invoice]) -> str:
        """تنسيق قائمة الفواتير"""
        if not invoices:
            return "🧾 لا توجد فواتير في النظام"
        
        response = "🧾 *قائمة الفواتير:*\n"
        for invoice in invoices:
            status_text = "✅ مؤكدة" if invoice.status == 'confirmed' else "⏳ مسودة"
            response += f"• فاتورة #{invoice.id} - {invoice.customer.name} - {invoice.total_amount} ر.س {status_text}\n"
        
        return response
    
    @staticmethod
    def format_stats(company: Company) -> str:
        """تنسيق الإحصائيات"""
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
        
        return response
    
    @staticmethod
    def format_error(error_message: str) -> str:
        """تنسيق رسائل الخطأ"""
        return f"❌ {error_message}"
    
    @staticmethod
    def format_success(message: str) -> str:
        """تنسيق رسائل النجاح"""
        return f"✅ {message}"
