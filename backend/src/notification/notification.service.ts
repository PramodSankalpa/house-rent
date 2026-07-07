import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { ChannelType } from '@prisma/client';
import * as Redis from 'ioredis';

@Injectable()
export class NotificationService implements OnModuleInit {
  private notificationQueue: Queue;
  private redisConnection: Redis.Redis;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;
    const tls = process.env.REDIS_TLS === 'true' ? {} : undefined;

    this.redisConnection = new Redis.default({
      host,
      port,
      password,
      tls,
      maxRetriesPerRequest: null,
    });

    this.notificationQueue = new Queue('notifications', {
      connection: this.redisConnection as any,
    });

    console.log('BullMQ Notification Queue Initialized');
  }

  // Queue a notification job asynchronously
  async sendNotification(data: {
    recipientId: string;
    type: string;
    channel: 'EMAIL' | 'SMS' | 'IN_APP';
    recipientAddress: string; // email address or phone number
    content: string;
  }) {
    const { recipientId, type, channel, recipientAddress, content } = data;

    // 1. Create a database record for traceability
    const notification = await this.prisma.notification.create({
      data: {
        recipientId,
        type,
        channel: channel === 'EMAIL' ? ChannelType.EMAIL : channel === 'SMS' ? ChannelType.SMS : ChannelType.IN_APP,
        content: `${channel} to ${recipientAddress}: ${content}`,
        status: 'PENDING',
      },
    });

    // 2. Add job to BullMQ
    await this.notificationQueue.add(
      'send',
      {
        notificationId: notification.id,
        recipientAddress,
        channel,
        content,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // retry after 5s
        },
      }
    );

    return notification;
  }
}
