import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";

import "./globals.css";

const serif = Noto_Serif_SC({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "700"]
});

const sans = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "700"]
});

export const metadata: Metadata = {
  title: "Komorebi 个人工作站",
  description: "一个用于规划、知识管理与写作的模块化个人工作站。"
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
