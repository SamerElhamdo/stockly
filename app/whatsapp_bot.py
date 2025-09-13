#!/usr/bin/env python3
"""
Stockly WhatsApp Bot - بوت الواتساب الذكي
يتكامل مع النظام الأساسي ويستخدم قاعدة البيانات نفسها
"""

import asyncio
import json
import logging
import requests
from typing import Dict, List, Any, Optional
from django.db.models import Q
from app.models import User, Company, Product, Customer, Invoice, Return, Payment, CustomerBalance

# Setup logging
logger = logging.getLogger(__name__)

class WhatsAppBot:
    """بوت الواتساب الذكي"""
    
    def __init__(self):
        self.webhook_url = "https://n8n.srv772321.hstgr.cloud/webhook/7d526f0e-36a0-4d77-a05b-e9a0fe46785a"
        
        # Available commands
        self.commands = {
            "منتجات": self.get_products,
            "products": self.get_products,
            "عملاء": self.get_customers,
            "customers": self.get_customers,
            "فواتير": self.get_invoices,
            "invoices": self.get_invoices,
            "مرتجعات": self.get_returns,
            "returns": self.get_returns,
            "مدفوعات": self.get_payments,
            "payments": self.get_payments,
            "إحصائيات": self.get_stats,
            "stats": self.get_stats,
            "dashboard": self.get_stats,
        }
    
    def get_company_from_phone(self, phone_number: str) -> Optional[Company]:
        """الحصول على الشركة من رقم الهاتف"""
        try:
            # Clean phone number
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
    
    def get_user_from_company(self, company: Company) -> Optional[User]:
        """الحصول على مستخدم من الشركة"""
        try:
            return User.objects.filter(
                company=company,
                account_type__in=['company_owner', 'company_staff']
            ).first()
        except Exception as e:
            logger.error(f"خطأ في البحث عن المستخدم: {e}")
            return None
    
    def send_message(self, phone_number: str, message: str) -> bool:
        """إرسال رسالة عبر الواتساب"""
        try:
            data = {
                "to": phone_number,
                "message": message
            }
            
            response = requests.post(self.webhook_url, json=data)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"خطأ في إرسال الرسالة: {e}")
            return False
    
    def get_products(self, company: Company) -> str:
        """الحصول على قائمة المنتجات"""
        try:
            products = Product.objects.filter(company=company)[:10]
            if not products:
                return "📦 لا توجد منتجات في النظام"
            
            response = "📦 *قائمة المنتجات:*\n"
            for product in products:
                response += f"• {product.name} - {product.price} ر.س (المخزون: {product.stock_qty})\n"
            
            return response
        except Exception as e:
            logger.error(f"خطأ في جلب المنتجات: {e}")
            return "❌ خطأ في جلب المنتجات"
    
    def get_customers(self, company: Company) -> str:
        """الحصول على قائمة العملاء"""
        try:
            customers = Customer.objects.filter(company=company)[:10]
            if not customers:
                return "👥 لا يوجد عملاء في النظام"
            
            response = "👥 *قائمة العملاء:*\n"
            for customer in customers:
                # Get customer balance
                try:
                    balance = CustomerBalance.objects.get(customer=customer)
                    balance_text = f" (المستحقات: {balance.balance} ر.س)" if balance.balance > 0 else ""
                except:
                    balance_text = ""
                
                response += f"• {customer.name}{balance_text}\n"
            
            return response
        except Exception as e:
            logger.error(f"خطأ في جلب العملاء: {e}")
            return "❌ خطأ في جلب العملاء"
    
    def get_invoices(self, company: Company) -> str:
        """الحصول على قائمة الفواتير"""
        try:
            invoices = Invoice.objects.filter(company=company).order_by('-created_at')[:10]
            if not invoices:
                return "🧾 لا توجد فواتير في النظام"
            
            response = "🧾 *قائمة الفواتير:*\n"
            for invoice in invoices:
                status_text = "✅ مؤكدة" if invoice.status == 'confirmed' else "⏳ مسودة"
                response += f"• فاتورة #{invoice.id} - {invoice.customer.name} - {invoice.total_amount} ر.س {status_text}\n"
            
            return response
        except Exception as e:
            logger.error(f"خطأ في جلب الفواتير: {e}")
            return "❌ خطأ في جلب الفواتير"
    
    def get_returns(self, company: Company) -> str:
        """الحصول على قائمة المرتجعات"""
        try:
            returns = Return.objects.filter(company=company).order_by('-created_at')[:10]
            if not returns:
                return "🔄 لا توجد مرتجعات في النظام"
            
            response = "🔄 *قائمة المرتجعات:*\n"
            for return_obj in returns:
                status_text = "✅ موافق عليها" if return_obj.status == 'approved' else "⏳ في الانتظار"
                response += f"• مرتجع #{return_obj.return_number} - {return_obj.customer.name} - {return_obj.total_amount} ر.س {status_text}\n"
            
            return response
        except Exception as e:
            logger.error(f"خطأ في جلب المرتجعات: {e}")
            return "❌ خطأ في جلب المرتجعات"
    
    def get_payments(self, company: Company) -> str:
        """الحصول على قائمة المدفوعات"""
        try:
            payments = Payment.objects.filter(company=company).order_by('-payment_date')[:10]
            if not payments:
                return "💳 لا توجد مدفوعات في النظام"
            
            response = "💳 *قائمة المدفوعات:*\n"
            for payment in payments:
                amount_text = f"+{payment.amount}" if payment.amount >= 0 else f"{payment.amount}"
                response += f"• {payment.customer.name} - {amount_text} ر.س ({payment.payment_method})\n"
            
            return response
        except Exception as e:
            logger.error(f"خطأ في جلب المدفوعات: {e}")
            return "❌ خطأ في جلب المدفوعات"
    
    def get_stats(self, company: Company) -> str:
        """الحصول على الإحصائيات"""
        try:
            from django.db.models import Sum, Count
            from django.utils import timezone
            
            today = timezone.now().date()
            
            # Today's invoices
            today_invoices = Invoice.objects.filter(company=company, created_at__date=today).count()
            
            # Total sales
            total_sales = Invoice.objects.filter(company=company, status='confirmed').aggregate(
                total=Sum('total_amount'))['total'] or 0
            
            # Low stock items
            low_stock_items = Product.objects.filter(company=company, stock_qty__lt=5).count()
            
            # Total customers
            total_customers = Customer.objects.filter(company=company).count()
            
            response = "📊 *إحصائيات لوحة التحكم:*\n"
            response += f"• فواتير اليوم: {today_invoices}\n"
            response += f"• إجمالي المبيعات: {total_sales} ر.س\n"
            response += f"• منتجات قليلة المخزون: {low_stock_items}\n"
            response += f"• إجمالي العملاء: {total_customers}\n"
            
            return response
        except Exception as e:
            logger.error(f"خطأ في جلب الإحصائيات: {e}")
            return "❌ خطأ في جلب الإحصائيات"
    
    def process_message(self, phone_number: str, message: str) -> str:
        """معالجة الرسالة"""
        try:
            # Get company from phone
            company = self.get_company_from_phone(phone_number)
            if not company:
                return "❌ لم يتم العثور على الشركة. تأكد من تسجيل رقم الهاتف في النظام."
            
            # Get user from company
            user = self.get_user_from_company(company)
            if not user:
                return "❌ لم يتم العثور على مستخدم للشركة."
            
            # Parse message
            message_lower = message.strip().lower()
            
            # Find matching command
            for command, handler in self.commands.items():
                if command.lower() in message_lower:
                    response = handler(company)
                    return response
            
            # If no command found, show available commands
            available_commands = list(self.commands.keys())
            response = "❓ لم أفهم طلبك. الأوامر المتاحة:\n"
            for cmd in available_commands:
                response += f"• {cmd}\n"
            
            return response
            
        except Exception as e:
            logger.error(f"خطأ في معالجة الرسالة: {e}")
            return f"❌ حدث خطأ في معالجة طلبك: {str(e)}"
    
    def handle_webhook(self, data: dict) -> bool:
        """معالجة webhook من الواتساب"""
        try:
            if 'entry' in data:
                for entry in data['entry']:
                    if 'changes' in entry:
                        for change in entry['changes']:
                            if 'value' in change and 'messages' in change['value']:
                                for message in change['value']['messages']:
                                    # Get sender phone number
                                    sender_number = message['from']
                                    # Get message text
                                    message_text = message['text']['body'] if 'text' in message else ""
                                    
                                    # Process message
                                    response = self.process_message(sender_number, message_text)
                                    
                                    # Send response back
                                    self.send_message(sender_number, response)
            
            return True
        except Exception as e:
            logger.error(f"خطأ في معالجة webhook: {e}")
            return False

# Global bot instance
whatsapp_bot = WhatsAppBot()
