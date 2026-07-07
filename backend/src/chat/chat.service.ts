import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SenderType } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // Guest starts a conversation (enters name/email/phone on website)
  async startConversation(data: { name: string; email: string; phone: string }) {
    const { name, email, phone } = data;

    const guest = await this.prisma.guest.upsert({
      where: { email: email.toLowerCase() },
      update: { name, phone },
      create: { email: email.toLowerCase(), name, phone },
    });

    let conversation = await this.prisma.conversation.findFirst({
      where: { guestId: guest.id },
      include: { guest: true },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { guestId: guest.id },
        include: { guest: true },
      });

      // Add a default greeting message
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: SenderType.ADMIN,
          content: `Hi ${name}! Thanks for contacting Ahungalla Beach House. How can we help you today?`,
        },
      });
    }

    return conversation;
  }

  // Admin lists all active conversation threads
  async getConversations() {
    return this.prisma.conversation.findMany({
      include: {
        guest: {
          include: {
            _count: {
              select: { bookings: true },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  // Get messages for a specific conversation thread
  async getMessages(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Persist a message to database
  async saveMessage(conversationId: string, senderType: SenderType, content: string, fileUrl?: string) {
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderType,
        content,
        fileUrl,
      },
    });

    // Update lastMessageAt on the conversation
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  // Mark all unread messages in a thread as read
  async markAsRead(conversationId: string, readerType: SenderType) {
    const senderToMarkRead = readerType === SenderType.ADMIN ? SenderType.GUEST : SenderType.ADMIN;

    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderType: senderToMarkRead,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  }
}
