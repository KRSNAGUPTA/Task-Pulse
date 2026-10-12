// app/actions/auth.ts
'use server';
import { cookies } from "next/headers";
import { loginSchema, signUpSchema } from "../lib/validations/auth";

const baseUrl = process.env.API_GATEWAY || process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:5001";

type LoginRes = {
  user: { id: string; name: string; email: string };
  activeOrgId: string;
  orgs: Array<{ id: string; name: string; slug: string; role: string }>;
  token: { accessToken: string };
};

type RegisterRes = {
  user: { id: string; name: string; email: string; createdAt: string };
  org: { id: string; role: string };
  token: { accessToken: string };
};

export type AuthErrorResult = { success: false; error: string; fieldErrors?: Record<string, string[]>; status?: number; };
export type LoginSuccessResult = { success: true; accessToken: string; user: { id: string; name: string; email: string }; activeOrgId: string; orgs: Array<{ id: string; name: string; slug: string; role: string }>; };
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
    
    return { success: true, accessToken: loginRes.token.accessToken, user: loginRes.user, activeOrgId: loginRes.activeOrgId, orgs: loginRes.orgs };
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

async function setRefreshCookie(setCookieHeader: string | null) {
  if (!setCookieHeader) return;
  const match = setCookieHeader.match(/RefreshToken=([^;]+)/);
  if (match && match[1]) {
    const cookieStore = await cookies();
    cookieStore.set("RefreshToken", match[1], { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60 });
  }
}