'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

export default function AdminNavLink() {
  const pathname = usePathname();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    const checkLoginStatus = () => {
      if (typeof window !== 'undefined') {
        const token = sessionStorage.getItem('token');
        setIsAdminLoggedIn(!!token);
      }
    };

    // Check status on mount and pathname changes
    checkLoginStatus();

    // Listen for storage or custom sign out events
    window.addEventListener('storage', checkLoginStatus);
    window.addEventListener('chat_session_updated', checkLoginStatus);

    return () => {
      window.removeEventListener('storage', checkLoginStatus);
      window.removeEventListener('chat_session_updated', checkLoginStatus);
    };
  }, [pathname]);

  const targetPath = isAdminLoggedIn ? '/admin/dashboard' : '/admin/login';
  const label = isAdminLoggedIn ? 'Dashboard' : 'Admin';

  return (
    <Link 
      href={targetPath} 
      className="flex items-center gap-1 text-slate-400 hover:text-white transition"
    >
      <ShieldAlert className="w-4 h-4" />
      {label}
    </Link>
  );
}
