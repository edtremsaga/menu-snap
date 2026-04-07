import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Menu Snap",
  description: "Take or upload a menu photo and read a structured version of it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
