import { Geist } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata = {
  title: 'AgentHire - AI Recruitment Platform',
  description:
    'Spec-driven multi-agent recruitment platform: AI workflows, RAG matching, human approval checkpoints.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased bg-zinc-50 text-zinc-900`}>
        {children}
      </body>
    </html>
  );
}
