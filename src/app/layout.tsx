import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PokeRecipe Hub",
  description: "Discover and share Poke recipes built by the community.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
