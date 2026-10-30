import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Send,
  Sparkles,
  Bot,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  ExternalLink,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { api } from '../../services/api';

interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: 'gemini' | 'local_deterministic';
  dataSource?: 'supabase_live' | 'in_memory_baseline';
  timestamp: string;
  actionableLinks?: Array<{ label: string; path: string }>;
  suggestedQuestions?: string[];
  isError?: boolean;
}

interface CampusCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SUGGESTIONS = [
  'How many active complaints exist?',
  'Which complaints are Critical?',
  'Why was a complaint classified as Critical?',
  'Which building has the most active incidents?',
  'Which work orders are pending?',
  'Which inventory items are below minimum stock?',
  'What should management prioritize today?',
];

export default function CampusCopilotDrawer({ isOpen, onClose }: CampusCopilotDrawerProps) {
  const { user } = useCampus();
  const navigate = useNavigate();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [providerStatus, setProviderStatus] = useState<{
    activeProvider: string;
    isGeminiActive: boolean;
    model: string;
  }>({
    activeProvider: 'local_deterministic',
    isGeminiActive: false,
    model: 'Deterministic Engine v1.0',
  });

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Hello ${user.name.split(' ')[0]}! I am your **CampusOps AI Operations Copilot**.\n\nI monitor real-time facilities, active complaints, work order queues, inventory thresholds, and emergency room disruptions. Ask me any question below to get instant, verified operational answers.`,
      provider: 'local_deterministic',
      dataSource: 'in_memory_baseline',
      timestamp: 'Just now',
      suggestedQuestions: DEFAULT_SUGGESTIONS.slice(0, 4),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Poll / Check provider status on drawer open
  useEffect(() => {
    if (isOpen) {
      api.getCopilotStatus().then((status) => {
        if (status) {
          setProviderStatus({
            activeProvider: status.activeProvider,
            isGeminiActive: status.geminiConfigured,
            model: status.model,
          });
        }
      });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = async (questionToSend?: string) => {
    const query = (questionToSend || input).trim();
    if (!query || isLoading) return;

    setInput('');
    const userMsgId = `user-${Date.now()}`;
    const userMessage: CopilotMessage = {
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await api.queryCopilot(query, user);

      const assistantMessage: CopilotMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        provider: response.provider || 'local_deterministic',
        dataSource: response.dataSource || 'in_memory_baseline',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionableLinks: response.actionableLinks,
        suggestedQuestions: response.suggestedQuestions || DEFAULT_SUGGESTIONS.slice(0, 3),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message || 'An unexpected connection issue occurred.';
      const errorMessage: CopilotMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `**Inquiry Assistance:** I could not reach the remote Copilot server (${errorMsg}).\n\nI have switched to the **Local Operational Engine**. Please click one of the verified suggestions below or retry your question.`,
        provider: 'local_deterministic',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedQuestions: DEFAULT_SUGGESTIONS.slice(0, 3),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Conversation reset. Ready for your operational inquiries.`,
        provider: providerStatus.isGeminiActive ? 'gemini' : 'local_deterministic',
        timestamp: 'Just now',
        suggestedQuestions: DEFAULT_SUGGESTIONS.slice(0, 4),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#24283B]/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        className="relative w-full max-w-lg bg-[#FAF7F1] h-full shadow-2xl flex flex-col z-10 border-l border-[#E7E2DD] animate-in slide-in-from-right duration-300"
        style={{
          boxShadow: '-8px 0 32px rgba(36, 40, 59, 0.15)',
        }}
      >
        {/* Header */}
        <div className="p-4 bg-white border-b border-[#E7E2DD] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ background: 'linear-gradient(135deg, #24283B 0%, #3B4261 100%)' }}
            >
              <Sparkles size={20} className="text-[#E6E9FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-space font-bold text-base text-[#24283B]">CampusOps Copilot</h2>
                {providerStatus.isGeminiActive ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E9DDFB] text-[#5B3E96] border border-[#D5C2F5]">
                    <Sparkles size={10} />
                    Gemini Cloud AI
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D5F3E8] text-[#1E6B52] border border-[#B2E7D3]">
                    <Cpu size={10} />
                    Deterministic Engine
                  </span>
                )}
              </div>
              <p className="font-jakarta text-[11px] text-[#74788C]">
                Real-Time Operational Triage & Analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              title="Reset conversation"
              className="p-2 text-[#74788C] hover:text-[#24283B] hover:bg-[#F6F0E5] rounded-xl transition-colors"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#74788C] hover:text-[#24283B] hover:bg-[#F6F0E5] rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Message Box */}
              <div
                className={`max-w-[90%] rounded-2xl p-4 shadow-sm text-[13px] leading-relaxed font-jakarta ${
                  msg.role === 'user'
                    ? 'bg-[#24283B] text-white rounded-br-none'
                    : msg.isError
                    ? 'bg-[#FDF0F6] text-[#BA3D6E] border border-[#F8DCE8] rounded-bl-none'
                    : 'bg-white text-[#24283B] border border-[#E7E2DD] rounded-bl-none'
                }`}
              >
                {/* Formatted Markdown-like Content */}
                <div className="space-y-2 whitespace-pre-wrap">
                  {msg.content.split('\n\n').map((paragraph, idx) => {
                    if (paragraph.startsWith('> ')) {
                      return (
                        <div key={idx} className="p-2.5 rounded-xl bg-[#F0F2FF] border border-[#CCD3FF] text-xs font-medium text-[#24283B] my-1.5 shadow-2xs" dangerouslySetInnerHTML={{ __html: renderFormattedText(paragraph.replace(/^>\s*/, '')) }} />
                      );
                    }
                    if (paragraph.startsWith('### ')) {
                      return (
                        <h4 key={idx} className="font-space font-bold text-sm text-[#24283B] mt-1 mb-2">
                          {paragraph.replace('### ', '')}
                        </h4>
                      );
                    }
                    if (paragraph.startsWith('- ')) {
                      const lines = paragraph.split('\n');
                      return (
                        <ul key={idx} className="list-disc pl-4 space-y-1 my-1">
                          {lines.map((line, lIdx) => (
                            <li key={lIdx} dangerouslySetInnerHTML={{ __html: renderFormattedText(line.replace(/^- /, '')) }} />
                          ))}
                        </ul>
                      );
                    }
                    if (/^\d+\. /.test(paragraph)) {
                      const lines = paragraph.split('\n');
                      return (
                        <ol key={idx} className="list-decimal pl-4 space-y-1 my-1">
                          {lines.map((line, lIdx) => (
                            <li key={lIdx} dangerouslySetInnerHTML={{ __html: renderFormattedText(line.replace(/^\d+\. /, '')) }} />
                          ))}
                        </ol>
                      );
                    }
                    return (
                      <p key={idx} dangerouslySetInnerHTML={{ __html: renderFormattedText(paragraph) }} />
                    );
                  })}
                </div>

                {/* Actionable Deep Links */}
                {msg.actionableLinks && msg.actionableLinks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#E7E2DD]/60 flex flex-wrap gap-2">
                    {msg.actionableLinks.map((link, lIdx) => (
                      <button
                        key={lIdx}
                        onClick={() => {
                          onClose();
                          navigate(link.path);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E6E9FF] text-[#24283B] hover:bg-[#D4DAFF] transition-colors"
                      >
                        <span>{link.label}</span>
                        <ArrowRight size={12} />
                      </button>
                    ))}
                  </div>
                )}

                {/* Footer metadata for assistant response */}
                {msg.role === 'assistant' && (
                  <div className="mt-2 pt-2 border-t border-black/5 flex items-center justify-between text-[10px] text-[#74788C]">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#3FB950]" />
                      <span>{msg.provider === 'gemini' ? 'Gemini AI Verified' : 'Deterministic Engine'}</span>
                      <span className="text-gray-300">•</span>
                      <span className="font-semibold text-[#5B3E96]">{msg.dataSource === 'supabase_live' ? 'Live Supabase DB' : 'In-Memory Baseline'}</span>
                    </div>
                    <span>{msg.timestamp}</span>
                  </div>
                )}
              </div>

              {/* Follow-up question suggestion chips */}
              {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 max-w-[90%]">
                  {msg.suggestedQuestions.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => handleSend(q)}
                      className="text-left text-[11px] font-medium px-2.5 py-1 rounded-full bg-white border border-[#E7E2DD] text-[#74788C] hover:text-[#24283B] hover:border-[#D8D1C8] hover:bg-[#F6F0E5] transition-all duration-150"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Loading Animation */}
          {isLoading && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-[#E7E2DD] max-w-[80%] shadow-sm">
              <div className="w-6 h-6 rounded-lg bg-[#E6E9FF] flex items-center justify-center animate-spin">
                <Sparkles size={14} className="text-[#24283B]" />
              </div>
              <span className="font-jakarta text-xs text-[#74788C] animate-pulse">
                Evaluating campus records & synthesizing priorities…
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-[#E7E2DD] flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Copilot (e.g., 'What needs attention?')"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] text-[13px] font-jakarta text-[#24283B] placeholder-[#74788C] focus:outline-none focus:ring-2 focus:ring-[#24283B]/10 focus:border-[#24283B]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`p-2.5 rounded-xl text-white transition-all flex items-center justify-center ${
                input.trim() && !isLoading
                  ? 'bg-[#24283B] hover:bg-[#3B4261] shadow-sm'
                  : 'bg-[#E7E2DD] text-[#74788C] cursor-not-allowed'
              }`}
            >
              <Send size={16} />
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-2 flex items-center justify-between text-[10px] text-[#74788C]">
            <span className="flex items-center gap-1">
              <ShieldCheck size={11} className="text-[#1E6B52]" />
              Role: {user.role} ({user.department})
            </span>
            <span>Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Utility to convert markdown bold (**text**) and italic (*text*) to HTML
 */
function renderFormattedText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}
