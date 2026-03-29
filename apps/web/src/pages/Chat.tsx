import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/contexts/AuthContext';
import { sendChatMessage, type ChatMessage } from '@/services/chat';

const SUGGESTIONS = [
  'Qual o melhor celular para revender agora?',
  'Quais modelos vendem mais rápido na minha região?',
  'Quanto posso lucrar com iPhone 15 Pro Max?',
  'O mercado está bom para comprar estoque?',
];

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '\n• ')
    .replace(/\n/g, '<br/>');
}

export default function Chat() {
  useDocumentTitle('IA Analista');
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || isLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await sendChatMessage(
        message,
        messages,
        user?.region ?? 'SC',
      );

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: err instanceof Error
          ? err.message
          : 'Desculpe, ocorreu um erro. Tente novamente.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#22c55e]/10">
          <Sparkles className="h-5 w-5 text-[#22c55e]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#f0f0f5]">IA Analista</h1>
          <p className="text-xs text-[#f0f0f5]/40">
            Seu assistente de mercado de celulares
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-6">
        {messages.length === 0 && !isLoading && (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#22c55e]/10">
              <Sparkles className="h-8 w-8 text-[#22c55e]" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-[#f0f0f5]">
                Olá! Sou seu analista de mercado.
              </h2>
              <p className="mt-1 text-sm text-[#f0f0f5]/40">
                Pergunte qualquer coisa sobre o mercado de celulares na sua região.
              </p>
            </div>
            <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="rounded-xl border border-white/[0.06] bg-[#12121a] px-4 py-3 text-left text-sm text-[#f0f0f5]/60 transition-colors hover:border-[#22c55e]/30 hover:bg-[#22c55e]/5 hover:text-[#f0f0f5]/80"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 px-1">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#22c55e]/20">
                  <span className="text-[10px] font-bold text-[#22c55e]">IA</span>
                </div>
              )}
              <div
                className={
                  msg.role === 'user'
                    ? 'ml-auto max-w-[80%] rounded-2xl bg-[#22c55e]/10 px-4 py-3 text-sm text-[#f0f0f5]'
                    : 'max-w-[80%] rounded-2xl border border-white/[0.06] bg-[#1a1a26] px-4 py-3 text-sm text-[#f0f0f5]/80'
                }
              >
                {msg.role === 'assistant' ? (
                  <div
                    className="leading-relaxed [&>strong]:font-semibold [&>strong]:text-[#f0f0f5]"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                  />
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#22c55e]/20">
                <span className="text-[10px] font-bold text-[#22c55e]">IA</span>
              </div>
              <div className="max-w-[80%] rounded-2xl border border-white/[0.06] bg-[#1a1a26] px-4 py-3">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#22c55e]/60 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#22c55e]/60 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#22c55e]/60 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 flex items-center gap-2 border-t border-white/[0.06] bg-[#0a0a0f] pt-4"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Pergunte sobre o mercado..."
          disabled={isLoading}
          className="flex-1 rounded-xl border border-white/[0.06] bg-[#12121a] px-4 py-3 text-sm text-[#f0f0f5] placeholder-[#f0f0f5]/30 outline-none transition-colors focus:border-[#22c55e]/40 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#22c55e] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
