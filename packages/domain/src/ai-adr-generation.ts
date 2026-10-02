/**
 * DiagramHQ - AI Architecture Decision Record (ADR) Generator (F070)
 *
 * Automatically drafts comprehensive, structured ADR proposals from architecture
 * change sets and pull requests. Translates raw graph mutations into standard
 * Michael Nygard / MADR architectural decision records:
 * - Title: Clear, descriptive architectural decision statement
 * - Status: 'proposed' or 'draft'
 * - Context: Synthesizes problem background, affected systems, and motivations
 * - Decision: Concrete technical action (components added/modified/removed, protocols adopted)
 * - Consequences: Explicit positive and negative architectural trade-offs
 * - Alternatives: Synthesizes viable alternative designs considered
 * - Direct Linking: Establishes a polymorphic attachment link directly pointing to the source change ID.
 *
 * Human-in-the-loop workflow:
 * - AI generates the initial draft (`draftADRFromChange`)
 * - Human architects review, edit, and fine-tune fields
 * - Human accepts (`acceptDraftedADR`) committing the official `ArchitectureDecisionRecord`.
 */

import { createId } from './ids';
import {
  createADR,
  type ArchitectureDecisionRecord,
  type ADRAttachment,
  type ADRAuthor,
  type ADRStatus,
} from './adrs';
import type { ArchitectureChangeSet } from './changes';

export interface GenerateADRInput {
  changeSet: ArchitectureChangeSet;
  customTitle?: string;
  problemStatement?: string;
  businessGoals?: string[];
  author?: ADRAuthor;
}

export interface DraftedADR {
  id: string;
  changeId: string;
  title: string;
  status: ADRStatus;
  context: string;
  decision: string;
  consequences: string;
  alternatives: string[];
  attachments: ADRAttachment[];
  author?: ADRAuthor;
  isDraft: boolean;
  generatedAt: string;
}

export interface AcceptADRModifications {
  title?: string;
  status?: ADRStatus;
  context?: string;
  decision?: string;
  consequences?: string;
  alternatives?: string[];
  author?: ADRAuthor;
}

/**
 * Drafts a structured Architecture Decision Record (ADR) from an architectural change set.
 */
