import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SenderType } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: '*', // Allow all origins for dev simplicity, configurable in production
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Socket Client Connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Socket Client Disconnected: ${client.id}`);
  }

  // Client joins a specific conversation room
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody('conversationId') conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(conversationId);
    console.log(`Client ${client.id} joined room: ${conversationId}`);
    return { success: true };
  }

  // Client sends message
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody()
    data: {
      conversationId: string;
      senderType: 'GUEST' | 'ADMIN';
      content: string;
      fileUrl?: string;
    },
  ) {
    const { conversationId, senderType, content, fileUrl } = data;
    
    // Save to DB
    const savedMsg = await this.chatService.saveMessage(
      conversationId,
      senderType === 'ADMIN' ? SenderType.ADMIN : SenderType.GUEST,
      content,
      fileUrl,
    );

    // Broadcast to room
    this.server.to(conversationId).emit('messageReceived', savedMsg);
    
    // Trigger global update for admin dashboard lists
    this.server.emit('conversationsUpdated');

    return savedMsg;
  }

  // Client typing indicator
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody()
    data: {
      conversationId: string;
      senderType: 'GUEST' | 'ADMIN';
      isTyping: boolean;
    },
  ) {
    const { conversationId, senderType, isTyping } = data;
    // Broadcast typing state to other clients in room
    this.server.to(conversationId).emit('typingStatus', { senderType, isTyping });
  }

  // Client read receipt trigger
  @SubscribeMessage('markRead')
  async handleMarkRead(
    @MessageBody()
    data: {
      conversationId: string;
      readerType: 'GUEST' | 'ADMIN';
    },
  ) {
    const { conversationId, readerType } = data;
    
    await this.chatService.markAsRead(
      conversationId,
      readerType === 'ADMIN' ? SenderType.ADMIN : SenderType.GUEST,
    );

    // Broadcast read status to room
    this.server.to(conversationId).emit('messagesRead', { readerType });
    this.server.emit('conversationsUpdated');
    
    return { success: true };
  }
}
