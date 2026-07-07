'use client';

import { useState, useEffect } from 'react';
import { DollarSign, CalendarRange, Users, Sparkles, Check, X, ShieldAlert, Loader } from 'lucide-react';
import api from '../../../utils/api';

interface Booking {
  id: string;
  invoiceNumber: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  bookingStatus: string;
  paymentStatus: string;
  guest: {
    name: string;
    email: string;
    phone: string;
    _count?: { bookings: number };
  };
  property: { name: string };
}

interface Stats {
  totalRevenue: number;
  bookingsCount: number;
  occupancyRate: number;
  recentBookings: Booking[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const statsRes = await api.get('/bookings/stats');
      setStats(statsRes.data);

      const bookingsRes = await api.get('/bookings');
      setBookings(bookingsRes.data);

      const notifRes = await api.get('/bookings/logs/notifications');
      setNotifications(notifRes.data);
    } catch (err) {
      console.error('Failed to load dashboard logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleUpdateStatus = async (bookingId: string, status: string) => {
    try {
      await api.put(`/bookings/${bookingId}/status`, { status });
      await loadDashboardData(); // Reload stats & tables
    } catch (err) {
      alert('Error updating booking state: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex justify-center items-center gap-2 text-sky-400">
        <Loader className="w-8 h-8 animate-spin" />
        <span>Loading stats records...</span>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Earnings',
      value: `$${stats?.totalRevenue || 0}`,
      desc: 'Sum of all processed transactions',
      icon: DollarSign,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Occupancy Rate',
      value: `${stats?.occupancyRate || 0}%`,
      desc: 'Days booked in next 30 days',
      icon: CalendarRange,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
    {
      title: 'Confirmed Reservations',
      value: `${stats?.bookingsCount || 0}`,
      desc: 'Active guest check-ins',
      icon: Users,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold font-display text-white">Dashboard Overview</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time vacation rental property analytics.</p>
      </div>

      {/* Analytics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="p-6 rounded-3xl glass-card border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{card.title}</span>
                <span className="text-3xl font-bold text-white font-display mt-2 block">{card.value}</span>
                <span className="text-[11px] text-slate-500 mt-1 block">{card.desc}</span>
              </div>
              <div className={`p-4 rounded-2xl border ${card.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bookings log table */}
      <div className="p-6 rounded-3xl glass-card border border-white/5 space-y-6">
        <h3 className="text-lg font-semibold text-white font-display">Recent Reservations</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                <th className="pb-4">Invoice</th>
                <th className="pb-4">Guest</th>
                <th className="pb-4">Stay Dates (YYYY-MM-DD)</th>
                <th className="pb-4">Nights</th>
                <th className="pb-4">Amount</th>
                <th className="pb-4">Booking State</th>
                <th className="pb-4">Payment</th>
                <th className="pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-white/5 transition">
                  <td className="py-4 font-mono text-xs">{b.invoiceNumber}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{b.guest.name}</p>
                      {b.guest._count && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          b.guest._count.bookings > 1
                            ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                            : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                        }`}>
                          {b.guest._count.bookings > 1 ? `Returning (${b.guest._count.bookings})` : 'New'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{b.guest.email} | {b.guest.phone}</p>
                  </td>
                  <td className="py-4 text-xs">
                    {b.checkIn.split('T')[0]} to {b.checkOut.split('T')[0]}
                  </td>
                  <td className="py-4 text-xs font-semibold text-slate-300">
                    {Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24))}
                  </td>
                  <td className="py-4 font-semibold text-white">${b.totalAmount}</td>
                  <td className="py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      b.bookingStatus === 'CONFIRMED'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : b.bookingStatus === 'CANCELLED'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      {b.bookingStatus}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      b.paymentStatus === 'PAID'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : b.paymentStatus === 'FAILED'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td className="py-4 text-right space-x-2">
                    {b.bookingStatus === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(b.id, 'CONFIRMED')}
                          className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition"
                          title="Confirm Reservation"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(b.id, 'CANCELLED')}
                          className="p-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-slate-950 border border-rose-500/20 rounded-lg transition"
                          title="Cancel Reservation"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {b.bookingStatus === 'CONFIRMED' && (
                      <button
                        onClick={() => handleUpdateStatus(b.id, 'CANCELLED')}
                        className="px-2.5 py-1 text-xs bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 hover:border-rose-400 text-rose-400 hover:text-slate-950 font-semibold rounded-lg transition"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 text-sm">
                    No reservations logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notifications Queue Log Table */}
      <div className="p-6 rounded-3xl glass-card border border-white/5 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white font-display">System Notifications Log (BullMQ Queue)</h3>
          <p className="text-xs text-slate-500 mt-1">Asynchronous dispatch logging. Emails/SMS are simulated in console stdout logs when local SMTP configs are empty.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                <th className="pb-4">Timestamp</th>
                <th className="pb-4">Channel</th>
                <th className="pb-4">Notification Type</th>
                <th className="pb-4">Content Summary</th>
                <th className="pb-4 text-right">Delivery Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {notifications.map((n) => (
                <tr key={n.id} className="hover:bg-white/5 transition text-xs">
                  <td className="py-4 text-[10px] text-slate-500">
                    {new Date(n.createdAt).toLocaleString()}
                  </td>
                  <td className="py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      n.channel === 'EMAIL'
                        ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      {n.channel}
                    </span>
                  </td>
                  <td className="py-4 font-semibold text-slate-300">{n.type}</td>
                  <td className="py-4 text-slate-400 max-w-xs truncate" title={n.content}>
                    {n.content}
                  </td>
                  <td className="py-4 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      n.status === 'SENT'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : n.status === 'FAILED'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      {n.status}
                    </span>
                    {n.errorLog && (
                      <p className="text-[9px] text-rose-400 mt-1 italic max-w-xs truncate">{n.errorLog}</p>
                    )}
                  </td>
                </tr>
              ))}
              {notifications.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500 text-sm">
                    No system notification records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
