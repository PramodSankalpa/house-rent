import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BookingService } from '../booking/booking.service';
import { PaymentStatus } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import Stripe from 'stripe';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private bookingService: BookingService,
    private notificationService: NotificationService,
  ) {
    const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16' as any,
    });
  }

  // Create Checkout Session (Stripe)
  async createCheckoutSession(bookingId: string) {
    const booking = await this.bookingService.getBookingById(bookingId);

    if (booking.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Booking is already paid');
    }

    const priceAmount = booking.totalAmount; // Full amount
    const description = `Reservation for ${booking.property.name} (Stay: ${booking.checkIn.toISOString().split('T')[0]} to ${booking.checkOut.toISOString().split('T')[0]})`;

    // Fallback: If mock stripe key, return simulated payment link
    if (process.env.STRIPE_SECRET_KEY === 'sk_test_mock') {
      const mockCheckoutUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/booking/checkout?bookingId=${booking.id}&mockPay=true`;
      return { url: mockCheckoutUrl, mock: true };
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: booking.guest.email,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: booking.property.name,
                description,
              },
              unit_amount: Math.round(priceAmount * 100), // In cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/booking/success?bookingId=${booking.id}`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/booking/checkout?bookingId=${booking.id}`,
        metadata: {
          bookingId: booking.id,
        },
      });

      return { url: session.url, mock: false };
    } catch (error) {
      console.error('Stripe Checkout Error:', error);
      throw new BadRequestException('Error generating payment link: ' + error.message);
    }
  }

  // Handle Stripe Webhook Events
  async handleStripeWebhook(payload: Buffer, sig: string) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock'
      );
    } catch (err) {
      console.error(`Webhook signature verification failed:`, err.message);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;
      const transactionId = session.payment_intent as string;
      const amountPaid = (session.amount_total || 0) / 100;

      if (bookingId && transactionId) {
        await this.confirmPayment(bookingId, amountPaid, 'STRIPE', transactionId, session);
      }
    }

    return { received: true };
  }

  // Handle simulated / mock payment execution (for local testing without live webhooks)
  async handleMockPayment(bookingId: string) {
    const booking = await this.bookingService.getBookingById(bookingId);
    if (booking.paymentStatus === PaymentStatus.PAID) {
      return { success: true, alreadyPaid: true };
    }

    const transactionId = `mock-txn-${crypto.randomBytes(8).toString('hex')}`;
    await this.confirmPayment(bookingId, booking.totalAmount, 'MOCK_STRIPE', transactionId, { mock: true });
    return { success: true };
  }

  // Handle PayHere IPN notification callback (Sri Lankan Gateway)
  async handlePayHereIpn(ipnBody: any) {
    const {
      merchant_id,
      order_id, // bookingId
      payment_id, // transactionId
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
    } = ipnBody;

    // Verify signatures
    const localMerchantId = process.env.PAYHERE_MERCHANT_ID || 'merchant_mock';
    const localSecret = process.env.PAYHERE_SECRET || 'payhere_secret_mock';

    // MD5 Signature format: Merchant ID + Order ID + PayHere Amount + PayHere Currency + Status Code + MD5(Merchant Secret) in Uppercase
    const secretHash = crypto.createHash('md5').update(localSecret).digest('hex').toUpperCase();
    const concatString = merchant_id + order_id + payhere_amount + payhere_currency + status_code + secretHash;
    const calculatedSig = crypto.createHash('md5').update(concatString).digest('hex').toUpperCase();

    if (calculatedSig !== md5sig) {
      throw new BadRequestException('PayHere IPN signature verification failed');
    }

    // status_code 2 means success
    if (status_code === '2') {
      const amountPaid = parseFloat(payhere_amount);
      await this.confirmPayment(order_id, amountPaid, 'PAYHERE', payment_id, ipnBody);
    }

    return { success: true };
  }

  // Execute database transitions and payments logs
  private async confirmPayment(
    bookingId: string,
    amount: number,
    method: string,
    transactionId: string,
    gatewayResponse: any,
  ) {
    const booking = await this.prisma.$transaction(async (tx) => {
      // 1. Create payment transaction record
      await tx.payment.create({
        data: {
          bookingId,
          amount,
          paymentMethod: method,
          transactionId,
          status: PaymentStatus.PAID,
          gatewayResponse,
        },
      });

      // 2. Update booking states & total amount paid
      const booking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          amountPaid: { increment: amount },
          paymentStatus: PaymentStatus.PAID,
          bookingStatus: 'CONFIRMED',
        },
        include: {
          guest: true,
          property: true,
        },
      });

      // 3. Generate static HTML invoice string and store metadata
      const invoiceHtml = this.generateInvoiceHtml(booking);
      
      return booking;
    });

    // Send async email and SMS notifications via BullMQ after booking is paid/confirmed
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const checkInStr = booking.checkIn.toISOString().split('T')[0];
      const checkOutStr = booking.checkOut.toISOString().split('T')[0];

      // 1. Email notification
      await this.notificationService.sendNotification({
        recipientId: booking.guest.id,
        type: 'payment.success',
        channel: 'EMAIL',
        recipientAddress: booking.guest.email,
        content: `Hi ${booking.guest.name}!\n\nYour payment of $${amount} has been successfully processed for your stay at ${booking.property.name}.\n\nStay Details:\nInvoice Number: ${booking.invoiceNumber}\nDates: ${checkInStr} to ${checkOutStr}\nTotal Price: $${booking.totalAmount}\nAmount Paid: $${booking.amountPaid}\n\nYou can review, download receipts, and manage your reservation details anytime at: ${frontendUrl}/booking/lookup?email=${booking.guest.email}&invoiceNumber=${booking.invoiceNumber}`,
      });

      // 2. SMS notification
      await this.notificationService.sendNotification({
        recipientId: booking.guest.id,
        type: 'payment.success',
        channel: 'SMS',
        recipientAddress: booking.guest.phone,
        content: `Hi ${booking.guest.name}! Payment of $${amount} received for ${booking.property.name}. Invoice: ${booking.invoiceNumber}. Manage details at: ${frontendUrl}/booking/lookup`,
      });
    } catch (err) {
      console.error('Failed to queue payment.success notifications:', err);
    }

    return booking;
  }

  // Dynamically compile professional invoices
  private generateInvoiceHtml(booking: any): string {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Invoice for Ahungalla Beach House</h2>
        <p><strong>Invoice Number:</strong> ${booking.invoiceNumber}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <hr/>
        <h3>Guest Details:</h3>
        <p><strong>Name:</strong> ${booking.guest.name}</p>
        <p><strong>Email:</strong> ${booking.guest.email}</p>
        <hr/>
        <h3>Stay Details:</h3>
        <p><strong>Property:</strong> ${booking.property.name}</p>
        <p><strong>Check-In:</strong> ${booking.checkIn.toISOString().split('T')[0]}</p>
        <p><strong>Check-Out:</strong> ${booking.checkOut.toISOString().split('T')[0]}</p>
        <hr/>
        <h3>Charges Summary:</h3>
        <table style="width: 100%; text-align: left; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #ccc;">
            <th>Item</th>
            <th>Amount</th>
          </tr>
          <tr>
            <td>Accommodation Charges</td>
            <td>$${booking.totalAmount + booking.discountAmount}</td>
          </tr>
          ${booking.discountAmount > 0 ? `
          <tr style="color: green;">
            <td>Discount Applied</td>
            <td>-$${booking.discountAmount}</td>
          </tr>` : ''}
          <tr style="font-weight: bold; border-top: 2px solid #333;">
            <td>Total Charges</td>
            <td>$${booking.totalAmount}</td>
          </tr>
          <tr style="font-weight: bold; color: green;">
            <td>Amount Paid</td>
            <td>$${booking.amountPaid + booking.totalAmount}</td>
          </tr>
        </table>
        <br/>
        <p>Thank you for choosing to stay with us. Stay Longer, Live by the Ocean.</p>
      </div>
    `;
  }
}
