import { useState, useEffect } from 'react';
import api from '../utils/api';

export interface SiteSettings {
  whatsapp_number?: string;
  phone_number?: string;
  contact_email?: string;
  google_maps_url?: string;
  site_title?: string;
  site_tagline?: string;
  facebook_url?: string;
  instagram_url?: string;
}

export function useSettings() {
  const [settings, setSettings] = useState<SiteSettings>({
    whatsapp_number: '+94774402546',
    phone_number: '0094774402546',
    contact_email: 'hello@ahungallabeachhouse.com',
    google_maps_url: 'https://maps.app.goo.gl/pMC4zUotycCCD3m48',
    site_title: 'Ahungalla Beach House',
    site_tagline: 'Stay Longer. Live by the Ocean.',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await api.get('/settings');
        setSettings(response.data);
      } catch (err) {
        console.error('Failed to load site settings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  return { settings, loading };
}
