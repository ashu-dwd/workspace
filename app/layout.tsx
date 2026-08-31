import type { Metadata } from "next";
import "./globals.css";
import ClientApp from "./client-app";

export const metadata: Metadata = {
  title: "Workspace",
  description: "a next gen note taking app",
  icons: [{ rel: "icon", url: "/grid.png" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientApp>{children}</ClientApp>
      </body>
    </html>
  );
}
