import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { Toaster } from 'sonner'

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
})

export const metadata: Metadata = {
    title: {
        template: '%s | VyaparAI',
        default: 'VyaparAI – India\'s First AI Business Co-Pilot',
    },
    description:
        'AI-powered Business Co-Pilot for Indian MSMEs. OCR invoice extraction, fraud detection, cashflow forecasting, contract risk analysis, and RAG business chat.',
    keywords: ['MSME', 'AI', 'invoice', 'GST', 'India', 'business intelligence', 'cashflow'],
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    openGraph: {
        title: 'VyaparAI – India\'s First AI Business Co-Pilot',
        description: 'AI-powered business intelligence for Indian MSMEs',
        type: 'website',
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning className={inter.variable}>
            <body className="min-h-screen bg-background font-sans antialiased">
                <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                    <QueryProvider>
                        {children}
                        <Toaster
                            position="top-right"
                            toastOptions={{
                                style: {
                                    background: 'hsl(222 47% 7%)',
                                    border: '1px solid hsl(222 47% 13%)',
                                    color: 'hsl(213 31% 91%)',
                                },
                            }}
                        />
                    </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
