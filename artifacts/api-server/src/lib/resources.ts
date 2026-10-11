import { z } from "zod";
import { HttpError, adminRoles, receptionRoles } from "./supabase";

const text = z.string().max(4000);
const short = z.string().min(1).max(180);
const optionalId = z.union([z.string().uuid(), z.literal(""), z.null()]).transform(v => v || null);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timestamp = z.union([z.string().datetime({ offset: true }), z.literal(""), z.null()]).transform(v => v || null);
const url = z.union([z.string().url().refine(v => /^https:\/\//.test(v), "Use an HTTPS URL"), z.literal("")]);
const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);
const optionalTime = z.union([time, z.literal(""), z.null()]).transform(v => v || null);
const nameTranslations = { name: short, name_ar: text };
const contentFields = { title: short, title_ar: text, slug: z.string().regex(/^[a-z0-9-]+$/), body: text, body_ar: text, excerpt: text, image_url: url, published: z.boolean() };
const patientFields = {
  name: short, phone: z.string().min(7).max(30),
  communication_preference: z.enum(["email", "phone", "none"]), consent: z.boolean(),
  assigned_to: optionalId, status: z.enum(["active", "inactive"]),
  tag_ids: z.array(z.string().uuid()).max(100),
};
export const resources = {
  patients: { table: "profiles", roles: receptionRoles, schema: z.object(patientFields), required: ["name", "email"] },
  staff: { table: "profiles", roles: adminRoles, schema: z.object({ ...patientFields, role: z.enum(["super_admin", "clinic_admin", "receptionist", "doctor", "patient"]) }), required: ["name", "email", "role"] },
  leads: { table: "crm_leads", roles: receptionRoles, schema: z.object({ name: short, email: z.string().email(), phone: text, message: text, status: z.enum(["new_inquiry", "contacted", "interested", "appointment_requested", "appointment_booked", "converted", "closed"]), assigned_to: optionalId, consent: z.boolean(), is_demo: z.boolean() }), required: ["name", "email"] },
  tasks: { table: "crm_tasks", roles: receptionRoles, schema: z.object({ title: short, description: text, assigned_to: optionalId, due_at: timestamp, status: z.enum(["open", "completed"]), lead_id: optionalId, patient_id: optionalId }), required: ["title"] },
  doctors: { table: "doctors", roles: adminRoles, schema: z.object({ ...nameTranslations, specialty: short, biography: text, biography_ar: text, image_url: url, languages: text, profile_id: optionalId, service_ids: z.array(z.string().uuid()).max(100), published: z.boolean(), is_demo: z.boolean() }), required: ["name", "specialty"] },
  services: { table: "services", roles: adminRoles, schema: z.object({ ...nameTranslations, slug: z.string().regex(/^[a-z0-9-]+$/), description: text, description_ar: text, specialty: short, duration_minutes: z.coerce.number().int().min(5).max(240), price: z.coerce.number().min(0).max(100000), icon: text, published: z.boolean(), is_demo: z.boolean() }), required: ["name", "slug", "specialty"] },
  schedules: { table: "working_schedules", roles: adminRoles, schema: z.object({ doctor_id: z.string().uuid(), weekday: z.coerce.number().int().min(0).max(6), start_time: time, end_time: time, break_start: optionalTime, break_end: optionalTime }), required: ["doctor_id", "weekday", "start_time", "end_time"] },
  exceptions: { table: "schedule_exceptions", roles: [...receptionRoles, "doctor"], schema: z.object({ doctor_id: optionalId, date, starts_at: timestamp, ends_at: timestamp, reason: text }), required: ["date"] },
  content: { table: "website_content", roles: adminRoles, schema: z.object({ ...contentFields, seo_title: text, seo_description: text }), required: ["title", "slug"] },
  posts: { table: "blog_posts", roles: adminRoles, schema: z.object(contentFields), required: ["title", "slug", "body"] },
  faqs: { table: "faqs", roles: adminRoles, schema: z.object({ question: short, answer: text, question_ar: text, answer_ar: text, published: z.boolean(), approved: z.boolean() }), required: ["question", "answer"] },
  testimonials: { table: "testimonials", roles: adminRoles, schema: z.object({ name: short, quote: text, approved: z.boolean(), published: z.boolean(), is_demo: z.boolean() }), required: ["name", "quote"] },
  settings: { table: "clinic_settings", roles: adminRoles, schema: z.object({ name: short, headline: short, description: text, timezone: z.string().refine(v => { try { new Intl.DateTimeFormat("en", { timeZone: v }); return true; } catch { return false; } }), currency: z.string().regex(/^[A-Z]{3}$/), email: z.union([z.string().email(), z.literal("")]), phone: text, address: text, hours: text, logo_url: url, cancellation_hours: z.coerce.number().int().min(0).max(720), approval_required: z.boolean() }), required: ["name"] },
  audit: { table: "audit_logs", roles: adminRoles, schema: z.object({}), required: [] },
  notes: { table: "crm_notes", roles: receptionRoles, schema: z.object({ body: text, patient_id: optionalId, lead_id: optionalId }), required: ["body"] },
  interactions: { table: "crm_interactions", roles: receptionRoles, schema: z.object({ body: text, channel: z.enum(["internal", "phone", "email", "sms", "in_person"]), patient_id: optionalId, lead_id: optionalId }), required: ["body"] },
  tags: { table: "crm_tags", roles: receptionRoles, schema: z.object({ name: short, color: z.string().regex(/^#[0-9a-f]{6}$/i) }), required: ["name"] },
  branches: { table: "branches", roles: adminRoles, schema: z.object({ name: short, address: text, phone: text, published: z.boolean() }), required: ["name"] },
  waitlist: { table: "waitlist", roles: receptionRoles, schema: z.object({ status: z.enum(["waiting", "contacted", "booked", "closed"]) }), required: [] },
  notifications: { table: "notification_delivery_logs", roles: receptionRoles, schema: z.object({}), required: [] },
  templates: { table: "notification_templates", roles: adminRoles, schema: z.object({ name: short, channel: z.enum(["email", "sms"]), subject: text, body: text }), required: ["name", "channel", "body"] },
  schedule_requests: { table: "schedule_requests", roles: [...adminRoles, "doctor"], schema: z.object({ doctor_id: z.string().uuid(), weekday: z.coerce.number().int().min(0).max(6), start_time: time, end_time: time, reason: text, status: z.enum(["pending", "approved", "rejected"]) }), required: ["doctor_id", "weekday", "start_time", "end_time"] },
} as const;
export type Resource = keyof typeof resources;
export function getResource(name: string) {
  if (!Object.hasOwn(resources, name)) throw new HttpError(404, "Management module not found.");
  return resources[name as Resource];
}
export function parseRecord(name: string, raw: Record<string, unknown>, create: boolean) {
  const r = getResource(name);
  // Supplied row id, timestamps and other server-owned fields are never written.
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([k]) => !["id", "created_at", "updated_at", "created_by"].includes(k)));
  const schema = r.schema.partial();
  const input = (name === "patients" || name === "staff") && create
    ? schema.extend({ email: z.string().email(), name: short }).strip().parse(cleaned)
    : schema.strip().parse(cleaned);
  if (create) {
    for (const k of r.required) if (input[k as keyof typeof input] === undefined) throw new HttpError(400, `The ${k.replaceAll("_", " ")} field is required.`);
  }
  if (!Object.keys(input).length) throw new HttpError(400, "No editable fields supplied.");
  return input as Record<string, unknown>;
}
