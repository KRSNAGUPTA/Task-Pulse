"use client";

import { useActionState, useState } from "react";
import { login, signup } from "@/app/actions/auth";
import { loginSchema, signUpSchema } from "@/app/lib/validations/auth";
import { useAuthStore } from "@/app/store/useAuthStore";
import { toast } from "@/components/ui/toast";

type ActionState = {
  error?: string | null;
  message?: string | null;
  success?: boolean;
} | null;

interface LoginFormProps {
  defaultTab?: "login" | "signup";
}

export function LoginForm({ defaultTab = "login" }: LoginFormProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">(defaultTab);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const setAccessToken = useAuthStore((state) => state.setAccessToken);

  const handleTabChange = (tab: "login" | "signup") => {
    setActiveTab(tab);
    setFieldErrors({});
  };

  const handleLogin = async (
    _prev: ActionState,
    formData: FormData
  ): Promise<ActionState> => {
    setFieldErrors({});

    const rawData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const validation = loginSchema.safeParse(rawData);
    if (!validation.success) {
      const formattedErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          formattedErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setFieldErrors(formattedErrors);
      return { error: "Please fix the validation errors below.", success: false };
    }

    const res = await login(formData);

    if (!res.success) {
      if (res.fieldErrors) {
        setFieldErrors(res.fieldErrors);
      }
      return { error: res.error || "Authentication failed.", success: false };
    }

    if (res.accessToken) {
      setAccessToken(res.accessToken as string);
    }

    toast.add({
      title: "Welcome Back!",
      description: "You have logged in successfully.",
    });

    return { error: null, success: true };
  };

  const handleSignup = async (
    _prev: ActionState,
    formData: FormData
  ): Promise<ActionState> => {
    setFieldErrors({});

    const rawData = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const validation = signUpSchema.safeParse(rawData);
    if (!validation.success) {
      const formattedErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          formattedErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setFieldErrors(formattedErrors);
      return { error: "Please fix the validation errors below.", success: false };
    }

    const res = await signup(formData);

    if (!res.success) {
      if (res.fieldErrors) {
        setFieldErrors(res.fieldErrors);
      }
      return { error: res.error || "Failed to create account.", success: false };
    }

    toast.add({
      title: "Account Created!",
      description: "Please log in with your credentials.",
    });

    handleTabChange("login");
    return { error: null, success: true, message: "Registration successful!" };
  };

  const [loginState, loginAction, isLoginPending] = useActionState<
    ActionState,
    FormData
  >(handleLogin, null);

  const [signupState, signupAction, isSignupPending] = useActionState<
    ActionState,
    FormData
  >(handleSignup, null);

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
      {/* Tab Switcher Controls */}
      <div className="mb-6 flex rounded-full bg-slate-100 p-1 border border-slate-200/80">
        <button
          type="button"
          onClick={() => handleTabChange("login")}
          className={`w-1/2 rounded-full py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === "login"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("signup")}
          className={`w-1/2 rounded-full py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === "signup"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Sign up
        </button>
      </div>

      {activeTab === "login" ? (
        <form action={loginAction} className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Email Address
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              aria-invalid={!!fieldErrors.email}
              className={`w-full rounded-xl border bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                fieldErrors.email
                  ? "border-red-300 focus:ring-red-500"
                  : "border-slate-200 focus:border-sky-500 focus:ring-sky-500/20"
              }`}
            />
            {fieldErrors.email && (
              <span className="text-[11px] font-medium text-red-500">{fieldErrors.email}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!fieldErrors.password}
              className={`w-full rounded-xl border bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                fieldErrors.password
                  ? "border-red-300 focus:ring-red-500"
                  : "border-slate-200 focus:border-sky-500 focus:ring-sky-500/20"
              }`}
            />
            {fieldErrors.password && (
              <span className="text-[11px] font-medium text-red-500">{fieldErrors.password}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoginPending}
            className="mt-2 w-full rounded-full bg-sky-500 py-3 text-sm font-semibold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {isLoginPending ? "Logging in..." : "Log in"}
          </button>
        </form>
      ) : (
        <form action={signupAction} className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-name" className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Full Name
            </label>
            <input
              id="signup-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="John Doe"
              aria-invalid={!!fieldErrors.name}
              className={`w-full rounded-xl border bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                fieldErrors.name
                  ? "border-red-300 focus:ring-red-500"
                  : "border-slate-200 focus:border-sky-500 focus:ring-sky-500/20"
              }`}
            />
            {fieldErrors.name && (
              <span className="text-[11px] font-medium text-red-500">{fieldErrors.name}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-email" className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Email Address
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              aria-invalid={!!fieldErrors.email}
              className={`w-full rounded-xl border bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                fieldErrors.email
                  ? "border-red-300 focus:ring-red-500"
                  : "border-slate-200 focus:border-sky-500 focus:ring-sky-500/20"
              }`}
            />
            {fieldErrors.email && (
              <span className="text-[11px] font-medium text-red-500">{fieldErrors.email}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-password" className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Password
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={!!fieldErrors.password}
              className={`w-full rounded-xl border bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                fieldErrors.password
                  ? "border-red-300 focus:ring-red-500"
                  : "border-slate-200 focus:border-sky-500 focus:ring-sky-500/20"
              }`}
            />
            {fieldErrors.password && (
              <span className="text-[11px] font-medium text-red-500">{fieldErrors.password}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSignupPending}
            className="mt-2 w-full rounded-full bg-sky-500 py-3 text-sm font-semibold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {isSignupPending ? "Registering..." : "Create Account"}
          </button>
        </form>
      )}
    </div>
  );
}
