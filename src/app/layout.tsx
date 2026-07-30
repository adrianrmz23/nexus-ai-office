import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppToaster } from "@/components/theme/app-toaster";
import { ThemeProvider } from "@/components/theme/theme-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeBootstrapScript = `
(function () {
  try {
    var stored = localStorage.getItem("nexus-theme");
    var preference = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    var resolved = preference === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : preference;
    var root = document.documentElement;
    root.dataset.theme = resolved;
    root.dataset.themePreference = preference;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
  } catch (_) {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }
})();`;

export const metadata: Metadata = {
  title: {
    default: "NEXUS AI Office",
    template: "%s · NEXUS",
  },
  description:
    "Centro de operaciones para proyectos, agentes especializados y modelos de inteligencia artificial.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
