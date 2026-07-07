import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
    private notificationService: NotificationService,
  ) {}

  // Check checkIn / checkOut availability
  async checkAvailability(propertyId: string, checkInStr: string, checkOutStr: string) {
    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid date formats');
    }

    if (checkIn >= checkOut) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    // 1. Check existing confirmed or pending bookings
    const conflictingBooking = await this.prisma.booking.findFirst({
      where: {
        propertyId,
        bookingStatus: {
          in: [BookingStatus.CONFIRMED, BookingStatus.PENDING],
        },
        AND: [
          { checkIn: { lt: checkOut } },
          { checkOut: { gt: checkIn } },
        ],
      },
    });

    if (conflictingBooking) {
      return { available: false, reason: 'Dates are already booked' };
    }

    // 2. Check blocked dates by admin
    const blockedDates = await this.prisma.blockedDate.findFirst({
      where: {
        propertyId,
        date: {
          gte: checkIn,
          lt: checkOut,
        },
      },
    });

    if (blockedDates) {
      return { available: false, reason: 'Some dates in this range are blocked by the host' };
    }

    return { available: true };
  }

  // Transaction-safe booking creation
  async createBooking(data: {
    propertyId: string;
    checkIn: string;
    checkOut: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
  }) {
    const { propertyId, checkIn, checkOut, guestName, guestEmail, guestPhone } = data;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Run within database transaction to enforce consistency
    const booking = await this.prisma.$transaction(async (tx) => {
      // 1. Recheck availability inside transaction (advisory locking mechanism alternative)
      const conflict = await tx.booking.findFirst({
        where: {
          propertyId,
          bookingStatus: {
            in: [BookingStatus.CONFIRMED, BookingStatus.PENDING],
          },
          AND: [
            { checkIn: { lt: checkOutDate } },
            { checkOut: { gt: checkInDate } },
          ],
        },
      });

      if (conflict) {
        throw new BadRequestException('These dates have just been reserved. Please try other dates.');
      }

      // Check admin blocked dates
      const blocked = await tx.blockedDate.findFirst({
        where: {
          propertyId,
          date: {
            gte: checkInDate,
            lt: checkOutDate,
          },
        },
      });

      if (blocked) {
        throw new BadRequestException('These dates are blocked by the administrator.');
      }

      // 2. Upsert guest
      const guest = await tx.guest.upsert({
        where: { email: guestEmail.toLowerCase() },
        update: { name: guestName, phone: guestPhone },
        create: { email: guestEmail.toLowerCase(), name: guestName, phone: guestPhone },
      });

      // 3. Calculate price details
      const quote = await this.pricingService.calculatePrice(propertyId, checkIn, checkOut);

      // 4. Generate Invoice ID
      const timestamp = Date.now().toString().slice(-6);
      const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${timestamp}`;

      // 5. Create Booking
      const booking = await tx.booking.create({
        data: {
          propertyId,
          guestId: guest.id,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          basePrice: quote.subtotal / quote.totalNights,
          discountAmount: quote.discountAmount,
          taxAmount: 0, // Set dynamic tax if needed
          totalAmount: quote.totalAmount,
          depositAmount: Math.round((quote.totalAmount * 0.3) * 100) / 100, // 30% deposit required
          bookingStatus: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          invoiceNumber,
        },
        include: {
          guest: true,
          property: true,
        },
      });

      // Create conversation if it doesn't exist
      const existingConv = await tx.conversation.findFirst({
        where: { guestId: guest.id },
      });

      if (!existingConv) {
        await tx.conversation.create({
          data: {
            guestId: guest.id,
            messages: {
              create: {
                senderType: 'ADMIN',
                content: `Hi ${guest.name}! Thanks for choosing ${booking.property.name}. Your booking request has been received. Feel free to message us here if you have any questions.`,
              },
            },
          },
        });
      }

      return booking;
    });

    // Send async email and SMS notifications via BullMQ after booking is saved
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const checkInStr = booking.checkIn.toISOString().split('T')[0];
      const checkOutStr = booking.checkOut.toISOString().split('T')[0];

      // 1. Email notification
      await this.notificationService.sendNotification({
        recipientId: booking.guestId,
        type: 'booking.created',
        channel: 'EMAIL',
        recipientAddress: booking.guest.email,
        content: `Hi ${booking.guest.name}! Your booking request at ${booking.property.name} has been received.\n\nStay Details:\nInvoice Number: ${booking.invoiceNumber}\nDates: ${checkInStr} to ${checkOutStr}\nTotal Price: $${booking.totalAmount}\n\nYou can retrieve and manage your reservation details and receipt anytime at: ${frontendUrl}/booking/lookup?email=${booking.guest.email}&invoiceNumber=${booking.invoiceNumber}`,
      });

      // 2. SMS notification
      await this.notificationService.sendNotification({
        recipientId: booking.guestId,
        type: 'booking.created',
        channel: 'SMS',
        recipientAddress: booking.guest.phone,
        content: `Hi ${booking.guest.name}! Booking request received for ${booking.property.name}. Invoice: ${booking.invoiceNumber}. Manage details at: ${frontendUrl}/booking/lookup`,
      });
    } catch (err) {
      console.error('Failed to queue booking.created notifications:', err);
    }

    return booking;
  }

  async getBookings() {
    return this.prisma.booking.findMany({
      include: {
        guest: {
          include: {
            _count: {
              select: { bookings: true },
            },
          },
        },
        property: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBookingById(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        guest: true,
        property: true,
        payments: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const conversation = await this.prisma.conversation.findFirst({
      where: { guestId: booking.guestId },
    });

    return {
      ...booking,
      conversationId: conversation?.id || null,
    };
  }

  async updateBookingStatus(id: string, status: BookingStatus) {
    const booking = await this.getBookingById(id);
    return this.prisma.booking.update({
      where: { id },
      data: { bookingStatus: status },
      include: { guest: true },
    });
  }

  async updatePaymentStatus(id: string, status: PaymentStatus, amountPaidAddition = 0) {
    const booking = await this.getBookingById(id);
    const newAmountPaid = booking.amountPaid + amountPaidAddition;
    
    // Determine payment status state based on paid amount
    let nextStatus = status;
    if (newAmountPaid >= booking.totalAmount) {
      nextStatus = PaymentStatus.PAID;
    } else if (newAmountPaid > 0) {
      nextStatus = PaymentStatus.PARTIALLY_PAID;
    }

    // Auto confirm booking if paid
    let nextBookingStatus = booking.bookingStatus;
    if (nextStatus === PaymentStatus.PAID || nextStatus === PaymentStatus.PARTIALLY_PAID) {
      nextBookingStatus = BookingStatus.CONFIRMED;
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        paymentStatus: nextStatus,
        bookingStatus: nextBookingStatus,
        amountPaid: newAmountPaid,
      },
      include: { guest: true },
    });
  }

  // Manage blocked dates
  async getBlockedDates(propertyId: string) {
    return this.prisma.blockedDate.findMany({
      where: { propertyId },
      orderBy: { date: 'asc' },
    });
  }

  async blockDates(propertyId: string, data: { startDate: string; endDate: string; reason: string }) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const operations = [];
    for (let i = 0; i <= nights; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      operations.push(
        this.prisma.blockedDate.create({
          data: {
            propertyId,
            date: d,
            reason: data.reason,
          },
        })
      );
    }
    await this.prisma.$transaction(operations);
    return { success: true };
  }

  async unblockDate(id: string) {
    await this.prisma.blockedDate.delete({ where: { id } });
    return { success: true };
  }

  // Retrieve occupancy & stats for Admin dashboard
  async getStats() {
    const bookings = await this.prisma.booking.findMany({
      where: {
        bookingStatus: {
          in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
        },
      },
    });

    const totalRevenue = bookings.reduce((sum, b) => sum + b.amountPaid, 0);
    const confirmedBookingsCount = bookings.length;

    // Simplified occupancy calculation: days booked in next 30 days
    const now = new Date();
    const future30Days = new Date();
    future30Days.setDate(now.getDate() + 30);

    const activeIn30Days = await this.prisma.booking.findMany({
      where: {
        bookingStatus: BookingStatus.CONFIRMED,
        AND: [
          { checkIn: { lt: future30Days } },
          { checkOut: { gt: now } },
        ],
      },
    });

    let bookedNights = 0;
    activeIn30Days.forEach((b) => {
      const start = b.checkIn > now ? b.checkIn : now;
      const end = b.checkOut < future30Days ? b.checkOut : future30Days;
      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      bookedNights += nights;
    });

    const occupancyRate = Math.round((bookedNights / 30) * 100);

    return {
      totalRevenue,
      bookingsCount: confirmedBookingsCount,
      occupancyRate,
      recentBookings: await this.prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { guest: true },
      }),
    };
  }

  async lookupBooking(email: string, invoiceNumber?: string) {
    if (!invoiceNumber || invoiceNumber.trim() === '') {
      // Lookup all bookings for this guest by email only
      const bookings = await this.prisma.booking.findMany({
        where: {
          guest: {
            email: email.toLowerCase().trim(),
          },
        },
        include: {
          guest: true,
          property: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (bookings.length === 0) {
        throw new NotFoundException('No reservations found for this email address');
      }

      return {
        type: 'LIST',
        bookings,
      };
    }

    // Standard lookup with invoice number
    const booking = await this.prisma.booking.findFirst({
      where: {
        invoiceNumber: invoiceNumber.trim(),
        guest: {
          email: email.toLowerCase().trim(),
        },
      },
      include: {
        guest: true,
        property: true,
        payments: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('No booking found matching these details');
    }

    const notifications = await this.prisma.notification.findMany({
      where: {
        recipientId: booking.guestId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const conversation = await this.prisma.conversation.findFirst({
      where: { guestId: booking.guestId },
    });

    return {
      type: 'SINGLE',
      ...booking,
      conversationId: conversation?.id || null,
      notifications,
    };
  }

  async getNotificationLogs() {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }
}
