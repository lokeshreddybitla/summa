import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Summa — AI Content Summarizer',
  description: 'Summarize any content — text, PDFs, or images — instantly with AI. Normal and Exam mode with flashcards.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Summa — AI Content Summarizer',
    description: 'Summarize text, PDFs, and images in seconds. Exam mode with bullet points and flashcards.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1E1E2A',
              color: '#E8E8F0',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'var(--font-body)',
            },
            success: { iconTheme: { primary: '#00D4AA', secondary: '#0A0A0F' } },
            error: { iconTheme: { primary: '#FF4D6D', secondary: '#0A0A0F' } },
          }}
        />
      </body>
    </html>
  );
}
