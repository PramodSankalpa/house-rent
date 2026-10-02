import './globals.css';
import Link from 'next/link';
import { Waves, Calendar, MessageSquare, ShieldAlert } from 'lucide-react';
import ChatWidget from '@/components/ChatWidget';
import AdminNavLink from '@/components/AdminNavLink';

export const metadata = {
  title: 'Ahungalla Beach House – Luxury Vacation Rental Sri Lanka',
  description: 'Stay Longer. Live by the Ocean. A beautiful beachfront vacation house in Ahungalla, Sri Lanka. Features direct beach path, 2 bedrooms, fully equipped kitchen, veranda, and high speed WiFi. Multi-tenant ready.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-ocean-gradient min-h-screen flex flex-col justify-between">
        {/* Navigation Header */}
        <header className="fixed top-0 left-0 right-0 z-40 glass-nav">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-white hover:text-sky-400 transition duration-300">
              <Waves className="w-6 h-6 text-sky-400" />
              <span className="font-bold text-lg tracking-wider font-display uppercase">Ahungalla Beach House</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
              <Link href="/#details" className="hover:text-white transition">The House</Link>
              <Link href="/#amenities" className="hover:text-white transition">Amenities</Link>
              <Link href="/#location" className="hover:text-white transition">Location</Link>
              <Link href="/booking/lookup" className="hover:text-white transition">Manage Booking</Link>
              <AdminNavLink />
            </nav>

            <Link
              href="/#reserve"
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-900 text-sm font-bold rounded-2xl shadow-lg shadow-sky-500/15 transition-transform duration-300 hover:scale-105"
            >
              Book Stay
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow pt-20">
          {children}
        </main>

        {/* Chat Widget */}
        <ChatWidget />

        {/* Footer */}
        <footer className="mt-20 border-t border-white/5 bg-slate-950/80 py-12">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2">
                <Waves className="w-5 h-5 text-sky-400" />
                <span className="font-bold font-display text-white text-base tracking-widest uppercase">Ahungalla Beach House</span>
              </div>
              <p className="text-sm text-slate-400 mt-4 max-w-xs leading-relaxed">
                Stay Longer. Live by the Ocean. Beachfront villa renting in Ahungalla, Sri Lanka.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-white text-sm tracking-wider uppercase">Quick Links</h5>
              <div className="flex flex-col gap-3 mt-4 text-sm text-slate-400">
                <Link href="/#details" className="hover:text-sky-400 transition">Property Details</Link>
                <Link href="/#amenities" className="hover:text-sky-400 transition">Amenities Checklist</Link>
                <Link href="/#location" className="hover:text-sky-400 transition font-sans">Google Maps Location</Link>
                <Link href="/booking/lookup" className="hover:text-sky-400 transition">Manage Booking</Link>
                <Link href="/admin/login" className="hover:text-sky-400 transition">Host Administration Portal</Link>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-white text-sm tracking-wider uppercase">Contact Host</h5>
              <div className="flex flex-col gap-3 mt-4 text-sm text-slate-400">
                <a
                  href="https://wa.me/94774402546"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-400 transition duration-300 block"
                >
                  WhatsApp: +94 77 440 2546
                </a>
                <p>Phone: +94 91 765 4321</p>
                <p>Email: hello@ahungallabeachhouse.com</p>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 border-t border-white/5 mt-12 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
            <p>&copy; {new Date().getFullYear()} Ahungalla Beach House. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
