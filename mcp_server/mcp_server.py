"""
Stockly MCP Server
محاسب ذكي لنظام Stockly لإدارة المخزون والفواتير
"""

from fastmcp import FastMCP
from typing import Dict, List, Optional, Any, Union
import requests
import json
import logging
from datetime import datetime, timedelta
from .config import StocklyMCPConfig

# إعداد السجلات
logging.basicConfig(
    level=getattr(logging, StocklyMCPConfig.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(StocklyMCPConfig.LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class StocklyMCPTools:
    """أدوات المحاسبة الذكية لنظام Stockly"""
    
    def __init__(self, config: StocklyMCPConfig = None):
        self.config = config or StocklyMCPConfig()
        self.mcp = FastMCP(self.config.MCP_SERVER_NAME)
        self.session = requests.Session()
        self.session.headers.update(self.config.get_headers())
        
        # التحقق من صحة الإعدادات
        if not self.config.validate_config():
            raise ValueError("إعدادات غير صحيحة")
        
        logger.info(f"تم تهيئة {self.config.MCP_SERVER_NAME} v{self.config.MCP_SERVER_VERSION}")
    
    def _make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict:
        """إجراء طلب API إلى Django"""
        url = f"{self.config.DJANGO_BASE_URL}{endpoint}"
        
        try:
            logger.debug(f"إجراء طلب {method.upper()} إلى {url}")
            
            if method.upper() == 'GET':
                response = self.session.get(url, params=params, timeout=self.config.REQUEST_TIMEOUT)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, timeout=self.config.REQUEST_TIMEOUT)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, timeout=self.config.REQUEST_TIMEOUT)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, timeout=self.config.REQUEST_TIMEOUT)
            else:
                return {"error": f"طريقة طلب غير مدعومة: {method}"}
            
            response.raise_for_status()
            result = response.json()
            logger.debug(f"تم استلام الاستجابة بنجاح من {url}")
            return result
            
        except requests.exceptions.Timeout:
            error_msg = f"انتهت مهلة الطلب إلى {url}"
            logger.error(error_msg)
            return {"error": error_msg}
        except requests.exceptions.ConnectionError:
            error_msg = f"خطأ في الاتصال بـ {url}"
            logger.error(error_msg)
            return {"error": error_msg}
        except requests.exceptions.HTTPError as e:
            error_msg = f"خطأ HTTP {e.response.status_code}: {e.response.text}"
            logger.error(error_msg)
            return {"error": error_msg}
        except requests.exceptions.RequestException as e:
            error_msg = f"خطأ في الطلب: {str(e)}"
            logger.error(error_msg)
            return {"error": error_msg}
        except json.JSONDecodeError:
            error_msg = f"خطأ في تحليل JSON من {url}"
            logger.error(error_msg)
            return {"error": error_msg}
        except Exception as e:
            error_msg = f"خطأ غير متوقع: {str(e)}"
            logger.error(error_msg)
            return {"error": error_msg}
    
    # ==================== أدوات الفواتير ====================
    
    def create_invoice(self, customer_name: str = "عميل نقدي") -> Dict:
        """إنشاء فاتورة جديدة
        
        Args:
            customer_name: اسم العميل (افتراضي: عميل نقدي)
            
        Returns:
            Dict: معلومات الفاتورة الجديدة أو رسالة خطأ
        """
        logger.info(f"إنشاء فاتورة جديدة للعميل: {customer_name}")
        return self._make_request('POST', '/api/invoices/session', {
            'customer_name': customer_name
        })
    
    def get_invoice(self, invoice_id: int) -> Dict:
        """الحصول على تفاصيل الفاتورة
        
        Args:
            invoice_id: معرف الفاتورة
            
        Returns:
            Dict: تفاصيل الفاتورة أو رسالة خطأ
        """
        logger.info(f"الحصول على تفاصيل الفاتورة: {invoice_id}")
        return self._make_request('GET', f'/api/invoices/{invoice_id}')
    
    def add_item_to_invoice(self, invoice_id: int, product_id: int, quantity: float) -> Dict:
        """إضافة منتج للفاتورة
        
        Args:
            invoice_id: معرف الفاتورة
            product_id: معرف المنتج
            quantity: الكمية
            
        Returns:
            Dict: نتيجة إضافة المنتج أو رسالة خطأ
        """
        logger.info(f"إضافة منتج {product_id} للفاتورة {invoice_id} بكمية {quantity}")
        return self._make_request('POST', f'/api/invoices/{invoice_id}/items', {
            'product_id': product_id,
            'qty': quantity
        })
    
    def confirm_invoice(self, invoice_id: int) -> Dict:
        """تأكيد الفاتورة
        
        Args:
            invoice_id: معرف الفاتورة
            
        Returns:
            Dict: نتيجة تأكيد الفاتورة أو رسالة خطأ
        """
        logger.info(f"تأكيد الفاتورة: {invoice_id}")
        return self._make_request('POST', f'/api/invoices/{invoice_id}/confirm')
    
    def get_recent_invoices(self, limit: int = 10) -> Dict:
        """الحصول على الفواتير الأخيرة
        
        Args:
            limit: عدد الفواتير المطلوبة (افتراضي: 10)
            
        Returns:
            Dict: قائمة الفواتير الأخيرة أو رسالة خطأ
        """
        logger.info(f"الحصول على آخر {limit} فاتورة")
        return self._make_request('GET', '/api/invoices/recent', params={'limit': limit})
    
    def search_invoices(self, query: str, limit: int = 20) -> Dict:
        """البحث في الفواتير
        
        Args:
            query: نص البحث
            limit: عدد النتائج المطلوبة
            
        Returns:
            Dict: نتائج البحث أو رسالة خطأ
        """
        logger.info(f"البحث في الفواتير عن: {query}")
        return self._make_request('GET', '/api/search-invoices/', params={
            'query': query,
            'limit': limit
        })
    
    # ==================== أدوات العملاء ====================
    
    def get_customers(self, search_query: str = "") -> Dict:
        """الحصول على قائمة العملاء
        
        Args:
            search_query: نص البحث (اختياري)
            
        Returns:
            Dict: قائمة العملاء أو رسالة خطأ
        """
        logger.info(f"الحصول على قائمة العملاء - البحث: {search_query}")
        params = {}
        if search_query:
            params['search'] = search_query
        return self._make_request('GET', '/api/customers/', params=params)
    
    def add_customer(self, name: str, phone: str = "", email: str = "", address: str = "") -> Dict:
        """إضافة عميل جديد
        
        Args:
            name: اسم العميل (مطلوب)
            phone: رقم الهاتف
            email: البريد الإلكتروني
            address: العنوان
            
        Returns:
            Dict: معلومات العميل الجديد أو رسالة خطأ
        """
        logger.info(f"إضافة عميل جديد: {name}")
        return self._make_request('POST', '/api/customers/add/', {
            'name': name,
            'phone': phone,
            'email': email,
            'address': address
        })
    
    def update_customer(self, customer_id: int, name: str = None, phone: str = None, 
                       email: str = None, address: str = None) -> Dict:
        """تحديث بيانات العميل
        
        Args:
            customer_id: معرف العميل
            name: الاسم الجديد
            phone: رقم الهاتف الجديد
            email: البريد الإلكتروني الجديد
            address: العنوان الجديد
            
        Returns:
            Dict: نتيجة التحديث أو رسالة خطأ
        """
        logger.info(f"تحديث بيانات العميل: {customer_id}")
        data = {}
        if name is not None:
            data['name'] = name
        if phone is not None:
            data['phone'] = phone
        if email is not None:
            data['email'] = email
        if address is not None:
            data['address'] = address
        
        return self._make_request('PUT', f'/api/customers/{customer_id}/update/', data)
    
    def get_customer_balance(self, customer_id: int) -> Dict:
        """الحصول على رصيد العميل
        
        Args:
            customer_id: معرف العميل
            
        Returns:
            Dict: رصيد العميل أو رسالة خطأ
        """
        logger.info(f"الحصول على رصيد العميل: {customer_id}")
        return self._make_request('GET', f'/api/customers/{customer_id}/balance/')
    
    def get_customer_payments(self, customer_id: int) -> Dict:
        """الحصول على مدفوعات العميل
        
        Args:
            customer_id: معرف العميل
            
        Returns:
            Dict: مدفوعات العميل أو رسالة خطأ
        """
        logger.info(f"الحصول على مدفوعات العميل: {customer_id}")
        return self._make_request('GET', f'/api/customers/{customer_id}/payments/')
    
    def get_customer_invoices(self, customer_id: int) -> Dict:
        """الحصول على فواتير العميل
        
        Args:
            customer_id: معرف العميل
            
        Returns:
            Dict: فواتير العميل أو رسالة خطأ
        """
        logger.info(f"الحصول على فواتير العميل: {customer_id}")
        return self._make_request('GET', f'/api/customers/{customer_id}/invoices/')
    
    # ==================== أدوات المنتجات ====================
    
    def get_products(self, search_query: str = "") -> Dict:
        """الحصول على قائمة المنتجات
        
        Args:
            search_query: نص البحث (اختياري)
            
        Returns:
            Dict: قائمة المنتجات أو رسالة خطأ
        """
        logger.info(f"الحصول على قائمة المنتجات - البحث: {search_query}")
        params = {}
        if search_query:
            params['query'] = search_query
        return self._make_request('GET', '/api/products/', params=params)
    
    def add_product(self, name: str, category_id: int, price: float, 
                   stock_qty: int = 0, unit: str = "piece", 
                   cost_price: float = None, wholesale_price: float = None,
                   retail_price: float = None, description: str = "",
                   measurement: str = "") -> Dict:
        """إضافة منتج جديد
        
        Args:
            name: اسم المنتج (مطلوب)
            category_id: معرف الفئة (مطلوب)
            price: السعر (مطلوب)
            stock_qty: كمية المخزون
            unit: الوحدة
            cost_price: سعر التكلفة
            wholesale_price: سعر الجملة
            retail_price: سعر المفرق
            description: الوصف
            measurement: القياس
            
        Returns:
            Dict: معلومات المنتج الجديد أو رسالة خطأ
        """
        logger.info(f"إضافة منتج جديد: {name}")
        return self._make_request('POST', '/api/products/add/', {
            'name': name,
            'category_id': category_id,
            'price': price,
            'stock_qty': stock_qty,
            'unit': unit,
            'cost_price': cost_price,
            'wholesale_price': wholesale_price,
            'retail_price': retail_price,
            'description': description,
            'measurement': measurement
        })
    
    def update_product(self, product_id: int, name: str = None, price: float = None,
                      stock_qty: int = None, unit: str = None, 
                      cost_price: float = None, description: str = None) -> Dict:
        """تحديث معلومات المنتج
        
        Args:
            product_id: معرف المنتج
            name: الاسم الجديد
            price: السعر الجديد
            stock_qty: كمية المخزون الجديدة
            unit: الوحدة الجديدة
            cost_price: سعر التكلفة الجديد
            description: الوصف الجديد
            
        Returns:
            Dict: نتيجة التحديث أو رسالة خطأ
        """
        logger.info(f"تحديث المنتج: {product_id}")
        data = {}
        if name is not None:
            data['name'] = name
        if price is not None:
            data['price'] = price
        if stock_qty is not None:
            data['stock_qty'] = stock_qty
        if unit is not None:
            data['unit'] = unit
        if cost_price is not None:
            data['cost_price'] = cost_price
        if description is not None:
            data['description'] = description
        
        return self._make_request('PUT', f'/api/products/{product_id}/update/', data)
    
    def update_product_stock(self, product_id: int, new_stock: int) -> Dict:
        """تحديث كمية المخزون
        
        Args:
            product_id: معرف المنتج
            new_stock: الكمية الجديدة
            
        Returns:
            Dict: نتيجة التحديث أو رسالة خطأ
        """
        logger.info(f"تحديث مخزون المنتج {product_id} إلى {new_stock}")
        return self.update_product(product_id, stock_qty=new_stock)
    
    # ==================== أدوات الفئات ====================
    
    def get_categories(self) -> Dict:
        """الحصول على قائمة الفئات
        
        Returns:
            Dict: قائمة الفئات أو رسالة خطأ
        """
        logger.info("الحصول على قائمة الفئات")
        return self._make_request('GET', '/api/categories/')
    
    def add_category(self, name: str, parent_id: int = None) -> Dict:
        """إضافة فئة جديدة
        
        Args:
            name: اسم الفئة (مطلوب)
            parent_id: معرف الفئة الأب (اختياري)
            
        Returns:
            Dict: معلومات الفئة الجديدة أو رسالة خطأ
        """
        logger.info(f"إضافة فئة جديدة: {name}")
        data = {'name': name}
        if parent_id:
            data['parent_id'] = parent_id
        return self._make_request('POST', '/api/categories/add/', data)
    
    def update_category(self, category_id: int, name: str, parent_id: int = None) -> Dict:
        """تحديث الفئة
        
        Args:
            category_id: معرف الفئة
            name: الاسم الجديد
            parent_id: معرف الفئة الأب الجديد
            
        Returns:
            Dict: نتيجة التحديث أو رسالة خطأ
        """
        logger.info(f"تحديث الفئة: {category_id}")
        data = {'name': name}
        if parent_id is not None:
            data['parent_id'] = parent_id
        return self._make_request('PUT', f'/api/categories/{category_id}/update/', data)
    
    # ==================== أدوات المدفوعات ====================
    
    def create_payment(self, customer_id: int, amount: float, 
                      payment_method: str = "cash", invoice_id: int = None, 
                      notes: str = "") -> Dict:
        """إنشاء دفعة جديدة
        
        Args:
            customer_id: معرف العميل (مطلوب)
            amount: المبلغ (مطلوب)
            payment_method: طريقة الدفع
            invoice_id: معرف الفاتورة (اختياري)
            notes: ملاحظات
            
        Returns:
            Dict: معلومات الدفعة الجديدة أو رسالة خطأ
        """
        logger.info(f"إنشاء دفعة جديدة للعميل {customer_id} بمبلغ {amount}")
        return self._make_request('POST', '/api/payments/create/', {
            'customer_id': customer_id,
            'amount': amount,
            'payment_method': payment_method,
            'invoice_id': invoice_id,
            'notes': notes
        })
    
    def get_payments(self, limit: int = 20) -> Dict:
        """الحصول على قائمة المدفوعات
        
        Args:
            limit: عدد المدفوعات المطلوبة
            
        Returns:
            Dict: قائمة المدفوعات أو رسالة خطأ
        """
        logger.info(f"الحصول على قائمة المدفوعات - الحد: {limit}")
        return self._make_request('GET', '/api/payments/', params={'limit': limit})
    
    def get_invoice_payments(self, invoice_id: int) -> Dict:
        """الحصول على مدفوعات الفاتورة
        
        Args:
            invoice_id: معرف الفاتورة
            
        Returns:
            Dict: مدفوعات الفاتورة أو رسالة خطأ
        """
        logger.info(f"الحصول على مدفوعات الفاتورة: {invoice_id}")
        return self._make_request('GET', f'/api/invoices/{invoice_id}/payments/')
    
    # ==================== أدوات التقارير ====================
    
    def get_dashboard_stats(self) -> Dict:
        """الحصول على إحصائيات لوحة التحكم
        
        Returns:
            Dict: إحصائيات لوحة التحكم أو رسالة خطأ
        """
        logger.info("الحصول على إحصائيات لوحة التحكم")
        return self._make_request('GET', '/api/dashboard/stats')
    
    def get_sales_report(self, start_date: str = None, end_date: str = None) -> Dict:
        """تقرير المبيعات
        
        Args:
            start_date: تاريخ البداية (YYYY-MM-DD)
            end_date: تاريخ النهاية (YYYY-MM-DD)
            
        Returns:
            Dict: تقرير المبيعات أو رسالة خطأ
        """
        logger.info(f"تقرير المبيعات من {start_date} إلى {end_date}")
        # يمكن تطوير endpoint مخصص للتقارير
        return self._make_request('GET', '/api/dashboard/stats')
    
    def get_inventory_report(self) -> Dict:
        """تقرير المخزون
        
        Returns:
            Dict: تقرير المخزون أو رسالة خطأ
        """
        logger.info("تقرير المخزون")
        products = self._make_request('GET', '/api/products/')
        if 'error' in products:
            return products
        
        # تحليل بيانات المخزون
        total_products = len(products)
        low_stock = [p for p in products if p.get('stock_qty', 0) < 10]
        out_of_stock = [p for p in products if p.get('stock_qty', 0) == 0]
        
        return {
            'total_products': total_products,
            'low_stock_items': len(low_stock),
            'out_of_stock_items': len(out_of_stock),
            'low_stock_products': low_stock,
            'out_of_stock_products': out_of_stock
        }
    
    def get_customer_balances_report(self) -> Dict:
        """تقرير أرصدة العملاء
        
        Returns:
            Dict: تقرير أرصدة العملاء أو رسالة خطأ
        """
        logger.info("تقرير أرصدة العملاء")
        return self._make_request('GET', '/api/customer-balances/')
    
    # ==================== أدوات المرتجعات ====================
    
    def create_return(self, invoice_id: int, items: List[Dict], notes: str = "") -> Dict:
        """إنشاء مرتجع
        
        Args:
            invoice_id: معرف الفاتورة الأصلية
            items: قائمة العناصر المرتجعة
            notes: ملاحظات
            
        Returns:
            Dict: معلومات المرتجع الجديد أو رسالة خطأ
        """
        logger.info(f"إنشاء مرتجع للفاتورة: {invoice_id}")
        return self._make_request('POST', '/api/returns/create/', {
            'invoice_id': invoice_id,
            'items': items,
            'notes': notes
        })
    
    def get_returns(self, limit: int = 20) -> Dict:
        """الحصول على قائمة المرتجعات
        
        Args:
            limit: عدد المرتجعات المطلوبة
            
        Returns:
            Dict: قائمة المرتجعات أو رسالة خطأ
        """
        logger.info(f"الحصول على قائمة المرتجعات - الحد: {limit}")
        return self._make_request('GET', '/api/returns/', params={'limit': limit})
    
    def get_return_details(self, return_id: int) -> Dict:
        """الحصول على تفاصيل المرتجع
        
        Args:
            return_id: معرف المرتجع
            
        Returns:
            Dict: تفاصيل المرتجع أو رسالة خطأ
        """
        logger.info(f"الحصول على تفاصيل المرتجع: {return_id}")
        return self._make_request('GET', f'/api/returns/{return_id}/')
    
    def approve_return(self, return_id: int) -> Dict:
        """الموافقة على المرتجع
        
        Args:
            return_id: معرف المرتجع
            
        Returns:
            Dict: نتيجة الموافقة أو رسالة خطأ
        """
        logger.info(f"الموافقة على المرتجع: {return_id}")
        return self._make_request('POST', f'/api/returns/{return_id}/approve/')
    
    def reject_return(self, return_id: int) -> Dict:
        """رفض المرتجع
        
        Args:
            return_id: معرف المرتجع
            
        Returns:
            Dict: نتيجة الرفض أو رسالة خطأ
        """
        logger.info(f"رفض المرتجع: {return_id}")
        return self._make_request('POST', f'/api/returns/{return_id}/reject/')
    
    def get_invoice_returnable_items(self, invoice_id: int) -> Dict:
        """الحصول على العناصر القابلة للاسترداد من الفاتورة
        
        Args:
            invoice_id: معرف الفاتورة
            
        Returns:
            Dict: العناصر القابلة للاسترداد أو رسالة خطأ
        """
        logger.info(f"الحصول على العناصر القابلة للاسترداد من الفاتورة: {invoice_id}")
        return self._make_request('GET', f'/api/invoices/{invoice_id}/returnable-items/')
    
    # ==================== أدوات مساعدة ====================
    
    def get_system_info(self) -> Dict:
        """الحصول على معلومات النظام
        
        Returns:
            Dict: معلومات النظام
        """
        return {
            'server_name': self.config.MCP_SERVER_NAME,
            'version': self.config.MCP_SERVER_VERSION,
            'description': self.config.MCP_SERVER_DESCRIPTION,
            'django_url': self.config.DJANGO_BASE_URL,
            'timestamp': datetime.now().isoformat()
        }
    
    def health_check(self) -> Dict:
        """فحص صحة النظام
        
        Returns:
            Dict: حالة النظام
        """
        logger.info("فحص صحة النظام")
        try:
            # اختبار الاتصال بـ Django
            response = self._make_request('GET', '/api/dashboard/stats')
            if 'error' in response:
                return {
                    'status': 'unhealthy',
                    'error': response['error'],
                    'timestamp': datetime.now().isoformat()
                }
            
            return {
                'status': 'healthy',
                'django_connection': 'ok',
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    # ==================== تسجيل الأدوات ====================
    
    def register_all_tools(self):
        """تسجيل جميع الأدوات في MCP"""
        logger.info("تسجيل جميع الأدوات في MCP")
        
        # أدوات الفواتير
        self.mcp.tool()(self.create_invoice)
        self.mcp.tool()(self.get_invoice)
        self.mcp.tool()(self.add_item_to_invoice)
        self.mcp.tool()(self.confirm_invoice)
        self.mcp.tool()(self.get_recent_invoices)
        self.mcp.tool()(self.search_invoices)
        
        # أدوات العملاء
        self.mcp.tool()(self.get_customers)
        self.mcp.tool()(self.add_customer)
        self.mcp.tool()(self.update_customer)
        self.mcp.tool()(self.get_customer_balance)
        self.mcp.tool()(self.get_customer_payments)
        self.mcp.tool()(self.get_customer_invoices)
        
        # أدوات المنتجات
        self.mcp.tool()(self.get_products)
        self.mcp.tool()(self.add_product)
        self.mcp.tool()(self.update_product)
        self.mcp.tool()(self.update_product_stock)
        
        # أدوات الفئات
        self.mcp.tool()(self.get_categories)
        self.mcp.tool()(self.add_category)
        self.mcp.tool()(self.update_category)
        
        # أدوات المدفوعات
        self.mcp.tool()(self.create_payment)
        self.mcp.tool()(self.get_payments)
        self.mcp.tool()(self.get_invoice_payments)
        
        # أدوات التقارير
        self.mcp.tool()(self.get_dashboard_stats)
        self.mcp.tool()(self.get_sales_report)
        self.mcp.tool()(self.get_inventory_report)
        self.mcp.tool()(self.get_customer_balances_report)
        
        # أدوات المرتجعات
        self.mcp.tool()(self.create_return)
        self.mcp.tool()(self.get_returns)
        self.mcp.tool()(self.get_return_details)
        self.mcp.tool()(self.approve_return)
        self.mcp.tool()(self.reject_return)
        self.mcp.tool()(self.get_invoice_returnable_items)
        
        # أدوات مساعدة
        self.mcp.tool()(self.get_system_info)
        self.mcp.tool()(self.health_check)
        
        logger.info("تم تسجيل جميع الأدوات بنجاح")
    
    def run(self):
        """تشغيل خادم MCP"""
        logger.info(f"بدء تشغيل {self.config.MCP_SERVER_NAME}")
        self.register_all_tools()
        self.mcp.run()
