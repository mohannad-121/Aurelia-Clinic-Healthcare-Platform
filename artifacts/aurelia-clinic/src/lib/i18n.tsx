import { useGetClinic } from '@workspace/api-client-react';
import { DEFAULT_TZ, validTz, ymdInTz, zonedToIso, isoToZoned } from '@/lib/tz';
import { AR } from '@/lib/ar-dict';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'en' | 'ar';

const D: Record<string, [string, string]> = {
  'nav.home': ['Home', 'الرئيسية'],
  'nav.about': ['About', 'عن العيادة'],
  'nav.services': ['Services', 'الخدمات'],
  'nav.doctors': ['Doctors', 'الأطباء'],
  'nav.articles': ['Journal', 'المقالات'],
  'nav.contact': ['Contact', 'تواصل معنا'],
  'nav.faq': ['FAQ', 'الأسئلة الشائعة'],
  'nav.book': ['Book appointment', 'احجز موعدًا'],
  'nav.portal': ['Patient portal', 'بوابة المريض'],
  'nav.login': ['Sign in', 'تسجيل الدخول'],
  'nav.logout': ['Sign out', 'تسجيل الخروج'],
  'nav.dashboard': ['Dashboard', 'لوحة التحكم'],
  'hero.title1': ['Care designed', 'رعاية صُمّمت'],
  'hero.title2': ['around you.', 'من أجلك.'],
  'hero.sub': ['Experience modern healthcare where compassionate professionals, intelligent technology, and exceptional service come together.', 'اختبر رعاية صحية حديثة يجتمع فيها المهنيون المتعاطفون والتقنية الذكية والخدمة الاستثنائية.'],
  'hero.explore': ['Explore our services', 'استكشف خدماتنا'],
  'demo.label': ['Illustrative demo content', 'محتوى توضيحي تجريبي'],
  'demo.banner': ['This is an illustrative demo clinic. Services, doctors and reviews shown are sample content, and online booking is not yet connected to a live database.', 'هذه عيادة توضيحية تجريبية. الخدمات والأطباء والتقييمات المعروضة محتوى نموذجي، والحجز الإلكتروني غير متصل بعد بقاعدة بيانات فعلية.'],
  'sec.specialties': ['Our specialties', 'تخصصاتنا'],
  'sec.why': ['Why Aurelia', 'لماذا أوريليا'],
  'sec.specialists': ['Meet our specialists', 'تعرّف على أخصائيينا'],
  'sec.visit': ['How your visit works', 'كيف تتم زيارتك'],
  'sec.digital': ['Digital patient experience', 'تجربة المريض الرقمية'],
  'sec.clinic': ['The clinic experience', 'تجربة العيادة'],
  'sec.testimonials': ['Patient voices', 'أصوات المرضى'],
  'sec.faq': ['Frequently asked questions', 'الأسئلة الشائعة'],
  'sec.cta': ['Your next visit starts here.', 'زيارتك القادمة تبدأ هنا.'],
  'common.viewAll': ['View all', 'عرض الكل'],
  'common.learn': ['Learn more', 'اعرف المزيد'],
  'common.book': ['Book', 'احجز'],
  'common.min': ['min', 'دقيقة'],
  'common.back': ['Back', 'رجوع'],
  'common.next': ['Continue', 'متابعة'],
  'common.save': ['Save', 'حفظ'],
  'common.cancel': ['Cancel', 'إلغاء'],
  'common.loading': ['Loading', 'جارٍ التحميل'],
  'common.retry': ['Try again', 'أعد المحاولة'],
  'common.error': ['Something went wrong.', 'حدث خطأ ما.'],
  'common.search': ['Search', 'بحث'],
  'common.none': ['Nothing here yet.', 'لا يوجد شيء بعد.'],
  'common.readMore': ['Read article', 'اقرأ المقال'],
  'common.specialty': ['Specialty', 'التخصص'],
  'common.languages': ['Languages', 'اللغات'],
  'form.name': ['Full name', 'الاسم الكامل'],
  'form.email': ['Email', 'البريد الإلكتروني'],
  'form.phone': ['Phone', 'الهاتف'],
  'form.password': ['Password', 'كلمة المرور'],
  'form.message': ['Message', 'الرسالة'],
  'form.notes': ['Notes (optional)', 'ملاحظات (اختياري)'],
  'form.consent': ['I consent to Aurelia storing these details to contact me about my request, as described in the privacy policy.', 'أوافق على أن تحتفظ أوريليا بهذه البيانات للتواصل معي بشأن طلبي كما هو موضح في سياسة الخصوصية.'],
  'form.send': ['Send message', 'إرسال الرسالة'],
  'form.sent': ['Message received. Reception will reply using your details.', 'تم استلام رسالتك. ستتواصل معك الاستقبال.'],
  'auth.login': ['Welcome back', 'مرحبًا بعودتك'],
  'auth.register': ['Create your patient account', 'أنشئ حساب المريض'],
  'auth.forgot': ['Reset your password', 'إعادة تعيين كلمة المرور'],
  'auth.noAccount': ['No account yet?', 'ليس لديك حساب؟'],
  'auth.haveAccount': ['Already registered?', 'لديك حساب؟'],
  'auth.forgotLink': ['Forgot password?', 'نسيت كلمة المرور؟'],
  'auth.sendLink': ['Send reset link', 'أرسل رابط الاستعادة'],
  'auth.setup': ['Sign-in is unavailable until the clinic connects its secure database. Public pages remain fully browsable.', 'تسجيل الدخول غير متاح حتى تربط العيادة قاعدة بياناتها الآمنة. صفحات الموقع العامة متاحة بالكامل.'],
  'book.title': ['Book your appointment', 'احجز موعدك'],
  'book.s1': ['Service', 'الخدمة'],
  'book.s2': ['Doctor', 'الطبيب'],
  'book.s3': ['Date and time', 'التاريخ والوقت'],
  'book.s4': ['Details', 'التفاصيل'],
  'book.s5': ['Review', 'المراجعة'],
  'book.anyDoctor': ['First available doctor', 'أول طبيب متاح'],
  'book.noSlots': ['No open times for this day.', 'لا توجد مواعيد متاحة في هذا اليوم.'],
  'book.waitlist': ['Join the waitlist for this day', 'انضم إلى قائمة الانتظار لهذا اليوم'],
  'book.confirm': ['Confirm appointment', 'تأكيد الموعد'],
  'book.needLogin': ['Sign in or create an account to confirm. We never show a confirmation until it is saved.', 'سجّل الدخول أو أنشئ حسابًا للتأكيد. لن نعرض تأكيدًا قبل حفظ الموعد فعليًا.'],
  'book.done': ['Appointment saved', 'تم حفظ الموعد'],
  'book.ref': ['Reference', 'المرجع'],
  'book.fee': ['Fee', 'الرسوم'],
  'book.tz': ['Times shown in clinic time zone', 'الأوقات بتوقيت العيادة'],
  'book.pick': ['Choose a time', 'اختر وقتًا'],
  'book.reschedule': ['Reschedule', 'إعادة الجدولة'],
  'book.consentLabel': ['Consent', 'الموافقة'],
  'auth.newPw': ['New password (12+ characters)', 'كلمة المرور الجديدة (12 حرفًا فأكثر)'],
  'auth.confirmPw': ['Confirm password', 'تأكيد كلمة المرور'],
  'auth.setPw': ['Save password', 'حفظ كلمة المرور'],
  'auth.verifying': ['Verifying your secure link', 'جارٍ التحقق من الرابط الآمن'],
  'dash.overview': ['Overview', 'نظرة عامة'], 'dash.appointments': ['Appointments', 'المواعيد'], 'dash.patients': ['Patients', 'المرضى'], 'dash.leads': ['Leads', 'الاستفسارات'],
  'dash.tasks': ['Tasks', 'المهام'], 'dash.doctors': ['Doctors', 'الأطباء'], 'dash.services': ['Services', 'الخدمات'], 'dash.schedules': ['Schedules', 'الجداول'],
  'dash.exceptions': ['Exceptions', 'الاستثناءات'], 'dash.staff': ['Staff', 'الموظفون'], 'dash.branches': ['Branches', 'الفروع'], 'dash.tags': ['Tags', 'الوسوم'],
  'dash.waitlist': ['Waitlist', 'قائمة الانتظار'], 'dash.notifications': ['Delivery log', 'سجل الإشعارات'], 'dash.analytics': ['Analytics', 'التحليلات'],
  'dash.content': ['Website CMS', 'محتوى الموقع'], 'dash.faqs': ['Knowledge', 'قاعدة المعرفة'], 'dash.posts': ['Articles', 'المقالات'],
  'dash.testimonials': ['Testimonials', 'الشهادات'], 'dash.settings': ['Settings', 'الإعدادات'], 'dash.audit': ['Audit log', 'سجل التدقيق'],
  'emergency': ['For emergencies call 911 or go to the nearest emergency department. This website does not provide medical advice.', 'في الحالات الطارئة اتصل بالرقم 911 أو توجّه لأقرب قسم طوارئ. لا يقدم هذا الموقع نصائح طبية.'],
  'portal.title': ['Your care, at a glance', 'رعايتك في لمحة'],
  'portal.upcoming': ['Upcoming', 'القادمة'],
  'portal.past': ['Previous', 'السابقة'],
  'portal.profile': ['Profile', 'الملف الشخصي'],
  'portal.prefs': ['Communication preferences', 'تفضيلات التواصل'],
  'portal.cancel': ['Cancel appointment', 'إلغاء الموعد'],
  'chat.title': ['Clinic assistant', 'مساعد العيادة'],
  'chat.mode': ['Limited FAQ mode. Not a medical professional.', 'وضع الأسئلة الشائعة المحدود. ليس مختصًا طبيًا.'],
  'chat.ph': ['Ask about hours, services, booking', 'اسأل عن المواعيد أو الخدمات أو الحجز'],
  'footer.rights': ['All rights reserved.', 'جميع الحقوق محفوظة.'],
  'footer.privacy': ['Privacy', 'الخصوصية'],
  'footer.terms': ['Terms', 'الشروط'],
};

