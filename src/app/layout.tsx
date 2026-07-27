import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} dark`}
    >
      <body>
        {children}
        <Toaster
          theme="dark"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: "#0b1219",
              border: "1px solid rgba(137, 208, 216, 0.16)",
            },
          }}
        />
      </body>
    </html>
  );
}
