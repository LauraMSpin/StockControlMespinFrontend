'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isLoginPage = pathname === '/login';
  const isAuthenticated = status === 'authenticated' && !!session;

  // Login page: render without sidebar
  if (isLoginPage || !isAuthenticated) {
    return <>{children}</>;
  }

  // Authenticated pages: render with sidebar
  return (
    <div className="flex h-screen bg-[#FAF8F5]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto ml-64">
        {children}
      </main>
    </div>
  );
}
