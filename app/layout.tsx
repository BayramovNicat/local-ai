import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fira_Code } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "local.ai | Private, Local-First AI Assistant",
  description: "Fast, private, and secure AI chat that runs entirely in your browser using WebGPU. No data leaves your device.",
  keywords: ["local ai", "browser ai", "private assistant", "webgpu", "llama", "qwen", "phi-3"],
  authors: [{ name: "local.ai" }],
  openGraph: {
    title: "local.ai | Private, Local-First AI Assistant",
    description: "Fast, private, and secure AI chat that runs entirely in your browser using WebGPU.",
    type: "website",
    siteName: "local.ai",
  },
  twitter: {
    card: "summary_large_image",
    title: "local.ai | Private, Local-First AI Assistant",
    description: "Fast, private, and secure AI chat that runs entirely in your browser using WebGPU.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${firaCode.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
