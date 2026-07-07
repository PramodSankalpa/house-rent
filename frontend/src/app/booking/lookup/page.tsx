'use client';

import { useState } from 'react';
import { Calendar, Search, Waves, MapPin, Loader, FileText, CheckCircle, ShieldAlert, Sparkles, MessageSquare } from 'lucide-react';
import api from '../../../utils/api';
import Link from 'next/link';

interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  createdAt: string;
}

interface Booking {
  id: string;
  invoiceNumber: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  amountPaid: number;
  discountAmount: number;
  bookingStatus: string;
  paymentStatus: string;
  guest: { name: string; email: string; phone: string };
  property: { name: string; address: string };
  payments: Payment[];
  notifications?: Array<{ id: string; channel: string; content: string; status: string; createdAt: string }>;
}

export default function GuestLookupPage() {
  const [email, setEmail] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [bookingList, setBookingList] = useState<any[] | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    setBooking(null);
    setBookingList(null);

    try {
      const response = await api.get('/bookings/search/lookup', {
        params: {
          email: email.trim(),
          invoiceNumber: invoiceNumber ? invoiceNumber.trim() : '',
        },
      });
      const data = response.data;
      if (data.type === 'LIST') {
        setBookingList(data.bookings);
      } else {
        setBooking(data);
        if (data.conversationId) {
          localStorage.setItem('chat_conversation_id', data.conversationId);
          window.dispatchEvent(new Event('chat_session_updated'));
        }
      }
    } catch (err) {
      setError(err.message || 'No booking found matching these credentials.');
    } finally {
      setLoading(false);
    }
  };

  const getMinNights = (checkInStr: string, checkOutStr: string) => {
    const start = new Date(checkInStr);
    const end = new Date(checkOutStr);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-white font-display">Manage Your Reservation</h1>
        <p className="text-slate-400 mt-2 text-sm">Retrieve receipts, stay statuses, and invoice breakdowns.</p>
      </div>

      {/* Query Search Form */}
      <div className="max-w-xl mx-auto p-6 rounded-3xl glass-card border border-white/10 shadow-2xl">
        <form onSubmit={handleLookup} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Guest Email</label>
              <input
                type="email"
                required
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-3 px-4 text-white text-sm focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 font-mono">Invoice Number</label>
              <input
                type="text"
                placeholder="e.g. INV-20260619-XXXX"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-3 px-4 text-white text-sm focus:outline-none transition"
              />
              <span className="text-[10px] text-slate-500 mt-1.5 block">Leave blank to find all bookings associated with your email.</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-slate-950 font-bold rounded-2xl transition duration-300 flex justify-center items-center gap-2 shadow-lg"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Retrieve Booking
          </button>
        </form>
      </div>

      {error && (
        <div className="max-w-xl mx-auto p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-2xl flex gap-2 justify-center">
          <ShieldAlert className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Booking List View (Email-only search results) */}
      {bookingList && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white/5 border border-white/5 p-4 rounded-2xl">
            <span className="text-xs text-slate-400">
              Found <strong className="text-white">{bookingList.length}</strong> reservation{bookingList.length > 1 ? 's' : ''} for <strong className="text-white">{email}</strong>
            </span>
            <button
              onClick={() => {
                setBookingList(null);
                setEmail('');
                setInvoiceNumber('');
              }}
              className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 hover:border-rose-400 text-rose-400 hover:text-slate-950 text-xs font-bold rounded-xl transition duration-300"
            >
              Clear Search
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookingList.map((b) => (
              <div key={b.id} className="p-6 rounded-3xl glass-card border border-white/10 hover:border-sky-500/30 transition duration-300 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Reference</span>
                      <h4 className="text-base font-bold text-white font-mono mt-0.5">{b.invoiceNumber}</h4>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                      b.bookingStatus === 'CONFIRMED'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : b.bookingStatus === 'CANCELLED'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      {b.bookingStatus}
                    </span>
                  </div>

                  <div className="text-sm">
                    <p className="font-semibold text-white">{b.property.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {b.checkIn.split('T')[0]} to {b.checkOut.split('T')[0]}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Price</span>
                    <span className="text-sky-400 font-bold text-sm">${b.totalAmount}</span>
                  </div>
                  <button
                    onClick={async () => {
                      setLoading(true);
                      setError(null);
                      try {
                        const response = await api.get('/bookings/search/lookup', {
                          params: {
                            email: email.trim(),
                            invoiceNumber: b.invoiceNumber.trim(),
                          },
                        });
                        const data = response.data;
                        setBooking(data);
                        setBookingList(null);
                        if (data.conversationId) {
                          localStorage.setItem('chat_conversation_id', data.conversationId);
                          window.dispatchEvent(new Event('chat_session_updated'));
                        }
                      } catch (err: any) {
                        setError(err.response?.data?.message || err.message || 'Could not load booking details.');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="py-2 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-xl transition duration-300"
                  >
                    Manage Booking
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Dashboard View */}
      {booking && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white/5 border border-white/5 p-4 rounded-2xl">
            <span className="text-xs text-slate-400">Viewing Reservation for <strong className="text-white">{booking.guest.name}</strong></span>
            <button
              onClick={() => {
                setBooking(null);
                setEmail('');
                setInvoiceNumber('');
                localStorage.removeItem('chat_conversation_id');
                window.dispatchEvent(new Event('chat_session_updated'));
              }}
              className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 hover:border-rose-400 text-rose-400 hover:text-slate-950 text-xs font-bold rounded-xl transition duration-300"
            >
              Close Booking View
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start animate-fade-in">
          
          {/* Main Status & Receipt Panel */}
          <div className="md:col-span-3 space-y-6">
            <div className="p-6 rounded-3xl glass-card border border-white/5 space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Reference</span>
                  <h3 className="text-lg font-bold text-white mt-1 font-mono">{booking.invoiceNumber}</h3>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                    booking.bookingStatus === 'CONFIRMED'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : booking.bookingStatus === 'CANCELLED'
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    {booking.bookingStatus}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                    booking.paymentStatus === 'PAID'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    Payment: {booking.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Stay timeline details */}
              <div className="grid grid-cols-2 gap-6 bg-white/5 p-4 rounded-2xl border border-white/5">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Check-in</span>
                  <span className="text-base font-bold text-white mt-1 block">{booking.checkIn.split('T')[0]}</span>
                  <span className="text-[10px] text-slate-500 mt-1 block">After 2:00 PM</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Check-out</span>
                  <span className="text-base font-bold text-white mt-1 block">{booking.checkOut.split('T')[0]}</span>
                  <span className="text-[10px] text-slate-500 mt-1 block">Before 11:00 AM</span>
                </div>
              </div>

              {/* Address details */}
              <div className="flex gap-3 items-start text-sm">
                <MapPin className="w-5 h-5 text-sky-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-white">{booking.property.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{booking.property.address}</p>
                </div>
              </div>
            </div>

            {/* Transaction Logs card */}
            <div className="p-6 rounded-3xl glass-card border border-white/5 space-y-4">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-sky-400" />
                Payments Log
              </h4>

              <div className="space-y-3">
                {booking.payments.map((p) => (
                  <div key={p.id} className="p-3.5 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-white">Processed ${p.amount}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Method: {p.paymentMethod} | Reference: {p.transactionId}</p>
                    </div>
                    <span className="text-slate-400 font-semibold">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notification & Messages Log card */}
            <div className="p-6 rounded-3xl glass-card border border-white/5 space-y-4">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-sky-400" />
                Notification & Message Logs (Simulated Email / SMS)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                To facilitate verification of email and SMS communications on local environments, all dispatched guest alerts are logs:
              </p>

              <div className="space-y-3">
                {booking.notifications && booking.notifications.map((n) => (
                  <div key={n.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                        n.channel === 'EMAIL' 
                          ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' 
                          : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                      }`}>
                        {n.channel}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                        n.status === 'SENT'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : n.status === 'FAILED'
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        {n.status}
                      </span>
                    </div>
                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed select-all font-mono text-[11px]">
                      {n.content}
                    </p>
                    <span className="text-[10px] text-slate-500 block text-right">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
                {(!booking.notifications || booking.notifications.length === 0) && (
                  <p className="text-xs text-slate-500 text-center py-4">No alerts logged for this booking reference.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Columns: Invoice breakdown */}
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl glass-card border border-white/5 space-y-6">
              <h4 className="font-semibold text-white border-b border-white/5 pb-3 font-display">Charges Summary</h4>

              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Nightly rate subtotal</span>
                  <span className="font-semibold text-white">${booking.totalAmount + booking.discountAmount}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Duration</span>
                  <span className="font-semibold text-white">{getMinNights(booking.checkIn, booking.checkOut)} Nights</span>
                </div>

                {booking.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 text-xs">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Long-stay discount
                    </span>
                    <span>-${booking.discountAmount}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-white pt-3 border-t border-white/5 text-base font-display">
                  <span>Total Stay Price</span>
                  <span className="text-sky-400">${booking.totalAmount}</span>
                </div>

                <div className="flex justify-between text-xs pt-1">
                  <span className="text-slate-400">Amount Paid</span>
                  <span className="font-semibold text-emerald-400">${booking.amountPaid}</span>
                </div>
              </div>
            </div>

            {/* Support Box */}
            <div className="p-5 bg-sky-500/10 border border-sky-400/20 rounded-3xl flex items-start gap-4">
              <MessageSquare className="w-5 h-5 text-sky-400 mt-1 flex-shrink-0" />
              <div>
                <h5 className="font-semibold text-white text-sm">Concierge Assistance</h5>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Need to check in early or requests airport transport? Trigger support by using the floating web chat in the bottom-right corner.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
      )}
    </div>
  );
}
