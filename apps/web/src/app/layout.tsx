import type { Metadata } from "next";
import { Noto_Serif, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const serif = Noto_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "700"]
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Komorebi Personal Workstation",
  description: "A modular personal workstation for planning, knowledge, and writing."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${serif.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}

