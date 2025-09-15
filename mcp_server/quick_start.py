#!/usr/bin/env python3
"""
Stockly MCP Server - دليل البدء السريع
إعداد وتشغيل سريع للخادم
"""

import os
import sys
import subprocess
from pathlib import Path

def print_banner():
    """طباعة شعار المشروع"""
    print("=" * 60)
    print("🚀 Stockly MCP Server - دليل البدء السريع")
    print("=" * 60)
    print()

def check_python_version():
    """فحص إصدار Python"""
    print("🐍 فحص إصدار Python...")
    if sys.version_info < (3, 8):
        print("❌ يتطلب Python 3.8 أو أحدث")
        print(f"   الإصدار الحالي: {sys.version}")
        return False
    print(f"✅ Python {sys.version.split()[0]} - جيد")
    return True

def check_django_server():
    """فحص تشغيل Django server"""
    print("\n🌐 فحص Django server...")
    try:
        import requests
        response = requests.get("http://localhost:8000/api/dashboard/stats", timeout=5)
        if response.status_code == 200:
            print("✅ Django server يعمل")
            return True
        else:
            print(f"⚠️  Django server يعمل لكن API غير متاح (HTTP {response.status_code})")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Django server لا يعمل")
        print("   شغّل: cd .. && python manage.py runserver")
        return False
    except ImportError:
        print("⚠️  مكتبة requests غير مثبتة - سيتم تثبيتها")
        return False

def install_requirements():
    """تثبيت المتطلبات"""
    print("\n📦 تثبيت المتطلبات...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                      check=True, capture_output=True, text=True)
        print("✅ تم تثبيت المتطلبات بنجاح")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ فشل في تثبيت المتطلبات: {e}")
        print(f"   الخطأ: {e.stderr}")
        return False

def setup_environment():
    """إعداد متغيرات البيئة"""
    print("\n⚙️  إعداد متغيرات البيئة...")
    
    env_file = Path(".env")
    if not env_file.exists():
        print("📝 إنشاء ملف .env...")
        with open(".env", "w", encoding="utf-8") as f:
            f.write("""# Stockly MCP Server - ملف الإعدادات
DJANGO_BASE_URL=http://localhost:8000
API_TOKEN=your_django_api_token_here
DEBUG=True
LOG_LEVEL=INFO
""")
        print("✅ تم إنشاء ملف .env")
        print("⚠️  يرجى تعديل API_TOKEN في ملف .env")
        return False
    else:
        print("✅ ملف .env موجود")
        return True

def get_api_token():
    """الحصول على API Token"""
    print("\n🔑 الحصول على API Token...")
    print("1. اذهب إلى Django Admin: http://localhost:8000/admin/")
    print("2. اذهب إلى 'Tokens' وأنشئ token جديد")
    print("3. ضع الـ token في ملف .env")
    
    token = input("\nأدخل API Token (أو اضغط Enter لتخطي): ").strip()
    if token:
        # تحديث ملف .env
        with open(".env", "r", encoding="utf-8") as f:
            content = f.read()
        
        content = content.replace("API_TOKEN=your_django_api_token_here", f"API_TOKEN={token}")
        
        with open(".env", "w", encoding="utf-8") as f:
            f.write(content)
        
        print("✅ تم حفظ API Token")
        return True
    else:
        print("⚠️  تم تخطي إدخال API Token")
        return False

def test_server():
    """اختبار الخادم"""
    print("\n🧪 اختبار الخادم...")
    try:
        result = subprocess.run([sys.executable, "test_server.py"], 
                              capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            print("✅ اختبار الخادم نجح")
            return True
        else:
            print("❌ اختبار الخادم فشل")
            print(f"   الخطأ: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        print("⏰ انتهت مهلة الاختبار")
        return False
    except Exception as e:
        print(f"❌ خطأ في الاختبار: {e}")
        return False

def run_server():
    """تشغيل الخادم"""
    print("\n🚀 تشغيل الخادم...")
    print("اضغط Ctrl+C لإيقاف الخادم")
    print("-" * 40)
    
    try:
        subprocess.run([sys.executable, "run_server.py"])
    except KeyboardInterrupt:
        print("\n⏹️  تم إيقاف الخادم")
    except Exception as e:
        print(f"❌ خطأ في تشغيل الخادم: {e}")

def main():
    """الدالة الرئيسية"""
    print_banner()
    
    # فحص Python
    if not check_python_version():
        return 1
    
    # فحص Django
    django_ok = check_django_server()
    if not django_ok:
        print("\n💡 نصائح:")
        print("   1. تأكد من تشغيل Django server")
        print("   2. شغّل: cd .. && python manage.py runserver")
        print("   3. ثم شغّل هذا الملف مرة أخرى")
        return 1
    
    # تثبيت المتطلبات
    if not install_requirements():
        return 1
    
    # إعداد البيئة
    env_ok = setup_environment()
    if not env_ok:
        get_api_token()
    
    # اختبار الخادم
    if not test_server():
        print("\n⚠️  اختبار الخادم فشل - تأكد من الإعدادات")
        return 1
    
    # تشغيل الخادم
    print("\n🎉 كل شيء جاهز! تشغيل الخادم...")
    run_server()
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
