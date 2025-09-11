import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stockly_proj.settings')
django.setup()

from app.models import User

def create_superuser():
    """Create superuser account (command line only)"""
    try:
        # Check if superuser already exists
        if User.objects.filter(is_superuser=True).exists():
            print("❌ Superuser already exists!")
            return
        
        # Create superuser
        superuser = User.objects.create_superuser(
            username='admin',
            email='admin@stockly.com',
            password='admin123',
            account_type='superuser',
            first_name='مدير النظام',
            last_name='العام'
        )
        
        # Ensure superuser has staff permissions for Django admin
        superuser.is_staff = True
        superuser.is_active = True
        superuser.save()
        
        print("✅ Superuser created successfully!")
        print(f"   Username: {superuser.username}")
        print(f"   Password: admin123")
        print(f"   Account Type: {superuser.get_account_type_display_arabic()}")
        print(f"\n🌐 Access Django Admin: http://127.0.0.1:8000/admin/")
        print(f"🌐 Access Application: http://127.0.0.1:8000/")
        
    except Exception as e:
        print(f"❌ Error creating superuser: {e}")

if __name__ == "__main__":
    create_superuser()
