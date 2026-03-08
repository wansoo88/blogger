import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blogger Ops",
  description: "Local admin app for Blogger content operations",
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
