import { Router, type IRouter } from "express";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { dbError, identity, receptionRoles, requireRole } from "../lib/supabase";

const router: IRouter = Router();
router.get("/dashboard/summary", async (req, res) => {
  const auth = (await identity(req, res))!; requireRole(auth.profile, receptionRoles);
  const c = auth.db;
  const now = new Date(), start = new Date(now.getTime() - 6 * 86400000), month = new Date(now.getTime() - 30 * 86400000);
  const [patients, newPatients, appointments, leads, activity, settings, schedules, doctors] = await Promise.all([
    c.from("profiles").select("id", { count: "exact", head: true }).eq("role", "patient"),
    c.from("profiles").select("id", { count: "exact", head: true }).eq("role", "patient").gte("created_at", month.toISOString()),
    c.from("appointments").select("*,service:services(name),doctor:doctors(name)").gte("starts_at", month.toISOString()).limit(10000),
    c.from("crm_leads").select("status").limit(10000),
    auth.profile.role === "receptionist" ? c.from("crm_tasks").select("*").order("created_at", { ascending: false }).limit(8) : c.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(8),
    c.from("clinic_settings").select("timezone").single(),
    c.from("working_schedules").select("*"), c.from("doctors").select("id,name"),
  ]);
  for (const q of [patients, newPatients, appointments, leads, activity, settings, schedules, doctors]) dbError(q.error);
  const zone = settings.data?.timezone || "Asia/Amman";
  const localDay = (v: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(v);
  const all = appointments.data || [], today = localDay(now);
  const weekly = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getTime() + i * 86400000);
    return { label: new Intl.DateTimeFormat("en", { timeZone: zone, weekday: "short" }).format(d), value: all.filter(a => localDay(new Date(a.starts_at)) === localDay(d)).length };
  });
  const totals = new Map<string, number>();
  for (const a of all) totals.set(a.service?.name || "Service", (totals.get(a.service?.name || "Service") || 0) + 1);
  const minutes = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  const utilization = (doctors.data || []).map(d => {
    const booked = all.filter(a => a.doctor_id === d.id && new Date(a.starts_at) >= start && new Date(a.starts_at) <= now && !["cancelled", "no_show"].includes(a.status))
      .reduce((n, a) => n + (Date.parse(a.ends_at) - Date.parse(a.starts_at)) / 60000, 0);
    const scheduled = (schedules.data || []).filter(s => s.doctor_id === d.id)
      .reduce((n, s) => n + minutes(s.end_time) - minutes(s.start_time) - (s.break_start && s.break_end ? minutes(s.break_end) - minutes(s.break_start) : 0), 0);
    return { label: d.name, value: scheduled ? Math.min(100, Math.round(booked / scheduled * 100)) : 0 };
  });
  res.json(GetDashboardSummaryResponse.parse({
    total_patients: patients.count || 0, new_patients: newPatients.count || 0,
    today_appointments: all.filter(a => localDay(new Date(a.starts_at)) === today).length,
    upcoming_appointments: all.filter(a => Date.parse(a.starts_at) >= now.getTime() && ["pending", "confirmed"].includes(a.status)).length,
    pending_appointments: all.filter(a => a.status === "pending").length,
    completed_appointments: all.filter(a => a.status === "completed").length,
    cancelled_appointments: all.filter(a => a.status === "cancelled").length,
    no_show_appointments: all.filter(a => a.status === "no_show").length,
    new_inquiries: leads.data?.filter(l => l.status === "new_inquiry").length || 0,
    conversion_rate: leads.data?.length ? Math.round(leads.data.filter(l => l.status === "converted").length / leads.data.length * 100) : 0,
    weekly, services: Array.from(totals, ([label, value]) => ({ label, value })), utilization,
    activity: activity.data?.map(a => ({ id: a.id, data: a })) || [],
  }));
});
export default router;
