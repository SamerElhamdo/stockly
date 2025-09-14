"""
إعدادات Logging للوكيل الذكي
"""
import logging
import os
from django.conf import settings


def setup_logger(name: str = 'whatsapp_agent.agent_manager') -> logging.Logger:
    """إعداد logger للوكيل الذكي"""
    
    # إنشاء logger
    logger = logging.getLogger(name)
    
    # تجنب إضافة handlers متعددة
    if logger.handlers:
        return logger
    
    # تعيين مستوى logging
    logger.setLevel(logging.INFO)
    
    # إنشاء formatter
    formatter = logging.Formatter(
        '%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s',
        style='{'
    )
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler
    log_file = os.path.join(settings.BASE_DIR, 'agent_debug.log')
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    # منع انتشار الرسائل إلى loggers أخرى
    logger.propagate = False
    
    return logger
