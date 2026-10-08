import { LoginForm } from "@/app/components/auth/LoginForm";

export default function RegisterPage() {
  return (
    <main className="flex h-screen w-full items-center justify-center">
      <LoginForm defaultTab="signup" />
    </main>
  );
}
