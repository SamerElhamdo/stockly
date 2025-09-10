# دعم الخطوط العربية في PDF

## المشكلة
كانت الأحرف العربية تظهر بشكل مبهم أو غير صحيح في ملفات PDF المولدة باستخدام reportlab.

## الحل المطبق

### 1. تثبيت المكتبات المطلوبة
```bash
pip install arabic-reshaper python-bidi
```

### 2. تحميل خط يدعم العربية
تم تحميل خط Noto Sans Arabic من Google Fonts:
- الملف: `static/fonts/NotoSansArabic-Regular.ttf`
- يدعم جميع الأحرف العربية بشكل كامل

### 3. إضافة دالة معالجة النص العربي
```python
def format_arabic_text(text):
    """Format Arabic text for proper display in PDF"""
    if not text:
        return text
    try:
        # Reshape Arabic text
        reshaped_text = arabic_reshaper.reshape(text)
        # Apply bidirectional algorithm
        bidi_text = get_display(reshaped_text)
        return bidi_text
    except:
        # Fallback to original text if reshaping fails
        return text
```

### 4. تسجيل الخط في PDF
```python
# Register Arabic font
try:
    # Try to register Noto Sans Arabic font
    pdfmetrics.registerFont(TTFont('NotoSansArabic', 'static/fonts/NotoSansArabic-Regular.ttf'))
except:
    # Fallback to other fonts...
```

### 5. استخدام الخط في جميع عناصر PDF
- العناوين
- الجداول
- النصوص العادية
- التذييل

## النتيجة
- ✅ الأحرف العربية تظهر بوضوح ووضوح تام
- ✅ المحاذاة صحيحة (من اليمين إلى اليسار)
- ✅ جميع النصوص العربية مدعومة
- ✅ حجم PDF مناسب (16KB للفاتورة الواحدة)

## الملفات المحدثة
- `app/views.py`: دالة `invoice_pdf` مع دعم الخطوط العربية
- `static/fonts/NotoSansArabic-Regular.ttf`: الخط العربي المحمل

## كيفية الاستخدام
1. اضغط على زر "طباعة PDF" في صفحة الفاتورة
2. أو اضغط على زر "طباعة" في قائمة الفواتير
3. سيتم تحميل PDF مع النصوص العربية الصحيحة تلقائياً
