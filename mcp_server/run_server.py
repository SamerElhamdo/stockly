#!/usr/bin/env python3
"""
Stockly MCP Server - ملف التشغيل الرئيسي
تشغيل خادم MCP للمحاسب الذكي
"""

import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv

# إضافة مسار المشروع إلى Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from mcp_server.config import StocklyMCPConfig
from mcp_server.mcp_server import StocklyMCPTools

def main():
    """الدالة الرئيسية لتشغيل الخادم"""
    
    # إعداد parser للأوامر
    parser = argparse.ArgumentParser(
        description='Stockly MCP Server - محاسب ذكي لنظام Stockly',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
أمثلة على الاستخدام:
  python run_server.py                    # تشغيل عادي
  python run_server.py --config .env     # استخدام ملف إعدادات مخصص
  python run_server.py --debug           # تشغيل في وضع التصحيح
  python run_server.py --check           # فحص الإعدادات فقط
        """
    )
    
    parser.add_argument(
        '--config', '-c',
        type=str,
        default='.env',
        help='مسار ملف الإعدادات (افتراضي: .env)'
    )
    
    parser.add_argument(
        '--debug', '-d',
        action='store_true',
        help='تشغيل في وضع التصحيح'
    )
    
    parser.add_argument(
        '--check',
        action='store_true',
        help='فحص الإعدادات فقط دون تشغيل الخادم'
    )
    
    parser.add_argument(
        '--version', '-v',
        action='version',
        version='Stockly MCP Server v1.0.0'
    )
    
    args = parser.parse_args()
    
    # تحميل متغيرات البيئة
    env_file = Path(args.config)
    if env_file.exists():
        load_dotenv(env_file)
        print(f"✅ تم تحميل الإعدادات من: {env_file}")
    else:
        print(f"⚠️  ملف الإعدادات غير موجود: {env_file}")
        print("   سيتم استخدام الإعدادات الافتراضية")
    
    # إعداد وضع التصحيح
    if args.debug:
        os.environ['LOG_LEVEL'] = 'DEBUG'
        print("🐛 وضع التصحيح مفعل")
    
    try:
        # إنشاء إعدادات الخادم
        config = StocklyMCPConfig()
        
        # فحص الإعدادات
        if not config.validate_config():
            print("❌ فشل في التحقق من الإعدادات")
            return 1
        
        print("✅ تم التحقق من الإعدادات بنجاح")
        
        if args.check:
            print("🔍 فحص الإعدادات مكتمل - الخادم جاهز للتشغيل")
            return 0
        
        # إنشاء وتشغيل الخادم
        print("🚀 بدء تشغيل Stockly MCP Server...")
        print("=" * 60)
        print(f"📊 اسم الخادم: {config.MCP_SERVER_NAME}")
        print(f"🔢 الإصدار: {config.MCP_SERVER_VERSION}")
        print(f"🌐 رابط Django: {config.DJANGO_BASE_URL}")
        print(f"🔑 API Token: {'*' * 20}{config.API_TOKEN[-4:] if config.API_TOKEN else 'غير محدد'}")
        print(f"📝 مستوى السجلات: {config.LOG_LEVEL}")
        print("=" * 60)
        
        server = StocklyMCPTools(config)
        
        # فحص صحة النظام
        health = server.health_check()
        if health['status'] != 'healthy':
            print(f"❌ فحص صحة النظام فشل: {health.get('error', 'خطأ غير معروف')}")
            return 1
        
        print("✅ فحص صحة النظام نجح")
        print("🎯 الخادم جاهز لاستقبال الطلبات من n8n AI Agent")
        print("⏹️  اضغط Ctrl+C لإيقاف الخادم")
        print("=" * 60)
        
        # تشغيل الخادم
        server.run()
        
    except KeyboardInterrupt:
        print("\n⏹️  تم إيقاف الخادم بواسطة المستخدم")
        return 0
    except Exception as e:
        print(f"❌ خطأ في تشغيل الخادم: {e}")
        if args.debug:
            import traceback
            traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
