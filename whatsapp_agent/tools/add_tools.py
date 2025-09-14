"""
أدوات إضافة البيانات
"""
from typing import Dict, Any
from app.models import Company, Customer, Product, Category, CustomerBalance
from .base_tool import BaseTool


class AddCustomerTool(BaseTool):
    """أداة إضافة عميل"""
    
    def __init__(self):
        super().__init__()
        self.name = "إضافة عميل"
        self.description = "إضافة عميل جديد"
        self.keywords = ["إضافة عميل", "add customer", "عميل جديد", "new customer", "تسجيل عميل", "register customer"]
        self.requires_confirmation = True
    
    def execute(self, company: Company, **kwargs) -> Dict[str, Any]:
        validation = self.validate_required_fields(['name', 'phone'], **kwargs)
        if not validation['success']:
            return validation
        
        name = kwargs.get('name', '')
        phone = kwargs.get('phone', '')
        email = kwargs.get('email', '')
        
        customer = Customer.objects.create(
            company=company,
            name=name,
            phone=phone,
            email=email or ''
        )
        
        # إنشاء رصيد للعميل
        CustomerBalance.objects.create(customer=customer, balance=0)
        
        return self.format_response(f"✅ تم إضافة العميل '{name}' بنجاح")


class AddProductTool(BaseTool):
    """أداة إضافة منتج"""
    
    def __init__(self):
        super().__init__()
        self.name = "إضافة منتج"
        self.description = "إضافة منتج جديد"
        self.keywords = ["إضافة منتج", "add product", "منتج جديد", "new product", "تسجيل منتج", "register product"]
        self.requires_confirmation = True
    
    def execute(self, company: Company, **kwargs) -> Dict[str, Any]:
        validation = self.validate_required_fields(['name', 'price'], **kwargs)
        if not validation['success']:
            return validation
        
        name = kwargs.get('name', '')
        price = float(kwargs.get('price', 0))
        stock_qty = int(kwargs.get('stock_qty', 0))
        category_name = kwargs.get('category', '')
        
        if price <= 0:
            return self.format_response("يرجى تحديد سعر صحيح", False)
        
        # البحث عن الفئة أو إنشاؤها
        category = None
        if category_name:
            category, created = Category.objects.get_or_create(
                name=category_name,
                company=company,
                defaults={'description': f'فئة {category_name}'}
            )
        
        product = Product.objects.create(
            company=company,
            name=name,
            price=price,
            stock_qty=stock_qty,
            category=category
        )
        
        return self.format_response(f"✅ تم إضافة المنتج '{name}' بنجاح")


class AddCategoryTool(BaseTool):
    """أداة إضافة فئة"""
    
    def __init__(self):
        super().__init__()
        self.name = "إضافة فئة"
        self.description = "إضافة فئة جديدة"
        self.keywords = ["إضافة فئة", "add category", "فئة جديدة", "new category", "تسجيل فئة", "register category"]
        self.requires_confirmation = True
    
    def execute(self, company: Company, **kwargs) -> Dict[str, Any]:
        validation = self.validate_required_fields(['name'], **kwargs)
        if not validation['success']:
            return validation
        
        name = kwargs.get('name', '')
        description = kwargs.get('description', '')
        
        category = Category.objects.create(
            company=company,
            name=name,
            description=description or f'فئة {name}'
        )
        
        return self.format_response(f"✅ تم إضافة الفئة '{name}' بنجاح")


class AddTools:
    """مجموعة أدوات الإضافة"""
    
    def __init__(self):         
        self.tools = {
            "add_customer": AddCustomerTool(),
            "add_product": AddProductTool(),
            "add_category": AddCategoryTool(),
        }
    
    def get_tool(self, tool_name: str) -> BaseTool:
        return self.tools.get(tool_name)
    
    def get_all_tools(self) -> Dict[str, BaseTool]:
        return self.tools
