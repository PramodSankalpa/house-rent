import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  // Calculate price break-down for a stay
  async calculatePrice(propertyId: string, checkInStr: string, checkOutStr: string) {
    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid date formats');
    }

    if (checkIn >= checkOut) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new BadRequestException('Property not found');
    }

    // Calculate total nights
    const totalNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // Fetch pricing rules and discount tiers
    const pricingRules = await this.prisma.pricingRule.findMany({
      where: { propertyId, isActive: true },
    });

    const discountTiers = await this.prisma.discountTier.findMany({
      where: { propertyId, isActive: true },
      orderBy: { minDays: 'desc' }, // Order by largest discount threshold first
    });

    const nightlyRates: Array<{
      date: string;
      originalPrice: number;
      finalPrice: number;
      appliedRules: string[];
    }> = [];

    let totalBaseAmount = 0;

    // Find applicable long-stay discount tier
    const matchingTier = discountTiers.find((tier) => totalNights >= tier.minDays);
    const discountPct = matchingTier ? matchingTier.discountPct : 0;

    // Loop through each night
    for (let i = 0; i < totalNights; i++) {
      const currentNight = new Date(checkIn);
      currentNight.setDate(checkIn.getDate() + i);
      const currentNightStr = currentNight.toISOString().split('T')[0];

      let nightPrice = property.basePrice;
      const appliedRules: string[] = [];

      // Check for specific date-based pricing overrides
      const activeRules = pricingRules.filter((rule) => {
        if (!rule.startDate || !rule.endDate) return false;
        const start = new Date(rule.startDate.toISOString().split('T')[0]);
        const end = new Date(rule.endDate.toISOString().split('T')[0]);
        const current = new Date(currentNightStr);
        return current >= start && current <= end;
      });

      // If we have custom pricing rules matching this date
      if (activeRules.length > 0) {
        // Find if there is a fixed price override first
        const fixedRule = activeRules.find((r) => r.fixedPrice !== null && r.fixedPrice !== undefined);
        if (fixedRule) {
          nightPrice = fixedRule.fixedPrice;
          appliedRules.push(`${fixedRule.name} (Override: $${fixedRule.fixedPrice}/night)`);
        } else {
          // Otherwise, apply multipliers
          let multiplier = 1.0;
          activeRules.forEach((rule) => {
            multiplier *= rule.multiplier;
            appliedRules.push(`${rule.name} (Multiplier: ${rule.multiplier}x)`);
          });
          nightPrice = nightPrice * multiplier;
        }
      }

      // Check if it's a weekend night (Friday or Saturday night)
      const dayOfWeek = currentNight.getDay(); // 5 = Friday, 6 = Saturday
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        // Let's see if we have a weekend multiplier set in pricing rules or default to 1.1x multiplier
        const weekendRule = pricingRules.find((r) => r.type === 'WEEKEND');
        if (weekendRule) {
          nightPrice = nightPrice * weekendRule.multiplier;
          appliedRules.push(`Weekend Multiplier (${weekendRule.multiplier}x)`);
        }
      }

      nightlyRates.push({
        date: currentNightStr,
        originalPrice: property.basePrice,
        finalPrice: Math.round(nightPrice * 100) / 100,
        appliedRules,
      });

      totalBaseAmount += nightPrice;
    }

    // Apply long-stay discounts if applicable
    let discountAmount = 0;
    let appliedDiscountTierName = '';

    if (matchingTier) {
      discountAmount = (totalBaseAmount * matchingTier.discountPct) / 100;
      appliedDiscountTierName = `${matchingTier.name} (${matchingTier.discountPct}% off for stays of ${matchingTier.minDays}+ days)`;
    }

    const subtotal = totalBaseAmount;
    const finalAmount = Math.max(0, subtotal - discountAmount);

    return {
      propertyId,
      checkIn: checkInStr,
      checkOut: checkOutStr,
      totalNights,
      nightlyRates,
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      appliedDiscountTier: appliedDiscountTierName || null,
      totalAmount: Math.round(finalAmount * 100) / 100,
    };
  }

  // Manage pricing rules (CRUD)
  async getRules(propertyId: string) {
    return this.prisma.pricingRule.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRule(propertyId: string, data: any) {
    const { startDate, endDate, ...rest } = data;
    return this.prisma.pricingRule.create({
      data: {
        propertyId,
        ...rest,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });
  }

  async deleteRule(ruleId: string) {
    return this.prisma.pricingRule.delete({
      where: { id: ruleId },
    });
  }

  // Manage long-stay discount tiers
  async getDiscountTiers(propertyId: string) {
    return this.prisma.discountTier.findMany({
      where: { propertyId },
      orderBy: { minDays: 'asc' },
    });
  }

  async createDiscountTier(propertyId: string, data: any) {
    return this.prisma.discountTier.create({
      data: {
        propertyId,
        ...data,
      },
    });
  }

  async deleteDiscountTier(tierId: string) {
    return this.prisma.discountTier.delete({
      where: { id: tierId },
    });
  }
}
