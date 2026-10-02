'use client';

import React from 'react';
import type {
  ArchitectureTask,
  TaskStatus,
  TaskPriority,
} from '@diagramhq/domain';

export interface MentionTextProps {
  text: string;
  onMentionClick?: (handle: string) => void;
  className?: string;
}

/**
 * Parses inline @mentions in text and renders them with stylized badges.
 */
export function MentionText({
  text,
  onMentionClick,
  className = '',
}: MentionTextProps): JSX.Element {
  const parts = text.split(/(@[a-zA-Z0-9._-]+)/g);

  return (
    <span className={`leading-relaxed ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith('@') && part.length > 1) {
          const handle = part.slice(1);
          return (
            <span
              key={index}
              data-testid={`mention-pill-${handle.toLowerCase()}`}
              onClick={() => onMentionClick?.(handle)}
              className="inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded-md bg-primary/20 text-primary-fixed border border-primary/40 font-semibold text-[11px] cursor-pointer hover:bg-primary/30 transition-colors"
            >
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'text-slate-400 border-slate-600 bg-slate-800/40',
  medium: 'text-blue-400 border-blue-600/50 bg-blue-950/40',
  high: 'text-amber-400 border-amber-600/50 bg-amber-950/40',
  urgent: 'text-rose-400 border-rose-600/50 bg-rose-950/40',
};

const STATUS_ICONS: Record<TaskStatus, string> = {
  open: 'radio_button_unchecked',
  in_progress: 'pending',
  completed: 'check_circle',
  cancelled: 'cancel',
};

export interface TaskCardProps {
  task: ArchitectureTask;
  onStatusChange?: (task: ArchitectureTask, nextStatus: TaskStatus) => void;
  className?: string;
}

export function TaskCard({
  task,
  onStatusChange,
  className = '',
}: TaskCardProps): JSX.Element {
  const isDone = task.status === 'completed';

  const handleToggle = () => {
    const nextStatus: TaskStatus = isDone ? 'open' : 'completed';
    onStatusChange?.(task, nextStatus);
  };

  return (
    <div
      data-testid={`task-card-${task.id}`}
      className={`p-3 rounded-xl border transition-all ${
        isDone
          ? 'bg-slate-900/40 border-slate-800 text-slate-400 opacity-80'
          : 'bg-slate-800/70 border-slate-700/80 shadow-md text-slate-200'
      } ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          data-testid={`task-toggle-${task.id}`}
          onClick={handleToggle}
          className={`mt-0.5 p-0.5 rounded hover:text-white transition-colors ${
            isDone ? 'text-emerald-400' : 'text-slate-400'
          }`}
          title={isDone ? 'Reopen task' : 'Mark as completed'}
        >
          <span className="material-symbols-outlined text-[18px]">
            {STATUS_ICONS[task.status]}
          </span>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4
              data-testid={`task-title-${task.id}`}
              className={`text-xs font-semibold truncate ${
                isDone ? 'line-through text-slate-400' : 'text-white'
              }`}
            >
              {task.title}
            </h4>

            {/* Priority Badge */}
            <span
              data-testid={`task-priority-${task.id}`}
              className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${
                PRIORITY_COLORS[task.priority]
              }`}
            >
              {task.priority}
            </span>
          </div>

          <p
            data-testid={`task-desc-${task.id}`}
            className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed mb-2"
          >
            {task.description}
          </p>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[12px]">person</span>
              <span data-testid={`task-assignee-${task.id}`}>
                {task.assigneeName || 'Unassigned'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="capitalize">{`${task.targetType}:`}</span>
              <span className="font-mono text-slate-300">{task.targetId}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
