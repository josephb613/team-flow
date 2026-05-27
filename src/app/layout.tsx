import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { authClient } from "@/lib/auth/client";
import { SearchDialog } from "@/components/search-dialog";
import { QueryProvider } from "@/components/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TeamFlow - Collaborative Project Management",
  description:
    "The all-in-one workspace for teams that ship. Plan, track, and collaborate — all in one place.",
  keywords: [
    "TeamFlow",
    "Project Management",
    "Collaboration",
    "Tasks",
    "Kanban",
    "Team",
  ],
  authors: [{ name: "TeamFlow" }],
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <NeonAuthUIProvider authClient={authClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>{children}</QueryProvider>
            <SearchDialog />
            <Toaster />
          </ThemeProvider>
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}
