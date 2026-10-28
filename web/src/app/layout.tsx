import type { Metadata } from "next"
import { Geist_Mono, Host_Grotesk } from "next/font/google"
import "./globals.css"

const hostGrotesk = Host_Grotesk({
  subsets: ["latin"],
  variable: "--font-host-grotesk",
  weight: ["400", "500", "600", "700"],
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "Heartwood — Duress-Aware Shielded Zcash Wallet",
  description:
    "Hidden-volume dual-identity Zcash wallet with in-band ZIP-302 distress signaling.",
}

export type RootLayoutProps = {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`${hostGrotesk.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen bg-white text-neutral-950 antialiased">
        {children}
      </body>
    </html>
  )
}
