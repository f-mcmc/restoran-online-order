import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RESTAURANT } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: `${RESTAURANT.name} — onlayn buyurtma`,
  description: "Palov, somsa, shashlik va boshqa taomlarni onlayn buyurtma qiling. Yetkazib berish yoki olib ketish.",
};

export const viewport: Viewport = { themeColor: "#1d5a47" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
