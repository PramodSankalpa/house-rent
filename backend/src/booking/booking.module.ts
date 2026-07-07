import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { PricingModule } from '../pricing/pricing.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [AuthModule, PricingModule, NotificationModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
