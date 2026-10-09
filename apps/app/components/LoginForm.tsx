"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "signup">(defaultTab);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleTabChange = (tab: "login" | "signup") => {
    setActiveTab(tab);
    setFieldErrors({});
  };

  // --- LOGIN HANDLER ---
  const handleLogin = async (
    _prev: ActionState,
    formData: FormData
  ): Promise<ActionState> => {
    setFieldErrors({});

    // 1. Client-side validation
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
      return { error: "Please correct the errors below.", success: false };
    }

    // 2. Server Action
    const res = await login(formData);

    // 3. Type Narrowing: Handle Errors
    if (!res.success) {
      toast.add({
        title: "Login failed",
        description: res.error,
      });
      return { error: res.error, success: false };
    }

    // 4. Handle Success (TypeScript now knows res has accessToken and user)
    setAuth(res.user, res.accessToken);
    toast.add({
      title: "Welcome back",
      description: "Signed in successfully.",
    });
    router.push("/dashboard");
    return { error: null, success: true };
  };

  // --- SIGNUP HANDLER ---
  const handleSignup = async (
    _prev: ActionState,
    formData: FormData
  ): Promise<ActionState> => {
    setFieldErrors({});

    // 1. Client-side validation
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
      return { error: "Please correct the errors below.", success: false };
    }

    // 2. Server Action
    const res = await signup(formData);

    // 3. Handle Errors
    if (!res.success) {
      toast.add({
        title: "Registration failed",
        description: res.error || "Please check your details and try again.",
      });
      return { error: res.error || "Registration failed.", success: false };
    }

    // 4. Handle Success 
    // Note: Your auth.ts doesn't return a token on signup, so we just 
    // show a success message and switch to the login tab.
    toast.add({
      title: "Account created",
      description: "Please log in with your credentials.",
    });
    handleTabChange("login");
    return { error: null, success: true };
  };

  const [loginState, loginAction, isLoginPending] = useActionState<ActionState, FormData>(
    handleLogin,
    null
  );

  const [signupState, signupAction, isSignupPending] = useActionState<ActionState, FormData>(
    handleSignup,
    null
  );

  const activeError = activeTab === "login" ? loginState?.error : signupState?.error;

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-bg-subtle/40 px-4 py-8 sm:px-6">
      {/* Decorative ambient background sphere */}
      <div className="pointer-events-none absolute -bottom-10 right-0 sm:-bottom-14 sm:right-[16%] h-32 w-32 sm:h-44 sm:w-44 rounded-full bg-accent/30 blur-2xl" />

      {/* Main Split Card Container */}
      <div className="relative z-10 flex w-full max-w-4xl overflow-hidden rounded-3xl sm:rounded-[32px] border border-secondary/40 bg-white shadow-2xl shadow-surface-dark/10">
        
        {/* Left Section: Form Area */}
        <div className="flex w-full flex-col justify-center px-6 py-8 sm:px-10 lg:px-14 lg:w-1/2">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="font-display font-extrabold text-3xl text-primary mb-2">
              Task Pulse
            </h1>
            <h2 className="font-sans text-xl font-bold uppercase tracking-wider text-surface-dark transition-all duration-300">
              {activeTab === "login" ? "Login" : "Sign Up"}
            </h2>
            <p className="mt-1 font-sans text-sm font-medium text-accent">
              {activeTab === "login"
                ? "Enter your credentials to access your account"
                : "Create an account to start managing tasks"}
            </p>
          </div>

          {/* Smooth Slider Switcher */}
          <div className="relative mb-6 flex rounded-full bg-bg-subtle/60 p-1">
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${
                activeTab === "signup" ? "translate-x-full" : "translate-x-0"
              }`}
            />
            <button
              type="button"
              onClick={() => handleTabChange("login")}
              className={`cursor-pointer relative z-10 w-1/2 py-2 text-sm font-bold tracking-wide transition-colors duration-200 ${
                activeTab === "login" ? "text-primary " : "text-accent hover:text-surface-dark"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("signup")}
              className={`cursor-pointer relative z-10 w-1/2 py-2 text-sm font-bold tracking-wide transition-colors duration-200 ${
                activeTab === "signup" ? "text-primary" : "text-accent hover:text-surface-dark"
              }`}
            >
              Sign up
            </button>
          </div>

          {/* Banner Error */}
          {activeError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm font-medium text-red-600">
              <svg className="h-5 w-5 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{activeError}</span>
            </div>
          )}

          {/* Animated Smooth Switch Forms */}
          <div className="relative overflow-hidden">
            <div
              className={`flex w-[200%] transition-transform duration-300 ease-in-out ${
                activeTab === "signup" ? "-translate-x-1/2" : "translate-x-0"
              }`}
            >
              {/* Login Form */}
              <div className={`w-1/2 pr-2 sm:pr-3 ${activeTab !== "login" ? "pointer-events-none invisible" : ""}`}>
                <form action={loginAction} className="space-y-4">
                  <div className="space-y-1">
                    <div className="relative flex items-center">
                      <svg className="absolute left-3 sm:left-4 h-4 w-4 sm:h-5 sm:w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <input
                        id="login-email"
                        name="email"
                        type="email"
                        required={activeTab === "login"}
                        tabIndex={activeTab === "login" ? 0 : -1}
                        autoComplete="email"
                        placeholder="Email address"
                        aria-invalid={!!fieldErrors.email}
                        className={`w-full rounded-2xl border bg-bg-subtle/30 py-3 pr-4 pl-10 sm:pl-11 text-sm text-surface-dark placeholder:text-muted transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                          fieldErrors.email
                            ? "border-red-300 focus:ring-red-100"
                            : "border-transparent focus:border-primary focus:ring-primary/20"
                        }`}
                      />
                    </div>
                    {fieldErrors.email && <p className="pl-2 text-xs text-red-500">{fieldErrors.email}</p>}
                  </div>

                  <div className="space-y-1">
                    <div className="relative flex items-center">
                      <svg className="absolute left-3 sm:left-4 h-4 w-4 sm:h-5 sm:w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <input
                        id="login-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required={activeTab === "login"}
                        tabIndex={activeTab === "login" ? 0 : -1}
                        autoComplete="current-password"
                        placeholder="Password"
                        aria-invalid={!!fieldErrors.password}
                        className={`w-full rounded-2xl border bg-bg-subtle/30 py-3 pr-20 sm:pr-24 pl-10 sm:pl-11 text-sm text-surface-dark placeholder:text-muted transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                          fieldErrors.password
                            ? "border-red-300 focus:ring-red-100"
                            : "border-transparent focus:border-primary focus:ring-primary/20"
                        }`}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="cursor-pointer absolute right-3 sm:right-4 text-xs sm:text-sm font-semibold text-accent hover:text-surface-dark"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    {fieldErrors.password && <p className="pl-2 text-xs text-red-500">{fieldErrors.password}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoginPending || activeTab !== "login"}
                    tabIndex={activeTab === "login" ? 0 : -1}
                    className="cursor-pointer w-full rounded-2xl bg-primary py-3.5 text-sm font-bold tracking-wider text-white transition-all duration-200 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoginPending ? "SIGNING IN..." : "LOGIN NOW"}
                  </button>
                </form>
              </div>

              {/* Signup Form */}
              <div className={`w-1/2 pl-2 sm:pl-3 ${activeTab !== "signup" ? "pointer-events-none invisible" : ""}`}>
                <form action={signupAction} className="space-y-4">
                  <div className="space-y-1">
                    <div className="relative flex items-center">
                      <svg className="absolute left-3 sm:left-4 h-4 w-4 sm:h-5 sm:w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <input
                        id="signup-name"
                        name="name"
                        type="text"
                        tabIndex={activeTab === "signup" ? 0 : -1}
                        autoComplete="name"
                        placeholder="Full Name (optional)"
                        aria-invalid={!!fieldErrors.name}
                        className={`w-full rounded-2xl border bg-bg-subtle/30 py-3 pr-4 pl-10 sm:pl-11 text-sm text-surface-dark placeholder:text-muted transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                          fieldErrors.name
                            ? "border-red-300 focus:ring-red-100"
                            : "border-transparent focus:border-primary focus:ring-primary/20"
                        }`}
                      />
                    </div>
                    {fieldErrors.name && <p className="pl-2 text-xs text-red-500">{fieldErrors.name}</p>}
                  </div>

                  <div className="space-y-1">
                    <div className="relative flex items-center">
                      <svg className="absolute left-3 sm:left-4 h-4 w-4 sm:h-5 sm:w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      <input
                        id="signup-email"
                        name="email"
                        type="email"
                        required={activeTab === "signup"}
                        tabIndex={activeTab === "signup" ? 0 : -1}
                        autoComplete="email"
                        placeholder="Email address"
                        aria-invalid={!!fieldErrors.email}
                        className={`w-full rounded-2xl border bg-bg-subtle/30 py-3 pr-4 pl-10 sm:pl-11 text-sm text-surface-dark placeholder:text-muted transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                          fieldErrors.email
                            ? "border-red-300 focus:ring-red-100"
                            : "border-transparent focus:border-primary focus:ring-primary/20"
                        }`}
                      />
                    </div>
                    {fieldErrors.email && <p className="pl-2 text-xs text-red-500">{fieldErrors.email}</p>}
                  </div>

                  <div className="space-y-1">
                    <div className="relative flex items-center">
                      <svg className="absolute left-3 sm:left-4 h-4 w-4 sm:h-5 sm:w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <input
                        id="signup-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required={activeTab === "signup"}
                        tabIndex={activeTab === "signup" ? 0 : -1}
                        autoComplete="new-password"
                        placeholder="Password (min 8 chars)"
                        aria-invalid={!!fieldErrors.password}
                        className={`w-full rounded-2xl border bg-bg-subtle/30 py-3 pr-20 sm:pr-24 pl-10 sm:pl-11 text-sm text-surface-dark placeholder:text-muted transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                          fieldErrors.password
                            ? "border-red-300 focus:ring-red-100"
                            : "border-transparent focus:border-primary focus:ring-primary/20"
                        }`}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="cursor-pointer absolute right-3 sm:right-4 text-xs sm:text-sm font-semibold text-accent hover:text-surface-dark"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    {fieldErrors.password && <p className="pl-2 text-xs text-red-500">{fieldErrors.password}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isSignupPending || activeTab !== "signup"}
                    tabIndex={activeTab === "signup" ? 0 : -1}
                    className="cursor-pointer w-full rounded-2xl bg-gradient-to-r from-primary to-primary-hover py-3.5 text-sm font-bold tracking-wider text-white  transition-all duration-200 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSignupPending ? "CREATING..." : "CREATE ACCOUNT"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Olive Earthy Gradient Showcase Area */}
        <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-surface-dark via-surface-dark to-surface-darker p-10 lg:flex">
          <div className="pointer-events-none absolute inset-0 opacity-15">
            <svg className="h-full w-full" viewBox="0 0 400 600" preserveAspectRatio="none">
              <path d="M0,100 C150,200 250,50 400,150 L400,600 L0,600 Z" fill="none" stroke="var(--color-bg-subtle)" strokeWidth="2" />
              <path d="M0,250 C100,350 300,150 400,300 L400,600 L0,600 Z" fill="none" stroke="var(--color-bg-subtle)" strokeWidth="2" />
            </svg>
          </div>

          <div className="relative flex h-[340px] w-64 flex-col items-center justify-between rounded-[28px] border border-white/20 bg-white/10 p-6 text-center backdrop-blur-md">
            <div className="absolute -left-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-bg-subtle shadow-md">
              <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-subtle/20 shadow-inner">
              <svg className="h-6 w-6 text-bg-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-bg-subtle">Focus & Organize</h3>
              <p className="text-xs leading-relaxed text-secondary">
                Track sprints, update tasks in real-time, and manage deadlines smoothly.
              </p>
            </div>

            <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-bg-subtle">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Task Pulse Workspace
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}