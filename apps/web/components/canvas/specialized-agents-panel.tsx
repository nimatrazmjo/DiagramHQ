'use client';

import React, { useState } from 'react';
import {
  SPECIALIZED_AGENT_REGISTRY,
  type SpecializedAgentRole,
  type SpecializedAgentExecutionResult,
  type MCPToolProposal,
} from '@diagramhq/domain';

export interface SpecializedAgentSelectorProps {
  selectedRole: SpecializedAgentRole;
  onSelectRole: (role: SpecializedAgentRole) => void;
  onRunTask: (role: SpecializedAgentRole, instruction: string) => void;
  isRunning?: boolean;
}

export function SpecializedAgentSelector({
  selectedRole,
  onSelectRole,
  onRunTask,
  isRunning = false,
}: SpecializedAgentSelectorProps): React.JSX.Element {
  const [instruction, setInstruction] = useState('');
  const activeAgent = SPECIALIZED_AGENT_REGISTRY[selectedRole];

  const handleRun = () => {
    const text = instruction.trim() || `Run default scoped analysis as ${activeAgent.name}`;
    onRunTask(selectedRole, text);
  };

  const roleIcons: Record<SpecializedAgentRole, string> = {
    analyst: '📊',
    designer: '🎨',
    security: '🛡️',
    cloud: '☁️',
    documentation: '📝',
    migration: '🔄',
    code: '💻',
  };

  return (
    <div className="space-y-4" data-testid="specialized-agent-selector">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(Object.keys(SPECIALIZED_AGENT_REGISTRY) as SpecializedAgentRole[]).map((role) => {
          const agent = SPECIALIZED_AGENT_REGISTRY[role];
          const isSelected = selectedRole === role;

          return (
            <button
              key={role}
              type="button"
              onClick={() => onSelectRole(role)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
              data-testid={`agent-card-${role}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{roleIcons[role]}</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {role}
                </span>
              </div>
              <h4 className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                {agent.name}
              </h4>
            </button>
          );
        })}
      </div>

      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>{roleIcons[selectedRole]}</span>
            <span>{activeAgent.title}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {activeAgent.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-500">MCP Tool Surface:</span>
          {activeAgent.preferredMCPTools.map((tool: string) => (
            <span
              key={tool}
              className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              {tool}
            </span>
          ))}
        </div>

        <div className="space-y-2 pt-2">
          <label
            htmlFor="agent-instruction-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Scoped Task Instruction:
          </label>
          <div className="flex gap-2">
            <input
              id="agent-instruction-input"
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={`e.g. Analyze domain boundaries for active components...`}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
              data-testid="run-agent-task-button"
            >
              {isRunning ? 'Executing MCP...' : 'Run Agent Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface SpecializedAgentResultCardProps {
  result: SpecializedAgentExecutionResult;
  onApproveProposal?: (proposal: MCPToolProposal) => void;
}

export function SpecializedAgentResultCard({
  result,
  onApproveProposal,
}: SpecializedAgentResultCardProps): React.JSX.Element {
  const { role, status, summary, mcpToolsInvoked, findings, proposals, recommendations } = result;

  return (
    <div
      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3"
      data-testid="specialized-agent-result-card"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
            {`${role} Agent`}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
              status === 'completed'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            {status.toUpperCase()}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          {new Date(result.completedAt).toLocaleTimeString()}
        </span>
      </div>

      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
        {summary}
      </p>

      {/* MCP Tools Invoked */}
      <div className="space-y-1">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          MCP Tools Invoked ({mcpToolsInvoked.length}):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {mcpToolsInvoked.map((t, idx: number) => (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 ${
                t.isMutating
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>{t.toolName}</span>
              {t.isMutating && <span className="text-[9px] font-sans font-bold">[PROPOSAL]</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Findings output */}
      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
          Findings & Structured Metrics:
        </span>
        <pre className="text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(findings, null, 2)}
        </pre>
      </div>

      {/* Proposals requiring approval */}
      {proposals.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Reviewable Proposals Generated ({proposals.length})</span>
            </span>
          </div>
          <div className="space-y-2">
            {proposals.map((prop: MCPToolProposal) => (
              <div
                key={prop.proposalId}
                className="p-2.5 rounded bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 text-xs flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {prop.summary}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Tool: {prop.toolName} | Proposal: {prop.proposalId}
                  </div>
                </div>
                {onApproveProposal && (
                  <button
                    type="button"
                    onClick={() => onApproveProposal(prop)}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                  >
                    Approve Proposal
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-1 pt-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Recommendations:
          </span>
          <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
            {recommendations.map((rec: string, idx: number) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export interface SpecializedAgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  results: SpecializedAgentExecutionResult[];
  onRunTask: (role: SpecializedAgentRole, instruction: string) => void;
  isRunning?: boolean;
}

export function SpecializedAgentDrawer({
  isOpen,
  onClose,
  results,
  onRunTask,
  isRunning = false,
}: SpecializedAgentDrawerProps): React.JSX.Element | null {
  const [selectedRole, setSelectedRole] = useState<SpecializedAgentRole>('analyst');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      data-testid="specialized-agent-drawer-modal"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🤖 Specialized AI Role Agents on MCP</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Role agents operate directly over DiagramHQ Model Context Protocol (MCP) tools to inspect and safely propose architecture updates.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <SpecializedAgentSelector
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            onRunTask={onRunTask}
            isRunning={isRunning}
          />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Agent Execution Activity ({results.length})
            </h3>
            {results.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No agent executions in this session. Select an agent role above to dispatch a scoped MCP task.
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((res: SpecializedAgentExecutionResult) => (
                  <SpecializedAgentResultCard key={res.taskId} result={res} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs">
          <span className="text-slate-500">
            Acceptance invariant: Mutating agent actions return proposals requiring human approval.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
