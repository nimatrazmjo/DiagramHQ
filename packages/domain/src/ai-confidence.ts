/**
 * DiagramHQ - AI Evidence & Confidence Domain Logic (F120)
 *
 * Grounding and confidence calibration engine for all AI assertions,
 * generated dependencies, architectural edits, and model proposals.
 *
 * Acceptance Invariant:
 * - Every AI assertion/edit carries evidence (repo/file/line where applicable) + a confidence score.
 * - Test: a generated dependency includes evidence; low confidence flagged.
 */

import {
  createId,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
} from './ids';
import type { ModelConnection, ConnectionKind } from './types';

export type EvidenceSourceType =
  | 'ast_call'
  | 'network_trace'
  | 'import_statement'
  | 'config_file'
  | 'git_history'
  | 'doc_comment'
  | 'heuristic'
  | 'manual';

export interface CodeLocation {
  repo?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  commitSha?: string;
  symbol?: string;
  snippet?: string;
}

export interface AIEvidence {
  id: string;
  sourceType: EvidenceSourceType;
  location?: CodeLocation;
  description: string;
  rawCitation: string;
  strength: number; // 0.00 to 1.00
  timestamp: string;
}

export type ConfidenceTier = 'high' | 'medium' | 'low';

export const DEFAULT_LOW_CONFIDENCE_THRESHOLD = 0.6;
export const DEFAULT_HIGH_CONFIDENCE_THRESHOLD = 0.85;

export interface ConfidenceAssessment {
  score: number; // 0.00 to 1.00
  tier: ConfidenceTier;
  isLowConfidence: boolean;
  flagged: boolean;
  reasons: string[];
  recommendation: string;
}

export type AIAssertionKind =
  | 'dependency'
  | 'object_attribute'
  | 'boundary'
  | 'protocol'
  | 'data_flow'
  | 'edit';

export interface GroundedAssertion<T = unknown> {
  id: string;
  kind: AIAssertionKind;
  claim: string;
  subjectId: string;
  evidence: AIEvidence[];
  confidence: ConfidenceAssessment;
  payload?: T;
  createdAt: string;
}

export interface GroundedDependency {
  connection: ModelConnection;
  sourceObjectId: ObjectId;
  targetObjectId: ObjectId;
  protocol?: string;
  evidence: AIEvidence[];
  confidence: ConfidenceAssessment;
  requiresHumanVerification: boolean;
}

export interface CreateEvidenceInput {
  sourceType: EvidenceSourceType;
  location?: CodeLocation;
  description: string;
  strength?: number;
}

export interface GenerateGroundedDependencyInput {
  architectureId: ArchitectureId;
  versionId: VersionId;
  sourceObjectId: ObjectId;
  targetObjectId: ObjectId;
  kind?: ConnectionKind;
  label?: string;
  description?: string;
  protocol?: string;
  evidence: AIEvidence[];
  customThreshold?: number;
}

/**
 * Generates a clean human-readable citation string from a CodeLocation.
 * Example: "github.com/acme/orders:src/services/checkout.ts#L42-L55"
 */
export function formatEvidenceCitation(location?: CodeLocation): string {
  if (!location) {
    return 'unanchored:heuristic-inference';
  }

  const parts: string[] = [];
  if (location.repo) {
    parts.push(location.repo);
  }
  if (location.filePath) {
    parts.push(location.filePath);
  }

  let base = parts.join(':');
  if (!base) {
    base = 'unspecified-source';
  }

  if (location.lineStart !== undefined) {
    if (location.lineEnd !== undefined && location.lineEnd > location.lineStart) {
      base += `#L${location.lineStart}-L${location.lineEnd}`;
    } else {
      base += `#L${location.lineStart}`;
    }
  }

  if (location.symbol) {
    base += ` (${location.symbol})`;
  }

  return base;
}

/**
 * Creates a structured AIEvidence record with computed baseline strength and citation.
 */
