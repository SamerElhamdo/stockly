"""
إعدادات MCP Server
Stockly Accounting Assistant Configuration
"""

import os
from typing import Optional, List
from dotenv import load_dotenv

# تحميل متغيرات البيئة
load_dotenv()

class StocklyMCPConfig:
    """إعدادات خادم MCP"""
    
    # إعدادات Django API
    DJANGO_BASE_URL: str = os.getenv('DJANGO_BASE_URL', 'http://localhost:8000')
    API_TOKEN: Optional[str] = os.getenv('API_TOKEN')
    
    # إعدادات MCP Server
    MCP_SERVER_NAME: str = "Stockly Accounting Assistant"
    MCP_SERVER_VERSION: str = "1.0.0"
    MCP_SERVER_DESCRIPTION: str = "محاسب ذكي لنظام Stockly لإدارة المخزون والفواتير"
    
    # إعدادات الاتصال
    REQUEST_TIMEOUT: int = int(os.getenv('REQUEST_TIMEOUT', '30'))
    MAX_RETRIES: int = int(os.getenv('MAX_RETRIES', '3'))
    
    # إعدادات الأمان
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "https://stockly.encryptosystem.com"
    ]
    
    # إعدادات السجلات
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE: str = os.getenv('LOG_FILE', 'mcp_server.log')
    
    # إعدادات الأداء
    MAX_CONCURRENT_REQUESTS: int = int(os.getenv('MAX_CONCURRENT_REQUESTS', '10'))
    CACHE_TTL: int = int(os.getenv('CACHE_TTL', '300'))  # 5 دقائق
    
    @classmethod
    def validate_config(cls) -> bool:
        """التحقق من صحة الإعدادات"""
        if not cls.API_TOKEN:
            print("❌ خطأ: يجب تعيين API_TOKEN في متغيرات البيئة")
            return False
        
        if not cls.DJANGO_BASE_URL:
            print("❌ خطأ: يجب تعيين DJANGO_BASE_URL في متغيرات البيئة")
            return False
        
        return True
    
    @classmethod
    def get_headers(cls) -> dict:
        """الحصول على headers للطلبات"""
        return {
            'Authorization': f'Token {cls.API_TOKEN}',
            'Content-Type': 'application/json',
            'User-Agent': f'{cls.MCP_SERVER_NAME}/{cls.MCP_SERVER_VERSION}'
        }