export function draftADRFromChange(input: GenerateADRInput): DraftedADR {
  const { changeSet, customTitle, problemStatement, businessGoals = [], author } = input;
  const now = new Date().toISOString();

  const addedObjs = changeSet.changes.added.filter((c) => c.kind === 'object');
  const addedConns = changeSet.changes.added.filter((c) => c.kind === 'connection');
  const modifiedObjs = changeSet.changes.modified.filter((c) => c.kind === 'object');
  const removedObjs = changeSet.changes.removed.filter((c) => c.kind === 'object');

  // Title synthesis
  let title = customTitle;
  if (!title) {
    if (addedObjs.length > 0) {
      title = `ADR: Introduce ${addedObjs.map((o) => o.name).join(', ')}`;
    } else if (removedObjs.length > 0) {
      title = `ADR: Decommission ${removedObjs.map((o) => o.name).join(', ')}`;
    } else if (changeSet.title) {
      title = `ADR: ${changeSet.title}`;
    } else {
      title = `ADR: Architectural Evolution (${changeSet.id})`;
    }
  }

  // Context synthesis
  const contextParts: string[] = [];
  if (problemStatement) {
    contextParts.push(problemStatement.trim());
  } else {
    contextParts.push(
      `As part of change set '${changeSet.title || changeSet.id}', the architecture requires evolution to meet scalability, resiliency, and boundary isolation requirements.`
    );
  }

  if (businessGoals.length > 0) {
    contextParts.push(`Key objectives:\n${businessGoals.map((g) => `- ${g}`).join('\n')}`);
  }

  const affectedCount = changeSet.affected?.counts?.objects || 0;
  if (affectedCount > 0) {
    contextParts.push(
      `Topological analysis indicates this change directly or indirectly impacts ${affectedCount} downstream architecture object(s).`
    );
  }

  const context = contextParts.join('\n\n');

  // Decision synthesis
  const decisionParts: string[] = [
    `We have decided to apply architectural change set '${changeSet.title || changeSet.id}':`,
  ];

  if (addedObjs.length > 0) {
    decisionParts.push(
      `- Provision new component(s): ${addedObjs.map((o) => `**${o.name}** (\`${o.id}\`)`).join(', ')}.`
    );
  }
  if (addedConns.length > 0) {
    decisionParts.push(
      `- Establish integration connection(s): ${addedConns.map((c) => `**${c.name}** (\`${c.id}\`)`).join(', ')}.`
    );
  }
  if (modifiedObjs.length > 0) {
    decisionParts.push(
      `- Refactor existing component(s): ${modifiedObjs.map((o) => `**${o.name}** (\`${o.id}\`)`).join(', ')}.`
    );
  }
  if (removedObjs.length > 0) {
    decisionParts.push(
      `- Decommission legacy component(s): ${removedObjs.map((o) => `**${o.name}** (\`${o.id}\`)`).join(', ')}.`
    );
  }

  const decision = decisionParts.join('\n');

  // Consequences synthesis
  const posConsequences = [
    'Modular boundary separation with decoupled responsibilities.',
    'Clear architectural traceability linked directly to versioned change sets.',
  ];
  const negConsequences = [
    'Requires team operational training and deployment orchestration.',
    'Added network hops or synchronization considerations across services.',
  ];

  const consequences = [
    '### Positive Consequences',
    ...posConsequences.map((c) => `- ${c}`),
    '',
    '### Negative Consequences & Trade-offs',
    ...negConsequences.map((c) => `- ${c}`),
  ].join('\n');

  // Alternatives considered
  const alternatives = [
    'Status Quo: Retain the existing architecture without changes, deferring technical debt.',
    'Direct Point-to-Point Integration: Implement direct point-to-point connections without dedicated intermediaries.',
    'Monolithic Extension: Embed new capabilities within existing service boundaries rather than provisioning isolated components.',
  ];

  // Attachments: polymorphic link to source change set AND modified entities
  const attachments: ADRAttachment[] = [
    {
      targetType: 'change',
      targetId: changeSet.id,
      attachedAt: now,
    },
  ];

  for (const obj of [...addedObjs, ...modifiedObjs]) {
    attachments.push({
      targetType: 'object',
      targetId: obj.id,
      attachedAt: now,
    });
  }

  return {
    id: `draft_adr_${createId('dec')}`,
    changeId: changeSet.id,
    title,
    status: 'proposed',
    context,
    decision,
    consequences,
    alternatives,
    attachments,
    author,
    isDraft: true,
    generatedAt: now,
  };
}

/**
 * Human architect accepts the AI-generated ADR draft (with optional human edits),
 * producing an official immutable ArchitectureDecisionRecord.
 */
export function acceptDraftedADR(
  draft: DraftedADR,
  modifications?: AcceptADRModifications
): ArchitectureDecisionRecord {
  const finalTitle = modifications?.title?.trim() || draft.title;
  const finalStatus = modifications?.status || 'accepted';
  const finalContext = modifications?.context?.trim() || draft.context;
  const finalDecision = modifications?.decision?.trim() || draft.decision;
  const finalConsequences = modifications?.consequences?.trim() || draft.consequences;
  const finalAlternatives = modifications?.alternatives || draft.alternatives;
  const finalAuthor = modifications?.author || draft.author;

  // Guarantee that the attachment to the source change is preserved
  const attachments = [...draft.attachments];
  if (!attachments.some((a) => a.targetType === 'change' && a.targetId === draft.changeId)) {
    attachments.unshift({
      targetType: 'change',
      targetId: draft.changeId,
      attachedAt: new Date().toISOString(),
    });
  }

  return createADR({
    title: finalTitle,
    status: finalStatus,
    context: finalContext,
    decision: finalDecision,
    consequences: finalConsequences,
    alternatives: finalAlternatives,
    attachments,
    author: finalAuthor,
  });
}
