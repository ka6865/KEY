import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "THE KEY | 전국 방탈출 아카이브 & 정교한 기록 도구",
  description: "내 손안의 가장 완벽한 방탈출 아카이브. 사진 인증 기반의 고품격 후기, 친구와 함께 기록하는 크루 기능, 전국 테마 평점을 만나보세요.",
  keywords: ["방탈출", "방탈출 기록", "방탈출 어플", "방탈출 후기", "방탈출 평점", "방탈출 카페", "방탈출 테마", "방탈출 추천", "방탈출 동아리", "THE KEY"],
  manifest: "/manifest.json",
  openGraph: {
    title: "THE KEY | 전국 방탈출 아카이브",
    description: "사진 인증으로 증명하는 진짜 방탈출 후기. 지금 친구들과 함께 기록을 시작하세요.",
    url: "https://thekey-log.vercel.app",
    siteName: "THE KEY",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "THE KEY 서비스 이미지",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${inter.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
