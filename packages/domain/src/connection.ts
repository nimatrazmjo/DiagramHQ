// Rich connection metadata types for F029

export type ConnectionProtocol =
  | 'HTTP' | 'HTTPS' | 'REST' | 'GraphQL' | 'gRPC'
  | 'WebSocket' | 'TCP' | 'UDP' | 'Kafka' | 'Event'
  | 'Queue' | 'Database' | 'File' | 'Internal' | 'External';

export type ConnectionDirection = 'unidirectional' | 'bidirectional';
export type ConnectionStatus = 'active' | 'deprecated' | 'planned' | 'unknown';
export type ConnectionAuth = 'none' | 'api_key' | 'oauth2' | 'jwt' | 'mtls' | 'basic';
export type ConnectionEncryption = 'none' | 'tls' | 'mtls' | 'custom';

export interface RichConnectionMetadata {
  protocol?: ConnectionProtocol | string;
  technology?: string;
  direction?: ConnectionDirection;
  dataType?: string;
  auth?: ConnectionAuth | string;
  encryption?: ConnectionEncryption | string;
  status?: ConnectionStatus | string;
  owner?: string;
  tags?: string[];
  api?: string;
  port?: number;
  frequency?: string;
  latency?: string;
  errorBehavior?: string;
  [key: string]: unknown;
}

export const RICH_CONNECTION_PROTOCOLS: ConnectionProtocol[] = [
  'HTTP', 'HTTPS', 'REST', 'GraphQL', 'gRPC',
  'WebSocket', 'TCP', 'UDP', 'Kafka', 'Event',
  'Queue', 'Database', 'File', 'Internal', 'External'
];

export function isRichConnection(metadata: Record<string, unknown> | null | undefined): boolean {
  return metadata != null && typeof metadata === 'object' && 'protocol' in metadata;
}

export function createRichConnectionMetadata(options: Partial<RichConnectionMetadata>): RichConnectionMetadata {
  return { ...options };
}
