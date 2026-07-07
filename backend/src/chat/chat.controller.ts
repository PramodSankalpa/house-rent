import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations/start')
  async startConversation(
    @Body() data: { name: string; email: string; phone: string },
  ) {
    return this.chatService.startConversation(data);
  }

  @Get('conversations')
  @UseGuards(AdminGuard)
  async getConversations() {
    return this.chatService.getConversations();
  }

  @Get('conversations/:id/messages')
  async getMessages(@Param('id') conversationId: string) {
    return this.chatService.getMessages(conversationId);
  }
}
