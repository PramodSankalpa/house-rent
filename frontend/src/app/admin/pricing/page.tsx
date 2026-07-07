'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Percent, CalendarRange, Plus, Trash, Loader, AlertCircle } from 'lucide-react';
import api from '../../../utils/api';

interface PricingRule {
  id: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  fixedPrice: number | null;
}

interface DiscountTier {
  id: string;
  name: string;
  minDays: number;
  discountPct: number;
}

interface Property {
  id: string;
  name: string;
  basePrice: number;
}

export default function AdminPricingEditor() {
  const [property, setProperty] = useState<Property | null>(null);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [discounts, setDiscounts] = useState<DiscountTier[]>([]);
  const [loading, setLoading] = useState(true);

  // New Pricing Rule Form
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('CUSTOM');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [multiplier, setMultiplier] = useState(1.0);
  const [fixedPrice, setFixedPrice] = useState('');

  // New Discount Form
  const [discName, setDiscName] = useState('');
  const [minDays, setMinDays] = useState(7);
  const [discountPct, setDiscountPct] = useState(10);

  const [savingRule, setSavingRule] = useState(false);
  const [savingDisc, setSavingDisc] = useState(false);

  const loadPricingData = async () => {
    try {
      const propsRes = await api.get('/properties');
      if (propsRes.data.length > 0) {
        const prop = propsRes.data[0];
        setProperty(prop);

        const rulesRes = await api.get(`/pricing/rules/${prop.id}`);
        setRules(rulesRes.data);

        const discRes = await api.get(`/pricing/discounts/${prop.id}`);
        setDiscounts(discRes.data);
      }
    } catch (err) {
      console.error('Failed to load pricing configurations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPricingData();
  }, []);

  // Submit Seasonal Rule
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !ruleName) return;
    setSavingRule(true);

    try {
      await api.post(`/pricing/rules/${property.id}`, {
        name: ruleName,
        type: ruleType,
        startDate: startDate || null,
        endDate: endDate || null,
        multiplier: parseFloat(multiplier.toString()),
        fixedPrice: fixedPrice ? parseFloat(fixedPrice) : null,
      });

      // Clear Form & reload
      setRuleName('');
      setStartDate('');
      setEndDate('');
      setMultiplier(1.0);
      setFixedPrice('');
      await loadPricingData();
    } catch (err) {
      alert('Error creating pricing rule: ' + err.message);
    } finally {
      setSavingRule(false);
    }
  };

  // Delete Seasonal Rule
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) return;
    try {
      await api.delete(`/pricing/rules/${ruleId}`);
      await loadPricingData();
    } catch (err) {
      alert('Failed to delete rule: ' + err.message);
    }
  };

  // Submit Discount Tier
  const handleAddDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !discName) return;
    setSavingDisc(true);

    try {
      await api.post(`/pricing/discounts/${property.id}`, {
        name: discName,
        minDays: parseInt(minDays.toString()),
        discountPct: parseFloat(discountPct.toString()),
      });

      // Clear Form & reload
      setDiscName('');
      setMinDays(7);
      setDiscountPct(10);
      await loadPricingData();
    } catch (err) {
      alert('Error saving discount tier: ' + err.message);
    } finally {
      setSavingDisc(false);
    }
  };

  // Delete Discount Tier
  const handleDeleteDiscount = async (tierId: string) => {
    if (!confirm('Delete this discount tier?')) return;
    try {
      await api.delete(`/pricing/discounts/${tierId}`);
      await loadPricingData();
    } catch (err) {
      alert('Failed to delete tier: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex justify-center items-center gap-2 text-sky-400">
        <Loader className="w-8 h-8 animate-spin" />
        <span>Loading PMS pricing parameters...</span>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl flex gap-2">
        <AlertCircle className="w-4 h-4" />
        <span>No property seeded. Please configure property records first.</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-display text-white">Pricing Engine Editor</h1>
        <p className="text-sm text-slate-400 mt-1">Configure seasonal pricing multipliers, custom fixed overrides, and discount policies.</p>
      </div>

      <div className="p-6 rounded-3xl glass-card border border-white/5 flex items-baseline gap-2">
        <span className="text-slate-400 text-sm">Default base rate:</span>
        <span className="text-2xl font-bold text-white font-display">${property.basePrice}</span>
        <span className="text-slate-500 text-xs">/ night</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Seasonal Pricing Rules Section */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl glass-card border border-white/5 space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 font-display">
              <CalendarRange className="w-5 h-5 text-sky-400" />
              Add Custom pricing overrides
            </h3>

            <form onSubmit={handleAddRule} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Christmas Peak, Summer Special"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-2.5 px-4 text-white text-sm focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-2.5 px-4 text-white text-sm focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-2.5 px-4 text-white text-sm focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Multiplier (e.g. 1.25x)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={multiplier}
                    onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                    className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-2.5 px-4 text-white text-sm focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Fixed Price Override ($)</label>
                  <input
                    type="number"
                    placeholder="Optional fixed price"
                    value={fixedPrice}
                    onChange={(e) => setFixedPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-2.5 px-4 text-white text-sm focus:outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingRule}
                className="w-full py-3 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-slate-900 font-bold rounded-2xl transition duration-300 flex justify-center items-center gap-2"
              >
                {savingRule ? <Loader className="w-4.5 h-4.5 animate-spin" /> : <Plus className="w-4.5 h-4.5" />}
                Add Pricing Rule
              </button>
            </form>
          </div>

          {/* Active Rules List */}
          <div className="p-6 rounded-3xl glass-card border border-white/5 space-y-4">
            <h4 className="font-semibold text-white">Active Date Overrides</h4>
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-white text-sm">{rule.name}</h5>
                    <p className="text-xs text-slate-400 mt-1">
                      {rule.startDate ? new Date(rule.startDate).toLocaleDateString() : 'Always'} to {rule.endDate ? new Date(rule.endDate).toLocaleDateString() : 'Always'}
                    </p>
                    <p className="text-xs text-sky-400 mt-1">
                      {rule.fixedPrice ? `Override: $${rule.fixedPrice}/night` : `Multiplier: ${rule.multiplier}x`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 hover:border-rose-400 text-rose-400 hover:text-slate-950 rounded-xl transition"
                  >
                    <Trash className="w-4.5 h-4.5" />
                  </button>
                </div>
              ))}
              {rules.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No custom date rules established.</p>
              )}
            </div>
          </div>
        </div>

        {/* Long-Stay Discount Tiers Section */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl glass-card border border-white/5 space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 font-display">
              <Percent className="w-5 h-5 text-sky-400" />
              Configure Long-Stay Discounts
            </h3>

            <form onSubmit={handleAddDiscount} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Discount Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Stay, Monthly Plan"
                  value={discName}
                  onChange={(e) => setDiscName(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-2.5 px-4 text-white text-sm focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Min Stay (Nights)</label>
                  <input
                    type="number"
                    min="2"
                    value={minDays}
                    onChange={(e) => setMinDays(parseInt(e.target.value))}
                    className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-2.5 px-4 text-white text-sm focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Discount Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(parseFloat(e.target.value))}
                    className="w-full bg-white/5 border border-white/5 focus:border-sky-500/50 rounded-2xl py-2.5 px-4 text-white text-sm focus:outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingDisc}
                className="w-full py-3 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-slate-900 font-bold rounded-2xl transition duration-300 flex justify-center items-center gap-2"
              >
                {savingDisc ? <Loader className="w-4.5 h-4.5 animate-spin" /> : <Plus className="w-4.5 h-4.5" />}
                Save Discount Tier
              </button>
            </form>
          </div>

          {/* Active Discount List */}
          <div className="p-6 rounded-3xl glass-card border border-white/5 space-y-4">
            <h4 className="font-semibold text-white">Active Discount Tiers</h4>
            <div className="space-y-3">
              {discounts.map((tier) => (
                <div key={tier.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-white text-sm">{tier.name}</h5>
                    <p className="text-xs text-slate-400 mt-1">Stays of {tier.minDays}+ Nights</p>
                    <p className="text-xs text-emerald-400 mt-1">{tier.discountPct}% Discount Applied</p>
                  </div>
                  <button
                    onClick={() => handleDeleteDiscount(tier.id)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 hover:border-rose-400 text-rose-400 hover:text-slate-950 rounded-xl transition"
                  >
                    <Trash className="w-4.5 h-4.5" />
                  </button>
                </div>
              ))}
              {discounts.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No discount policies set up.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
