#!/usr/bin/env python3
"""
Stockly Smart WhatsApp Agent - الوكيل الذكي للواتساب
يستخدم النظام الجديد مع مدير الوكلاء
"""

from .agent_manager import agent_manager

# Global agent instance (backward compatibility)
smart_agent = agent_manager