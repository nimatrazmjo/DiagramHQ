import React from 'react';
import type { Technology } from '@diagramhq/domain';

export interface TechnologyBadgesProps {
  technologyView?: boolean;
  technologies?: Technology[];
}

export function TechnologyBadges(props: TechnologyBadgesProps): JSX.Element | null {
  if (!props.technologyView) return null;
  if (!props.technologies || props.technologies.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-800/50" data-testid="technology-badges">
      {props.technologies.map((tech) => {
        let badgeColor = 'text-slate-300 bg-slate-800 border-slate-700';
        
        if (tech.lifecycle === 'unsupported' || tech.lifecycle === 'deprecated') {
          badgeColor = 'text-red-400 bg-red-950/60 border-red-900';
        } else if (tech.lifecycle === 'active' || tech.lifecycle === 'adopt') {
          badgeColor = 'text-green-400 bg-green-950/60 border-green-900';
        } else if (tech.lifecycle === 'evaluate' || tech.lifecycle === 'assess') {
          badgeColor = 'text-amber-400 bg-amber-950/60 border-amber-900';
        }

        return (
          <span 
            key={tech.id}
            className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${badgeColor}`} 
            data-testid={`badge-tech-${tech.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            {tech.name}
            {tech.version && <span className="opacity-70 ml-0.5">v{tech.version}</span>}
          </span>
        );
      })}
    </div>
  );
}
