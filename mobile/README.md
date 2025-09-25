# Stockly Mobile (Expo)

تطبيق React Native باستخدام Expo يوفر تجربة جوال متكاملة لمنظومة Stockly مع تصميم Soft UI ودعم الوضعين الفاتح والداكن.

## ✨ المزايا الرئيسية
- لوحة تحكم غنية بالإحصائيات مع بطاقات Soft UI.
- إدارة المنتجات، العملاء، الفئات، الفواتير، المدفوعات، المرتجعات والأرشيف.
- تكامل كامل مع API الباك اند المستخدم في الواجهة الويب.
- دعم الوضع الفاتح والداكن مع ألوان متناسقة.
- بنية ملاحة تجمع بين Tab Navigator وStack Navigators.

## 🚀 البدء السريع
```bash
npm install
npm run start
```

التطبيق يعتمد على متغير البيئة `EXPO_PUBLIC_API_BASE` لتحديد عنوان الـ API. يمكن تمرير المتغير عند التشغيل:
```bash
EXPO_PUBLIC_API_BASE=http://127.0.0.1:8000 npm run start
```

## 🧱 الهيكل العام
```
src/
  components/      # مكونات الواجهة المخصصة بنمط Soft UI
  context/         # مزودي السياق (المصادقة، بيانات الشركة)
  navigation/      # التوجيه والملاحة
  screens/         # الشاشات الرئيسية للتطبيق
  services/        # عميل API و Query Client
  theme/           # نظام الألوان والوضع الليلي
  utils/           # أدوات المساعدة (تنسيق التاريخ وغيرها)
```

## 🛡️ المتطلبات
- Node.js 18+
- Expo CLI

## 🧪 الأوامر المتاحة
```bash
npm run start      # تشغيل Expo
npm run android    # بناء وتشغيل على أندرويد
npm run ios        # بناء وتشغيل على iOS
npm run web        # تشغيل نسخة الويب
npm run lint       # فحص ESLint
npm run typecheck  # فحص TypeScript
```

## 📄 الترخيص
MIT
