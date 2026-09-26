import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Mono, Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";

const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const display = Playfair_Display({ subsets: ["latin"], variable: "--font-display" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "NewLook — AI Hairstyle Advisor", template: "%s | NewLook" },
  description: "Discover hairstyles that suit your face and hair, try them on, and get a salon-ready guide.",
  openGraph: { title: "NewLook — AI Hairstyle Advisor", description: "See it before you cut it.", type: "website" },
};

function Document({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}><body>{children}</body></html>;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const content = <Document>{children}</Document>;
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <ClerkProvider>{content}</ClerkProvider> : content;
}
