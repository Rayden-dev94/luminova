import type { Metadata } from 'next'
import { Playfair_Display } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'LUMINOVA',
  description: 'Concept Design by Wevin',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${playfair.variable} h-full`}>
      <body className="min-h-screen flex items-center justify-center">
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}
