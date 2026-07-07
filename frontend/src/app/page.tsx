'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Waves, Calendar, ShieldCheck, Check, Sparkles, MapPin, Loader, Info, HelpCircle, X, ChevronLeft, ChevronRight, Sunset, Compass, Anchor, Camera, Activity } from 'lucide-react';
import api from '../utils/api';
import SlideGallery from '@/components/SlideGallery';
import Map from '@/components/Map';

interface Property {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  basePrice: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  rules: string[];
  images: Array<{ id: string; url: string; alt: string }>;
}

const nearbyAttractions = [
  {
    name: 'Ahungalla Beach',
    distance: '100 m',
    duration: '1 min walk',
    description: 'Pristine stretch of wide golden sand beach right at your doorstep, ideal for peaceful sunset strolls and swimming.',
    imageUrl: '/uploads/ahungalla-beach.jpg',
    icon: Sunset,
  },
  {
    name: 'Sea Turtle Hatchery (Kosgoda)',
    distance: '3.5 km',
    duration: '5 min drive',
    description: 'A vital sanctuary dedicated to nesting turtles. Visitors can learn about conservation and release baby hatchlings.',
    imageUrl: '/uploads/turtle-hatchery.jpg',
    icon: Activity,
  },
  {
    name: 'Madu Ganga Boat Safari',
    distance: '6.0 km',
    duration: '10 min drive',
    description: 'Explore coastal wetlands and mangrove forests by boat, visiting ancient island temples and cinnamon farms.',
    imageUrl: '/uploads/madu-safari.jpg',
    icon: Anchor,
  },
  {
    name: 'Brief Garden by Bevis Bawa',
    distance: '22 km',
    duration: '30 min drive',
    description: 'A magical, beautifully landscaped tropical garden estate designed by the legendary Sri Lankan artist.',
    imageUrl: '/uploads/brief-garden.jpg',
    icon: Compass,
  },
  {
    name: 'Hikkaduwa Coral Reef',
    distance: '24 km',
    duration: '25 min drive',
    description: 'Renowned marine sanctuary offering excellent snorkeling, scuba diving, and glass-bottom boat excursions.',
    imageUrl: '/uploads/hikkaduwa-beach.jpg',
    icon: Waves,
  },
  {
    name: 'Galle Dutch Fort',
    distance: '42 km',
    duration: '45 min drive',
    description: 'UNESCO World Heritage site rich with colonial history, cobblestone streets, boutiques, and the iconic lighthouse.',
    imageUrl: '/uploads/galle-fort.jpg',
    icon: Camera,
  },
];

