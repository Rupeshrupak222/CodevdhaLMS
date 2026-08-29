import React from 'react';
import './globals.css';
import { ClientLayout } from './ClientLayout';

export const metadata = {
  title: 'CodVedha LMS | Master 4.0 Technologies',
  description: 'CodVedha Learning Management System - Career Transformation Platform',
  icons: {
    icon: '/assets/logo-codvedha.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-900 dark:text-slate-50 bg-slate-50 dark:bg-slate-950 min-h-screen">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
