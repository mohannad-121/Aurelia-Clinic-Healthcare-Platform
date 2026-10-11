import { Router, type IRouter } from "express";
import { CreateAppointmentBody, UpdateAppointmentBody, GetAvailabilityQueryParams, GetAvailabilityResponse, CreateAppointmentResponse, ListAppointmentsResponse, JoinWaitlistBody } from "@workspace/api-zod";
import { client, configured, dbError, HttpError, identity } from "../lib/supabase";

const router: IRouter = Router();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validId = (s: string) => { if (!uuid.test(s)) throw new HttpError(400, "Invalid record identifier."); };
const validDate = (s: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(`${s}T00:00:00Z`))) throw new HttpError(400, "Choose a valid date."); };
const validTimestamp = (s: string) => { if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(s) || !Number.isFinite(Date.parse(s))) throw new HttpError(400, "Choose a valid appointment time with timezone."); };
async function appointments(c: ReturnType<typeof client>, id?: string) {
  let query = c.from("appointments").select("*, patient:profiles!appointments_patient_id_fkey(name,email,phone), doctor:doctors(name), service:services(name)").order("starts_at");
  if (id) query = query.eq("id", id);
  const { data, error } = await query; dbError(error);
  return (data || []).map(a => ({ ...a, patient_name: a.patient?.name || "", patient_email: a.patient?.email || "", patient_phone: a.patient?.phone || "", doctor_name: a.doctor?.name || "", service_name: a.service?.name || "" }));
}
router.get("/availability", async (req, res) => {
  const input = GetAvailabilityQueryParams.parse(req.query);
  validDate(input.date);
  if (!configured()) {
    res.json(GetAvailabilityResponse.parse({ configured: false, timezone: "Asia/Amman", slots: [], message: "Online booking is unavailable until Supabase and doctor schedules are configured." })); return;
  }
  validId(input.service_id); if (input.doctor_id) validId(input.doctor_id);
  const c = client();
  const [{ data, error }, settings] = await Promise.all([
    c.rpc("available_slots", { p_service: input.service_id, p_date: input.date, p_doctor: input.doctor_id || null }),
    c.from("clinic_settings").select("timezone").single(),
  ]);
  dbError(error); dbError(settings.error);
  res.json(GetAvailabilityResponse.parse({ configured: true, timezone: settings.data?.timezone, slots: data || [] }));
});
router.get("/appointments", async (req, res) => {
  const auth = (await identity(req, res))!;
  res.json(ListAppointmentsResponse.parse(await appointments(auth.db)));
});
router.post("/appointments", async (req, res) => {
  const auth = (await identity(req, res))!;
  const input = CreateAppointmentBody.parse(req.body);
  if (!input.consent) throw new HttpError(400, "Privacy consent is required to book.");
  validId(input.service_id); validId(input.doctor_id); validTimestamp(input.starts_at);
  if (input.patient_id) validId(input.patient_id);
  const { data, error } = await auth.db.rpc("book_appointment", {
    p_service: input.service_id, p_doctor: input.doctor_id, p_starts_at: input.starts_at, p_notes: input.notes || "",
    p_patient: input.patient_id || null,
  }); dbError(error);
  const [a] = await appointments(auth.db, data.id);
  res.status(201).json(CreateAppointmentResponse.parse(a));
});
router.patch("/appointments/:id", async (req, res) => {
  const auth = (await identity(req, res))!;
  const id = String(req.params.id); validId(id);
  const input = UpdateAppointmentBody.parse(req.body);
  if (!input.status && !input.starts_at && !input.doctor_id) throw new HttpError(400, "No appointment change supplied.");
  if (input.starts_at) validTimestamp(input.starts_at); if (input.doctor_id) validId(input.doctor_id);
  const { error } = await auth.db.rpc("change_appointment", { p_id: id, p_status: input.status || null, p_starts_at: input.starts_at || null, p_doctor: input.doctor_id || null }); dbError(error);
  const [a] = await appointments(auth.db, id);
  res.json(CreateAppointmentResponse.parse(a));
});
router.post("/waitlist", async (req, res) => {
  const auth = (await identity(req, res))!;
  const input = JoinWaitlistBody.parse(req.body);
  validId(input.service_id); validDate(input.date); if (input.doctor_id) validId(input.doctor_id);
  const { error } = await auth.db.from("waitlist").insert({ ...input, doctor_id: input.doctor_id || null, patient_id: auth.user.id }); dbError(error);
  res.status(201).json({ message: "Your waitlist request has been saved. Reception will review availability." });
});
export default router;
