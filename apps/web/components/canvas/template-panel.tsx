import React from 'react';
import { listTemplates, getTemplatesByCategory } from '@diagramhq/domain';
import type { ArchitectureTemplate, TemplateId } from '@diagramhq/domain';

// ─── Category badge ───────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  patterns: { label: 'Pattern',        color: 'text-blue-400 bg-blue-950/50 border-blue-900' },
  cloud:    { label: 'Cloud',          color: 'text-violet-400 bg-violet-950/50 border-violet-900' },
  infrastructure: { label: 'Infra',   color: 'text-amber-400 bg-amber-950/50 border-amber-900' },
  data:     { label: 'Data',           color: 'text-cyan-400 bg-cyan-950/50 border-cyan-900' },
};

// ─── Template card ────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: ArchitectureTemplate;
  onSelect: (id: TemplateId) => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps): JSX.Element {
  const cat = CATEGORY_CONFIG[template.category] ?? { label: template.category, color: 'text-slate-400 bg-slate-900 border-slate-700' };
  return (
    <button
      type="button"
      className="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/60 transition-colors text-left w-full"
      onClick={() => onSelect(template.id)}
      data-testid={`template-card-${template.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-100 truncate">{template.name}</span>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cat.color} shrink-0`}
          data-testid={`template-category-${template.id}`}
        >
          {cat.label}
        </span>
      </div>
      <p className="text-xs text-slate-400 leading-snug line-clamp-2">{template.description}</p>
      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
        <span data-testid={`template-obj-count-${template.id}`}>{template.objects.length} objects</span>
        <span>·</span>
        <span>{template.connections.length} connections</span>
      </div>
    </button>
  );
}

// ─── Template picker ──────────────────────────────────────────────────────────

export interface TemplatePanelProps {
  /** Called when the user selects a template. */
  onSelectTemplate: (templateId: TemplateId) => void;
  /** Called when the user dismisses the panel. */
  onClose?: () => void;
}

const ALL_CATEGORIES = ['patterns', 'cloud', 'infrastructure', 'data'] as const;
type Category = (typeof ALL_CATEGORIES)[number] | 'all';

/**
 * TemplatePanel — lists architecture templates grouped by category and
 * calls onSelectTemplate when one is chosen (F135).
 *
 * This is a pure presentation component; instantiation and persistence are
 * handled by the calling page/action via instantiateTemplate() in the domain.
 */
export function TemplatePanel({ onSelectTemplate, onClose }: TemplatePanelProps): JSX.Element {
  const [activeCategory, setActiveCategory] = React.useState<Category>('all');

  const templates: ArchitectureTemplate[] =
    activeCategory === 'all' ? listTemplates() : getTemplatesByCategory(activeCategory);

  return (
    <div
      className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl shadow-2xl"
      data-testid="template-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Architecture Templates</h2>
          <p className="text-xs text-slate-500 mt-0.5">Start from a pre-built architecture</p>
        </div>
        {onClose && (
          <button
            type="button"
            className="text-slate-500 hover:text-slate-300 p-1 rounded"
            onClick={onClose}
            aria-label="Close template picker"
            data-testid="template-panel-close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800">
        {(['all', ...ALL_CATEGORIES] as Category[]).map((cat) => (
          <button
            key={cat}
            type="button"
            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
              activeCategory === cat
                ? 'border-slate-500 bg-slate-800 text-slate-100'
                : 'border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
            }`}
            onClick={() => setActiveCategory(cat)}
            data-testid={`template-filter-${cat}`}
          >
            {cat === 'all' ? 'All' : CATEGORY_CONFIG[cat]?.label ?? cat}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div
        className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3"
        data-testid="template-grid"
      >
        {templates.map((tmpl) => (
          <TemplateCard key={tmpl.id} template={tmpl} onSelect={onSelectTemplate} />
        ))}
      </div>
    </div>
  );
}
