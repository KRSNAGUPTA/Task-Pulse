// app/actions/auth.ts
'use server';
import { cookies } from "next/headers";
import { loginSchema, signUpSchema } from "../lib/validations/auth";

const baseUrl = process.env.API_GATEWAY || process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:5001";

type LoginRes = {
  user: { id: string; name: string; email: string };
  activeOrgId?: string;
  org?: { id: string; role: string };
  orgs?: Array<{ id: string; name: string; slug: string; role: string }>;
  token: { accessToken: string };
};

type RegisterRes = {
  user: { id: string; name: string; email: string; createdAt: string };
  org: { id: string; role: string };
  token: { accessToken: string };
};

export type AuthErrorResult = { success: false; error: string; fieldErrors?: Record<string, string[]>; status?: number; };
export type LoginSuccessResult = {
  success: true;
  accessToken: string;
  user: { id: string; name: string; email: string; activeOrgId: string };
  activeOrgId: string;
  orgs: Array<{ id: string; name: string; slug: string; role: string }>;
};
export type SignupSuccessResult = { success: true; message: string; accessToken: string; user: { id: string; name: string; email: string; createdAt: string }; org: { id: string; role: string }; };

export type LoginResult = AuthErrorResult | LoginSuccessResult;
export type SignupResult = AuthErrorResult | SignupSuccessResult;

export async function login(formData: FormData): Promise<LoginResult> {
  try {
    const parseResult = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
    if (!parseResult.success) {
      return { success: false, error: parseResult.error.issues[0]?.message || "Invalid email or password", fieldErrors: parseResult.error.flatten().fieldErrors };
    }

    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parseResult.data), cache: 'no-store'
    });
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.message || "Invalid email or password" };

    await setRefreshCookie(response.headers.get("set-cookie"));
    const loginRes = data as LoginRes;

    // ✅ FIX: auth service returns `org` (singular) + optional `orgs`/`activeOrgId`.
    // Normalize so the client always receives `activeOrgId` + `orgs` (array).
    const activeOrgId = loginRes.activeOrgId ?? loginRes.org?.id;
    const orgs = loginRes.orgs ?? (loginRes.org ? [{ id: loginRes.org.id, name: "", slug: "", role: loginRes.org.role }] : []);

    if (!activeOrgId) {
      return { success: false, error: "Login response missing active organization" };
    }

    return {
      success: true,
      accessToken: loginRes.token.accessToken,
      user: { ...loginRes.user, activeOrgId },
      activeOrgId,
      orgs,
    };
  } catch (error: any) {
    return { success: false, error: "Unable to reach authentication service." };
  }
}

export async function signup(formData: FormData): Promise<SignupResult> {
  const zodRes = signUpSchema.safeParse({ name: formData.get("name"), email: formData.get("email"), password: formData.get("password") });
  if (!zodRes.success) {
    return { success: false, error: zodRes.error.issues[0]?.message || "Invalid form data input", fieldErrors: zodRes.error.flatten().fieldErrors };
  }

  try {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST', body: JSON.stringify(zodRes.data), headers: { "Content-Type": "application/json" }, cache: 'no-store'
    });
    const data = await res.json();
    if (!res.ok) return { success: false, status: res.status, error: data?.message || "Failed to register" };

    await setRefreshCookie(res.headers.get("set-cookie"));
    const registerRes = data as RegisterRes;

    return { success: true, message: "Registered Successfully", accessToken: registerRes.token.accessToken, user: registerRes.user, org: registerRes.org };
  } catch (error: any) {
    return { success: false, error: "Unable to reach authentication service." };
  }
}

export async function logout() {
  try {
    const cookieStore = await cookies();
    cookieStore.set("RefreshToken", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    return { success: true, message: "Logout Successful" };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to logout" };
  }
}

// ✅ NEW: server action to switch orgs. Runs on the server, forwards the
// refresh cookie (via the current access token passed from the client),
// and returns the new access token + org.
export type SwitchOrgResult =
  | { success: true; accessToken: string; org: { id: string; role: string } }
  | { success: false; error: string; status?: number };

export async function switchOrgAction(orgId: string, currentAccessToken: string): Promise<SwitchOrgResult> {
  if (!orgId) return { success: false, error: "orgId is required" };
  if (!currentAccessToken) return { success: false, error: "Missing access token" };

  try {
    const res = await fetch(`${baseUrl}/api/auth/switch-org`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentAccessToken}`,
      },
      body: JSON.stringify({ orgId }),
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, status: res.status, error: data?.message || "Failed to switch organization" };
    }

    // Persist the rotated refresh cookie on the Next.js side
    await setRefreshCookie(res.headers.get("set-cookie"));

    return {
      success: true,
      accessToken: data.token.accessToken,
      org: { id: orgId, role: data.org?.role ?? "" },
    };
  } catch (error: any) {
    return { success: false, error: "Unable to reach authentication service." };
  }
}

async function setRefreshCookie(setCookieHeader: string | null) {
  if (!setCookieHeader) return;
  const match = setCookieHeader.match(/RefreshToken=([^;]+)/);
  if (match && match[1]) {
    const cookieStore = await cookies();
    cookieStore.set("RefreshToken", match[1], { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60 });
  }
}