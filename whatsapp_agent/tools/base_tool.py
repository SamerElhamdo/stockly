"""
الكلاس الأساسي للأدوات
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from django.db.models import Q
from app.models import Company


class BaseTool(ABC):
    """الكلاس الأساسي لجميع أدوات الوكيل"""
    
    def __init__(self):
        self.name = ""
        self.description = ""
        self.keywords = []
        self.requires_confirmation = False
    
    @abstractmethod
    def execute(self, company: Company, **kwargs) -> Dict[str, Any]:
        """تنفيذ الأداة"""
        pass
    
    def validate_required_fields(self, required_fields: List[str], **kwargs) -> Dict[str, Any]:
        """التحقق من الحقول المطلوبة"""
        missing_fields = []
        for field in required_fields:
            if not kwargs.get(field):
                missing_fields.append(field)
        
        if missing_fields:
            return {
                "success": False,
                "error": f"يرجى تحديد: {', '.join(missing_fields)}"
            }
        return {"success": True}
    
    def format_response(self, data: str, success: bool = True) -> Dict[str, Any]:
        """تنسيق الرد"""
        return {
            "success": success,
            "data": data
        }
    
    def search_in_queryset(self, queryset, search_term: str, fields: List[str]) -> Any:
        """البحث في queryset"""
        q_objects = Q()
        for field in fields:
            q_objects |= Q(**{f"{field}__icontains": search_term})
        
        return queryset.filter(q_objects)[:10]