interface Ctx { locale: Locale; setLocale: (l: Locale) => void; t: (k: string) => string; dir: 'ltr' | 'rtl' }
const LocaleCtx = createContext<Ctx>({ locale: 'en', setLocale: () => {}, t: (k) => k, dir: 'ltr' });

let curLocale: Locale = 'en';
export function tr(en: string): string {
  return curLocale === 'ar' ? (AR[en] ?? en) : en;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => new URLSearchParams(window.location.search).get('lang') === 'ar' ? 'ar' : 'en');
  curLocale = locale;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);
  const value = useMemo<Ctx>(() => ({ locale, setLocale, dir, t: (k) => D[k]?.[locale === 'ar' ? 1 : 0] ?? k }), [locale, dir]);
  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}
export const useLocale = () => useContext(LocaleCtx);

/** Pick Arabic field when locale is ar and the value exists */
export function useLoc() {
  const { locale } = useLocale();
  return <T extends object>(item: T | undefined, key: string): string => {
    if (!item) return '';
    const r = item as Record<string, unknown>;
    const ar = r[`${key}_ar`];
    if (locale === 'ar' && typeof ar === 'string' && ar) return ar;
    const v = r[key];
    return typeof v === 'string' ? v : '';
  };
}

export const TZ = DEFAULT_TZ;
export function useFmt() {
  const { locale } = useLocale();
  const { data } = useGetClinic();
  const tz = validTz(data?.settings.timezone);
  const cur = /^[A-Z]{3}$/.test(data?.settings.currency ?? '') ? (data?.settings.currency as string) : 'JOD';
  const l = locale === 'ar' ? 'ar-JO' : 'en-JO';
  return {
    tz,
    currency: cur,
    money: (n: number) => new Intl.NumberFormat(l, { style: 'currency', currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n),
    date: (iso: string) => new Intl.DateTimeFormat(l, { dateStyle: 'medium', timeZone: tz }).format(new Date(iso)),
    time: (iso: string) => new Intl.DateTimeFormat(l, { timeStyle: 'short', timeZone: tz }).format(new Date(iso)),
    dateTime: (iso: string) => new Intl.DateTimeFormat(l, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz }).format(new Date(iso)),
    weekday: (iso: string) => new Intl.DateTimeFormat(l, { weekday: 'short', timeZone: tz }).format(new Date(iso)),
    num: (n: number) => new Intl.NumberFormat(l).format(n),
    ymd: (d: Date | string) => ymdInTz(d, tz),
    toIso: (local: string) => zonedToIso(local, tz),
    toLocal: (iso: unknown) => isoToZoned(iso, tz),
  };
}

export function errMsg(e: unknown): string {
  if (e && typeof e === 'object') {
    const o = e as { data?: { message?: string; error?: string }; message?: string; status?: number };
    return tr(o.data?.message ?? o.data?.error ?? (o.status === 503 ? 'The clinic database is not connected yet, so changes cannot be saved.' : o.message ?? 'Something went wrong.'));
  }
  return tr('Something went wrong.');
}
