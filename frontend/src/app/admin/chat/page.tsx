'use client';

import { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { Send, CheckCheck, User, Mail, Phone, MessageSquare, Loader, Waves } from 'lucide-react';
import api from '../../../utils/api';

interface Guest {
  name: string;
  email: string;
  phone: string;
  _count?: { bookings: number };
}

interface Conversation {
  id: string;
  guest: Guest;
  lastMessageAt: string;
  messages: Array<{ content: string; senderType: string }>;
}

interface Message {
  id: string;
  senderType: 'GUEST' | 'ADMIN';
  content: string;
  isRead: boolean;
  createdAt: string;
}

export default function AdminChatInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [guestIsTyping, setGuestIsTyping] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchConversations = async (autoSelect = false) => {
    try {
      const response = await api.get('/chat/conversations');
      setConversations(response.data);
      setLoadingThreads(false);
      
      // Auto select first thread if available and none selected
      if (autoSelect && response.data.length > 0 && !selectedConv) {
        handleSelectConversation(response.data[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  useEffect(() => {
    fetchConversations(true);

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(backendUrl);
    socketRef.current = socket;

    // Listen for global chat list updates
    socket.on('conversationsUpdated', () => {
      fetchConversations(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Socket room joining and triggers when selecting conversation
  useEffect(() => {
    if (!selectedConv || !socketRef.current) return;

    const socket = socketRef.current;
    socket.emit('joinRoom', { conversationId: selectedConv.id });

    // Mark conversation read
    socket.emit('markRead', { conversationId: selectedConv.id, readerType: 'ADMIN' });

    socket.on('messageReceived', (msg: Message) => {
      if (msg.conversationId === selectedConv.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
        
        // Auto mark as read if selected
        socket.emit('markRead', { conversationId: selectedConv.id, readerType: 'ADMIN' });
      }
    });

    socket.on('typingStatus', (data: { senderType: string; isTyping: boolean }) => {
      if (data.senderType === 'GUEST') {
        setGuestIsTyping(data.isTyping);
      }
    });

    socket.on('messagesRead', (data: { readerType: string }) => {
      if (data.readerType === 'GUEST') {
        setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      }
    });

    return () => {
      socket.off('messageReceived');
      socket.off('typingStatus');
      socket.off('messagesRead');
    };
  }, [selectedConv]);

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    setLoadingMessages(true);
    setGuestIsTyping(false);

    try {
      const response = await api.get(`/chat/conversations/${conv.id}/messages`);
      setMessages(response.data);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to load message history:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Typing event emitter
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMsg(e.target.value);
    if (!socketRef.current || !selectedConv) return;

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing', { conversationId: selectedConv.id, senderType: 'ADMIN', isTyping: true });
    }

    const lastTypingTime = new Date().getTime();
    setTimeout(() => {
      const timeNow = new Date().getTime();
      const difference = timeNow - lastTypingTime;
      if (difference >= 2000 && isTyping) {
        socketRef.current?.emit('typing', { conversationId: selectedConv.id, senderType: 'ADMIN', isTyping: false });
        setIsTyping(false);
      }
    }, 2000);
  };

  // Send message submit
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !socketRef.current || !selectedConv) return;

    socketRef.current.emit('sendMessage', {
      conversationId: selectedConv.id,
      senderType: 'ADMIN',
      content: inputMsg,
    });

    setInputMsg('');
    if (isTyping) {
      socketRef.current.emit('typing', { conversationId: selectedConv.id, senderType: 'ADMIN', isTyping: false });
      setIsTyping(false);
    }
  };

  if (loadingThreads) {
    return (
      <div className="min-h-[400px] flex justify-center items-center gap-2 text-sky-400">
        <Loader className="w-8 h-8 animate-spin" />
        <span>Loading inbox threads...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display text-white">Guest Chat Inbox</h1>
        <p className="text-sm text-slate-400 mt-1">Communicate with booking inquiries and staying guests.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px] items-stretch">
        
        {/* Left Side: Threads List */}
        <div className="lg:col-span-1 rounded-3xl glass-card border border-white/5 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/5 font-semibold text-sm text-slate-300">
            Conversations
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {conversations.map((conv) => {
              const isActive = selectedConv?.id === conv.id;
              const lastMsg = conv.messages[0]?.content || 'Started a conversation';
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full text-left p-4 transition duration-200 flex items-start gap-3 ${
                    isActive ? 'bg-sky-500/10 border-l-4 border-sky-400' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-300">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4 className="font-semibold text-white text-sm truncate">{conv.guest.name}</h4>
                        {conv.guest._count && conv.guest._count.bookings > 1 && (
                          <span className="px-1.5 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[8px] rounded-full font-bold flex-shrink-0">
                            Regular
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 flex-shrink-0">
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-1">{lastMsg}</p>
                  </div>
                </button>
              );
            })}

            {conversations.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">
                No active chat threads found.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Message Thread */}
        <div className="lg:col-span-2 rounded-3xl glass-card border border-white/5 flex flex-col overflow-hidden">
          {selectedConv ? (
            <>
              {/* Thread Header */}
              <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-white text-base">{selectedConv.guest.name}</h4>
                    {selectedConv.guest._count && (
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        selectedConv.guest._count.bookings > 1
                          ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                          : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                      }`}>
                        {selectedConv.guest._count.bookings > 1 
                          ? `Regular Guest (${selectedConv.guest._count.bookings} Bookings)` 
                          : 'New Guest (1 Booking)'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-sky-400" />
                      {selectedConv.guest.email}
                    </span>
                    <span className="flex items-center gap-1 font-sans">
                      <Phone className="w-3.5 h-3.5 text-sky-400" />
                      {selectedConv.guest.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages viewport */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-950/20">
                {loadingMessages ? (
                  <div className="h-full flex justify-center items-center text-sky-400">
                    <Loader className="w-8 h-8 animate-spin" />
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isMe = msg.senderType === 'ADMIN';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-2xl text-sm leading-relaxed ${
                              isMe
                                ? 'bg-sky-500 text-slate-950 font-medium shadow-md shadow-sky-500/10'
                                : 'bg-white/5 border border-white/5 text-slate-200'
                            }`}
                          >
                            {msg.content}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isMe && (
                              <CheckCheck className={`w-3.5 h-3.5 ${msg.isRead ? 'text-sky-400' : 'text-slate-500'}`} />
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {guestIsTyping && (
                      <div className="flex items-center gap-1 text-slate-400 text-xs italic animate-pulse">
                        <span>Guest is typing...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="p-4 bg-white/5 border-t border-white/5 flex gap-2">
                <input
                  type="text"
                  placeholder="Type a reply..."
                  value={inputMsg}
                  onChange={handleInputChange}
                  className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500/50 transition"
                />
                <button
                  type="submit"
                  disabled={!inputMsg.trim() || loadingMessages}
                  className="p-3 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/30 text-slate-950 rounded-2xl transition duration-300"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-slate-500 space-y-3">
              <MessageSquare className="w-12 h-12 text-slate-600" />
              <p className="text-sm">Select a guest thread to begin real-time messaging.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
