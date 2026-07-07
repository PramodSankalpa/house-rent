'use client';

import { MapPin, Compass, Navigation, Waves } from 'lucide-react';

export default function Map() {
  const mapEmbedUrl = "https://maps.google.com/maps?q=Ahungalla%20Beach,%20Sri%20Lanka&t=&z=15&ie=UTF8&iwloc=&output=embed";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch">
      {/* Location Details Panel */}
      <div className="lg:col-span-2 flex flex-col justify-between p-8 rounded-3xl glass-card border border-white/5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
            Neighborhood
          </span>
          <h3 className="text-3xl font-bold font-display text-white mt-4 leading-tight">
            Perfect Oceanfront Seclusion
          </h3>
          <p className="text-slate-300 mt-4 leading-relaxed">
            Located in Ahungalla, a quiet beach village renowned for wide golden sand beaches, coconut palm groves, and nesting sea turtles. 
          </p>

          <div className="mt-8 space-y-6">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-sky-500/10 rounded-2xl text-sky-400 border border-sky-500/20">
                <Waves className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Direct Beach Access</h4>
                <p className="text-sm text-slate-400 mt-1">
                  100 meters walk from the house to the sand via a shaded direct footpath.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-3 bg-sky-500/10 rounded-2xl text-sky-400 border border-sky-500/20">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Ahungalla, Sri Lanka</h4>
                <p className="text-sm text-slate-400 mt-1">
                  Close to turtle conservation centers, Madu Ganga river safari, and Galle Fort (45 min drive).
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex gap-4">
          <a
            href="https://maps.app.goo.gl/pMC4zUotycCCD3m48"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/20 text-sky-400 font-semibold rounded-2xl transition duration-300"
          >
            <Compass className="w-4 h-4" />
            Explore Area Guides
          </a>
          <a
            href="https://maps.app.goo.gl/pMC4zUotycCCD3m48"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-3.5 bg-sky-500 hover:bg-sky-400 text-slate-900 rounded-2xl transition duration-300"
          >
            <Navigation className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Map Embed Frame */}
      <div className="lg:col-span-3 h-[450px] lg:h-auto min-h-[350px] relative overflow-hidden rounded-3xl border border-white/5 shadow-2xl">
        <iframe
          src={mapEmbedUrl}
          width="100%"
          height="100%"
          style={{ border: 0, filter: "invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)" }} // Fits luxury dark-theme palette
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0"
        />
      </div>
    </div>
  );
}
