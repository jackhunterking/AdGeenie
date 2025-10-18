import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AdPreviewProvider } from "@/lib/context/ad-preview-context";
import { GoalProvider } from "@/lib/context/goal-context";
import { LocationProvider } from "@/lib/context/location-context";
import { AudienceProvider } from "@/lib/context/audience-context";
import { BudgetProvider } from "@/lib/context/budget-context";
import { AdCopyProvider } from "@/lib/context/ad-copy-context";
import Script from "next/script";
import { COMPANY_NAME } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${COMPANY_NAME} - Create Meta Ads with AI`,
  description: "Create Facebook and Instagram ads with AI-generated content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="beforeInteractive" />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AdPreviewProvider>
              <GoalProvider>
                <LocationProvider>
                  <AudienceProvider>
                    <BudgetProvider>
                      <AdCopyProvider>
                        {children}
                      </AdCopyProvider>
                    </BudgetProvider>
                  </AudienceProvider>
                </LocationProvider>
              </GoalProvider>
            </AdPreviewProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
