'use client';

import { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { MessageSquare, X, Send, CheckCheck, User, Mail, Phone, Loader, LogOut } from 'lucide-react';
import api, { getBackendUrl } from '../utils/api';

interface Message {
  id: string;
  senderType: 'GUEST' | 'ADMIN';
  content: string;
  isRead: boolean;
  createdAt: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  // Registration Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Chat Messaging State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [adminIsTyping, setAdminIsTyping] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load chat session if existing
  useEffect(() => {
    const handleSessionUpdate = () => {
      const storedId = localStorage.getItem('chat_conversation_id');
      if (storedId) {
        setConversationId(storedId);
        setHasRegistered(true);
        loadMessages(storedId);
      } else {
        setConversationId(null);
        setHasRegistered(false);
        setMessages([]);
        setName('');
        setEmail('');
        setPhone('');
      }
    };

    if (typeof window !== 'undefined') {
      handleSessionUpdate();
      window.addEventListener('chat_session_updated', handleSessionUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('chat_session_updated', handleSessionUpdate);
      }
    };
  }, []);

  // Socket Connection setup
  useEffect(() => {
    if (!conversationId) return;

    const backendUrl = getBackendUrl();
    const socket = io(backendUrl);
    socketRef.current = socket;

    socket.emit('joinRoom', { conversationId });

    socket.on('messageReceived', (msg: Message) => {
      setMessages((prev) => {
        // Prevent duplicate appending
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
      
      // If chat is open, auto mark message as read
      if (isOpen && msg.senderType === 'ADMIN') {
        socket.emit('markRead', { conversationId, readerType: 'GUEST' });
      }
    });

    socket.on('typingStatus', (data: { senderType: string; isTyping: boolean }) => {
      if (data.senderType === 'ADMIN') {
        setAdminIsTyping(data.isTyping);
      }
    });

    socket.on('messagesRead', (data: { readerType: string }) => {
      if (data.readerType === 'ADMIN') {
        setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [conversationId, isOpen]);

  // Mark unread when chat opens
  useEffect(() => {
    if (isOpen && conversationId && socketRef.current) {
      socketRef.current.emit('markRead', { conversationId, readerType: 'GUEST' });
      scrollToBottom();
    }
  }, [isOpen, conversationId]);

  const loadMessages = async (convId: string) => {
    try {
      const response = await api.get(`/chat/conversations/${convId}/messages`);
      setMessages(response.data);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to load message history:', err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Submit registration form
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) return;
    setRegLoading(true);

    try {
      const response = await api.post('/chat/conversations/start', {
        name,
        email,
        phone,
      });

      const newId = response.data.id;
      localStorage.setItem('chat_conversation_id', newId);
      setConversationId(newId);
      setHasRegistered(true);
      await loadMessages(newId);
    } catch (err) {
      alert('Error starting conversation: ' + err.message);
    } finally {
      setRegLoading(false);
    }
  };

  // Typing state emitter
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMsg(e.target.value);

    if (!socketRef.current || !conversationId) return;

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing', { conversationId, senderType: 'GUEST', isTyping: true });
    }

    // Debounce typing timer
    const lastTypingTime = new Date().getTime();
    setTimeout(() => {
      const timeNow = new Date().getTime();
      const difference = timeNow - lastTypingTime;
      if (difference >= 2000 && isTyping) {
        socketRef.current?.emit('typing', { conversationId, senderType: 'GUEST', isTyping: false });
        setIsTyping(false);
      }
    }, 2000);
  };

  // Send message handler
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !socketRef.current || !conversationId) return;

    socketRef.current.emit('sendMessage', {
      conversationId,
      senderType: 'GUEST',
      content: inputMsg,
    });

    setInputMsg('');
    if (isTyping) {
      socketRef.current.emit('typing', { conversationId, senderType: 'GUEST', isTyping: false });
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      {/* Expanded Chat Box */}
      {isOpen && (
        <div className="w-[calc(100vw-2rem)] sm:w-[360px] h-[500px] mb-4 rounded-3xl overflow-hidden glass-card border border-white/10 flex flex-col shadow-2xl transition-all duration-300">
          {/* Header */}
          <div className="p-4 bg-sky-500/20 border-b border-white/5 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute" />
              <div className="w-3 h-3 rounded-full bg-emerald-500 relative" />
              <div>
                <h4 className="font-semibold text-white text-sm">Beach House Concierge</h4>
                <p className="text-xs text-slate-400">Replies instantly</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {hasRegistered && (
                <button
                  onClick={() => {
                    if (confirm('End this chat session? This will clear your chat history on this browser.')) {
                      localStorage.removeItem('chat_conversation_id');
                      setConversationId(null);
                      setHasRegistered(false);
                      setMessages([]);
                      setName('');
                      setEmail('');
                      setPhone('');
                    }
                  }}
                  title="End Chat Session"
                  className="p-1 hover:bg-white/10 text-rose-400 hover:text-rose-300 rounded-full transition duration-200"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!hasRegistered ? (
              // Onboarding Form
              <form onSubmit={handleRegister} className="h-full flex flex-col justify-center space-y-4">
                <div className="text-center mb-2">
                  <p className="text-sm text-slate-300">
                    We live by the ocean. Drop your details, and let&apos;s plan your long stay!
                  </p>
                </div>

                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Your Name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-sky-500 transition"
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="Your Email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-sky-500 transition"
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="Your Phone Number"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-sky-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-slate-900 font-semibold rounded-xl flex items-center justify-center gap-2 transition duration-300"
                >
                  {regLoading && <Loader className="w-4 h-4 animate-spin" />}
                  Start Chatting
                </button>
              </form>
            ) : (
              // Message Logs
              <>
                {messages.map((msg) => {
                  const isAdmin = msg.senderType === 'ADMIN';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                          isAdmin
                            ? 'bg-white/5 border border-white/5 text-slate-200'
                            : 'bg-sky-500 text-slate-950 font-medium'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {!isAdmin && (
                          <CheckCheck className={`w-3.5 h-3.5 ${msg.isRead ? 'text-sky-400' : 'text-slate-500'}`} />
                        )}
                      </div>
                    </div>
                  );
                })}

                {adminIsTyping && (
                  <div className="flex items-center gap-1 text-slate-400 text-xs mt-2 italic animate-pulse">
                    <span>Host is typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Footer Input */}
          {hasRegistered && (
            <form onSubmit={handleSendMessage} className="p-3 bg-white/5 border-t border-white/5 flex gap-2">
              <input
                type="text"
                placeholder="Type your message..."
                value={inputMsg}
                onChange={handleInputChange}
                className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition"
              />
              <button
                type="submit"
                disabled={!inputMsg.trim()}
                className="p-2.5 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/30 text-slate-900 rounded-xl transition duration-300"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 bg-sky-500 hover:bg-sky-400 text-slate-900 rounded-full shadow-2xl border border-sky-400/30 transition-transform duration-300 hover:scale-105 active:scale-95 flex items-center justify-center"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
}
