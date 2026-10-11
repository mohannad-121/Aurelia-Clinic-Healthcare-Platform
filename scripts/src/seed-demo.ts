import { createClient } from "@supabase/supabase-js";

// Explicit, manually invoked demo-only seed. It never creates passwords or sends invitations.
if (!process.argv.includes("--confirm-demo")) {
  throw new Error("This creates SYNTHETIC records in your configured Supabase project. Use a dedicated demo project and pass --confirm-demo.");
}
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const c = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const ensure = (error: { message: string } | null) => { if (error) throw new Error("Supabase seed operation failed. Verify the initial migration and public seed were applied to the demo project."); };
const { data: settings, error: se } = await c.from("clinic_settings").select("timezone").single();
ensure(se);
const people = [
  { email: "demo.patient.one@example.invalid", name: "Demo Patient One", role: "patient" },
  { email: "demo.patient.two@example.invalid", name: "Demo Patient Two", role: "patient" },
  { email: "demo.doctor@example.invalid", name: "Demo Doctor Account", role: "doctor" },
];
const ids: string[] = [];
for (const person of people) {
  const { data: existing, error: lookupError } = await c.from("profiles").select("id,is_demo").eq("email", person.email).maybeSingle();
  ensure(lookupError);
  let id = existing?.id as string | undefined;
  if (existing && !existing.is_demo) throw new Error("A non-demo account already uses a reserved demonstration address. Stopping without overwriting it.");
  if (!id) {
    const { data, error } = await c.auth.admin.createUser({ email: person.email, email_confirm: true, user_metadata: { name: person.name, phone: "+962000000000", consent: false } });
    ensure(error); if (!data.user) throw new Error("The demonstration Supabase account was not created."); id = data.user.id;
  }
  const { error } = await c.from("profiles").update({ name: person.name, role: person.role, is_demo: true, consent: false }).eq("id", id);
  ensure(error); ids.push(id);
}
const doctor = "30000000-0000-4000-8000-000000000001";
const service = "20000000-0000-4000-8000-000000000001";
const { error: doctorError } = await c.from("doctors").update({ profile_id: ids[2] }).eq("id", doctor).eq("is_demo", true);
ensure(doctorError);
for (let i = 0; i < 2; i++) {
  const apptId = `60000000-0000-4000-8000-00000000000${i + 1}`;
  const { data: exists, error: existError } = await c.from("appointments").select("id").eq("id", apptId).maybeSingle();
  ensure(existError); if (exists) continue;
  let slot: { starts_at: string; ends_at: string } | undefined;
  for (let offset = 1; offset <= 10 && !slot; offset++) {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: settings!.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + offset * 86400000));
    const { data, error } = await c.rpc("available_slots", { p_service: service, p_date: day, p_doctor: doctor }); ensure(error);
    slot = data?.[i] || data?.[0];
  }
  if (!slot) throw new Error("No demonstration working slots exist. Apply supabase/seed.sql first.");
  const { error } = await c.from("appointments").insert({ id: apptId, patient_id: ids[i], doctor_id: doctor, service_id: service, starts_at: slot.starts_at, ends_at: slot.ends_at, status: i ? "pending" : "confirmed", notes: "SYNTHETIC demonstration appointment. No real patient information.", is_demo: true });
  ensure(error);
}
const { error: leadError } = await c.from("crm_leads").upsert([
  { id: "70000000-0000-4000-8000-000000000001", name: "Demo Inquiry One", email: "inquiry.one@example.invalid", phone: "+962000000000", message: "SYNTHETIC inquiry for a general consultation.", status: "new_inquiry", consent: false, is_demo: true },
  { id: "70000000-0000-4000-8000-000000000002", name: "Demo Inquiry Two", email: "inquiry.two@example.invalid", phone: "+962000000000", message: "SYNTHETIC inquiry for clinic information.", status: "contacted", consent: false, is_demo: true },
]);
ensure(leadError);
const { error: taskError } = await c.from("crm_tasks").upsert({
  id: "80000000-0000-4000-8000-000000000001", title: "Demo: follow up on a synthetic inquiry",
  description: "SYNTHETIC administrative follow-up, not a real communication request.",
  lead_id: "70000000-0000-4000-8000-000000000001", due_at: new Date(Date.now() + 86400000).toISOString(), status: "open",
});
ensure(taskError);
process.stdout.write("Synthetic demonstration accounts, appointments, leads and task saved. No passwords were generated and no invitation or reminder was sent.\n");
