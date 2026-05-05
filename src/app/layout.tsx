import type { Metadata } from "next";
import { Rajdhani, Manrope } from "next/font/google";
import "./globals.css";
import { PortalShell } from "@/components/layout/PortalShell";
import { PlanProvider } from "@/components/PlanProvider";
import { IntelligenceProvider } from "@/components/IntelligenceProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Vault Co — Veronica | Internal Growth Portal",
  description: "Veronica by Vault Co — AI Growth Operator. Internal command center for campaign strategy, client intelligence, and approval-ready growth plans.",
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
      className={`${rajdhani.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="h-full flex bg-[#05070B] text-[#f8f8f7]">
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
