import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PT Putri Kharisma Jaya — Finance",
  description: "Sistem manajemen keuangan dan operasional PT Putri Kharisma Jaya",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 font-sans">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto md:pt-0 pt-[calc(3.5rem+env(safe-area-inset-top))]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
