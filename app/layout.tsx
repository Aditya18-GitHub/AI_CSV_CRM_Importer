import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CRM Importer — AI-Powered Universal CSV Import',
  description:
    'Upload CSV files from any CRM, marketing platform, or spreadsheet and intelligently convert them into a standardized CRM format using AI.',
  openGraph: {
    title: 'CRM Importer — AI-Powered Universal CSV Import',
    description:
      'Upload CSV files from any CRM, marketing platform, or spreadsheet and intelligently convert them into a standardized CRM format using AI.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
