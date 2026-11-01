import type { Metadata, Viewport } from "next";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "JamSpot.lk – Book music studios in Sri Lanka",
  description:
    "Find and book music practice studios in Sri Lanka. Studio owners list rooms, timetables and prices; musicians book slots in seconds.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ea580c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        <Header />
        <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:pt-6">{children}</main>
      </body>
    </html>
  );
}
