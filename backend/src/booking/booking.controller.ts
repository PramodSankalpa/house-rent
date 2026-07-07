import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { AdminGuard } from '../auth/admin.guard';
import { BookingStatus } from '@prisma/client';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @UseGuards(AdminGuard)
  async getBookings() {
    return this.bookingService.getBookings();
  }

  @Get('stats')
  @UseGuards(AdminGuard)
  async getStats() {
    return this.bookingService.getStats();
  }

  @Post('check-availability')
  async checkAvailability(
    @Body('propertyId') propertyId: string,
    @Body('checkIn') checkIn: string,
    @Body('checkOut') checkOut: string,
  ) {
    return this.bookingService.checkAvailability(propertyId, checkIn, checkOut);
  }

  @Post()
  async createBooking(
    @Body() data: {
      propertyId: string;
      checkIn: string;
      checkOut: string;
      guestName: string;
      guestEmail: string;
      guestPhone: string;
    },
  ) {
    return this.bookingService.createBooking(data);
  }

  @Get('blocked/:propertyId')
  async getBlockedDates(@Param('propertyId') propertyId: string) {
    return this.bookingService.getBlockedDates(propertyId);
  }

  @Post('block/:propertyId')
  @UseGuards(AdminGuard)
  async blockDates(
    @Param('propertyId') propertyId: string,
    @Body() data: { startDate: string; endDate: string; reason: string },
  ) {
    return this.bookingService.blockDates(propertyId, data);
  }

  @Delete('blocked/:id')
  @UseGuards(AdminGuard)
  async unblockDate(@Param('id') id: string) {
    return this.bookingService.unblockDate(id);
  }

  @Get('search/lookup')
  async lookupBooking(
    @Query('email') email: string,
    @Query('invoiceNumber') invoiceNumber: string,
  ) {
    return this.bookingService.lookupBooking(email, invoiceNumber);
  }

  @Get('logs/notifications')
  @UseGuards(AdminGuard)
  async getNotificationLogs() {
    return this.bookingService.getNotificationLogs();
  }

  @Get(':id')
  async getBookingById(@Param('id') id: string) {
    return this.bookingService.getBookingById(id);
  }

  @Put(':id/status')
  @UseGuards(AdminGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: BookingStatus,
  ) {
    return this.bookingService.updateBookingStatus(id, status);
  }
}
