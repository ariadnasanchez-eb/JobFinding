import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Coach: apply strategically",
  description:
    "Your AI career coach analyzes your experience against real opportunities and tells you which jobs are worth your time.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
