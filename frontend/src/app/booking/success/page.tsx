'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Calendar, Waves, MapPin, MessageSquare, Loader, ArrowRight } from 'lucide-react';
import api from '../../../utils/api';

interface Booking {
  id: string;
  invoiceNumber: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  paymentStatus: string;
  guest: { name: string; email: string };
  property: { name: string; address: string };
}

export default function BookingSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('bookingId');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) {
      router.push('/');
      return;
    }

    async function loadBooking() {
      try {
        const response = await api.get(`/bookings/${bookingId}`);
        setBooking(response.data);
        if (response.data.conversationId) {
          localStorage.setItem('chat_conversation_id', response.data.conversationId);
          window.dispatchEvent(new Event('chat_session_updated'));
        }
      } catch (err) {
        console.error('Failed to load booking success details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBooking();
  }, [bookingId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 text-sky-400 animate-spin" />
          <p className="text-slate-400 text-sm tracking-wider uppercase">Fetching booking records...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-[500px] flex items-center justify-center text-center">
        <div>
          <h2 className="text-2xl font-bold font-display text-white">Record Not Found</h2>
          <p className="text-slate-400 mt-2">Could not retrieve booking confirmation.</p>
          <Link href="/" className="inline-block mt-6 px-6 py-3 bg-sky-500 text-slate-950 font-bold rounded-2xl">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center">
      {/* Success Badge */}
      <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full mb-6">
        <Check className="w-12 h-12" />
      </div>

      <h1 className="text-4xl font-extrabold text-white font-display">Stay Confirmed!</h1>
      <p className="text-slate-300 mt-3 text-sm leading-relaxed max-w-sm mx-auto">
        Thank you, {booking.guest.name}! Your reservation at {booking.property.name} is confirmed. A receipt and stay details are sent to {booking.guest.email}.
      </p>

      {/* Booking Details Card */}
      <div className="mt-10 p-6 rounded-3xl glass-card border border-white/5 text-left space-y-4 shadow-2xl">
        <h4 className="font-semibold text-white border-b border-white/5 pb-2.5">Reservation Details</h4>
        
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Invoice Number</span>
          <span className="font-mono font-semibold text-white">{booking.invoiceNumber}</span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Dates (YYYY-MM-DD)</span>
          <span className="font-semibold text-white flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            {booking.checkIn.split('T')[0]} to {booking.checkOut.split('T')[0]}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Address</span>
          <span className="font-semibold text-white flex items-center gap-1 max-w-[70%] truncate">
            <MapPin className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            {booking.property.address}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Total Charges</span>
          <span className="font-bold text-sky-400 text-sm">${booking.totalAmount}</span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Payment Status</span>
          <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold rounded-full text-[10px]">
            {booking.paymentStatus}
          </span>
        </div>
      </div>

      {/* Guest Portal link */}
      <div className="mt-6 p-5 bg-white/5 border border-white/10 rounded-3xl text-left space-y-2.5">
        <h5 className="font-semibold text-white text-sm">Guest Lookup Portal</h5>
        <p className="text-xs text-slate-400 leading-relaxed">
          Keep track of your receipt details and stay status anytime. Bookmark this direct portal link:
        </p>
        <Link
          href={`/booking/lookup?email=${booking.guest.email}&invoiceNumber=${booking.invoiceNumber}`}
          className="text-sky-400 hover:text-sky-300 font-semibold text-xs underline break-all block"
        >
          http://localhost:3000/booking/lookup?email={booking.guest.email}&invoiceNumber={booking.invoiceNumber}
        </Link>
      </div>

      {/* Floating Chat Onboarding Promotion */}
      <div className="mt-8 p-5 bg-sky-500/10 border border-sky-400/20 rounded-2xl flex items-start gap-4 text-left">
        <MessageSquare className="w-5 h-5 text-sky-400 mt-1 flex-shrink-0" />
        <div>
          <h5 className="font-semibold text-white text-sm">Need Check-in Help?</h5>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            We already started a conversation thread for you! Open the floating chat widget on the bottom right to message us about airport transfers or key lockbox keys.
          </p>
        </div>
      </div>

      <div className="mt-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold rounded-2xl transition duration-300"
        >
          Back to Homepage
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
