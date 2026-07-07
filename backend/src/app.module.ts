import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { PropertyModule } from './property/property.module';
import { PricingModule } from './pricing/pricing.module';
import { BookingModule } from './booking/booking.module';
import { PaymentModule } from './payment/payment.module';
import { ChatModule } from './chat/chat.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    SettingsModule,
    PropertyModule,
    PricingModule,
    BookingModule,
    PaymentModule,
    ChatModule,
    NotificationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
