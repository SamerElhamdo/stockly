import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { isAxiosError } from "axios";
import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  IdentificationIcon,
  LockClosedIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
  KeyIcon,
  EnvelopeIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/custom-button";
import { Input } from "@/components/ui/custom-input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { apiClient, endpoints } from "@/lib/api";

type AuthTab = "login" | "register" | "forgot";

type RegisterFormData = {
  companyName: string;
  companyCode: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  adminUsername: string;
  adminPassword: string;
  adminPasswordConfirm: string;
};

type ResetFormData = {
  username: string;
  phone: string;
  newPassword: string;
  confirmPassword: string;
};

const cleanPhone = (value: string) => value.replace(/[^0-9]/g, "");

const extractErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === "string") {
      return data;
    }

    if (data && typeof data === "object") {
      const cast = data as {
        error?: string;
        detail?: string;
        message?: string;
        non_field_errors?: string[];
        errors?: string[];
      };

      return (
        cast.error ||
        cast.detail ||
        cast.message ||
        (Array.isArray(cast.non_field_errors) ? cast.non_field_errors.join(" ") : undefined) ||
        (Array.isArray(cast.errors) ? cast.errors.join(" ") : undefined) ||
        fallback
      );
    }
  }

  return fallback;
};

export const Auth: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [apkDownloadUrl, setApkDownloadUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [registerData, setRegisterData] = useState<RegisterFormData>({
    companyName: "",
    companyCode: "",
    companyEmail: "",
    companyPhone: "",
    companyAddress: "",
    adminUsername: "",
    adminPassword: "",
    adminPasswordConfirm: "",
  });
  const [isRegisterSubmitting, setIsRegisterSubmitting] = useState(false);
  const [isSendingRegisterOtp, setIsSendingRegisterOtp] = useState(false);
  const [isVerifyingRegisterOtp, setIsVerifyingRegisterOtp] = useState(false);
  const [registerOtpSession, setRegisterOtpSession] = useState<string | null>(null);
  const [registerOtp, setRegisterOtp] = useState("");
  const [registerOtpVerified, setRegisterOtpVerified] = useState(false);
  const [registerOtpExpiry, setRegisterOtpExpiry] = useState<number | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [resetData, setResetData] = useState<ResetFormData>({
    username: "",
    phone: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSendingResetOtp, setIsSendingResetOtp] = useState(false);
  const [isVerifyingResetOtp, setIsVerifyingResetOtp] = useState(false);
  const [resetOtpSession, setResetOtpSession] = useState<string | null>(null);
  const [resetOtp, setResetOtp] = useState("");
  const [resetOtpVerified, setResetOtpVerified] = useState(false);
  const [resetOtpExpiry, setResetOtpExpiry] = useState<number | null>(null);

  const registerPasswordMismatch = useMemo(
    () =>
      registerData.adminPassword.length > 0 &&
      registerData.adminPasswordConfirm.length > 0 &&
      registerData.adminPassword !== registerData.adminPasswordConfirm,
    [registerData.adminPassword, registerData.adminPasswordConfirm],
  );

  const resetPasswordMismatch = useMemo(
    () =>
      resetData.newPassword.length > 0 &&
      resetData.confirmPassword.length > 0 &&
      resetData.newPassword !== resetData.confirmPassword,
    [resetData.newPassword, resetData.confirmPassword],
  );

  const canSendRegisterOtp = useMemo(
    () => cleanPhone(registerData.companyPhone).length >= 10 && !isSendingRegisterOtp,
    [registerData.companyPhone, isSendingRegisterOtp],
  );

  const canSendResetOtp = useMemo(
    () =>
      cleanPhone(resetData.phone).length >= 10 &&
      resetData.username.trim().length > 0 &&
      !isSendingResetOtp,
    [resetData.phone, resetData.username, isSendingResetOtp],
  );

  const disableRegisterSubmit =
    isRegisterSubmitting ||
    !registerOtpSession ||
    !registerOtpVerified ||
    registerPasswordMismatch ||
    !acceptTerms ||
    !registerData.companyName.trim() ||
    !registerData.companyCode.trim() ||
    !registerData.adminUsername.trim() ||
    !registerData.adminPassword ||
    !registerData.adminPasswordConfirm;

  const disableResetSubmit =
    isResettingPassword ||
    !resetOtpSession ||
    !resetOtpVerified ||
    resetPasswordMismatch ||
    !resetData.username.trim() ||
    !resetData.newPassword ||
    !resetData.confirmPassword;

  // Fetch APK download URL on component mount
  useEffect(() => {
    const fetchAppConfig = async () => {
      try {
        const response = await apiClient.get(endpoints.appConfig);
        const url = (response.data as { apk_download_url?: string | null }).apk_download_url;
        setApkDownloadUrl(url || null);
      } catch (error) {
        console.error('Failed to fetch app config:', error);
        setApkDownloadUrl(null);
      }
    };

    fetchAppConfig();
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) return;

    setIsSubmitting(true);
    const success = await login(formData.username, formData.password);
    setIsSubmitting(false);

    if (!success) {
      toast({
        title: "تعذر تسجيل الدخول",
        description: "تحقق من بياناتك وحاول مرة أخرى.",
        variant: "destructive",
      });
    }
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "companyPhone") {
      setRegisterOtpSession(null);
      setRegisterOtp("");
      setRegisterOtpVerified(false);
      setRegisterOtpExpiry(null);
    }
  };

  const handleResetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setResetData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "phone") {
      setResetOtpSession(null);
      setResetOtp("");
      setResetOtpVerified(false);
      setResetOtpExpiry(null);
    }
  };

  const handleSendRegisterOtp = async () => {
    if (!canSendRegisterOtp) {
      toast({
        title: "رقم غير صالح",
        description: "يرجى إدخال رقم واتساب صحيح لإرسال رمز التحقق.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingRegisterOtp(true);
    try {
      const response = await apiClient.post(endpoints.sendOtp, {
        phone: registerData.companyPhone,
        verification_type: "company_registration",
      });

      const sessionId = (response.data as { session_id?: string }).session_id ?? null;
      const expiresIn = (response.data as { expires_in?: number }).expires_in ?? null;

      setRegisterOtpSession(sessionId);
      setRegisterOtp("");
      setRegisterOtpVerified(false);
      setRegisterOtpExpiry(expiresIn);

      toast({
        title: "تم إرسال رمز التحقق",
        description: "تحقق من تطبيق واتساب لديك لإدخال الرمز المكون من 6 أرقام.",
      });
    } catch (error) {
      toast({
        title: "تعذر إرسال الرمز",
        description: extractErrorMessage(error, "حدث خطأ أثناء إرسال رمز التحقق."),
        variant: "destructive",
      });
    } finally {
      setIsSendingRegisterOtp(false);
    }
  };

  const handleVerifyRegisterOtp = async () => {
    if (!registerOtpSession || registerOtp.length !== 6) {
      toast({
        title: "رمز غير مكتمل",
        description: "أدخل رمز التحقق المكون من 6 أرقام أولاً.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifyingRegisterOtp(true);
    try {
      await apiClient.post(endpoints.verifyOtp, {
        session_id: registerOtpSession,
        otp_code: registerOtp,
      });

      setRegisterOtpVerified(true);
      toast({
        title: "تم توثيق الرقم",
        description: "تم تأكيد رقم الواتساب بنجاح.",
      });
    } catch (error) {
      setRegisterOtpVerified(false);
      toast({
        title: "رمز غير صحيح",
        description: extractErrorMessage(error, "تعذر التحقق من رمز الواتساب."),
        variant: "destructive",
      });
    } finally {
      setIsVerifyingRegisterOtp(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerPasswordMismatch) {
      toast({
        title: "تأكيد كلمة المرور",
        description: "تأكد من تطابق كلمة المرور مع التأكيد.",
        variant: "destructive",
      });
      return;
    }

    if (!registerOtpSession || !registerOtpVerified) {
      toast({
        title: "توثيق مطلوب",
        description: "يرجى توثيق رقم الواتساب قبل إنشاء الحساب.",
        variant: "destructive",
      });
      return;
    }

    setIsRegisterSubmitting(true);
    try {
      const payload = {
        company: {
          name: registerData.companyName.trim(),
          code: registerData.companyCode.trim(),
          email: registerData.companyEmail.trim(),
          phone: registerData.companyPhone.trim(),
          address: registerData.companyAddress.trim(),
        },
        admin: {
          username: registerData.adminUsername.trim(),
          password: registerData.adminPassword,
        },
        otp_session_id: registerOtpSession,
      };

      await apiClient.post(endpoints.registerCompany, payload);

      toast({
        title: "تم إنشاء الشركة",
        description: "تم إنشاء الحساب بنجاح، جاري تسجيل الدخول...",
      });

      const loginSuccess = await login(
        registerData.adminUsername.trim(),
        registerData.adminPassword,
      );

      if (!loginSuccess) {
        toast({
          title: "تم إنشاء الحساب",
          description: "يمكنك الآن تسجيل الدخول باستخدام بيانات المدير الجديدة.",
        });
      }
    } catch (error) {
      toast({
        title: "تعذر إكمال التسجيل",
        description: extractErrorMessage(error, "حدث خطأ أثناء إنشاء الشركة."),
        variant: "destructive",
      });
    } finally {
      setIsRegisterSubmitting(false);
    }
  };

  const handleSendResetOtp = async () => {
    if (!canSendResetOtp) {
      toast({
        title: "بيانات غير مكتملة",
        description: "أدخل اسم المستخدم ورقم الواتساب المرتبط بالحساب.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingResetOtp(true);
    try {
      const response = await apiClient.post(endpoints.sendOtp, {
        phone: resetData.phone,
        username: resetData.username.trim(),
        verification_type: "forgot_password",
      });

      const sessionId = (response.data as { session_id?: string }).session_id ?? null;
      const expiresIn = (response.data as { expires_in?: number }).expires_in ?? null;

      setResetOtpSession(sessionId);
      setResetOtp("");
      setResetOtpVerified(false);
      setResetOtpExpiry(expiresIn);

      toast({
        title: "تم إرسال رمز الاستعادة",
        description: "تحقق من واتساب لإدخال رمز إعادة تعيين كلمة المرور.",
      });
    } catch (error) {
      toast({
        title: "تعذر إرسال الرمز",
        description: extractErrorMessage(error, "حدث خطأ أثناء إرسال رمز الاستعادة."),
        variant: "destructive",
      });
    } finally {
      setIsSendingResetOtp(false);
    }
  };

  const handleVerifyResetOtp = async () => {
    if (!resetOtpSession || resetOtp.length !== 6) {
      toast({
        title: "رمز غير مكتمل",
        description: "أدخل رمز التحقق المكون من 6 أرقام أولاً.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifyingResetOtp(true);
    try {
      await apiClient.post(endpoints.verifyOtp, {
        session_id: resetOtpSession,
        otp_code: resetOtp,
      });

      setResetOtpVerified(true);
      toast({
        title: "تم التحقق من الرمز",
        description: "يمكنك الآن تعيين كلمة مرور جديدة.",
      });
    } catch (error) {
      setResetOtpVerified(false);
      toast({
        title: "رمز غير صحيح",
        description: extractErrorMessage(error, "تعذر التحقق من الرمز المدخل."),
        variant: "destructive",
      });
    } finally {
      setIsVerifyingResetOtp(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (resetPasswordMismatch) {
      toast({
        title: "تأكيد كلمة المرور",
        description: "تأكد من تطابق كلمة المرور الجديدة مع التأكيد.",
        variant: "destructive",
      });
      return;
    }

    if (!resetOtpSession || !resetOtpVerified) {
      toast({
        title: "توثيق مطلوب",
        description: "تحقق من رمز واتساب قبل تحديث كلمة المرور.",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      await apiClient.post(endpoints.resetPassword, {
        username: resetData.username.trim(),
        phone: resetData.phone.trim(),
        new_password: resetData.newPassword,
        otp_session_id: resetOtpSession,
      });

      toast({
        title: "تم تحديث كلمة المرور",
        description: "يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.",
      });

      setActiveTab("login");
      setFormData((prev) => ({
        ...prev,
        username: resetData.username.trim(),
        password: "",
      }));

      setResetData({ username: "", phone: "", newPassword: "", confirmPassword: "" });
      setResetOtpSession(null);
      setResetOtp("");
      setResetOtpVerified(false);
      setResetOtpExpiry(null);
    } catch (error) {
      toast({
        title: "تعذر إعادة التعيين",
        description: extractErrorMessage(error, "حدث خطأ أثناء إعادة تعيين كلمة المرور."),
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light to-background px-4 py-8" dir="rtl" style={{ direction: 'rtl' }}>
      <div className="w-full max-w-4xl" style={{ direction: 'rtl' }}>
        <div className="bg-card rounded-xl shadow-lg p-8 border border-border" style={{ direction: 'rtl' }}>
          <div className="text-center mb-8 space-y-2">
            <h1 className="text-3xl font-bold text-primary">المحاسب الذكي</h1>
            <p className="text-muted-foreground">منظومة إدارة المخزون والفواتير</p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as AuthTab)}
            className="space-y-3 sm:space-y-6"
          >
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="register">تسجيل شركة</TabsTrigger>
              <TabsTrigger value="forgot">استعادة كلمة المرور</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div className="grid gap-4">
                  <Input
                    name="username"
                    type="text"
                    label="اسم المستخدم"
                    placeholder="أدخل اسم المستخدم"
                    value={formData.username}
                    onChange={handleLoginChange}
                    leftIcon={<UserIcon className="h-4 w-4" />}
                    required
                    autoComplete="username"
                  />

                  <Input
                    name="password"
                    type="password"
                    label="كلمة المرور"
                    placeholder="أدخل كلمة المرور"
                    value={formData.password}
                    onChange={handleLoginChange}
                    leftIcon={<LockClosedIcon className="h-4 w-4" />}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting || !formData.username || !formData.password}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      جاري تسجيل الدخول...
                    </span>
                  ) : (
                    "تسجيل الدخول"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  قم بإدخال بيانات شركتك ثم فعّل رقم الواتساب عبر رمز OTP لإكمال إنشاء الحساب.
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    name="companyName"
                    type="text"
                    label="اسم الشركة"
                    placeholder="مثال: شركة النجاح"
                    value={registerData.companyName}
                    onChange={handleRegisterChange}
                    leftIcon={<BuildingOffice2Icon className="h-4 w-4" />}
                    required
                  />
                  <Input
                    name="companyCode"
                    type="text"
                    label="رمز الشركة"
                    placeholder="رمز مميز للشركة"
                    value={registerData.companyCode}
                    onChange={handleRegisterChange}
                    leftIcon={<IdentificationIcon className="h-4 w-4" />}
                    required
                  />
                  <Input
                    name="companyPhone"
                    type="tel"
                    label="رقم واتساب الشركة"
                    placeholder="مثال: 9665XXXXXXXX"
                    value={registerData.companyPhone}
                    onChange={handleRegisterChange}
                    leftIcon={<PhoneIcon className="h-4 w-4" />}
                    required
                    className="md:col-span-2"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    name="adminUsername"
                    type="text"
                    label="اسم المستخدم للمدير"
                    placeholder="اختر اسم مستخدم للمدير"
                    value={registerData.adminUsername}
                    onChange={handleRegisterChange}
                    leftIcon={<UserIcon className="h-4 w-4" />}
                    required
                    autoComplete="new-username"
                  />
                  <Input
                    name="adminPassword"
                    type="password"
                    label="كلمة مرور المدير"
                    placeholder="كلمة مرور قوية"
                    value={registerData.adminPassword}
                    onChange={handleRegisterChange}
                    leftIcon={<LockClosedIcon className="h-4 w-4" />}
                    required
                    autoComplete="new-password"
                  />
                  <Input
                    name="adminPasswordConfirm"
                    type="password"
                    label="تأكيد كلمة المرور"
                    placeholder="أعد إدخال كلمة المرور"
                    value={registerData.adminPasswordConfirm}
                    onChange={handleRegisterChange}
                    leftIcon={<KeyIcon className="h-4 w-4" />}
                    required
                    error={registerPasswordMismatch ? "كلمات المرور غير متطابقة" : undefined}
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-right sm:text-start">
                      <p className="font-medium text-foreground">تأكيد رقم الواتساب</p>
                      <p className="text-sm text-muted-foreground">
                        سنرسل رمز تحقق مكون من 6 أرقام إلى رقم الواتساب لإكمال التفعيل.
                      </p>
                    </div>
                    {registerOtpVerified ? (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1.5 border-emerald-500/40 bg-emerald-50 text-emerald-600"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        الرقم موثق
                      </Badge>
                    ) : registerOtpSession ? (
                      <Badge
                        variant="outline"
                        className="border-amber-500/40 bg-amber-50 text-amber-600"
                      >
                        بانتظار التحقق
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={handleSendRegisterOtp}
                      disabled={!canSendRegisterOtp}
                    >
                      {isSendingRegisterOtp ? (
                        <span className="flex items-center gap-2">
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          جاري الإرسال...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <ChatBubbleLeftRightIcon className="h-4 w-4" />
                          إرسال الرمز عبر واتساب
                        </span>
                      )}
                    </Button>

                    {registerOtpSession && (
                      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                        <InputOTP
                          value={registerOtp}
                          onChange={setRegisterOtp}
                          maxLength={6}
                          containerClassName="justify-center sm:justify-start"
                        >
                          <InputOTPGroup>
                            {Array.from({ length: 6 }).map((_, index) => (
                              <InputOTPSlot key={index} index={index} className="h-10 w-10 text-lg" />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleVerifyRegisterOtp}
                          disabled={registerOtp.length !== 6 || isVerifyingRegisterOtp}
                        >
                          {isVerifyingRegisterOtp ? (
                            <span className="flex items-center gap-2">
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                              جاري التحقق...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <CheckCircleIcon className="h-4 w-4" />
                              تأكيد الرمز
                            </span>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {registerOtpSession && !registerOtpVerified && (
                    <p className="text-xs text-muted-foreground">
                      أدخل الرمز خلال {registerOtpExpiry ? Math.ceil(registerOtpExpiry / 60) : 5} دقائق لضمان نجاح التحقق.
                    </p>
                  )}
                </div>

                {/* Terms Acceptance Checkbox */}
                <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg border border-border">
                  <Checkbox
                    id="accept-terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  />
                  <label
                    htmlFor="accept-terms"
                    className="text-sm text-muted-foreground cursor-pointer flex-1 leading-relaxed"
                  >
                    أوافق على{' '}
                    <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">
                      شروط الاستخدام
                    </Link>
                  </label>
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  disabled={disableRegisterSubmit}
                >
                  {isRegisterSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      جاري إنشاء الحساب...
                    </span>
                  ) : (
                    "إتمام التسجيل"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="forgot">
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  أدخل اسم المستخدم ورقم الواتساب المرتبط بالحساب، ثم أعد ضبط كلمة المرور باستخدام رمز OTP.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    name="username"
                    type="text"
                    label="اسم المستخدم"
                    placeholder="اسم المستخدم الحالي"
                    value={resetData.username}
                    onChange={handleResetChange}
                    leftIcon={<UserIcon className="h-4 w-4" />}
                    required
                    autoComplete="username"
                  />
                  <Input
                    name="phone"
                    type="tel"
                    label="رقم واتساب الحساب"
                    placeholder="مثال: 9665XXXXXXXX"
                    value={resetData.phone}
                    onChange={handleResetChange}
                    leftIcon={<PhoneIcon className="h-4 w-4" />}
                    required
                  />
                  <Input
                    name="newPassword"
                    type="password"
                    label="كلمة المرور الجديدة"
                    placeholder="كلمة مرور قوية"
                    value={resetData.newPassword}
                    onChange={handleResetChange}
                    leftIcon={<LockClosedIcon className="h-4 w-4" />}
                    required
                    autoComplete="new-password"
                  />
                  <Input
                    name="confirmPassword"
                    type="password"
                    label="تأكيد كلمة المرور"
                    placeholder="أعد إدخال كلمة المرور"
                    value={resetData.confirmPassword}
                    onChange={handleResetChange}
                    leftIcon={<KeyIcon className="h-4 w-4" />}
                    required
                    error={resetPasswordMismatch ? "كلمات المرور غير متطابقة" : undefined}
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-3 rounded-lg border border-dashed border-secondary/30 bg-secondary/10 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-right sm:text-start">
                      <p className="font-medium text-foreground">التحقق عبر واتساب</p>
                      <p className="text-sm text-muted-foreground">
                        نرسل رمز تحقق إلى رقم الواتساب المرتبط لضمان ملكية الحساب.
                      </p>
                    </div>
                    {resetOtpVerified ? (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1.5 border-emerald-500/40 bg-emerald-50 text-emerald-600"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        الرقم موثق
                      </Badge>
                    ) : resetOtpSession ? (
                      <Badge
                        variant="outline"
                        className="border-amber-500/40 bg-amber-50 text-amber-600"
                      >
                        بانتظار التحقق
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={handleSendResetOtp}
                      disabled={!canSendResetOtp}
                    >
                      {isSendingResetOtp ? (
                        <span className="flex items-center gap-2">
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          جاري الإرسال...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <ChatBubbleLeftRightIcon className="h-4 w-4" />
                          إرسال الرمز عبر واتساب
                        </span>
                      )}
                    </Button>

                    {resetOtpSession && (
                      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                        <InputOTP
                          value={resetOtp}
                          onChange={setResetOtp}
                          maxLength={6}
                          containerClassName="justify-center sm:justify-start"
                        >
                          <InputOTPGroup>
                            {Array.from({ length: 6 }).map((_, index) => (
                              <InputOTPSlot key={index} index={index} className="h-10 w-10 text-lg" />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleVerifyResetOtp}
                          disabled={resetOtp.length !== 6 || isVerifyingResetOtp}
                        >
                          {isVerifyingResetOtp ? (
                            <span className="flex items-center gap-2">
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                              جاري التحقق...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <CheckCircleIcon className="h-4 w-4" />
                              تأكيد الرمز
                            </span>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {resetOtpSession && !resetOtpVerified && (
                    <p className="text-xs text-muted-foreground">
                      أدخل الرمز خلال {resetOtpExpiry ? Math.ceil(resetOtpExpiry / 60) : 5} دقائق لضمان نجاح التحقق.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  disabled={disableResetSubmit}
                >
                  {isResettingPassword ? (
                    <span className="flex items-center justify-center gap-2">
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      جاري تحديث كلمة المرور...
                    </span>
                  ) : (
                    "تحديث كلمة المرور"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-6 space-y-4">
          {/* Android App Download Button */}
          {apkDownloadUrl && (
            <div className="flex justify-center">
              <a
                href={apkDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:from-green-600 hover:to-green-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 0 0-.83.22l-1.88 3.24a11.43 11.43 0 0 0-8.94 0L5.65 5.67a.643.643 0 0 0-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.81 10.81 0 0 0 1 18h22a10.81 10.81 0 0 0-5.4-8.52M7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5m10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5"/>
                </svg>
                <span className="font-semibold">تحميل تطبيق أندرويد</span>
                <ArrowDownTrayIcon className="h-5 w-5" />
              </a>
            </div>
          )}
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground" style={{ direction: 'ltr' }}>© 2025 - 2024 المحاسب الذكي جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
