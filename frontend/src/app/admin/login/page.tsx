'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, Loader, ArrowRight } from 'lucide-react';
import api from '../../../utils/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin portal will always prompt for credentials upon accessing this page.

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, user } = response.data;
      
      sessionStorage.setItem('token', accessToken);
      sessionStorage.setItem('admin_user', JSON.stringify(user));
      
      router.push('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid administrative credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[600px] flex items-center justify-center px-6">
      <div className="w-full max-w-md p-8 rounded-3xl glass-card border border-white/10 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex p-3.5 bg-sky-500/10 border border-sky-400/20 text-sky-400 rounded-2xl mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold font-display text-white">Host Portal</h2>
          <p className="text-xs text-slate-400 mt-2">Access Ahungalla Beach House PMS modules</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-400" />
            <input
              type="email"
              required
              placeholder="Host Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none transition"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-400" />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-slate-900 font-bold rounded-2xl transition duration-300 flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Log In'}
            <ArrowRight className="w-4.5 h-4.5" />
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-[10px] text-slate-500">
            For local testing, seed values are: <br/>
            <span className="font-semibold text-slate-400">admin@beachhouse.com / admin123</span>
          </p>
        </div>

      </div>
    </div>
  );
}
