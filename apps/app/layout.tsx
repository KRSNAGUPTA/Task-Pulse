import { Fira_Sans, Nova_Script } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "./components/providers/AuthProvider";
import { Toaster } from "@/components/ui/toast";

const firaSans = Fira_Sans({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sniglet = Nova_Script({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Task Pulse",
  description: "Manage your task with ease of MCP",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${firaSans.variable} ${sniglet.variable} h-full antialiased`}
    >
        <body className="min-h-full flex flex-col">
      <AuthProvider>
        <Toaster/>
          {children}
      </AuthProvider>
          </body>
    </html>
  );
}
