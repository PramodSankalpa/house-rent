import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('calculate')
  async calculatePrice(
    @Query('propertyId') propertyId: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    return this.pricingService.calculatePrice(propertyId, checkIn, checkOut);
  }

  @Get('rules/:propertyId')
  @UseGuards(AdminGuard)
  async getRules(@Param('propertyId') propertyId: string) {
    return this.pricingService.getRules(propertyId);
  }

  @Post('rules/:propertyId')
  @UseGuards(AdminGuard)
  async createRule(@Param('propertyId') propertyId: string, @Body() data: any) {
    return this.pricingService.createRule(propertyId, data);
  }

  @Delete('rules/:ruleId')
  @UseGuards(AdminGuard)
  async deleteRule(@Param('ruleId') ruleId: string) {
    return this.pricingService.deleteRule(ruleId);
  }

  @Get('discounts/:propertyId')
  @UseGuards(AdminGuard)
  async getDiscountTiers(@Param('propertyId') propertyId: string) {
    return this.pricingService.getDiscountTiers(propertyId);
  }

  @Post('discounts/:propertyId')
  @UseGuards(AdminGuard)
  async createDiscountTier(@Param('propertyId') propertyId: string, @Body() data: any) {
    return this.pricingService.createDiscountTier(propertyId, data);
  }

  @Delete('discounts/:tierId')
  @UseGuards(AdminGuard)
  async deleteDiscountTier(@Param('tierId') tierId: string) {
    return this.pricingService.deleteDiscountTier(tierId);
  }
}
