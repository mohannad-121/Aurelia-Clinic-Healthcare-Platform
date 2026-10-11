import { Router, type IRouter } from "express";
import { LoginBody, RegisterBody, UpdateProfileBody, RecoverPasswordBody, GetSessionResponse, UpdateProfileResponse, VerifyEmailLinkBody, SetPasswordBody } from "@workspace/api-zod";
import { client, configured, identity, setSessionCookies, clearSessionCookies, dbError, HttpError, profileFor } from "../lib/supabase";

const router: IRouter = Router();
router.get("/auth/me", async (req, res) => {
  const auth = await identity(req, res, false);
  res.json(GetSessionResponse.parse({ configured: configured(), authenticated: Boolean(auth), ...(auth ? { profile: auth.profile } : {}) }));
});
router.post("/auth/login", async (req, res) => {
  const input = LoginBody.parse(req.body);
  const c = client();
  const { data, error } = await c.auth.signInWithPassword(input);
  if (error || !data.session) throw new HttpError(401, "Unable to sign in. Check your credentials and verify your email.");
  const profile = await profileFor(c, data.user.id);
  setSessionCookies(res, data.session.access_token, data.session.refresh_token, data.session.expires_in);
  res.json(GetSessionResponse.parse({ configured: true, authenticated: true, profile }));
});
router.post("/auth/register", async (req, res) => {
  const input = RegisterBody.parse(req.body);
  if (!input.consent) throw new HttpError(400, "Please accept the privacy notice to register.");
  const { data, error } = await client().auth.signUp({
    email: input.email, password: input.password,
    options: { data: { name: input.name, phone: input.phone, consent: input.consent }, ...(process.env.APP_URL ? { emailRedirectTo: `${process.env.APP_URL}/login` } : {}) },
  });
  if (error) throw new HttpError(400, "Registration could not be completed. Check the details or contact reception.");
  if (data.session) {
    setSessionCookies(res, data.session.access_token, data.session.refresh_token, data.session.expires_in);
    const { data: profile, error: e } = await client(data.session.access_token).from("profiles").select("*").eq("id", data.user!.id).single();
    dbError(e);
    res.json(GetSessionResponse.parse({ configured: true, authenticated: true, profile })); return;
  }
  res.json({ configured: true, authenticated: false, message: "Check your email to verify your account, then sign in." });
});
router.post("/auth/logout", async (req, res) => {
  const auth = await identity(req, res, false);
  if (auth && auth.refresh) {
    await auth.db.auth.setSession({ access_token: auth.token, refresh_token: auth.refresh });
    await auth.db.auth.signOut({ scope: "local" });
  }
  clearSessionCookies(res); res.json({ message: "Signed out." });
});
router.post("/auth/recover", async (req, res) => {
  const { email } = RecoverPasswordBody.parse(req.body);
  // Supabase's hosted email flow must be configured; don't claim delivery.
  if (!process.env.APP_URL) throw new HttpError(503, "APP_URL must be configured for secure email recovery links.");
  const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: `${process.env.APP_URL.replace(/\/$/, "")}/reset-password` });
  if (error) throw new HttpError(503, "Password recovery is temporarily unavailable.");
  res.json({ message: "If an eligible account exists, Supabase will process the recovery request. Check your inbox." });
});
router.post("/auth/verify", async (req, res) => {
  const input = VerifyEmailLinkBody.parse(req.body);
  const c = client();
  const { data, error } = await c.auth.setSession(input);
  if (error || !data.session || !data.user) throw new HttpError(401, "This email link is invalid or expired. Please request a new one.");
  const profile = await profileFor(c, data.user.id);
  setSessionCookies(res, data.session.access_token, data.session.refresh_token, data.session.expires_in);
  res.json(GetSessionResponse.parse({ configured: true, authenticated: true, profile }));
});
router.post("/auth/password", async (req, res) => {
  const auth = (await identity(req, res))!;
  const { password } = SetPasswordBody.parse(req.body);
  // A client created with an Authorization header alone has no Auth SDK session.
  if (!auth.refresh) throw new HttpError(401, "Please use a verified recovery link.");
  const { error: sessionError } = await auth.db.auth.setSession({ access_token: auth.token, refresh_token: auth.refresh });
  if (sessionError) throw new HttpError(401, "Your session has expired. Request a new recovery link.");
  const { error } = await auth.db.auth.updateUser({ password });
  if (error) throw new HttpError(400, "The password could not be updated. Use a different password or request a new link.");
  res.json({ message: "Your password has been updated securely." });
});
router.patch("/profile", async (req, res) => {
  const auth = (await identity(req, res))!;
  const input = UpdateProfileBody.parse(req.body);
  const { data, error } = await auth.db.rpc("update_self_profile", { p_data: input });
  dbError(error);
  res.json(UpdateProfileResponse.parse({ ...data, ...(auth.profile.doctor_id ? { doctor_id: auth.profile.doctor_id } : {}) }));
});
export default router;
