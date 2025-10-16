# توحيد اتجاه RTL في التطبيق

## نظرة عامة
تم توحيد اتجاه العرض من اليمين لليسار (RTL) في جميع شاشات ومكونات التطبيق للحصول على تجربة مستخدم متسقة على كل من iOS و Android.

## التغييرات الرئيسية

### 1. إعدادات RTL العامة

#### `App.tsx`
```typescript
// تم نقل إعدادات RTL خارج المكون لضمان تطبيقها قبل عرض التطبيق
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
```

#### `app.json`
```json
"android": {
  "supportsRtl": true
}
```

### 2. توحيد محاذاة العناصر (alignItems)

تم استبدال جميع `alignItems: 'flex-end'` بـ `alignItems: 'flex-start'` في:

#### الشاشات الرئيسية:
- ✅ `InvoicesScreen.tsx` - (3 تغييرات)
- ✅ `InvoiceCreateScreen.tsx` - (1 تغيير)
- ✅ `ProductsScreen.tsx` - (2 تغييرات)
- ✅ `CustomersScreen.tsx` - (1 تغيير)
- ✅ `ReturnsScreen.tsx` - (3 تغييرات)
- ✅ `PaymentsScreen.tsx` - (1 تغيير)
- ✅ `PaymentCreateScreen.tsx` - (1 تغيير)
- ✅ `SettingsScreen.tsx` - (1 تغيير)
- ✅ `DashboardScreen.tsx` - (2 تغييرات)
- ✅ `PrintInvoiceScreen.tsx` - (1 تغيير)
- ✅ `ArchiveScreen.tsx` - (1 تغيير)
- ✅ `CategoriesScreen.tsx` - (1 تغيير)
- ✅ `UsersScreen.tsx` - (1 تغيير)

#### المكونات (Components):
- ✅ `SectionHeader.tsx` - (1 تغيير)
- ✅ `AmountDisplay.tsx` - (1 تغيير)
- ✅ `ListItem.tsx` - (2 تغييرات)
- ✅ `SoftListItem.tsx` - (1 تغيير)
- ✅ `Picker.tsx` - تم تغيير `justifyContent: 'flex-end'` إلى `'flex-start'`

#### التنقل (Navigation):
- ✅ `SidebarPanel.tsx` - تم تبسيط الأنماط وإزالة إعدادات RTL المكررة
- ✅ `MainTabs.tsx` - تم تغيير محاذاة FloatingActionButton

### 3. توحيد محاذاة النصوص (textAlign)

تم استبدال جميع `textAlign: 'left'` بـ `textAlign: 'right'` في:
- ✅ `InvoicesScreen.tsx` - (1 تغيير)
- ✅ `ProductsScreen.tsx` - (1 تغيير)
- ✅ `SettingsScreen.tsx` - (1 تغيير)

### 4. إصلاح FloatingActionButton

```typescript
// قبل:
<View style={{ justifyContent: 'flex-end', alignItems: 'flex-start' }}>
  <Pressable style={{ left: right }}>

// بعد:
<View style={{ justifyContent: 'flex-end', alignItems: 'flex-end' }}>
  <Pressable style={{ right: right }}>
```

### 5. إصلاح Dashboard

```typescript
// تم تغيير cardTop من:
justifyContent: 'flex-end'
// إلى:
justifyContent: 'flex-start'
```

### 6. تنظيف الملفات غير المستخدمة

تم حذف الملفات التالية لأنها غير مستخدمة في التطبيق:
- ❌ `Sidebar.tsx` (تم استبداله بـ `SidebarPanel.tsx`)
- ❌ `MainDrawer.tsx` (غير مستخدم)

## الفوائد

### 1. **تجربة مستخدم موحدة**
- جميع العناصر تتماشى من اليمين بشكل متسق
- لا يوجد اختلاف بين iOS و Android
- النصوص العربية تظهر بشكل طبيعي من اليمين

### 2. **سهولة الصيانة**
- نمط واحد للمحاذاة في جميع أنحاء التطبيق
- تقليل الأخطاء والارتباك
- إزالة الملفات المكررة وغير المستخدمة

### 3. **أداء أفضل**
- إعدادات RTL يتم تطبيقها مرة واحدة عند بدء التطبيق
- عدم الحاجة لإعدادات مكررة في كل مكون

## ملاحظات مهمة

### إعادة تشغيل التطبيق مطلوبة
بعد تطبيق إعدادات `I18nManager.forceRTL(true)`، يجب إعادة تشغيل التطبيق بالكامل (وليس Hot Reload):

```bash
# لـ iOS
npx expo run:ios

# لـ Android
npx expo run:android
```

### قواعد المحاذاة الجديدة

في تطبيق RTL، استخدم:
- ✅ `alignItems: 'flex-start'` للمحاذاة من اليمين (البداية)
- ✅ `textAlign: 'right'` للنصوص العربية
- ✅ `flexDirection: 'row-reverse'` للصفوف التي تبدأ من اليمين
- ✅ `right: X` لوضع العناصر على اليمين
- ❌ تجنب استخدام `flex-end` و `left` في معظم الحالات

### استثناءات
بعض الحالات تتطلب `flex-end` مثل:
- الأزرار العائمة (FloatingActionButton) في أسفل الشاشة
- بعض التخطيطات الخاصة

## الملفات المعدلة (الملخص)

### ملفات التكوين (2)
1. `App.tsx`
2. `app.json`

### الشاشات (13)
1. InvoicesScreen.tsx
2. InvoiceCreateScreen.tsx
3. ProductsScreen.tsx
4. CustomersScreen.tsx
5. ReturnsScreen.tsx
6. PaymentsScreen.tsx
7. PaymentCreateScreen.tsx
8. SettingsScreen.tsx
9. DashboardScreen.tsx
10. PrintInvoiceScreen.tsx
11. ArchiveScreen.tsx
12. CategoriesScreen.tsx
13. UsersScreen.tsx

### المكونات (5)
1. SectionHeader.tsx
2. AmountDisplay.tsx
3. ListItem.tsx
4. SoftListItem.tsx
5. Picker.tsx
6. FloatingActionButton.tsx

### التنقل (2)
1. SidebarPanel.tsx
2. MainTabs.tsx

### ملفات محذوفة (2)
1. Sidebar.tsx
2. MainDrawer.tsx

## الخطوات التالية

1. ✅ إعادة تشغيل التطبيق على كل من iOS و Android
2. ✅ اختبار جميع الشاشات والتأكد من المحاذاة الصحيحة
3. ✅ التحقق من أن الأزرار والمدخلات في المكان الصحيح
4. ✅ اختبار الـ FloatingActionButton في جميع الشاشات
5. ✅ التأكد من أن النصوص العربية تظهر بشكل صحيح

## تاريخ التحديث
تم التطبيق في: أكتوبر 2025

