import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Pre Etat Date",
  description: "Socle technique de l'application Pre Etat Date.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
