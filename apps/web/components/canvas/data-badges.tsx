import React from 'react';

export interface DataBadgesProps {
  dataView?: boolean;
  dataClassification?: string;
}

export function DataBadges(props: DataBadgesProps): JSX.Element | null {
  if (!props.dataView || !props.dataClassification) return null;

  const classificationLower = props.dataClassification.toLowerCase();
  
  let colorClasses = "text-slate-400 bg-slate-950/60 border-slate-900";
  
  if (classificationLower === 'public') {
    colorClasses = "text-emerald-400 bg-emerald-950/60 border-emerald-900";
  } else if (classificationLower === 'internal') {
    colorClasses = "text-blue-400 bg-blue-950/60 border-blue-900";
  } else if (classificationLower === 'confidential') {
    colorClasses = "text-amber-400 bg-amber-950/60 border-amber-900";
  } else if (classificationLower === 'restricted') {
    colorClasses = "text-rose-400 bg-rose-950/60 border-rose-900";
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-800/50" data-testid="data-badges">
      <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${colorClasses}`} data-testid={`badge-data-${classificationLower}`}>
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        {props.dataClassification.toUpperCase()}
      </span>
    </div>
  );
}
