'use client';

import { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Plus, Trash, Loader, Compass, Save, Check, Lock, Upload, Image as ImageIcon, CheckCircle } from 'lucide-react';
import api, { getBackendUrl } from '../../../utils/api';
import Image from 'next/image';

interface SettingItem {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
}

interface BlockedDate {
  id: string;
  date: string;
  reason: string;
}

interface PropertyImage {
  id: string;
  url: string;
  alt: string;
  isMain: boolean;
}

interface Property {
  id: string;
  name: string;
  images: PropertyImage[];
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [property, setProperty] = useState<Property | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Block dates states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockingDates, setBlockingDates] = useState(false);

  // Change Password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Image Upload states
  const [imageAlt, setImageAlt] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Settings values mapping for input bindings
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});

  const loadSettingsData = async () => {
    try {
      const rawRes = await api.get('/settings/raw');
      setSettings(rawRes.data);
      
      const formMap = rawRes.data.reduce((acc: Record<string, string>, item: SettingItem) => {
        acc[item.key] = item.value;
        return acc;
      }, {});
      setSettingsForm(formMap);

      const propsRes = await api.get('/properties');
      if (propsRes.data.length > 0) {
        const prop = propsRes.data[0];
        setProperty(prop);
        await loadBlockedDates(prop.id);
      }
    } catch (err) {
      console.error('Failed to load settings logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBlockedDates = async (propId: string) => {
    try {
      const blockedRes = await api.get(`/bookings/blocked/${propId}`);
      setBlockedDates(blockedRes.data);
    } catch (err) {
      console.error('Failed to load blocked dates:', err);
    }
  };

  const refreshPropertyImages = async () => {
    if (!property) return;
    try {
      const response = await api.get(`/properties/${property.id}`);
      setProperty(response.data);
    } catch (err) {
      console.error('Failed to refresh images:', err);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleInputChange = (key: string, value: string) => {
    setSettingsForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Submit contact/social settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveSuccess(false);

    try {
      await api.post('/settings', settingsForm);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadSettingsData();
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Submit Block Dates range
  const handleBlockDates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !startDate || !endDate) return;
    setBlockingDates(true);

    try {
      await api.post(`/bookings/block/${property.id}`, {
        startDate,
        endDate,
        reason: blockReason || 'Maintenance override',
      });

      // Clear Form & reload
      setStartDate('');
      setEndDate('');
      setBlockReason('');
      await loadBlockedDates(property.id);
    } catch (err) {
      alert('Error blocking dates: ' + err.message);
    } finally {
      setBlockingDates(false);
    }
  };

  // Unblock date item
  const handleUnblockDate = async (blockedId: string) => {
    if (!confirm('Unblock this date?')) return;
    try {
      await api.delete(`/bookings/blocked/${blockedId}`);
      if (property) {
        await loadBlockedDates(property.id);
      }
    } catch (err) {
      alert('Failed to remove block: ' + err.message);
    }
  };

  // Submit Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setUpdatingPassword(true);
    try {
      await api.post('/auth/change-password', {
        oldPassword,
        newPassword,
      });
      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Convert image to base64 for upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Image Upload
  const handleImageUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !imagePreview) return;
    setUploadingImage(true);

    try {
      await api.post(`/properties/${property.id}/images`, {
        base64Data: imagePreview,
        alt: imageAlt || 'Property Room Image',
      });
      setImagePreview(null);
      setImageAlt('');
      await refreshPropertyImages();
    } catch (err) {
      alert('Failed to upload image: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Delete Image
  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    try {
      await api.delete(`/properties/images/${imageId}`);
      await refreshPropertyImages();
    } catch (err) {
      alert('Failed to delete image: ' + err.message);
    }
  };

  // Set Cover Image
  const handleSetMainImage = async (imageId: string) => {
    if (!property) return;
    try {
      await api.post(`/properties/${property.id}/images/${imageId}/set-main`);
      await refreshPropertyImages();
    } catch (err) {
      alert('Failed to set cover image: ' + err.message);
    }
  };

  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `${getBackendUrl()}${url}`;
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex justify-center items-center gap-2 text-sky-400">
        <Loader className="w-8 h-8 animate-spin" />
        <span>Loading dynamic site configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-display text-white">PMS Manager & Site Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Configure contact links, upload property photos, restrict calendar dates, and update credentials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        
        {/* Left Columns: Dynamic Values & Password Updates */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* General Site Config */}
          <div className="p-6 rounded-3xl glass-card border border-white/5 space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 font-display">
              <Settings className="w-5 h-5 text-sky-400" />
              Contact & Branding Values
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              {settings.map((item) => (
                <div key={item.id}>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    {item.key.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm[item.key] || ''}
                    onChange={(e) => handleInputChange(item.key, e.target.value)}
                    className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-2.5 px-4 text-white text-sm focus:outline-none transition"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">{item.description}</span>
                </div>
              ))}

              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-3 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-slate-950 font-bold rounded-2xl transition duration-300 flex items-center justify-center gap-2"
              >
                {savingSettings ? <Loader className="w-4.5 h-4.5 animate-spin" /> : saveSuccess ? <Check className="w-4.5 h-4.5" /> : <Save className="w-4.5 h-4.5" />}
                {saveSuccess ? 'Changes Saved!' : 'Save System Settings'}
              </button>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="p-6 rounded-3xl glass-card border border-white/5 space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 font-display">
              <Lock className="w-5 h-5 text-sky-400" />
              Security Settings (Change Password)
            </h3>

            {passwordError && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-1.5 font-semibold">
                <CheckCircle className="w-4 h-4" />
                Password successfully updated!
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-2.5 px-4 text-white text-sm focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-2.5 px-4 text-white text-sm focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-2.5 px-4 text-white text-sm focus:outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingPassword}
                className="px-6 py-3 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-slate-950 font-bold rounded-2xl transition duration-300 flex items-center justify-center gap-2"
              >
                {updatingPassword ? <Loader className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                Change Password
              </button>
            </form>
          </div>

        </div>

        {/* Right Columns: Image Manager & Calendar Block */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Image Manager Panel */}
          <div className="p-6 rounded-3xl glass-card border border-white/5 space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 font-display">
              <ImageIcon className="w-5 h-5 text-sky-400" />
              Property Image Manager
            </h3>

            {/* Upload New Image Form */}
            <form onSubmit={handleImageUpload} className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-xs font-bold text-slate-300">Upload New Photo</p>
              
              <div className="flex flex-col gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20 cursor-pointer"
                />

                {imagePreview && (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10">
                    <Image
                      src={imagePreview}
                      alt="Upload Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Image Description (e.g. Master Bedroom)"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-xl py-2 px-3 text-white text-xs focus:outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={uploadingImage || !imagePreview}
                className="w-full py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/20 disabled:text-slate-500 text-slate-950 font-bold rounded-xl transition text-xs flex justify-center items-center gap-1.5"
              >
                {uploadingImage ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload Image
              </button>
            </form>

            {/* List and manage existing images */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-300">Existing Images</p>
              <div className="grid grid-cols-2 gap-3">
                {property?.images.map((img) => (
                  <div key={img.id} className="relative group rounded-xl overflow-hidden border border-white/5 h-28 bg-slate-900 flex flex-col justify-between">
                    <Image
                      src={getImageUrl(img.url)}
                      alt={img.alt}
                      fill
                      className="object-cover group-hover:opacity-45 transition duration-300"
                    />
                    
                    {img.isMain && (
                      <span className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-sky-500 text-slate-950 font-bold text-[9px] uppercase tracking-wider rounded-full shadow-lg">
                        Cover
                      </span>
                    )}

                    {/* Manage Overlay Controls */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-between p-2">
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleDeleteImage(img.id)}
                          className="p-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-slate-950 border border-rose-500/20 rounded-lg transition"
                          title="Delete Photo"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {!img.isMain && (
                        <button
                          onClick={() => handleSetMainImage(img.id)}
                          className="w-full py-1 bg-white/10 hover:bg-sky-500 text-white hover:text-slate-950 font-bold text-[10px] rounded-lg transition"
                        >
                          Set Cover
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Admin Date Block Panel */}
          <div className="p-6 rounded-3xl glass-card border border-white/5 space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 font-display">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              Block Stay Dates
            </h3>

            <form onSubmit={handleBlockDates} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 font-sans">Start Block Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 focus:border-rose-500/50 rounded-2xl py-2.5 px-4 text-white text-sm focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">End Block Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 focus:border-rose-500/50 rounded-2xl py-2.5 px-4 text-white text-sm focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Block Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Owner direct stay, Villa maintenance"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 focus:border-rose-500/50 rounded-2xl py-2.5 px-4 text-white text-sm focus:outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={blockingDates}
                className="w-full py-3 bg-rose-500/20 hover:bg-rose-500 disabled:bg-rose-500/10 border border-rose-500/20 hover:border-rose-400 text-rose-400 hover:text-slate-950 font-bold rounded-2xl transition duration-300 flex justify-center items-center gap-2"
              >
                {blockingDates ? <Loader className="w-4.5 h-4.5 animate-spin" /> : <Plus className="w-4.5 h-4.5" />}
                Enforce Block Range
              </button>
            </form>
          </div>

          {/* List of currently blocked dates */}
          <div className="p-6 rounded-3xl glass-card border border-white/5 space-y-4">
            <h4 className="font-semibold text-white">Currently Blocked Dates</h4>
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {blockedDates.map((item) => (
                <div key={item.id} className="p-3 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-white">{item.date.split('T')[0]}</span>
                    <span className="text-slate-400 ml-2">({item.reason || 'Blocked'})</span>
                  </div>
                  <button
                    onClick={() => handleUnblockDate(item.id)}
                    className="text-rose-400 hover:text-rose-300 font-semibold transition"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {blockedDates.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">No dates currently restricted.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
