'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'error';
  content: string;
  timestamp: Date;
}

interface AiChatPanelProps {
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function AiChatPanel({ onClose, className, style }: AiChatPanelProps) {
  const { t } = useTranslation();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      content: t.aiChat.welcomeMessage,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasConversation = messages.some((m) => m.role === 'user');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const callLlmApi = useCallback(async (message: string) => {
    setIsLoading(true);
    setIsTyping(true);
    setLastFailedMessage(null);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: data.message || data.fallback || t.aiChat.errorMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'error',
        content: t.aiChat.errorMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setLastFailedMessage(message);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }, [t]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    callLlmApi(trimmed);
  }, [input, isLoading, callLlmApi]);

  const handleRetry = useCallback(() => {
    if (lastFailedMessage) {
      setMessages((prev) => prev.filter((m) => m.role !== 'error'));
      setLastFailedMessage(null);
      callLlmApi(lastFailedMessage);
    }
  }, [lastFailedMessage, callLlmApi]);

  const handleQuickAction = useCallback((action: string) => {
    if (isLoading) return;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: action,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    callLlmApi(action);
  }, [isLoading, callLlmApi]);

  const quickActions = [
    t.aiChat.summarizeTasks,
    t.aiChat.createTask,
    t.aiChat.findDeadlines,
    t.aiChat.teamStatus,
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 8 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={style}
      className={cn(
        'pointer-events-auto w-[min(380px,calc(100vw-2rem))] h-[min(460px,calc(100vh-6rem))] rounded-xl border border-border/80 bg-background shadow-xl flex flex-col overflow-hidden',
        className
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 h-12 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">{t.aiChat.title}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.role === 'error' ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{msg.content}</span>
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1 text-foreground hover:underline underline-offset-2"
                >
                  <RotateCcw className="h-3 w-3" />
                  {t.aiChat.retry}
                </button>
              </div>
            ) : msg.role === 'user' ? (
              <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-foreground px-3.5 py-2 text-sm leading-relaxed text-background">
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ) : (
              <div className="max-w-[88%] text-sm leading-relaxed text-foreground/90">
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            )}
          </motion.div>
        ))}

        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-center gap-1 py-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                    className="w-1 h-1 rounded-full bg-muted-foreground/60"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!hasConversation && !isTyping && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {quickActions.map((action) => (
              <button
                key={action}
                onClick={() => handleQuickAction(action)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-md text-xs text-muted-foreground border border-border/60 hover:text-foreground hover:border-border hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {action}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 pb-4 pt-2 shrink-0 border-t border-border/40">
        <div className="flex items-center gap-2 pt-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t.aiChat.placeholder}
            disabled={isLoading}
            className="flex-1 h-9 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 460;
const PANEL_GAP = 12;
const FAB_SIZE = 56;

export function getAiChatPanelPosition(
  fabX: number,
  fabY: number,
  placement: 'top' | 'bottom',
  align: 'left' | 'right',
  windowWidth: number,
  windowHeight: number
): React.CSSProperties {
  let left = align === 'right' ? fabX + FAB_SIZE - PANEL_WIDTH : fabX;
  let top =
    placement === 'bottom'
      ? fabY + FAB_SIZE + PANEL_GAP
      : fabY - PANEL_HEIGHT - PANEL_GAP;

  const margin = 12;
  const maxLeft = Math.max(margin, windowWidth - PANEL_WIDTH - margin);
  const maxTop = Math.max(margin, windowHeight - PANEL_HEIGHT - margin);

  left = Math.min(Math.max(margin, left), maxLeft);
  top = Math.min(Math.max(margin, top), maxTop);

  return { position: 'fixed', left, top, zIndex: 60 };
}
