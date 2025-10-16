# دليل إضافة زر "تم" لحقول الإدخال في التطبيق

## 🎯 **الطرق المتاحة:**

### **1. استخدام `returnKeyType` (الأسهل والأكثر شيوعاً):**

```tsx
<TextInput
  value={value}
  onChangeText={setValue}
  returnKeyType="done"
  onSubmitEditing={() => {
    Keyboard.dismiss(); // إخفاء الكيبورد
    // أو تنفيذ أي عمل آخر
  }}
/>
```

### **2. استخدام المكون المخصص `EnhancedInput`:**

```tsx
import { EnhancedInput } from '@/components';

<EnhancedInput
  label="اسم الحقل"
  value={value}
  onChangeText={setValue}
  placeholder="أدخل القيمة"
  returnKeyType="done"
  onDonePress={() => {
    // عمل مخصص عند الضغط على "تم"
  }}
/>
```

## 🔧 **أنواع `returnKeyType` المتاحة:**

- `"done"` - زر "تم" (الأكثر شيوعاً)
- `"next"` - زر "التالي" (للانتقال للحقل التالي)
- `"search"` - زر "بحث"
- `"send"` - زر "إرسال"
- `"go"` - زر "انتقال"
- `"default"` - الزر الافتراضي

## 📱 **مثال شامل:**

```tsx
import React, { useState } from 'react';
import { View, Keyboard } from 'react-native';
import { EnhancedInput } from '@/components';

export const ExampleScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = () => {
    // تنفيذ العمل المطلوب
    console.log('تم إرسال البيانات');
  };

  return (
    <View>
      {/* حقل اسم المستخدم - ينتقل للحقل التالي */}
      <EnhancedInput
        label="اسم المستخدم"
        value={name}
        onChangeText={setName}
        placeholder="أدخل اسم المستخدم"
        returnKeyType="next"
        autoCapitalize="none"
      />

      {/* حقل البريد الإلكتروني - ينتقل للحقل التالي */}
      <EnhancedInput
        label="البريد الإلكتروني"
        value={email}
        onChangeText={setEmail}
        placeholder="example@email.com"
        keyboardType="email-address"
        returnKeyType="next"
        autoCapitalize="none"
      />

      {/* حقل الهاتف - ينتهي بالإرسال */}
      <EnhancedInput
        label="رقم الهاتف"
        value={phone}
        onChangeText={setPhone}
        placeholder="9665XXXXXXXX"
        keyboardType="phone-pad"
        returnKeyType="done"
        onDonePress={handleSubmit}
      />
    </View>
  );
};
```

## 🎨 **خصائص المكون `EnhancedInput`:**

```tsx
interface EnhancedInputProps extends TextInputProps {
  label?: string;           // تسمية الحقل
  error?: string;           // رسالة خطأ
  helperText?: string;      // نص مساعد
  showDoneButton?: boolean; // إظهار زر "تم" (افتراضي: true)
  doneButtonText?: string;  // نص زر "تم" (افتراضي: "تم")
  onDonePress?: () => void; // دالة عند الضغط على "تم"
}
```

## 🔄 **تحديث الحقول الموجودة:**

### **قبل التحديث:**
```tsx
<TextInput
  value={value}
  onChangeText={setValue}
  placeholder="أدخل القيمة"
  style={styles.input}
/>
```

### **بعد التحديث:**
```tsx
<EnhancedInput
  value={value}
  onChangeText={setValue}
  placeholder="أدخل القيمة"
  returnKeyType="done"
  onSubmitEditing={() => Keyboard.dismiss()}
/>
```

## 📋 **قائمة الشاشات المحدثة:**

- ✅ `SimpleAuthScreen` - شاشة تسجيل الدخول
- ✅ `SettingsScreen` - شاشة الإعدادات
- ✅ `InvoiceCreateScreen` - شاشة إنشاء فاتورة جديدة

## 🚀 **الخطوات التالية:**

1. **تحديث باقي الشاشات** لتستخدم `EnhancedInput`
2. **إضافة `returnKeyType`** لجميع `TextInput` الموجودة
3. **اختبار تجربة المستخدم** على الأجهزة المختلفة

## 💡 **نصائح مهمة:**

- استخدم `returnKeyType="next"` للحقول المتتالية
- استخدم `returnKeyType="done"` للحقل الأخير
- أضف `onSubmitEditing` لتنفيذ عمل عند الضغط على "تم"
- استخدم `Keyboard.dismiss()` لإخفاء الكيبورد
- اختبر على أجهزة iOS و Android للتأكد من التوافق
