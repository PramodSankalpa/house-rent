'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldCheck, Calendar, DollarSign, User, Mail, Phone, CreditCard, Sparkles, Loader, CheckCircle } from 'lucide-react';
import api from '../../../utils/api';

interface Property {
  id: string;
  name: string;
  basePrice: number;
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const propertyId = searchParams.get('propertyId');
  const checkIn = searchParams.get('checkIn');
  const checkOut = searchParams.get('checkOut');

  const [property, setProperty] = useState<Property | null>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (!propertyId || !checkIn || !checkOut) {
      router.push('/');
      return;
    }

    async function loadCheckoutData() {
      try {
        const propRes = await api.get(`/properties/${propertyId}`);
        setProperty(propRes.data);

        const priceRes = await api.get('/pricing/calculate', {
          params: { propertyId, checkIn, checkOut },
        });
        setPricing(priceRes.data);
      } catch (err) {
        console.error('Checkout loading error:', err);
        router.push('/');
      } finally {
        setLoading(false);
      }
    }
    loadCheckoutData();
  }, [propertyId, checkIn, checkOut, router]);

  // Submit Booking reservation
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !propertyId || !checkIn || !checkOut) return;
    setSubmitLoading(true);

    try {
      const response = await api.post('/bookings', {
        propertyId,
        checkIn,
        checkOut,
        guestName: name,
        guestEmail: email,
        guestPhone: phone,
      });
      setCreatedBooking(response.data);
      setFormSubmitted(true);
    } catch (err) {
      alert('Failed to register booking: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Mock Payment Trigger (Dev Mode)
  const handleMockPayment = async () => {
    if (!createdBooking) return;
    setPaymentLoading(true);

    try {
      await api.post(`/payment/mock-pay/${createdBooking.id}`);
      router.push(`/booking/success?bookingId=${createdBooking.id}`);
    } catch (err) {
      alert('Mock payment failed: ' + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Live Gateway redirect (Stripe)
  const handleStripePayment = async () => {
    if (!createdBooking) return;
    setPaymentLoading(true);

    try {
      const response = await api.post(`/payment/checkout/${createdBooking.id}`);
      if (response.data.url) {
        // If the URL returned is the mock pay checkout page, load mock pay
        window.location.href = response.data.url;
      }
    } catch (err) {
      alert('Stripe redirect failed: ' + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 text-sky-400 animate-spin" />
          <p className="text-slate-400 text-sm tracking-wider uppercase">Preparing checkout details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-white font-display">Confirm Your Reservation</h1>
        <p className="text-slate-400 mt-2 text-sm">Review stay parameters and secure checkout keys.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
        
        {/* Left Side: Forms */}
        <div className="lg:col-span-3 space-y-6">
          {!formSubmitted ? (
            // Contact Information
            <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-sky-400" />
                Guest Details
              </h3>

              <form onSubmit={handleSubmitBooking} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter guest name"
                    className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-3 px-4 text-white text-sm focus:outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hello@example.com"
                      className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-3 px-4 text-white text-sm focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+94 77 123 4567"
                      className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-3 px-4 text-white text-sm focus:outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full py-4 mt-4 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-slate-900 font-bold rounded-2xl transition duration-300 flex justify-center items-center gap-2"
                >
                  {submitLoading && <Loader className="w-4.5 h-4.5 animate-spin" />}
                  Lock Dates & Continue
                </button>
              </form>
            </div>
          ) : (
            // Payment Gateway Picker
            <div className="p-8 rounded-3xl glass-card border border-sky-500/20 space-y-6">
              <div className="flex gap-3 items-center text-emerald-400">
                <CheckCircle className="w-7 h-7" />
                <div>
                  <h3 className="text-xl font-bold text-white">Dates Reserved Safely!</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Booking ID: {createdBooking?.id}</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <p className="text-sm text-slate-300 leading-relaxed">
                  We require a 30% deposit to lock the beachfront booking, or you can pay the full amount for convenience. Select checkout channels below:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <button
                    onClick={handleStripePayment}
                    disabled={paymentLoading}
                    className="p-5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-left transition duration-300 flex flex-col justify-between h-32 group"
                  >
                    <CreditCard className="w-6 h-6 text-sky-400 group-hover:scale-105 transition" />
                    <div>
                      <h4 className="font-semibold text-white">Pay via Stripe</h4>
                      <p className="text-[11px] text-slate-400 mt-1">Accepts Visa, Mastercard, AMEX globally.</p>
                    </div>
                  </button>

                  <button
                    onClick={handleMockPayment}
                    disabled={paymentLoading}
                    className="p-5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-2xl text-left transition duration-300 flex flex-col justify-between h-32 group"
                  >
                    <ShieldCheck className="w-6 h-6 text-emerald-400 group-hover:scale-105 transition" />
                    <div>
                      <h4 className="font-semibold text-emerald-400">Simulate Payment (Dev)</h4>
                      <p className="text-[11px] text-slate-400 mt-1">Instant database confirmation for local tests.</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Stay Summary */}
        <div className="lg:col-span-2 p-6 rounded-3xl glass-card border border-white/5 space-y-6">
          <h3 className="text-lg font-semibold text-white border-b border-white/5 pb-3 font-display">
            Stay Summary
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Villa</span>
              <span className="font-semibold text-white">{property?.name}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>Dates</span>
              </div>
              <span className="font-semibold text-white text-xs">
                {checkIn} to {checkOut}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Nights</span>
              <span className="font-semibold text-white">{pricing?.totalNights} Nights</span>
            </div>

            <div className="space-y-2 pt-4 border-t border-white/5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Nightly Rate Subtotal</span>
                <span className="font-semibold text-white">${pricing?.subtotal}</span>
              </div>

              {pricing?.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Long stay Discount</span>
                  </div>
                  <span>-${pricing?.discountAmount}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-white pt-3 border-t border-white/5 text-base font-display">
                <span>Total Stay Cost</span>
                <span className="text-lg text-sky-400">${pricing?.totalAmount}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
