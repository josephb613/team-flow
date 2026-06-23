'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '@/lib/store';

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  channelId: string;
  timestamp: string;
  reactions: { emoji: string; users: string[] }[];
  attachments: string[];
}

export interface ConnectedUser {
  id: string;
  name: string;
  avatar: string;
}

export interface TypingUser {
  userId: string;
  userName: string;
  channelId: string;
}

export function useChatSocket(channelId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUser = useAppStore((s) => s.currentUser);

  useEffect(() => {
    let cancelled = false;

    async function connectSocket() {
      if (!currentUser) return;

      const tokenResponse = await fetch('/api/chat/socket-token', { method: 'POST' });
      if (!tokenResponse.ok || cancelled) return;

      const { token } = (await tokenResponse.json()) as { token?: string };
      if (!token || cancelled) return;

      const socket = io('/?XTransformPort=3003', {
        transports: ['websocket', 'polling'],
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('authenticate', { token }, (result: { ok?: boolean }) => {
          if (!result?.ok) {
            socket.disconnect();
            return;
          }
          setIsConnected(true);
          socket.emit('join', { channel: channelId });
        });
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('channel_messages', (data: { channelId: string; messages: ChatMessage[] }) => {
        if (data.channelId === channelId) {
          setMessages(data.messages);
        }
      });

      socket.on('new_message', (message: ChatMessage) => {
        if (message.channelId === channelId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
        }
      });

      socket.on('connected_users', (data: { users: ConnectedUser[] }) => {
        setConnectedUsers(data.users);
      });

      socket.on('user_typing', (data: TypingUser) => {
        if (data.channelId === channelId && data.userId !== currentUser?.id) {
          setTypingUsers((prev) => {
            if (prev.some((u) => u.userId === data.userId)) return prev;
            return [...prev, data];
          });
        }
      });

      socket.on('user_stop_typing', (data: { userId: string; channelId: string }) => {
        if (data.channelId === channelId) {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        }
      });
    }

    connectSocket();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [channelId, currentUser]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!socketRef.current || !isConnected || !content.trim()) return;
      socketRef.current.emit('send_message', {
        channelId,
        content: content.trim(),
      });
    },
    [channelId, isConnected]
  );

  const emitTyping = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('typing', { channelId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', { channelId });
    }, 3000);
  }, [channelId, isConnected]);

  return {
    messages,
    sendMessage,
    emitTyping,
    typingUsers,
    connectedUsers,
    isConnected,
  };
}
