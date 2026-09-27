// Full metadata schema for architecture model objects (F030)

export type ObjectStatus = 'planned' | 'active' | 'deprecated' | 'retired';
export type ObjectEnvironment = 'development' | 'staging' | 'production' | 'all';
export type ObjectCriticality = 'low' | 'medium' | 'high' | 'critical';
export type ObjectDataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface ObjectMetadataSchema {
  // Core identity
  name?: string;
  description?: string;
  caption?: string;

  // Ownership
  owner?: string;
  team?: string;

  // Technical
  technology?: string;
  status?: ObjectStatus | string;
  environment?: ObjectEnvironment | string;

  // Classification
  domain?: string;
  tags?: string[];
  links?: string[];
  repository?: string;
  documentation?: string;

  // Risk & Compliance
  criticality?: ObjectCriticality | string;
  dataClassification?: ObjectDataClassification | string;
  compliance?: string[];
  costCenter?: string;

  // SLA
  sla?: string;
  rto?: string;
  rpo?: string;

  // Version tracking
  version?: string;

  // Lifecycle (F031 integration)
  lifecycle?: string;
  lifecycleTransitions?: Array<{ from: string; to: string; at: string; by?: string }>;

  [key: string]: unknown;
}

export const OBJECT_STATUS_OPTIONS: ObjectStatus[] = ['planned', 'active', 'deprecated', 'retired'];
export const OBJECT_ENVIRONMENT_OPTIONS: ObjectEnvironment[] = ['development', 'staging', 'production', 'all'];
export const OBJECT_CRITICALITY_OPTIONS: ObjectCriticality[] = ['low', 'medium', 'high', 'critical'];
export const OBJECT_DATA_CLASSIFICATION_OPTIONS: ObjectDataClassification[] = ['public', 'internal', 'confidential', 'restricted'];

export function mergeObjectMetadata(
  existing: Record<string, unknown> | null | undefined,
  patch: Partial<ObjectMetadataSchema>,
): Record<string, unknown> {
  return { ...(existing || {}), ...patch };
}
