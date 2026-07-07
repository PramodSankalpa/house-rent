import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { PrismaService } from '../prisma.service';
import * as nodemailer from 'nodemailer';
import * as Redis from 'ioredis';

@Injectable()
export class NotificationProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker;
  private redisConnection: Redis.Redis;
  private mailTransporter: nodemailer.Transporter;

  constructor(private prisma: PrismaService) {
    // Configure mail transporter (Mock / SMTP)
    this.mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      auth: {
        user: process.env.SMTP_USER || 'mock_user',
        pass: process.env.SMTP_PASS || 'mock_pass',
      },
    });
  }

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

    // Initialize BullMQ Worker
    this.worker = new Worker(
      'notifications',
      async (job: Job) => {
        await this.processJob(job);
      },
      {
        connection: this.redisConnection as any,
        concurrency: 2,
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`Notification Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Notification Job ${job?.id} failed:`, err);
    });

    console.log('BullMQ Worker listening on queue "notifications"');
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.redisConnection) {
      await this.redisConnection.quit();
    }
  }

  private async processJob(job: Job) {
    const { notificationId, recipientAddress, channel, content } = job.data;

    try {
      if (channel === 'EMAIL') {
        // Run simulated SMTP or live delivery
        if (process.env.SMTP_HOST) {
          const fromName = process.env.SMTP_FROM_NAME || 'Ahungalla Beach House';
          const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@ahungallabeachhouse.com';
          await this.mailTransporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: recipientAddress,
            subject: 'Reservation Update - Ahungalla Beach House',
            text: content,
          });
        } else {
          console.log(`[MOCK EMAIL SENT] To: ${recipientAddress} | Message: ${content}`);
        }
      } else if (channel === 'SMS') {
        // Run simulated Twilio or live delivery
        console.log(`[MOCK SMS SENT] To: ${recipientAddress} | Message: ${content}`);
      }

      // Update database status
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'SENT' },
      });

    } catch (error) {
      console.error(`Error delivering notification ${notificationId}:`, error);
      
      // Update database status with error log
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'FAILED',
          errorLog: error.message || 'Unknown delivery error',
        },
      });

      // Retrow to trigger BullMQ retry backoff
      throw error;
    }
  }
}
