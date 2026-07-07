import { Controller, Post, Param, Body, Headers, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Request, Response } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('checkout/:bookingId')
  async createCheckoutSession(@Param('bookingId') bookingId: string) {
    return this.paymentService.createCheckoutSession(bookingId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async stripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    // Note: Stripe requires the raw buffer. In NestJS, rawBody needs to be configured in main.ts.
    // If not configured, we pass req.body (or request buffer if configured).
    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
    return this.paymentService.handleStripeWebhook(rawBody, signature);
  }

  @Post('payhere-ipn')
  @HttpCode(HttpStatus.OK)
  async payHereIpn(@Body() ipnBody: any) {
    return this.paymentService.handlePayHereIpn(ipnBody);
  }

  @Post('mock-pay/:bookingId')
  @HttpCode(HttpStatus.OK)
  async mockPayment(@Param('bookingId') bookingId: string) {
    return this.paymentService.handleMockPayment(bookingId);
  }
}
