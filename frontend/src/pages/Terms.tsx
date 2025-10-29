import React from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

export const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-background">
      <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary-light rounded-full">
          <DocumentTextIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">شروط الاستخدام</h1>
          <p className="text-muted-foreground mt-1">آخر تحديث: {new Date().toLocaleDateString('ar')}</p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-card rounded-lg border border-border p-8 space-y-6">
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-3">1. القبول الشروط</h2>
          <p className="text-muted-foreground leading-relaxed">
            من خلال الوصول إلى هذا النظام واستخدامه، فإنك توافق على الالتزام بشروط وأحكام هذا الاتفاقية.
            إذا كنت لا توافق على أي من هذه الشروط، يُرجى عدم استخدام هذا النظام.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-3">2. استخدام النظام</h2>
          <div className="space-y-2">
            <p className="text-muted-foreground leading-relaxed">
              يُسمح لك باستخدام هذا النظام للأغراض التجارية والوصول إلى الميزات المتاحة وفقًا لصلاحياتك.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              يُمنع منعًا باتًا استخدام النظام لأي غرض غير قانوني أو غير مصرح به.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-3">3. الحسابات والأمان</h2>
          <div className="space-y-2">
            <p className="text-muted-foreground leading-relaxed">
              أنت مسؤول عن الحفاظ على سرية معلومات تسجيل الدخول الخاصة بك.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              يجب عليك إبلاغنا فورًا بأي استخدام غير مصرح به لحسابك.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              نحن لا نتحمل المسؤولية عن أي خسارة أو ضرر ناتج عن عدم امتثالك للتزامات الأمان.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-3">4. حماية البيانات</h2>
          <p className="text-muted-foreground leading-relaxed">
            نحن ملتزمون بحماية بياناتك الشخصية وفقًا لأعلى معايير الأمان والخصوصية.
            جميع البيانات المعالجة من خلال النظام محمية ومشفرة.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-3">5. دقة المعلومات</h2>
          <p className="text-muted-foreground leading-relaxed">
            أنت مسؤول عن دقة وصحة جميع المعلومات التي تقدمها من خلال النظام.
            يجب عليك تحديث معلوماتك فورًا عند حدوث أي تغيير.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-3">6. الملكية الفكرية</h2>
          <p className="text-muted-foreground leading-relaxed">
            جميع حقوق الملكية الفكرية في النظام ومواده تعود إلينا أو إلى أطراف ثالثة مرخص لها.
            لا يُسمح لك بنسخ أو تعديل أو توزيع أي جزء من النظام دون إذن مسبق.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-3">7. التعديلات</h2>
          <p className="text-muted-foreground leading-relaxed">
            نحتفظ بالحق في تعديل أو تحديث هذه الشروط في أي وقت دون إشعار مسبق.
            سيتم نشر أي تغييرات على هذه الصفحة، وتعتبر الاستمرار في استخدام النظام موافقة على التعديلات.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-3">8. إنهاء الخدمة</h2>
          <p className="text-muted-foreground leading-relaxed">
            نحتفظ بالحق في تعليق أو إنهاء وصولك إلى النظام في أي وقت دون إشعار مسبق
            إذا كنت تنتهك هذه الشروط والأحكام.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-3">9. المسؤولية</h2>
          <p className="text-muted-foreground leading-relaxed">
            لا نتحمل أي مسؤولية عن الخسائر المباشرة أو غير المباشرة أو العرضية
            الناتجة عن استخدام أو عدم القدرة على استخدام النظام.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-3">10. القانون الحاكم</h2>
          <p className="text-muted-foreground leading-relaxed">
            تخضع هذه الشروط والأحكام وتُفسر وفقًا للقوانين المحلية.
            أي نزاعات تنشأ عن هذه الشروط ستُحل من خلال المحاكم المختصة.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-3">11. الاتصال</h2>
          <p className="text-muted-foreground leading-relaxed">
            إذا كان لديك أي أسئلة حول شروط الاستخدام، يُرجى الاتصال بنا من خلال
            صفحة الإعدادات أو من خلال فريق الدعم الفني.
          </p>
        </section>
      </div>

      {/* Footer Note */}
      <div className="bg-muted/50 rounded-lg border border-border p-4 text-center">
        <p className="text-sm text-muted-foreground">
          بالاستمرار في استخدام هذا النظام، فإنك تؤكد أنك قد قرأت وفهمت ووافقت على جميع شروط الاستخدام أعلاه.
        </p>
      </div>

      {/* Back to Login Button */}
      <div className="flex justify-center pt-4">
        <Link
          to="/auth"
          className="text-primary hover:underline font-medium text-sm"
        >
          ← العودة إلى صفحة تسجيل الدخول
        </Link>
      </div>
      </div>
    </div>
  );
};

