import { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { sendAiChat } from '@/services/ai';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Qual celular da mais lucro?',
  'Tem oportunidade boa agora?',
  'Resumo do mercado hoje',
];

export function AiChatDrawer() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text?: string) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const reply = await sendAiChat(msg, `regiao: ${user?.region ?? 'BR'}`);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, nao consegui processar. Tente novamente.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/20 transition-transform hover:scale-110"
          title="Chat com IA"
        >
          <span className="text-xl">🧠</span>
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 flex h-[500px] w-full flex-col border-l border-t border-white/[0.06] bg-[#0a0a0f] shadow-2xl sm:bottom-6 sm:right-6 sm:h-[600px] sm:w-96 sm:rounded-2xl sm:border">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧠</span>
              <span className="text-sm font-semibold text-[#f0f0f5]">IA Analista</span>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-[#f0f0f5]/50 hover:bg-white/[0.04]">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2 pt-4">
                <p className="text-center text-xs text-[#f0f0f5]/40">Pergunte qualquer coisa sobre o mercado</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="w-full rounded-xl border border-white/[0.06] px-3 py-2 text-left text-xs text-[#f0f0f5]/60 hover:bg-white/[0.04]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={
                  msg.role === 'user'
                    ? 'max-w-[80%] rounded-2xl bg-[#22c55e]/10 px-3 py-2 text-sm text-[#f0f0f5]'
                    : 'max-w-[80%] rounded-2xl border border-white/[0.06] bg-[#1a1a26] px-3 py-2 text-sm text-[#f0f0f5]/80'
                }>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/[0.06] bg-[#1a1a26] px-3 py-2 text-sm text-[#f0f0f5]/40">
                  Pensando...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/[0.06] p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Pergunte sobre o mercado..."
                className="flex-1 rounded-xl border border-white/[0.06] bg-[#12121a] px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#f0f0f5]/30 outline-none focus:border-[#22c55e]"
                disabled={loading}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#22c55e] text-white disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