export default function HomePage() {
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  // Booking Calculator State
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [calcLoading, setCalcLoading] = useState(false);
  const [availability, setAvailability] = useState<{ available: boolean; reason?: string } | null>(null);
  const [pricingBreakdown, setPricingBreakdown] = useState<any>(null);
  const [showPriceDetails, setShowPriceDetails] = useState(false);

  // Photo Tour States
  const [activeTab, setActiveTab] = useState('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const getCategory = (alt: string) => {
    const text = alt.toLowerCase();
    if (text.includes('bedroom') || text.includes('suite') || text.includes('bed')) return 'Bedroom';
    if (text.includes('kitchen') || text.includes('dining')) return 'Kitchen & Dining';
    if (text.includes('living') || text.includes('lounge')) return 'Living Space';
    if (text.includes('ocean') || text.includes('beach') || text.includes('exterior') || text.includes('garden') || text.includes('veranda')) return 'Beach & Exterior';
    return 'General';
  };

  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return `${backendUrl}${url}`;
  };

  const categories = ['All', 'Bedroom', 'Living Space', 'Kitchen & Dining', 'Beach & Exterior'];

  const filteredImages = property ? property.images.filter(img => {
    if (activeTab === 'All') return true;
    return getCategory(img.alt) === activeTab;
  }) : [];

  const handlePrev = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex(prev => (prev === 0 ? filteredImages.length - 1 : prev! - 1));
  };

  const handleNext = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex(prev => (prev === filteredImages.length - 1 ? 0 : prev! + 1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, filteredImages]);

  // Load default property
  useEffect(() => {
    async function loadProperty() {
      try {
        const response = await api.get('/properties/slug/ahungalla-beach-house');
        setProperty(response.data);
      } catch (err) {
        console.error('Error fetching property:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProperty();
  }, []);

  // Recalculate price when dates change
  useEffect(() => {
    if (!property || !checkIn || !checkOut) {
      setAvailability(null);
      setPricingBreakdown(null);
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (checkInDate >= checkOutDate) {
      setAvailability({ available: false, reason: 'Check-out date must be after check-in' });
      setPricingBreakdown(null);
      return;
    }

    async function checkRates() {
      setCalcLoading(true);
      try {
        // 1. Check availability
        const availRes = await api.post('/bookings/check-availability', {
          propertyId: property!.id,
          checkIn,
          checkOut,
        });
        setAvailability(availRes.data);

        if (availRes.data.available) {
          // 2. Fetch pricing calculation breakdown
          const priceRes = await api.get('/pricing/calculate', {
            params: {
              propertyId: property!.id,
              checkIn,
              checkOut,
            },
          });
          setPricingBreakdown(priceRes.data);
        } else {
          setPricingBreakdown(null);
        }
      } catch (err) {
        console.error('Availability calculation error:', err);
      } finally {
        setCalcLoading(false);
      }
    }

    const delayDebounce = setTimeout(() => {
      checkRates();
    }, 500); // Debounce API calls

    return () => clearTimeout(delayDebounce);
  }, [checkIn, checkOut, property]);

  const handleBookRedirect = () => {
    if (!property || !checkIn || !checkOut || !availability?.available) return;
    router.push(`/booking/checkout?propertyId=${property.id}&checkIn=${checkIn}&checkOut=${checkOut}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 text-sky-400 animate-spin" />
          <p className="text-slate-400 text-sm tracking-wider uppercase font-semibold">Loading Paradise...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-[500px] flex items-center justify-center text-center">
        <div>
          <h2 className="text-2xl font-bold font-display text-white">Property Not Seeding</h2>
          <p className="text-slate-400 mt-2">Please verify that backend container is running and seed script succeeded.</p>
        </div>
      </div>
    );
  }

  // Get tomorrow's date for check-in limit
  const getMinDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  };

  const getMinCheckOut = () => {
    if (!checkIn) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      return tomorrow.toISOString().split('T')[0];
    }
    const checkInDate = new Date(checkIn);
    checkInDate.setDate(checkInDate.getDate() + 1);
    return checkInDate.toISOString().split('T')[0];
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-24">
      
      {/* Hero Section */}
      <section className="relative flex flex-col lg:flex-row items-center gap-12 lg:min-h-[550px]">
        <div className="flex-1 space-y-6 text-center lg:text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 border border-sky-400/20 text-sky-400 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Beachfront Escape
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight font-display">
            Ahungalla <br/>
            <span className="text-sky-400">Beach House</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 font-display italic">
            &ldquo;Stay Longer. Live by the Ocean.&rdquo;
          </p>
          <p className="text-slate-400 max-w-lg leading-relaxed text-sm">
            Experience golden sands, warm Indian Ocean waves, and serene luxury. Located just a 2-minute shaded path walk from the pristine Ahungalla beach. Perfect for remote work escapes and extended coastal stays.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-4 text-xs font-medium text-slate-400">
            <span className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl">2 Bedrooms</span>
            <span className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl">1 Bathroom</span>
            <span className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl">Fully Equipped Kitchen</span>
            <span className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl">100m Beach Access</span>
          </div>

          <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-2">
            <Link
              href="/booking/lookup"
              className="px-5 py-2.5 bg-slate-900/60 hover:bg-slate-900 border border-white/10 text-sky-400 hover:text-sky-300 text-xs font-semibold rounded-2xl shadow-md transition duration-300"
            >
              Already Booked? Lookup Reservation →
            </Link>
          </div>
        </div>

        {/* Gallery Slider */}
        <div className="flex-1 w-full max-w-[600px] lg:max-w-none">
          <SlideGallery images={property.images} />
        </div>
      </section>

      {/* Reservation & Availability Calculator */}
      <section id="reserve" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        {/* About detail panels */}
        <div id="details" className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-3xl font-bold font-display text-white">About the Villa</h2>
            <p className="text-slate-300 mt-4 leading-relaxed text-sm">
              {property.description}
            </p>
          </div>

          <div id="amenities">
            <h3 className="text-xl font-bold text-white">Property Amenities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {property.amenities.map((item, i) => (
                <div key={i} className="flex gap-2.5 items-center text-slate-300 text-sm">
                  <div className="p-1 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">House Rules</h3>
            <div className="space-y-3 mt-4">
              {property.rules.map((rule, i) => (
                <div key={i} className="flex gap-2.5 items-start text-slate-400 text-sm">
                  <span className="text-sky-400 font-bold">•</span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Calculator Widget */}
        <div className="p-8 rounded-3xl glass-card border border-white/10 shadow-2xl space-y-6">
          <div>
            <span className="text-slate-400 text-sm">Rates starting from</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-extrabold text-white font-display">${property.basePrice}</span>
              <span className="text-slate-400 text-sm">/ night</span>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Check-in</label>
              <input
                type="date"
                min={getMinDate()}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-3 px-4 text-white text-sm focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Check-out</label>
              <input
                type="date"
                min={getMinCheckOut()}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-3 px-4 text-white text-sm focus:outline-none transition"
              />
            </div>
          </div>

          {/* Pricing Calculations & Quote Showcase */}
          {calcLoading && (
            <div className="py-6 flex justify-center items-center gap-2 text-sky-400 text-sm italic">
              <Loader className="w-5 h-5 animate-spin" />
              Calculating rate options...
            </div>
          )}

          {!calcLoading && availability && (
            <div className="pt-4 border-t border-white/5 space-y-4">
              {availability.available && pricingBreakdown ? (
                // Confirmed Available Quote Breakdown
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Stay Duration</span>
                    <span className="font-semibold text-white">{pricingBreakdown.totalNights} Nights</span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Base Nightly Rate</span>
                    <button
                      onClick={() => setShowPriceDetails(!showPriceDetails)}
                      type="button"
                      className="text-sky-400 hover:text-sky-300 font-semibold transition"
                    >
                      {showPriceDetails ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>

                  {showPriceDetails && (
                    <div className="space-y-1 bg-white/5 p-3 rounded-2xl border border-white/5 text-xs text-slate-300 max-h-48 overflow-y-auto">
                      <p className="font-semibold text-white mb-2">Nightly Breakdown</p>
                      {pricingBreakdown.nightlyRates.map((rate: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs py-1 border-b border-white/5 last:border-b-0">
                          <span>{rate.date} {rate.appliedRules.length > 0 && <span className="text-[10px] text-sky-400">({rate.appliedRules.join(', ')})</span>}</span>
                          <span className="font-semibold text-white">${rate.finalPrice}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {pricingBreakdown.discountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Subtotal</span>
                      <span className="font-semibold text-white">${pricingBreakdown.subtotal}</span>
                    </div>
                  )}

                  {pricingBreakdown.discountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-400">
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Long stay Discount</span>
                      </div>
                      <span>-${pricingBreakdown.discountAmount}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-base font-bold text-white pt-2 border-t border-white/5 font-display">
                    <span>Total Amount</span>
                    <span className="text-xl text-sky-400">${pricingBreakdown.totalAmount}</span>
                  </div>

                  <button
                    onClick={handleBookRedirect}
                    className="w-full py-4 mt-2 bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold rounded-2xl shadow-xl shadow-sky-500/15 transition duration-300"
                  >
                    Confirm Booking
                  </button>
                </div>
              ) : (
                // Blocked dates error notification
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-2xl flex gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>{availability.reason || 'Dates are not available for check-in.'}</span>
                </div>
              )}
            </div>
          )}

          {!checkIn && !checkOut && (
            <div className="p-4 bg-sky-500/5 border border-sky-400/10 text-slate-400 text-xs rounded-2xl flex gap-2.5 leading-relaxed">
              <HelpCircle className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
              <span>Select stay dates to calculate seasonal pricing rates and automatically apply long-stay discount percentages.</span>
            </div>
          )}

          {/* Manage Reservation Portal Link */}
          <div className="pt-4 border-t border-white/5 text-center text-xs space-y-2.5">
            <span className="text-slate-400 block">Already have a reservation?</span>
            <Link
              href="/booking/lookup"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-sky-400 hover:text-sky-300 font-semibold rounded-xl transition duration-300 w-full justify-center"
            >
              Retrieve Booking & Receipts
            </Link>
          </div>
        </div>
      </section>

      {/* Immersive Photo Tour Gallery */}
      <section id="photos" className="scroll-mt-24 space-y-8">
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-bold font-display text-white">Photo Tour</h2>
          <p className="text-slate-400 mt-2 text-sm">Filter and explore different spaces of our beachfront villa.</p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 justify-center md:justify-start border-b border-white/5 pb-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveTab(cat);
                setLightboxIndex(null); // Reset lightbox index on tab change
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-full transition duration-300 ${
                activeTab === cat
                  ? 'bg-sky-500 text-slate-900 shadow-md'
                  : 'bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredImages.map((img, idx) => (
            <div
              key={img.id}
              onClick={() => setLightboxIndex(idx)}
              className="relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer border border-white/5 hover:border-sky-500/30 transition-all duration-300"
            >
              <Image
                src={getImageUrl(img.url)}
                alt={img.alt}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <span className="text-xs font-medium text-white line-clamp-2">
                  {img.alt}
                </span>
              </div>
            </div>
          ))}
          {filteredImages.length === 0 && (
            <p className="text-xs text-slate-500 col-span-full py-12 text-center">No images found for this category.</p>
          )}
        </div>
      </section>

      {/* Geography Map Section */}
      <section id="location" className="scroll-mt-24">
        <div className="text-center md:text-left mb-8">
          <h2 className="text-3xl font-bold font-display text-white">Location & Surroundings</h2>
          <p className="text-slate-400 mt-2 text-sm">Find us next to the ocean waves in Ahungalla.</p>
        </div>
        <Map />
      </section>

      {/* Nearby Attractions Section */}
      <section id="attractions" className="scroll-mt-24 space-y-8">
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-bold font-display text-white">Nearby Attractions & Activities</h2>
          <p className="text-slate-400 mt-2 text-sm">Explore local wonders and coastal experiences around Ahungalla.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nearbyAttractions.map((attr, idx) => {
            const Icon = attr.icon;
            return (
              <div key={idx} className="rounded-3xl glass-card border border-white/5 hover:border-sky-500/30 overflow-hidden flex flex-col group transition-all duration-300 shadow-xl">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={getImageUrl(attr.imageUrl)}
                    alt={attr.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4 p-2 bg-slate-950/70 border border-white/10 rounded-xl text-sky-400 backdrop-blur-md">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline gap-2">
                      <h3 className="font-bold text-white text-base leading-tight group-hover:text-sky-400 transition duration-300">{attr.name}</h3>
                    </div>
                    <span className="text-[10px] text-sky-400 font-semibold font-mono tracking-wider block bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded w-fit">
                      {attr.distance} • {attr.duration}
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed pt-1">
                      {attr.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Fullscreen Lightbox Modal */}
      {lightboxIndex !== null && filteredImages.length > 0 && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between items-center bg-black/95 backdrop-blur-xl p-6 select-none animate-fade-in">
          {/* Top Bar Controls */}
          <div className="w-full flex justify-between items-center max-w-7xl">
            <span className="text-xs font-semibold text-slate-400 font-mono tracking-wider">
              {lightboxIndex + 1} / {filteredImages.length}
            </span>
            <button
              onClick={() => setLightboxIndex(null)}
              className="p-2 bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/40 text-slate-300 hover:text-rose-400 rounded-xl transition duration-300 backdrop-blur-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Showcase Image Area */}
          <div className="relative flex-grow w-full max-w-5xl my-4 flex items-center justify-center">
            {/* Prev Trigger */}
            <button
              onClick={handlePrev}
              className="absolute left-4 z-10 p-3 bg-white/5 hover:bg-sky-500/80 border border-white/10 hover:border-sky-400/40 text-white rounded-full transition duration-300 backdrop-blur-md"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Image Wrapper */}
            <div className="relative w-full h-full max-h-[70vh] aspect-video">
              <Image
                src={getImageUrl(filteredImages[lightboxIndex].url)}
                alt={filteredImages[lightboxIndex].alt}
                fill
                priority
                sizes="100vw"
                className="object-contain transition-all duration-300 rounded-2xl"
              />
            </div>

            {/* Next Trigger */}
            <button
              onClick={handleNext}
              className="absolute right-4 z-10 p-3 bg-white/5 hover:bg-sky-500/80 border border-white/10 hover:border-sky-400/40 text-white rounded-full transition duration-300 backdrop-blur-md"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Caption & Controls Info */}
          <div className="text-center space-y-2 max-w-xl pb-2">
            <h3 className="text-lg font-bold text-white font-display">
              {filteredImages[lightboxIndex].alt}
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              Use Left / Right arrow keys to navigate • Esc to exit
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
