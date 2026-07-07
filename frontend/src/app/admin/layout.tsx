'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, MessageSquare, DollarSign, Settings, LogOut, Loader, Waves, User } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [adminName, setAdminName] = useState('Host');

  // Guard routing checks
  useEffect(() => {
    // Check if user is trying to access login page itself
    if (pathname === '/admin/login') {
      setAuthorized(true);
      return;
    }

    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('token');
      const userJSON = sessionStorage.getItem('admin_user');
      
      if (!token) {
        router.push('/admin/login');
      } else {
        if (userJSON) {
          try {
            const user = JSON.parse(userJSON);
            setAdminName(user.name);
          } catch (e) {}
        }
        setAuthorized(true);
      }
    }
  }, [pathname, router]);

  const handleSignOut = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('admin_user');
    localStorage.removeItem('chat_conversation_id');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('chat_session_updated'));
    }
    router.push('/admin/login');
  };

  // If path is login, don't show admin sidebars
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 text-sky-400 animate-spin" />
          <p className="text-slate-400 text-sm tracking-wider uppercase font-semibold">Authenticating Session...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Chat Inbox', path: '/admin/chat', icon: MessageSquare },
    { name: 'Pricing Editor', path: '/admin/pricing', icon: DollarSign },
    { name: 'Site Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-slate-900 flex flex-col justify-between p-6">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2 border-b border-white/5 pb-6">
            <Waves className="w-6 h-6 text-sky-400" />
            <span className="font-bold text-sm tracking-widest font-display text-white uppercase">Ahungalla PMS</span>
          </div>

          {/* Menus */}
          <nav className="flex flex-col gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Area */}
        <div className="border-t border-white/5 pt-6 space-y-4">
          <div className="flex items-center gap-2 px-2">
            <User className="w-5 h-5 text-sky-400" />
            <div>
              <p className="text-xs font-semibold text-white">{adminName}</p>
              <p className="text-[10px] text-slate-500">Property Host</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 rounded-2xl transition"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Admin Content Container */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Top Bar with Highly Visible Sign Out */}
          <div className="flex justify-end items-center gap-4 border-b border-white/5 pb-4">
            <span className="text-xs text-slate-400">Logged in as <strong className="text-slate-200">{adminName}</strong></span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500 hover:text-slate-950 border border-rose-500/20 hover:border-rose-400 text-rose-400 text-xs font-bold rounded-xl transition duration-300 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
