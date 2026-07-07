import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { BookingModule } from '../booking/booking.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [BookingModule, NotificationModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
