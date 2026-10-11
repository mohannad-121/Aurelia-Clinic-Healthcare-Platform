import { Router, type IRouter } from "express";
import { CreateRecordBody, UpdateRecordBody, ListRecordsResponse, CreateRecordResponse, UploadMediaBody } from "@workspace/api-zod";
import { getResource, parseRecord } from "../lib/resources";
import { identity, requireRole, adminRoles, privilegedClient, dbError, HttpError } from "../lib/supabase";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();
router.get("/manage/:resource", async (req, res) => {
  const auth = (await identity(req, res))!;
  const name = String(req.params.resource), r = getResource(name);
  requireRole(auth.profile, [...r.roles]);
  let q = auth.db.from(r.table).select("*").limit(3000);
  if (name === "patients") q = q.eq("role", "patient");
  if (name === "staff") q = q.neq("role", "patient");
  if (!["schedules", "settings", "tags", "templates"].includes(name)) q = q.order("created_at", { ascending: false });
  const { data, error } = await q; dbError(error);
  let rows = data || [];
  if (name === "doctors") {
    const relations = await auth.db.from("doctor_services").select("*"); dbError(relations.error);
    rows = rows.map(row => ({ ...row, service_ids: relations.data?.filter(rel => rel.doctor_id === row.id).map(rel => rel.service_id) || [] }));
  }
  if (name === "patients") {
    const tags = await auth.db.from("patient_tags").select("*"); dbError(tags.error);
    rows = rows.map(row => ({ ...row, tag_ids: tags.data?.filter(tag => tag.patient_id === row.id).map(tag => tag.tag_id) || [] }));
  }
  res.json(ListRecordsResponse.parse(rows.map(row => ({ id: row.id, data: row }))));
});
router.post("/manage/:resource", async (req, res) => {
  const auth = (await identity(req, res))!;
  const name = String(req.params.resource), r = getResource(name); requireRole(auth.profile, [...r.roles]);
  if (["audit", "notifications", "waitlist", "settings"].includes(name)) throw new HttpError(405, "Records in this module cannot be created here.");
  const input = parseRecord(name, CreateRecordBody.parse(req.body).data, true);
  if (name === "staff") requireRole(auth.profile, ["super_admin"]);
  if (name === "patients" || name === "staff") {
    if (!process.env.APP_URL) throw new HttpError(503, "APP_URL must be configured before sending account invitations.");
    const { data: account, error } = await privilegedClient().auth.admin.inviteUserByEmail(String(input.email), {
      data: { name: input.name, phone: input.phone || "" }, ...(process.env.APP_URL ? { redirectTo: `${process.env.APP_URL.replace(/\/$/, "")}/reset-password` } : {}),
    });
    if (error || !account.user) throw new HttpError(400, "The Supabase account invitation could not be created. The address may already be registered.");
    const privileged = privilegedClient();
    const { data, error: e } = await privileged.from("profiles").update({ name: input.name, phone: input.phone || "", role: name === "staff" ? input.role ?? "receptionist" : "patient",
      status: input.status ?? "active", consent: input.consent ?? false, communication_preference: input.communication_preference ?? "email" }).eq("id", account.user.id).select("*").single();
    dbError(e);
    const { error: logError } = await privileged.from("audit_logs").insert({ actor_id: auth.user.id, action: "INVITE_ACCOUNT", resource: "profiles", record_id: account.user.id });
    dbError(logError);
    res.status(201).json(CreateRecordResponse.parse({ id: data.id, data })); return;
  }
  if (name === "exceptions" && auth.profile.role === "doctor") {
    const { data, error } = await auth.db.from("doctors").select("id").eq("profile_id", auth.user.id).single(); dbError(error);
    input.doctor_id = data!.id;
  }
  if (name === "notes" || name === "interactions") input.created_by = auth.user.id;
  if (name === "schedule_requests") {
    if (auth.profile.role === "doctor") {
      if (!auth.profile.doctor_id) throw new HttpError(403, "Your doctor profile is not linked.");
      input.doctor_id = auth.profile.doctor_id;
    }
    input.status = "pending";
  }
  if (name === "doctors") {
    const { service_ids, ...fields } = input;
    const { data, error } = await auth.db.rpc("save_doctor", { p_id: null, p_data: fields, p_services: service_ids ?? [] }); dbError(error);
    res.status(201).json(CreateRecordResponse.parse({ id: data.id, data: { ...data, service_ids: service_ids ?? [] } })); return;
  }
  const { data, error } = await auth.db.from(r.table).insert(input).select("*").single(); dbError(error);
  res.status(201).json(CreateRecordResponse.parse({ id: data.id, data }));
});
router.patch("/manage/:resource/:id", async (req, res) => {
  const auth = (await identity(req, res))!;
  const name = String(req.params.resource), r = getResource(name); requireRole(auth.profile, [...r.roles]);
  const id = String(req.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, "Invalid record identifier.");
  if (["audit", "notifications"].includes(name)) throw new HttpError(405, "This module is read-only.");
  if (name === "staff") requireRole(auth.profile, ["super_admin"]);
  const input = parseRecord(name, UpdateRecordBody.parse(req.body).data, false);
  if (name === "patients" || name === "staff") {
    const { data: target, error } = await auth.db.from("profiles").select("role").eq("id", id).single(); dbError(error);
    if (name === "patients" && target?.role !== "patient") throw new HttpError(403, "This is not a patient account.");
  }
  if (name === "patients") {
    const { tag_ids, ...fields } = input;
    const { data, error } = await auth.db.rpc("save_patient", { p_id: id, p_data: fields, p_tags: tag_ids ?? null }); dbError(error);
    res.json(CreateRecordResponse.parse({ id: data.id, data: { ...data, ...(tag_ids ? { tag_ids } : {}) } })); return;
  }
  if (name === "schedule_requests") {
    requireRole(auth.profile, adminRoles);
    const { data, error } = await auth.db.rpc("review_schedule_request", { p_id: id, p_status: input.status }); dbError(error);
    res.json(CreateRecordResponse.parse({ id: data.id, data })); return;
  }
  if (name === "doctors") {
    const { service_ids, ...fields } = input;
    const { data, error } = await auth.db.rpc("save_doctor", { p_id: id, p_data: fields, p_services: service_ids ?? null }); dbError(error);
    res.json(CreateRecordResponse.parse({ id: data.id, data: { ...data, ...(service_ids ? { service_ids } : {}) } })); return;
  }
  const { data, error } = await auth.db.from(r.table).update(input).eq("id", id).select("*").single(); dbError(error);
  res.json(CreateRecordResponse.parse({ id: data.id, data }));
});
router.delete("/manage/:resource/:id", async (req, res) => {
  const auth = (await identity(req, res))!;
  const name = String(req.params.resource), r = getResource(name); requireRole(auth.profile, [...r.roles]);
  const id = String(req.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, "Invalid record identifier.");
  if (["settings", "audit", "notifications", "staff", "patients", "waitlist"].includes(name)) throw new HttpError(405, "Archive this record using its status rather than deleting it.");
  const query = ["doctors", "services", "content", "posts", "testimonials", "faqs", "branches"].includes(name)
    ? auth.db.from(r.table).update({ published: false }).eq("id", id)
    : auth.db.from(r.table).delete().eq("id", id);
  const { data, error } = await query.select("id"); dbError(error);
  if (!data?.length) throw new HttpError(404, "Record not found or access denied.");
  res.json({ message: ["doctors", "services", "content", "posts", "testimonials", "faqs", "branches"].includes(name) ? "Record unpublished." : "Record deleted." });
});
router.post("/media", async (req, res) => {
  const auth = (await identity(req, res))!; requireRole(auth.profile, adminRoles);
  const input = UploadMediaBody.parse(req.body);
  const bytes = Buffer.from(input.base64, "base64");
  if (bytes.length > 3000000 || bytes.length < 12) throw new HttpError(400, "Upload a valid image smaller than 3 MB.");
  const signature = input.content_type === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : input.content_type === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  if (!signature) throw new HttpError(400, "The file content does not match its image type.");
  const extension = input.content_type.split("/")[1], path = `${auth.user.id}/${randomUUID()}.${extension}`;
  const { error } = await auth.db.storage.from("clinic-media").upload(path, bytes, { contentType: input.content_type, upsert: false }); dbError(error);
  const { data } = auth.db.storage.from("clinic-media").getPublicUrl(path);
  res.status(201).json({ path, url: data.publicUrl });
});
export default router;
