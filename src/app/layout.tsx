import type {Metadata} from 'next';
import './globals.css';
import { ScheduleProvider } from '@/context/schedule-context';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'EduSched',
  description: 'AI-Powered Timetable Generation and Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet"></link>
      </head>
      <body className="font-body antialiased">
        <ScheduleProvider>
          {children}
          <Toaster />
        </ScheduleProvider>
      </body>
    </html>
  );
}
