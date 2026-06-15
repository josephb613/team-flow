import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
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
  description: "The all-in-one workspace for teams that ship. Plan, track, and collaborate — all in one place.",
  keywords: ["TeamFlow", "Project Management", "Collaboration", "Tasks", "Kanban", "Team"],
  authors: [{ name: "TeamFlow" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
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
        <Script
          id="strip-cursor-browser-refs"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  const attr = 'data-cursor-ref';
  const strip = (root) => {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.hasAttribute?.(attr)) root.removeAttribute(attr);
    root.querySelectorAll?.('[' + attr + ']').forEach((element) => element.removeAttribute(attr));
  };

  strip(document.documentElement);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        strip(mutation.target);
      } else {
        mutation.addedNodes.forEach(strip);
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [attr],
    childList: true,
    subtree: true,
  });

  window.addEventListener('load', () => {
    window.setTimeout(() => observer.disconnect(), 3000);
  }, { once: true });
})();
            `,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