export function createAIEvidence(input: CreateEvidenceInput): AIEvidence {
  const { sourceType, location, description } = input;
  const citation = formatEvidenceCitation(location);

  let baselineStrength: number;
  switch (sourceType) {
    case 'ast_call':
      baselineStrength = 0.95;
      break;
    case 'network_trace':
      baselineStrength = 0.9;
      break;
    case 'config_file':
      baselineStrength = 0.85;
      break;
    case 'import_statement':
      baselineStrength = 0.75;
      break;
    case 'git_history':
      baselineStrength = 0.7;
      break;
    case 'doc_comment':
      baselineStrength = 0.6;
      break;
    case 'heuristic':
      baselineStrength = 0.4;
      break;
    case 'manual':
      baselineStrength = 0.95;
      break;
    default:
      baselineStrength = 0.5;
  }

  // Adjust strength if concrete repo, file, and line numbers are provided
  let locationBonus = 0;
  if (location) {
    if (location.repo && location.filePath) {
      locationBonus += 0.05;
    }
    if (location.lineStart !== undefined) {
      locationBonus += 0.05;
    }
    if (location.symbol) {
      locationBonus += 0.05;
    }
  }

  const finalStrength = input.strength ?? Math.min(1.0, baselineStrength + locationBonus);

  return {
    id: `ev-${Math.random().toString(36).substring(2, 9)}`,
    sourceType,
    location,
    description,
    rawCitation: citation,
    strength: Math.round(finalStrength * 100) / 100,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Evaluates the confidence score of an AI assertion based on its supporting evidence.
 * If score < lowConfidenceThreshold, flags it with actionable reasons.
 */
export function evaluateConfidence(
  evidenceList: AIEvidence[],
  customThreshold: number = DEFAULT_LOW_CONFIDENCE_THRESHOLD,
): ConfidenceAssessment {
  const reasons: string[] = [];

  if (evidenceList.length === 0) {
    return {
      score: 0.1,
      tier: 'low',
      isLowConfidence: true,
      flagged: true,
      reasons: ['No grounded evidence provided for this assertion.'],
      recommendation: 'Manual code verification required before accepting this architectural claim.',
    };
  }

  // Calculate weighted maximum and corroboration bonus
  const strengths = evidenceList.map((e) => e.strength);
  const maxStrength = Math.max(...strengths);
  const corroborationBonus = evidenceList.length > 1 ? Math.min(0.15, (evidenceList.length - 1) * 0.05) : 0;

  // Penalty if any evidence lacks concrete file and line
  let missingLocationPenalty = 0;
  const missingLocationCount = evidenceList.filter(
    (e) => !e.location?.filePath || e.location.lineStart === undefined,
  ).length;

  if (missingLocationCount > 0) {
    missingLocationPenalty = 0.15 * (missingLocationCount / evidenceList.length);
    reasons.push(`${missingLocationCount} evidence item(s) lack specific file path or line number citations.`);
  }

  // Heuristic-only penalty
  const allHeuristic = evidenceList.every((e) => e.sourceType === 'heuristic');
  if (allHeuristic) {
    reasons.push('Assertion is based entirely on fuzzy heuristics without AST or configuration proof.');
  }

  let rawScore = maxStrength + corroborationBonus - missingLocationPenalty;
  rawScore = Math.max(0.05, Math.min(1.0, rawScore));
  const score = Math.round(rawScore * 100) / 100;

  const isLowConfidence = score < customThreshold;
  const tier: ConfidenceTier =
    score >= DEFAULT_HIGH_CONFIDENCE_THRESHOLD ? 'high' : score >= customThreshold ? 'medium' : 'low';

  if (isLowConfidence) {
    reasons.unshift(`Confidence score (${score}) is below required verification threshold (${customThreshold}).`);
  }

  const recommendation = isLowConfidence
    ? 'Flagged for human review. Verify referenced code points or provide concrete AST call site.'
    : tier === 'medium'
      ? 'Architectural inference supported by secondary evidence; review recommended.'
      : 'High confidence. Directly verified by primary code AST or configuration files.';

  return {
    score,
    tier,
    isLowConfidence,
    flagged: isLowConfidence,
    reasons,
    recommendation,
  };
}

/**
 * Generates an architecture dependency (ModelConnection) grounded by concrete evidence
 * and a calibrated confidence score.
 *
 * Test requirement: "a generated dependency includes evidence; low confidence flagged."
 */
export function generateGroundedDependency(input: GenerateGroundedDependencyInput): GroundedDependency {
  const confidence = evaluateConfidence(input.evidence, input.customThreshold);

  const connection: ModelConnection = {
    id: createId('con'),
    architectureId: input.architectureId,
    versionId: input.versionId,
    sourceObjectId: input.sourceObjectId,
    targetObjectId: input.targetObjectId,
    kind: input.kind ?? 'sync',
    label: input.label ?? (input.protocol ? `${input.protocol} call` : 'dependency'),
    description: input.description ?? null,
    metadata: {
      generatedByAI: true,
      protocol: input.protocol,
      confidenceScore: confidence.score,
      confidenceTier: confidence.tier,
      isLowConfidence: confidence.isLowConfidence,
      flagged: confidence.flagged,
      evidenceCitations: input.evidence.map((e) => e.rawCitation),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    connection,
    sourceObjectId: input.sourceObjectId,
    targetObjectId: input.targetObjectId,
    protocol: input.protocol,
    evidence: input.evidence,
    confidence,
    requiresHumanVerification: confidence.isLowConfidence,
  };
}

/**
 * Creates a grounded assertion wrapping any arbitrary claim or architectural attribute.
 */
export function createGroundedAssertion<T = unknown>(input: {
  kind: AIAssertionKind;
  claim: string;
  subjectId: string;
  evidence: AIEvidence[];
  payload?: T;
  customThreshold?: number;
}): GroundedAssertion<T> {
  const confidence = evaluateConfidence(input.evidence, input.customThreshold);

  return {
    id: `assert-${Math.random().toString(36).substring(2, 9)}`,
    kind: input.kind,
    claim: input.claim,
    subjectId: input.subjectId,
    evidence: input.evidence,
    confidence,
    payload: input.payload,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Wraps an architectural edit with attached evidence and confidence scoring.
 */
export function attachEvidenceToEdit(
  editId: string,
  instruction: string,
  evidence: AIEvidence[],
  customThreshold?: number,
): GroundedAssertion<{ editId: string }> {
  return createGroundedAssertion({
    kind: 'edit',
    claim: `Natural language edit: "${instruction}"`,
    subjectId: editId,
    evidence,
    payload: { editId },
    customThreshold,
  });
}

/**
 * Filters a list of assertions down to those flagged with low confidence.
 */
export function filterLowConfidenceAssertions(assertions: GroundedAssertion[]): GroundedAssertion[] {
  return assertions.filter((a) => a.confidence.isLowConfidence);
}
