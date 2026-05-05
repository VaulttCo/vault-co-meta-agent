import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PortalShell } from "@/components/layout/PortalShell";
import { PlanProvider } from "@/components/PlanProvider";
import { IntelligenceProvider } from "@/components/IntelligenceProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vault Co — Veronica",
  description: "AI-powered Meta advertising management for Vault Co",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex bg-[#0d0e12] text-[#e8eaf0]">
        <ThemeProvider>
          <AuthProvider>
            <PlanProvider>
              <IntelligenceProvider>
                <PortalShell>
                  {children}
                </PortalShell>
              </IntelligenceProvider>
            </PlanProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
