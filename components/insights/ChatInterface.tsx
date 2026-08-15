'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Search } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string; toolsUsed?: string[] };

const SUGGESTED_PROMPTS = [
  'How is our donor retention this year?',
  'Who are our most at-risk donors right now?',
  'How does giving this year compare to last year?',
  "What's our open pipeline look like by stage?",
  "What's our volunteer impact been over the last year?",
];

const TOOL_LABELS: Record<string, string> = {
  get_retention_rate: 'donor retention data',
  get_giving_summary: 'giving totals',
  get_at_risk_donors: 'at-risk donor list',
  get_pipeline_summary: 'pipeline data',
  get_volunteer_impact: 'volunteer hours data',
  find_donor: 'donor lookup',
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendQuestion(question: string) {
    if (!question.trim() || isPending) return;
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setIsPending(true);

    try {
      const res = await fetch('/api/insights/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong — try again.');
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      setSessionId(data.sessionId);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer, toolsUsed: data.toolsUsed }]);
    } catch {
      setError('Something went wrong — try again.');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsPending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendQuestion(input);
  }

  return (
    <div className="flex h-[calc(100vh-160px)] flex-col rounded-[16px] border border-gray-200 bg-white">
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-lg pt-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-evergreen/10 text-evergreen">
              <Sparkles size={22} />
            </div>
            <h2 className="mt-4 text-[17px] font-bold text-gray-900">Ask Jarvis</h2>
            <p className="mt-1.5 text-sm text-gray-600">
              Retention, giving trends, at-risk donors, pipeline, and volunteer impact — answered from
              your organization&rsquo;s real, current data.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => sendQuestion(p)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-left text-[13.5px] font-medium text-gray-700 transition-colors hover:border-teal hover:bg-teal/5"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%]">
                  {m.role === 'assistant' && (
                    <p className="mb-1 pl-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Jarvis
                    </p>
                  )}
                  <div
                    className={`rounded-[14px] px-4 py-3 text-[14px] leading-relaxed ${
                      m.role === 'user' ? 'bg-evergreen text-white' : 'bg-gray-50 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.toolsUsed && m.toolsUsed.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-gray-200 pt-2">
                        {Array.from(new Set(m.toolsUsed)).map((t) => (
                          <span
                            key={t}
                            className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10.5px] font-medium text-gray-500"
                          >
                            <Search size={10} />
                            Checked {TOOL_LABELS[t] ?? t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div className="rounded-[14px] bg-gray-50 px-4 py-3 text-[14px] text-gray-500">Jarvis is looking that up…</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && <p className="border-t border-gray-100 px-6 py-2 text-[13px] font-medium text-error">{error}</p>}

      <form onSubmit={handleSubmit} className="flex items-center gap-2.5 border-t border-gray-100 p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Jarvis about your donors, giving, or pipeline…"
          disabled={isPending}
          className="flex-1 rounded-[10px] border border-gray-200 px-4 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isPending || !input.trim()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-evergreen text-white transition-colors hover:bg-[#0d685f] disabled:opacity-40"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
