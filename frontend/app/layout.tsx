import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "./i18n/LanguageContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "可玩广告制作工具 | Playable Ads Maker",
  description: "创建交互式可玩广告，支持多平台 | Create interactive playable ads for multiple platforms",
  alternates: {
    languages: {
      'zh-CN': '/zh',
      'en-US': '/en',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body className={inter.className}>
        <LanguageProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
