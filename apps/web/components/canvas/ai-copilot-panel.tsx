'use client';

import React, { useState } from 'react';
import type {
  AIChatMessage,
  ModelCitation,
  ArchitectureGroundedContext,
  MessageId,
} from '@diagramhq/domain';
import { queryModelGroundedQA } from '@diagramhq/domain';

export interface CitationBadgeProps {
  citation: ModelCitation;
  onClick?: (citation: ModelCitation) => void;
}

export function CitationBadge({ citation, onClick }: CitationBadgeProps) {
  const kindIcons: Record<string, string> = {
    object: 'deployed_code',
    connection: 'arrow_forward',
    flow: 'alt_route',
    adr: 'gavel',
  };

  const kindColors: Record<string, string> = {
    object: 'border-cyan-800 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900',
    connection: 'border-amber-800 bg-amber-950/60 text-amber-300 hover:bg-amber-900',
    flow: 'border-purple-800 bg-purple-950/60 text-purple-300 hover:bg-purple-900',
    adr: 'border-emerald-800 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900',
  };

  const style = kindColors[citation.kind] || kindColors.object;
  const icon = kindIcons[citation.kind] || 'link';

  return (
    <button
      type="button"
      onClick={() => onClick?.(citation)}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${style}`}
      title={citation.description || `${citation.kind}: ${citation.name}`}
      aria-label={`Citation for ${citation.name}`}
    >
      <span className="material-symbols-outlined text-[13px]">{icon}</span>
      <span className="font-semibold">{citation.id}</span>
      <span className="text-slate-400 font-sans text-[10px]">({citation.name})</span>
    </button>
  );
}

export interface AICopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context: ArchitectureGroundedContext;
  onSelectEntity?: (entityId: string) => void;
  initialQuery?: string;
}

export function AICopilotPanel({
  isOpen,
  onClose,
  context,
  onSelectEntity,
  initialQuery,
}: AICopilotPanelProps) {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'msg_welcome' as MessageId,
      role: 'assistant',
      content: `I'm your Architecture Copilot, grounded directly on this model. Ask me about dependencies, blast radius, flows, or system boundaries.`,
      citations: context.objects.slice(0, 2).map((o) => ({
        kind: 'object',
        id: o.id,
        name: o.name,
      })),
      timestamp: new Date().toISOString(),
    },
  ]);

  const [input, setInput] = useState(initialQuery || '');
  const [isThinking, setIsThinking] = useState(false);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userText = input.trim();
    const userMsg: AIChatMessage = {
      id: `msg_u_${Date.now()}` as MessageId,
      role: 'user',
      content: userText,
      citations: [],
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    setTimeout(() => {
      const response = queryModelGroundedQA(userText, context);
      setMessages((prev) => [...prev, response]);
      setIsThinking(false);
    }, 50);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div
      data-testid="ai-copilot-panel"
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100"
      role="complementary"
      aria-label="Architecture AI Copilot Panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-cyan-400 text-2xl">
            psychology
          </span>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              Architecture Copilot
              <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                Grounded
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {`${context.objects.length} objects · ${context.connections.length} connections`}
            </p>
          </div>
        </div>
        <button
          type="button"
          data-testid="ai-copilot-close-btn"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Close Copilot Panel"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      {/* Suggested prompts banner */}
      {(() => {
        const firstObj = context.objects[0];
        const secondObj = context.objects[1];
        return (
          <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto flex items-center gap-2 text-xs">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">
              Try:
            </span>
            {firstObj && secondObj && (
              <button
                type="button"
                onClick={() =>
                  handleQuickPrompt(
                    `Why does ${firstObj.name} depend on ${secondObj.name}?`
                  )
                }
                className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-[11px] whitespace-nowrap border border-slate-700 hover:border-slate-600 transition-colors"
              >
                {`Why ${firstObj.name} → ${secondObj.name}?`}
              </button>
            )}
            {firstObj && (
              <button
                type="button"
                onClick={() =>
                  handleQuickPrompt(`What depends on ${firstObj.name}?`)
                }
                className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-[11px] whitespace-nowrap border border-slate-700 hover:border-slate-600 transition-colors"
              >
                {`What depends on ${firstObj.name}?`}
              </button>
            )}
          </div>
        );
      })()}

      {/* Message history */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] p-3 rounded-xl text-xs leading-relaxed ${
                  isUser
                    ? 'bg-cyan-600 text-white rounded-br-sm'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Grounded Citations */}
                {!isUser && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px] text-cyan-400">
                        verified
                      </span>
                      Grounded Model Citations ({msg.citations.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((c, idx) => (
                        <CitationBadge
                          key={`${c.id}-${idx}`}
                          citation={c}
                          onClick={(cit) => onSelectEntity?.(cit.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isThinking && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2 bg-slate-950/40 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            Analyzing architecture graph...
          </div>
        )}
      </div>

      {/* Input box */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="relative">
          <input
            type="text"
            data-testid="ai-copilot-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about the architecture..."
            className="w-full pl-3 pr-10 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 placeholder:text-slate-500"
          />
          <button
            type="submit"
            data-testid="ai-copilot-submit-btn"
            disabled={!input.trim() || isThinking}
            className="absolute right-2 top-2 p-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-40"
            aria-label="Send message to Copilot"
          >
            <span className="material-symbols-outlined text-lg">send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
