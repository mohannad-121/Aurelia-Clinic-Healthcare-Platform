-- OPTIONAL SYNTHETIC PUBLIC CONTENT ONLY. Never run this on a real clinic's production project.
-- Accounts, appointments and CRM examples are created separately by the explicit seed:demo script.
begin;
insert into public.specialties(id,name,name_ar) values
 ('10000000-0000-4000-8000-000000000001','Primary Care','الرعاية الأولية'),
 ('10000000-0000-4000-8000-000000000002','Heart Health','صحة القلب'),
 ('10000000-0000-4000-8000-000000000003','Skin Health','صحة الجلد')
on conflict(id) do nothing;
insert into public.services(id,name,name_ar,slug,description,description_ar,specialty,duration_minutes,price,icon,published,is_demo) values
 ('20000000-0000-4000-8000-000000000001','General Medicine','الطب العام','general-medicine','Illustrative general consultation service. Replace with approved clinic information.','خدمة استشارة عامة توضيحية.','Primary Care',30,35,'Stethoscope',true,true),
 ('20000000-0000-4000-8000-000000000002','Cardiology','أمراض القلب','cardiology','Illustrative specialist service. These prices and descriptions are synthetic.','خدمة متخصصة توضيحية وأسعار تجريبية.','Heart Health',45,60,'Heart',true,true),
 ('20000000-0000-4000-8000-000000000003','Dermatology','الأمراض الجلدية','dermatology','Illustrative skin consultation service. Not a verified service offering.','خدمة استشارة جلدية توضيحية.','Skin Health',30,45,'Sparkles',true,true),
 ('20000000-0000-4000-8000-000000000004','Pediatrics','طب الأطفال','pediatrics','Illustrative children and family appointment category.','فئة مواعيد الأطفال والأسرة التوضيحية.','Children''s Health',30,40,'Baby',true,true),
 ('20000000-0000-4000-8000-000000000005','Orthopedics','طب العظام','orthopedics','Illustrative mobility and musculoskeletal consultation.','استشارة توضيحية للحركة والعظام.','Movement & Mobility',45,55,'Activity',true,true),
 ('20000000-0000-4000-8000-000000000006','Preventive Health','الصحة الوقائية','preventive-health','Illustrative preventive appointment category.','فئة المواعيد الوقائية التوضيحية.','Wellness',45,50,'ShieldCheck',true,true)
on conflict(id) do nothing;
insert into public.doctors(id,name,name_ar,specialty,biography,biography_ar,languages,published,is_demo) values
 ('30000000-0000-4000-8000-000000000001','Dr. Lina Haddad','د. لينا حداد','General Medicine','Fictional demonstration specialist. Not a verified practicing clinician.','طبيب توضيحي غير معتمد لأغراض العرض.','English, Arabic',true,true),
 ('30000000-0000-4000-8000-000000000002','Dr. Omar Khalil','د. عمر خليل','Cardiology','Fictional demonstration specialist. Not a verified practicing clinician.','طبيب توضيحي غير معتمد لأغراض العرض.','English, Arabic',true,true),
 ('30000000-0000-4000-8000-000000000003','Dr. Sarah Mansour','د. سارة منصور','Dermatology','Fictional demonstration specialist. Not a verified practicing clinician.','طبيب توضيحي غير معتمد لأغراض العرض.','English, Arabic',true,true)
on conflict(id) do nothing;
insert into public.doctor_services(doctor_id,service_id) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000006'),
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002'),
 ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003')
on conflict do nothing;
insert into public.working_schedules(doctor_id,weekday,start_time,end_time,break_start,break_end)
select d.id,w.weekday,'09:00'::time,'18:00'::time,'13:00'::time,'14:00'::time
from public.doctors d cross join generate_series(0,4) w(weekday) where d.is_demo
on conflict(doctor_id,weekday) do nothing;
insert into public.faqs(id,question,answer,question_ar,answer_ar,published,approved) values
 ('40000000-0000-4000-8000-000000000001','How do I book?','Choose your service, doctor, date and actual available slot. Sign in and review your details before confirming.','كيف أحجز؟','اختر الخدمة والطبيب والتاريخ والوقت المتاح. سجل الدخول وراجع التفاصيل قبل التأكيد.',true,true),
 ('40000000-0000-4000-8000-000000000002','Can I cancel or reschedule?','Manage your visit in your patient portal within the configured change window. Contact reception for late changes.','هل أستطيع تعديل الموعد؟','يمكنك إدارة الموعد عبر بوابة المريض ضمن المدة المحددة. تواصل مع الاستقبال للتغييرات المتأخرة.',true,true),
 ('40000000-0000-4000-8000-000000000003','Does the assistant give medical advice?','No. The assistant provides administrative information and booking guidance only. It cannot diagnose, recommend medication or interpret tests.','هل يقدم المساعد نصائح طبية؟','لا. يقدم المساعد معلومات إدارية وإرشادات الحجز فقط، ولا يقدم تشخيصاً أو دواءً أو تفسيراً للتحاليل.',true,true)
on conflict(id) do nothing;
insert into public.blog_posts(id,title,title_ar,slug,body,body_ar,excerpt,published) values
 ('50000000-0000-4000-8000-000000000001','Illustrative guide: your first visit','دليل توضيحي: زيارتك الأولى','your-first-visit','Bring your identification and a list of questions for your healthcare professional. Arrive early for administrative check-in. This synthetic article is not medical advice.','أحضر الهوية والأسئلة التي ترغب بمناقشتها مع الطبيب. هذا مقال توضيحي وليس نصيحة طبية.','Administrative preparation for a comfortable clinic experience.',true)
on conflict(id) do nothing;
commit;
