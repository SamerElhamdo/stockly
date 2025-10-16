# 🔍 دليل تتبع مشكلة حفظ الإعدادات

## 📋 **الخطوات لتتبع المشكلة:**

### **1. افتح Developer Console:**
- في التطبيق المحمول، افتح Developer Tools
- أو استخدم `console.log` في المتصفح إذا كنت تستخدم Expo Go

### **2. اتبع هذه الخطوات:**
1. **افتح شاشة الإعدادات**
2. **غيّر تسمية المنتجات** (مثلاً من "منتجات" إلى "أصناف")
3. **اضغط على "حفظ التغييرات"**
4. **راقب الـ console** للرسائل التالية:

## 📊 **الرسائل المتوقعة في Console:**

### **عند تحميل الصفحة:**
```
📥 تم تحميل بيانات الملف الشخصي: {profile object}
🏷️ products_label من الباك إند: "منتجات" (أو null/undefined)
✅ تم تحديث جميع الحقول
```

### **عند الضغط على حفظ:**
```
📤 البيانات المرسلة للباك إند: {
  "return_policy": "...",
  "payment_policy": "...",
  "language": "ar",
  "dashboard_cards": [...],
  "secondary_currency": "...",
  "secondary_per_usd": "...",
  "price_display_mode": "both",
  "products_label": "أصناف",
  "logo": null
}

🔍 فحص البيانات:
- products_label: "أصناف" (نوع: string)
- products_label في payload: "أصناف"
```

### **عند بدء الحفظ:**
```
🔄 بدء عملية الحفظ...
📋 بيانات الملف الشخصي: 123
📝 FormData المحضر:
- return_policy: "..."
- payment_policy: "..."
- language: "ar"
- dashboard_cards: "[...]"
- secondary_currency: "..."
- secondary_per_usd: "..."
- price_display_mode: "both"
- products_label: "أصناف"
- logo: غير موجود
🌐 إرسال الطلب للباك إند...
🔗 الرابط: /api/company-profile/123/
```

### **عند النجاح:**
```
✅ تم الحفظ بنجاح!
📥 الاستجابة: {updated profile object}
```

### **عند الخطأ:**
```
❌ خطأ في الحفظ: {error object}
📋 تفاصيل الخطأ: {error details}
🔗 الرابط المطلوب: /api/company-profile/123/
📝 البيانات المرسلة: {form data}
```

## 🔧 **المشاكل المحتملة:**

### **1. إذا كان `products_label` من الباك إند `null` أو `undefined`:**
- الباك إند لا يدعم هذا الحقل بعد
- يحتاج تحديث في الباك إند

### **2. إذا كان الطلب يعلق عند "إرسال الطلب للباك إند":**
- مشكلة في الشبكة أو الباك إند
- تحقق من اتصال الإنترنت

### **3. إذا كان هناك خطأ 400 أو 422:**
- الباك إند يرفض البيانات
- تحقق من تفاصيل الخطأ في console

### **4. إذا كان هناك خطأ 500:**
- خطأ في الباك إند
- تحقق من logs الباك إند

## 📱 **للمطورين:**

### **إزالة console.log بعد التصحيح:**
```bash
# ابحث عن جميع console.log في الملف
grep -n "console.log" mobile/src/screens/Settings/SettingsScreen.tsx

# احذف السطور التي تحتوي على console.log
```

### **التحقق من الباك إند:**
```python
# في Django، تأكد من أن Model يحتوي على:
class CompanyProfile(models.Model):
    # ... existing fields ...
    products_label = models.CharField(
        max_length=20, 
        choices=[
            ('منتجات', 'منتجات'),
            ('أصناف', 'أصناف'),
            ('مواد', 'مواد'),
        ],
        default='منتجات'
    )
```

## 🎯 **النتيجة المتوقعة:**
بعد الحفظ الناجح، يجب أن ترى:
- رسالة نجاح: "✓ تم حفظ الإعدادات"
- تغيير تسمية المنتجات في جميع أنحاء التطبيق
- تحديث التبويبات والعناوين
