import { client, configured, dbError } from "./supabase";
import { GetClinicResponse } from "@workspace/api-zod";

// Read-only illustrative website content. Never used to simulate persisted records or appointments.
export const illustration = {
  configured: false, mode: "setup",
  settings: {
    id: "demo-clinic", name: "Aurelia Clinic", headline: "Care Designed Around You.",
    description: "Experience modern healthcare where compassionate professionals, intelligent technology, and exceptional service come together.",
    timezone: "Asia/Amman", currency: "JOD", email: "", phone: "", address: "Amman, Jordan",
    hours: "Sunday–Thursday, 09:00–18:00 (illustrative)", logo_url: "", cancellation_hours: 24, approval_required: true,
  },
  services: [
    { id: "demo-general", name: "General Medicine", name_ar: "الطب العام", slug: "general-medicine", specialty: "Primary Care", description: "Personalized consultations and everyday care, designed around your needs.", description_ar: "استشارات شخصية ورعاية يومية مصممة لتلبية احتياجاتك.", duration_minutes: 30, price: 35, icon: "Stethoscope", published: true, is_demo: true },
    { id: "demo-cardiology", name: "Cardiology", name_ar: "أمراض القلب", slug: "cardiology", specialty: "Heart Health", description: "Specialist consultations focused on your cardiovascular wellbeing.", description_ar: "استشارات متخصصة للعناية بصحة القلب.", duration_minutes: 45, price: 60, icon: "Heart", published: true, is_demo: true },
    { id: "demo-dermatology", name: "Dermatology", name_ar: "الأمراض الجلدية", slug: "dermatology", specialty: "Skin Health", description: "Thoughtful, individualized skin care in a comfortable environment.", description_ar: "رعاية فردية لصحة الجلد في بيئة مريحة.", duration_minutes: 30, price: 45, icon: "Sparkles", published: true, is_demo: true },
    { id: "demo-pediatrics", name: "Pediatrics", name_ar: "طب الأطفال", slug: "pediatrics", specialty: "Children's Health", description: "A welcoming space for children and families at every stage.", description_ar: "بيئة مريحة للأطفال وعائلاتهم في كل مرحلة.", duration_minutes: 30, price: 40, icon: "Baby", published: true, is_demo: true },
    { id: "demo-orthopedics", name: "Orthopedics", name_ar: "طب العظام", slug: "orthopedics", specialty: "Movement & Mobility", description: "Specialist appointments for musculoskeletal health and mobility.", description_ar: "استشارات متخصصة لصحة العظام والحركة.", duration_minutes: 45, price: 55, icon: "Activity", published: true, is_demo: true },
    { id: "demo-wellness", name: "Preventive Health", name_ar: "الصحة الوقائية", slug: "preventive-health", specialty: "Wellness", description: "Plan a preventive consultation with a qualified healthcare professional.", description_ar: "خطط لاستشارة وقائية مع متخصص في الرعاية الصحية.", duration_minutes: 45, price: 50, icon: "ShieldCheck", published: true, is_demo: true },
  ],
  doctors: [
    { id: "demo-doctor-1", name: "Dr. Lina Haddad", name_ar: "د. لينا حداد", specialty: "General Medicine", biography: "Illustrative specialist profile for development. Not a verified practicing clinician.", biography_ar: "ملف توضيحي لأغراض التطوير وليس لطبيب معتمد.", image_url: "", languages: "English, Arabic", service_ids: ["demo-general", "demo-wellness"], published: true, is_demo: true },
    { id: "demo-doctor-2", name: "Dr. Omar Khalil", name_ar: "د. عمر خليل", specialty: "Cardiology", biography: "Illustrative specialist profile for development. Not a verified practicing clinician.", biography_ar: "ملف توضيحي لأغراض التطوير وليس لطبيب معتمد.", image_url: "", languages: "English, Arabic", service_ids: ["demo-cardiology"], published: true, is_demo: true },
    { id: "demo-doctor-3", name: "Dr. Sarah Mansour", name_ar: "د. سارة منصور", specialty: "Dermatology", biography: "Illustrative specialist profile for development. Not a verified practicing clinician.", biography_ar: "ملف توضيحي لأغراض التطوير وليس لطبيب معتمد.", image_url: "", languages: "English, Arabic", service_ids: ["demo-dermatology"], published: true, is_demo: true },
  ],
  faqs: [
    { id: "demo-faq-1", question: "How do I book an appointment?", answer: "Choose a service, specialist, date, and available time in the booking flow. Sign in before confirming. Online booking becomes available once the clinic's Supabase connection and schedules are configured.", question_ar: "كيف أحجز موعداً؟", answer_ar: "اختر الخدمة والطبيب والتاريخ والوقت المتاح، ثم سجل الدخول للتأكيد. يتاح الحجز بعد إعداد اتصال العيادة وجداول العمل.", published: true },
    { id: "demo-faq-2", question: "Can I change or cancel my appointment?", answer: "Use your patient portal within the clinic's configured change window. The illustrative policy is 24 hours before the visit. Contact reception when the window has closed.", question_ar: "هل يمكنني تغيير أو إلغاء موعدي؟", answer_ar: "يمكنك إدارة الموعد عبر بوابة المريض ضمن المدة المحددة. السياسة التوضيحية هي 24 ساعة قبل الزيارة.", published: true },
    { id: "demo-faq-3", question: "Where is Aurelia Clinic located?", answer: "The demonstration clinic is based in Amman, Jordan. The clinic must publish its verified address and contact information before going live.", question_ar: "أين تقع عيادة أوريليا؟", answer_ar: "العيادة التوضيحية في عمّان، الأردن. يجب نشر العنوان وبيانات الاتصال المعتمدة قبل الإطلاق.", published: true },
    { id: "demo-faq-4", question: "What can the clinic assistant help with?", answer: "Clinic information, published services, and booking guidance only. It does not provide medical advice, diagnoses, medications, or emergency triage.", question_ar: "بماذا يساعدني مساعد العيادة؟", answer_ar: "معلومات العيادة والخدمات وإرشادات الحجز فقط. لا يقدم تشخيصاً أو نصائح علاجية أو أدوية.", published: true },
  ],
  posts: [
    { id: "demo-article-1", title: "Making the most of your first visit", title_ar: "الاستعداد لزيارتك الأولى", slug: "your-first-visit", body: "Bring your identification and a list of questions you would like to discuss with your healthcare professional. Arrive a little early to complete administrative check-in. This illustrative article is administrative guidance, not medical advice.", body_ar: "أحضر بطاقة الهوية وقائمة الأسئلة التي ترغب بمناقشتها مع الطبيب. احضر مبكراً لإتمام التسجيل الإداري. هذا المقال توضيحي وليس نصيحة طبية.", excerpt: "A little preparation for a more comfortable clinic experience.", image_url: "", published: true },
    { id: "demo-article-2", title: "Your care, connected", title_ar: "رعايتك، متصلة", slug: "your-care-connected", body: "Your patient portal keeps appointment details in one place. Manage your contact preferences and upcoming visits without calling reception during opening hours. Portal features require the clinic to complete Supabase configuration.", body_ar: "تجمع بوابة المريض تفاصيل مواعيدك في مكان واحد وتتيح إدارة بيانات الاتصال والزيارات القادمة.", excerpt: "A simpler way to manage your appointments and preferences.", image_url: "", published: true },
  ], content: [], testimonials: [],
};
export async function clinicSnapshot() {
  if (!configured()) return GetClinicResponse.parse(illustration);
  const c = client();
  const [settings, services, doctors, relations, faqs, posts, content, testimonials] = await Promise.all([
    c.from("clinic_settings").select("*").limit(1).single(),
    c.from("services").select("*").eq("published", true).order("name"),
    c.from("doctors").select("*").eq("published", true).order("name"),
    c.from("doctor_services").select("*"),
    c.from("faqs").select("*").eq("published", true).eq("approved", true).order("created_at"),
    c.from("blog_posts").select("*").eq("published", true).order("created_at", { ascending: false }),
    c.from("website_content").select("*").eq("published", true),
    c.from("testimonials").select("*").eq("published", true).eq("approved", true),
  ]);
  for (const q of [settings, services, doctors, relations, faqs, posts, content, testimonials]) dbError(q.error);
  return GetClinicResponse.parse({
    configured: true, mode: "live", settings: settings.data, services: services.data,
    doctors: doctors.data?.map(d => ({ ...d, service_ids: relations.data?.filter(r => r.doctor_id === d.id).map(r => r.service_id) || [] })),
    faqs: faqs.data, posts: posts.data, content: content.data,
    testimonials: testimonials.data?.map(t => ({ id: t.id, data: t })),
  });
}
