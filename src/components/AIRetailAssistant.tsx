import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, User, Bot, AlertCircle, ShoppingBag, Store } from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIRetailAssistantProps {
  products: any[];
  batches: any[];
}

export const AIRetailAssistant: React.FC<AIRetailAssistantProps> = ({ products, batches }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Namaste! I am your **StockSmart AI Operations Copilot**. I can help you automate store restocking, audit near-expiry stock, calculate GST parameters, or generate local flash marketplace discounts. Ask me anything!"
    }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [assistantRole, setAssistantRole] = useState<'vendor' | 'customer'>('vendor');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim()) return;

    if (!customText) setInput('');

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          role: assistantRole,
          history: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) throw new Error("Could not connect with AI intelligence.");
      const data = await response.json();
      
      const replyMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.text || "Sorry, I couldn't compute a reply."
      };
      setMessages(prev => [...prev, replyMsg]);
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: `❌ **Error:** ${e.message || "Failed to reach servers."}`
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let segments: React.ReactNode[] = [];
      const boldParts = line.split('**');
      
      if (boldParts.length > 1) {
        segments = boldParts.map((part, i) => {
          if (i % 2 === 1) {
            return (
              <strong key={i} className="font-extrabold text-emerald-600 bg-emerald-500/10 px-1 py-0.5 rounded">
                {part}
              </strong>
            );
          }
          return part;
        });
      }

      const renderedText = segments.length > 0 ? segments : line;

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc pl-1 my-1 text-slate-800 text-[11px] leading-relaxed">
            {renderedText}
          </li>
        );
      }

      if (line.trim().startsWith('### ')) {
        return <h4 key={idx} className="text-xs font-semibold text-slate-900 mt-3 mb-1 flex items-center">{line.replace('### ', '')}</h4>;
      }
      if (line.trim().startsWith('## ')) {
        return <h3 key={idx} className="text-sm font-semibold text-indigo-200 mt-4 mb-2 pb-1 border-b border-slate-200/50">{line.replace('## ', '')}</h3>;
      }

      if (line.trim() === '') return <div key={idx} className="h-2" />;

      return <p key={idx} className="text-slate-800 text-[11.5px] leading-relaxed my-1">{renderedText}</p>;
    });
  };

  const getQuickPrompts = () => {
    if (assistantRole === 'vendor') {
      return [
        "Audit expiring batches & suggest smart discounts",
        "Which products are below critical reorder points?",
        "Draft a GST invoice profile for Dairy items"
      ];
    } else {
      return [
        "What fresh discount items are available near me?",
        "Do you have high-freshness Milk in stock?",
        "Find grocery discounts under ₹100"
      ];
    }
  };

  return (
    <Card className="overflow-hidden h-full flex flex-col min-h-[480px] border-slate-200 shadow-sm">
      {/* Header */}
      <CardHeader className="bg-slate-50/50 border-b border-slate-200/50 flex flex-row items-center justify-between py-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-2xl border border-blue-200">
            <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">AI Retail Copilot</h3>
            <span className="text-[9px] font-mono text-slate-500/90">Gemini 3.5 Operational Assistant</span>
          </div>
        </div>

        {/* Persona Toggle */}
        <div className="bg-white border border-slate-200/50 rounded-2xl p-0.5 flex space-x-0.5">
          <button
            onClick={() => {
              setAssistantRole('vendor');
              setMessages([
                {
                  id: 'welcome',
                  role: 'assistant',
                  content: "Namaste! I am in **Storeowner SaaS mode**. I can check inventory counts, list critical reorder actions, draft retail discounts, or manage items expiring shortly."
                }
              ]);
            }}
            className={`px-2.5 py-1 rounded-xl text-[9px] font-medium uppercase transition flex items-center space-x-1 ${
              assistantRole === 'vendor' ? 'bg-blue-600 text-white' : 'text-slate-500/90 hover:text-slate-900'
            }`}
          >
            <Store className="w-3 h-3" />
            <span>Storeowner</span>
          </button>
          <button
            onClick={() => {
              setAssistantRole('customer');
              setMessages([
                {
                  id: 'welcome',
                  role: 'assistant',
                  content: "Welcome to the **Hyperlocal Shopper Assist**. Looking for nearby deals, dairy, organic bread, or fresh items at a discounted rate near you? Ask me!"
                }
              ]);
            }}
            className={`px-2.5 py-1 rounded-xl text-[9px] font-medium uppercase transition flex items-center space-x-1 ${
              assistantRole === 'customer' ? 'bg-blue-600 text-white' : 'text-slate-500/90 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3 h-3" />
            <span>Shopper</span>
          </button>
        </div></CardHeader>{/* Messages */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 max-h-[380px] min-h-[250px] bg-slate-50/20">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start space-x-2.5 max-w-[85%] ${
              m.role === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div
              className={`p-1.5 rounded-2xl border flex-shrink-0 ${
                m.role === 'user'
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-emerald-600/10 border-emerald-200 text-emerald-600'
              }`}
            >
              {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`rounded-2xl p-3.5 text-xs shadow-md border ${
                m.role === 'user'
                  ? 'bg-indigo-50 border-indigo-900 text-slate-900 rounded-tr-none'
                  : 'bg-slate-50 border-slate-200/30 text-slate-800 rounded-tl-none'
              }`}
            >
              {parseMarkdown(m.content)}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex items-start space-x-2.5 max-w-[85%] animate-fade-in">
            <div className="p-1.5 rounded-2xl border bg-blue-50 border-blue-200 text-blue-600 flex-shrink-0 relative overflow-hidden">
              <Bot className="w-3.5 h-3.5 relative z-10" />
              <div className="absolute inset-0 bg-indigo-400/20 animate-ping rounded-2xl"></div>
            </div>
            <div className="rounded-2xl p-6 text-xs bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-200/50 text-slate-500/90 rounded-tl-none font-mono flex flex-col space-y-2 shadow-lg shadow-indigo-500/5">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-[10px] font-medium text-blue-600">Synthesizing response...</span>
              </div>
              <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500/50 rounded-full animate-pulse w-full origin-left scale-x-50 transition-all duration-1000"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 bg-white shadow-sm border border-slate-200 rounded-2xl border-t border-slate-200/30 flex flex-wrap gap-1.5">
        {getQuickPrompts().map((p, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(p)}
            className="text-[9.5px] font-mono font-medium bg-white hover:bg-slate-100 border border-slate-200/50 hover:border-slate-300 text-slate-500/90 hover:text-slate-900 px-2.5 py-1.5 rounded-2xl transition"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 bg-slate-50 border-t border-slate-200/30 flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          placeholder={
            assistantRole === 'vendor'
              ? 'Ask about safety stock, milk batches, GST rules...'
              : 'Search nearby store discounts, bread quality, locations...'
          }
          className="flex-1 bg-white text-slate-800 border border-slate-200/50 rounded-2xl px-3.5 py-2.5 text-[11px] font-mono focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isSending || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-slate-900 p-2.5 rounded-2xl transition flex-shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </Card>
  );
};
