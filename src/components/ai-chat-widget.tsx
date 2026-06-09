'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Paperclip, Mic, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

function getAIResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('task')) {
    return "You have 5 tasks in progress and 4 in your to-do list. Your highest priority task is 'Set up authentication flow'. Would you like me to create a new task?";
  }
  if (lower.includes('deadline') || lower.includes('due')) {
    return "You have 2 tasks due this week: 'Design homepage hero section' (Jan 25) and 'Create onboarding screens' (Jan 28). Both are high priority.";
  }
  if (lower.includes('meeting')) {
    return "You have 2 meetings scheduled: 'Sprint Planning' today at 2:00 PM and 'Design Review' tomorrow at 10:00 AM.";
  }
  if (lower.includes('team') || lower.includes('member')) {
    return "Your team has 8 members. 5 are currently online. Sarah Chen and Mike Johnson are working on the Mobile App project.";
  }
  return `I understand you're asking about '${message}'. Let me look into that for you. In the meantime, you can check your dashboard for an overview or ask me about specific tasks, deadlines, or meetings.`;
}

export function AiChatWidget() {
  const { t } = useTranslation();
  const aiChatOpen = useAppStore((s) => s.aiChatOpen);
  const toggleAiChat = useAppStore((s) => s.toggleAiChat);
  const setAiChatOpen = useAppStore((s) => s.setAiChatOpen);

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (aiChatOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [aiChatOpen]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse = getAIResponse(trimmed);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1000);
  }, [input]);

  const handleQuickAction = useCallback((action: string) => {
    setInput(action);
    // Auto-send the quick action
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: action,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse = getAIResponse(action);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1000);
  }, []);

  const quickActions = [
    t.aiChat.summarizeTasks,
    t.aiChat.createTask,
    t.aiChat.findDeadlines,
    t.aiChat.teamStatus,
  ];

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!aiChatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={toggleAiChat}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-[oklch(0.55_0.15_160)] to-[oklch(0.45_0.15_160)] text-white shadow-lg hover:shadow-xl hover:shadow-emerald-500/25 transition-shadow flex items-center justify-center group"
            aria-label="Open AI Chat"
          >
            <Sparkles className="h-6 w-6 group-hover:scale-110 transition-transform" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full animate-ping bg-[oklch(0.55_0.15_160)] opacity-20" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {aiChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-[480px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-3rem)] rounded-2xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.45_0.15_160)] text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{t.aiChat.title}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span className="text-[11px] text-white/80">{t.aiChat.online}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setAiChatOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'ai'
                        ? 'bg-[oklch(0.55_0.15_160/0.1)] text-foreground border border-[oklch(0.55_0.15_160/0.15)]'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {msg.role === 'ai' && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Bot className="h-3.5 w-3.5 text-[oklch(0.55_0.15_160)]" />
                        <span className="text-[10px] font-medium text-[oklch(0.55_0.15_160)]">{t.aiChat.title}</span>
                      </div>
                    )}
                    <p>{msg.content}</p>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex justify-start"
                  >
                    <div className="bg-[oklch(0.55_0.15_160/0.1)] border border-[oklch(0.55_0.15_160/0.15)] rounded-2xl px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Bot className="h-3.5 w-3.5 text-[oklch(0.55_0.15_160)]" />
                        <span className="text-[10px] font-medium text-[oklch(0.55_0.15_160)]">{t.aiChat.thinking}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <motion.span
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                          className="w-1.5 h-1.5 rounded-full bg-[oklch(0.55_0.15_160)]"
                        />
                        <motion.span
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }}
                          className="w-1.5 h-1.5 rounded-full bg-[oklch(0.55_0.15_160)]"
                        />
                        <motion.span
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }}
                          className="w-1.5 h-1.5 rounded-full bg-[oklch(0.55_0.15_160)]"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="px-4 pb-2 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickAction(action)}
                    className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[oklch(0.55_0.15_160/0.08)] text-[oklch(0.55_0.15_160)] border border-[oklch(0.55_0.15_160/0.15)] hover:bg-[oklch(0.55_0.15_160/0.15)] transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="px-4 pb-4 pt-1 shrink-0">
              <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-3 py-2 focus-within:border-[oklch(0.55_0.15_160/0.4)] focus-within:ring-1 focus-within:ring-[oklch(0.55_0.15_160/0.2)] transition-all">
                <button
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
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
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                />
                <button
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Voice input"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-1.5 rounded-lg bg-[oklch(0.55_0.15_160)] text-white hover:bg-[oklch(0.55_0.15_160/0.9)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  aria-label="Send message"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
