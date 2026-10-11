import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Request, Response } from "express";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const configured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
export function client(token?: string): SupabaseClient {
  if (!configured()) throw new HttpError(503, "Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY, and apply the supplied migrations.");
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}
export function privilegedClient(): SupabaseClient {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new HttpError(503, "SUPABASE_SERVICE_ROLE_KEY is required for public inquiry submission.");
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function dbError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === "23P01" || error.message?.includes("slot is no longer")) throw new HttpError(409, "That appointment slot is no longer available. Please choose another time.");
  if (error.code === "42501" || /Not authorized|administrator|Protected administrator/.test(error.message || "")) throw new HttpError(403, "You do not have permission to perform this action.");
  if (/window closed/.test(error.message || "")) throw new HttpError(409, "The online change window has closed. Please contact reception.");
  if (error.code === "23505") throw new HttpError(409, "A record with these details already exists.");
  if (["23503", "23514", "22P02", "22007", "22008", "P0001"].includes(error.code || "")) throw new HttpError(400, "The supplied details are invalid or this action is not permitted.");
  throw new HttpError(503, "The clinic database is unavailable or its migrations have not been applied.");
}
const cookies = { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/api" };
export function setSessionCookies(res: Response, access: string, refresh: string, expires: number) {
  res.cookie("aurelia_access", access, { ...cookies, maxAge: expires * 1000 });
  res.cookie("aurelia_refresh", refresh, { ...cookies, maxAge: 7 * 86400 * 1000 });
}
export function clearSessionCookies(res: Response) {
  res.clearCookie("aurelia_access", cookies);
  res.clearCookie("aurelia_refresh", cookies);
}
export async function profileFor(c: SupabaseClient, userId: string) {
  const { data: profile, error } = await c.from("profiles").select("*").eq("id", userId).single();
  dbError(error);
  if (!profile || profile.status !== "active") throw new HttpError(403, "Your account is not active. Contact reception.");
  if (profile.role === "doctor") {
    const { data, error: doctorError } = await c.from("doctors").select("id").eq("profile_id", userId).maybeSingle();
    dbError(doctorError);
    if (data) profile.doctor_id = data.id;
  }
  return profile;
}
export async function identity(req: Request, res: Response, required = true) {
  if (!configured()) { if (required) client(); return null; }
  let token = req.cookies?.aurelia_access as string | undefined;
  let c = client(token);
  let user = token ? (await c.auth.getUser(token)).data.user : null;
  let refresh = req.cookies?.aurelia_refresh as string | undefined;
  if (!user && refresh) {
    const result = await client().auth.refreshSession({ refresh_token: refresh });
    if (result.data.session) {
      token = result.data.session.access_token;
      refresh = result.data.session.refresh_token;
      setSessionCookies(res, token, refresh, result.data.session.expires_in);
      c = client(token); user = result.data.user;
    } else clearSessionCookies(res);
  }
  if (!user) { if (required) throw new HttpError(401, "Please sign in to continue."); return null; }
  const profile = await profileFor(c, user.id);
  return { db: c, user, profile, token: token!, refresh };
}
export function requireRole(profile: { role: string }, roles: string[]) {
  if (!roles.includes(profile.role)) throw new HttpError(403, "You do not have permission to access this area.");
}
export const receptionRoles = ["super_admin", "clinic_admin", "receptionist"];
export const adminRoles = ["super_admin", "clinic_admin"];
