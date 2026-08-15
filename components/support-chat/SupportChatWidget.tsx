'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, X, ArrowRight } from 'lucide-react';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const SUGGESTED_QUESTIONS = [
  "What's a health score?",
  'How do grants work?',
  'How do I set up a Success Sequence?',
];

export default function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function sendMessage(content: string) {
    if (!content.trim() || isStreaming) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setIsStreaming(true);

    try {
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.body) throw new Error('No response stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages([...nextMessages, { role: 'assistant', content: assistantText }]);
      }
    } catch (err) {
      console.error('Support chat request failed:', err);
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: "Something went wrong — try again in a moment." },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open support chat"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-evergreen text-white shadow-lg transition-transform hover:scale-105"
      >
        <Sparkles size={22} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex max-h-[560px] w-[380px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-evergreen">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <p className="text-[13.5px] font-semibold text-gray-900">Donor Success Assistant</p>
            <p className="text-[11px] text-gray-500">Answers from the Success Hub</p>
          </div>
        </div>
        <button type="button" onClick={() => setIsOpen(false)} aria-label="Close support chat">
          <X size={18} className="text-gray-400 hover:text-gray-600" />
        </button>
      </div>

      <div ref={scrollRef} className="flex min-h-[220px] flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-[13px] text-gray-500">
            Ask anything about how Donor Success works — Success Sequences, grants, health scores,
            reports, all of it.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
              m.role === 'user'
                ? 'self-end rounded-br-sm bg-evergreen text-white'
                : 'self-start rounded-bl-sm bg-gray-100 text-gray-900'
            }`}
          >
            {m.content || (isStreaming && i === messages.length - 1 ? '…' : '')}
          </div>
        ))}
      </div>

      {messages.length === 0 && (
        <div className="flex gap-1.5 overflow-x-auto border-t border-gray-100 px-3.5 py-2.5">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => sendMessage(q)}
              className="flex-shrink-0 whitespace-nowrap rounded-full border border-gray-200 px-2.5 py-1 text-[11.5px] text-gray-600 hover:border-gray-300"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 px-4 py-2 text-center">
        <Link href="/support" className="text-[11.5px] font-medium text-gray-500 hover:text-evergreen">
          Still stuck? Contact support →
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-gray-100 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question"
          disabled={isStreaming}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          aria-label="Send"
          className="flex items-center justify-center rounded-lg bg-evergreen px-3 text-white disabled:opacity-60"
        >
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}
