"""
أدوات التحقق من البيانات
"""
from typing import Dict, Any, List
import re


class DataValidator:
    """أداة التحقق من البيانات"""
    
    @staticmethod
    def validate_phone(phone: str) -> bool:
        """التحقق من صحة رقم الهاتف"""
        if not phone:
            return False
        
        # إزالة المسافات والرموز
        clean_phone = re.sub(r'[\s\-\(\)]', '', phone)
        
        # التحقق من أن الرقم يحتوي على أرقام فقط
        if not clean_phone.isdigit():
            return False
        
        # التحقق من طول الرقم (7-15 رقم)
        if len(clean_phone) < 7 or len(clean_phone) > 15:
            return False
        
        return True
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """التحقق من صحة البريد الإلكتروني"""
        if not email:
            return True  # البريد اختياري
        
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @staticmethod
    def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> Dict[str, Any]:
        """التحقق من الحقول المطلوبة"""
        missing_fields = []
        for field in required_fields:
            if not data.get(field):
                missing_fields.append(field)
        
        if missing_fields:
            return {
                "success": False,
                "error": f"يرجى تحديد: {', '.join(missing_fields)}"
            }
        
        return {"success": True}
    
    @staticmethod
    def validate_numeric_field(value: Any, field_name: str, min_value: float = 0) -> Dict[str, Any]:
        """التحقق من الحقول الرقمية"""
        try:
            numeric_value = float(value)
            if numeric_value < min_value:
                return {
                    "success": False,
                    "error": f"{field_name} يجب أن يكون أكبر من أو يساوي {min_value}"
                }
            return {"success": True, "value": numeric_value}
        except (ValueError, TypeError):
            return {
                "success": False,
                "error": f"{field_name} يجب أن يكون رقماً صحيحاً"
            }
    
    @staticmethod
    def validate_text_field(value: str, field_name: str, min_length: int = 1, max_length: int = 255) -> Dict[str, Any]:
        """التحقق من الحقول النصية"""
        if not value or not value.strip():      
            return {
                "success": False,
                "error": f"{field_name} مطلوب"
            }
        
        value = value.strip()
        if len(value) < min_length:
            return {
                "success": False,
                "error": f"{field_name} يجب أن يكون على الأقل {min_length} حرف"
            }
        
        if len(value) > max_length:
            return {
                "success": False,
                "error": f"{field_name} يجب أن يكون أقل من {max_length} حرف"
            }
        
        return {"success": True, "value": value}
    
    @staticmethod
    def sanitize_input(value: str) -> str:
        """تنظيف المدخلات من الرموز الخطيرة"""
        if not value:
            return ""
        
        # إزالة الرموز الخطيرة
        dangerous_chars = ['<', '>', '"', "'", '&', ';', '(', ')', '|', '`', '$']
        for char in dangerous_chars:
            value = value.replace(char, '')
        
        return value.strip()
