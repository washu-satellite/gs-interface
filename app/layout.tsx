import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppContext, { AppContextProvider } from "@/components/app-context";
import { cn } from "@/lib/utils";
import { bStore } from "@/hooks/useAppStore";

export const metadata: Metadata = {
  title: "GS 2.1.0",
  description: "WashU Satellite ground station interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
        <AppContextProvider>
          {children}
        </AppContextProvider>
    </html>
  );
}
