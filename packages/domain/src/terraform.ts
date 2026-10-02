/**
 * @file packages/domain/src/terraform.ts
 *
 * F081 — Terraform Infrastructure as Code (IaC) Parser and Architecture Mapping Engine.
 *
 * Features:
 * - Parses Terraform HCL configuration files (.tf, .tfvars) and Terraform plan/state JSON (.tfstate).
 * - Extracts resources (resource blocks), data sources (data blocks), modules (module blocks),
 *   variables, and outputs.
 * - Multi-provider taxonomy recognition (AWS, Azure, GCP, Kubernetes, generic providers).
 * - Maps parsed IaC entities to DiagramHQ ModelObject instances (application, store, group, component).
 * - Generates module containment hierarchies (groupByModule) and VPC/Network containment.
 * - Infers inter-resource ModelConnection dependencies from HCL interpolations, explicit depends_on,
 *   and attribute references.
 * - Attaches verifiable TerraformEvidence to each object and connection.
 * - Framework-agnostic pure TypeScript implementation.
 */

import type { ArchitectureId, ConnectionId, ObjectId, VersionId } from './ids';
import type { ModelConnection, ModelObject, ObjectKind as ModelObjectKind } from './types';

export type TerraformProvider = 'aws' | 'azurerm' | 'google' | 'kubernetes' | 'generic';

export interface TerraformLocation {
  filePath: string;
  line: number;
}

export interface TerraformResource {
  address: string; // e.g. "aws_instance.api_server" or "module.networking.aws_vpc.main"
  provider: TerraformProvider;
  providerPrefix: string; // e.g. "aws", "azurerm", "google", "kubernetes", "cloudflare"
  type: string; // e.g. "aws_instance"
  name: string; // e.g. "api_server"
  module?: string; // module name if within a module
  attributes: Record<string, unknown>;
  references: string[]; // referenced resource addresses, e.g. ["aws_vpc.main", "aws_subnet.public"]
  dependsOn: string[];
  location: TerraformLocation;
}

export interface TerraformModule {
  name: string;
  source: string;
  version?: string;
  inputs: Record<string, unknown>;
  location: TerraformLocation;
}

export interface TerraformOutput {
  name: string;
  value: string;
  description?: string;
  sensitive?: boolean;
  location: TerraformLocation;
}

export interface TerraformVariable {
  name: string;
  type?: string;
  defaultValue?: unknown;
  description?: string;
  location: TerraformLocation;
}

export interface TerraformFile {
  filePath: string;
  content: string;
}

export interface TerraformConfigScanInput {
  files: TerraformFile[];
  stateJson?: string;
  repositoryUrl?: string;
}

export interface TerraformMappingOptions {
  architectureId?: ArchitectureId;
  versionId?: VersionId;
  includeModules?: boolean;
  groupByModule?: boolean;
  inferConnections?: boolean;
  filterProviders?: TerraformProvider[];
  filterResourceTypes?: string[];
}

export interface TerraformEvidence {
  sourceType: 'iac_terraform';
  provider: TerraformProvider;
  resourceType: string;
  address: string;
  filePath: string;
  line: number;
  confidence: number;
}

export interface TerraformImportResult {
  objects: ModelObject[];
  connections: ModelConnection[];
  resources: TerraformResource[];
  modules: TerraformModule[];
  outputs: TerraformOutput[];
  variables: TerraformVariable[];
  evidence: Record<ObjectId, TerraformEvidence>;
  summary: {
    resourceCount: number;
    moduleCount: number;
    connectionCount: number;
    providerCounts: Record<TerraformProvider, number>;
  };
}

/**
 * Detect provider from resource type prefix.
 */
export function detectProvider(resourceType: string): { provider: TerraformProvider; prefix: string } {
  const parts = resourceType.split('_');
  const prefix = parts[0] || '';
  if (prefix === 'aws') return { provider: 'aws', prefix: 'aws' };
  if (prefix === 'azurerm' || prefix === 'azuread') return { provider: 'azurerm', prefix: 'azurerm' };
  if (prefix === 'google' || prefix === 'google-beta') return { provider: 'google', prefix: 'google' };
  if (prefix === 'kubernetes' || prefix === 'helm') return { provider: 'kubernetes', prefix: 'kubernetes' };
  return { provider: 'generic', prefix };
}

/**
 * Determine the ModelObjectKind for a Terraform resource type.
 */
export function determineObjectKindForTerraform(
  resourceType: string,
  _attributes: Record<string, unknown> = {}
): ModelObjectKind {
  const t = resourceType.toLowerCase();

  // Storage / Datastore
  if (
    // AWS
    t === 'aws_db_instance' ||
    t === 'aws_rds_cluster' ||
    t === 'aws_rds_cluster_instance' ||
    t === 'aws_dynamodb_table' ||
    t === 'aws_s3_bucket' ||
    t === 'aws_elasticache_cluster' ||
    t === 'aws_elasticache_replication_group' ||
    t === 'aws_redshift_cluster' ||
    t === 'aws_docdb_cluster' ||
    // Azure
    t === 'azurerm_mssql_database' ||
    t === 'azurerm_mssql_server' ||
    t === 'azurerm_cosmosdb_account' ||
    t === 'azurerm_storage_account' ||
    t === 'azurerm_storage_container' ||
    t === 'azurerm_redis_cache' ||
    t === 'azurerm_postgresql_server' ||
    t === 'azurerm_mysql_server' ||
    // GCP
    t === 'google_sql_database_instance' ||
    t === 'google_sql_database' ||
    t === 'google_spanner_instance' ||
    t === 'google_spanner_database' ||
    t === 'google_bigtable_instance' ||
    t === 'google_firestore_database' ||
    t === 'google_storage_bucket' ||
    // Fallback keyword match
    t.includes('database') ||
    t.includes('rds') ||
    t.includes('dynamodb') ||
    t.includes('s3_bucket') ||
    t.includes('storage') ||
    t.includes('cache') ||
    t.includes('cosmos')
  ) {
    return 'store';
  }

  // Network / Logical Grouping
  if (
    // AWS
    t === 'aws_vpc' ||
    t === 'aws_subnet' ||
    t === 'aws_default_vpc' ||
    // Azure
    t === 'azurerm_virtual_network' ||
    t === 'azurerm_subnet' ||
    t === 'azurerm_resource_group' ||
    // GCP
    t === 'google_compute_network' ||
    t === 'google_compute_subnetwork' ||
    // Kubernetes
    t === 'kubernetes_namespace' ||
    // Fallback keyword match
    t.includes('vpc') ||
    t.includes('vnet') ||
    t.includes('network') ||
    t.includes('subnet') ||
    t.includes('resource_group')
  ) {
    return 'group';
  }

  // Messaging / Event Streaming Components
  if (
    // AWS
    t === 'aws_sqs_queue' ||
    t === 'aws_sns_topic' ||
    t === 'aws_cloudwatch_event_rule' ||
    t === 'aws_kinesis_stream' ||
    t === 'aws_mq_broker' ||
    // Azure
    t === 'azurerm_servicebus_queue' ||
    t === 'azurerm_servicebus_topic' ||
    t === 'azurerm_eventhub' ||
    t === 'azurerm_eventgrid_topic' ||
    // GCP
    t === 'google_pubsub_topic' ||
    t === 'google_pubsub_subscription' ||
    t === 'google_eventarc_trigger' ||
    t === 'google_cloud_tasks_queue' ||
    // Fallback keyword match
    t.includes('queue') ||
    t.includes('topic') ||
    t.includes('event') ||
    t.includes('pubsub') ||
    t.includes('stream')
  ) {
    return 'component';
  }

  // Applications / Services / Compute (default)
  return 'application';
}

/**
 * Determine a human-readable title and description from a Terraform resource.
 */
export function formatTerraformResourceName(type: string, name: string): string {
  const parts = name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return parts;
}

/**
 * Strip comments from HCL content while preserving line counts.
 */
function stripComments(content: string): string[] {
  const lines = content.split('\n');
  const sanitizedLines: string[] = [];
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i] ?? '';

    if (inBlockComment) {
      const endCommentIdx = line.indexOf('*/');
      if (endCommentIdx !== -1) {
        inBlockComment = false;
        line = ' '.repeat(endCommentIdx + 2) + line.substring(endCommentIdx + 2);
      } else {
        sanitizedLines.push('');
        continue;
      }
    }

    const startCommentIdx = line.indexOf('/*');
    if (startCommentIdx !== -1) {
      const endCommentIdx = line.indexOf('*/', startCommentIdx + 2);
      if (endCommentIdx !== -1) {
        line = line.substring(0, startCommentIdx) + ' '.repeat(endCommentIdx - startCommentIdx + 2) + line.substring(endCommentIdx + 2);
      } else {
        inBlockComment = true;
        line = line.substring(0, startCommentIdx);
      }
    }

    // Single line comments: # or //
    const hashIdx = line.indexOf('#');
    const slashIdx = line.indexOf('//');
    let commentIdx = -1;
    if (hashIdx !== -1 && slashIdx !== -1) {
      commentIdx = Math.min(hashIdx, slashIdx);
    } else if (hashIdx !== -1) {
      commentIdx = hashIdx;
    } else if (slashIdx !== -1) {
      commentIdx = slashIdx;
    }

    if (commentIdx !== -1) {
      // Ensure comment marker isn't inside quotes
      const beforeComment = line.substring(0, commentIdx);
      const quoteCount = (beforeComment.match(/"/g) || []).length;
      if (quoteCount % 2 === 0) {
        line = beforeComment;
      }
    }

    sanitizedLines.push(line);
  }

  return sanitizedLines;
}

/**
 * Extract resource references matching `<type>.<name>` or `module.<name>.<output>` from an HCL block.
 */
function extractReferences(blockContent: string, currentAddress: string): string[] {
  const references = new Set<string>();
  // Match patterns like aws_vpc.main.id or module.network.vpc_id or google_sql_database_instance.master
  const refRegex = /\b([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)(?:\.[a-zA-Z0-9_-]+)?\b/g;
  let match: RegExpExecArray | null;

  while ((match = refRegex.exec(blockContent)) !== null) {
    const candidateType = match[1] ?? '';
    const candidateName = match[2] ?? '';
    if (!candidateType || !candidateName) continue;

    // Filter out common false positives in HCL syntax
    if (
      candidateType === 'var' ||
      candidateType === 'local' ||
      candidateType === 'each' ||
      candidateType === 'count' ||
      candidateType === 'self' ||
      candidateType === 'path' ||
      candidateType === 'data'
    ) {
      continue;
    }

    const refAddress = `${candidateType}.${candidateName}`;
    if (refAddress !== currentAddress) {
      references.add(refAddress);
    }
  }

  // Also check explicit depends_on = [ ... ]
  const dependsOnRegex = /depends_on\s*=\s*\[(.*?)\]/s;
  const dependsOnMatch = blockContent.match(dependsOnRegex);
  if (dependsOnMatch && dependsOnMatch[1]) {
    const rawList = dependsOnMatch[1];
    const items = rawList.split(/[\s,]+/);
    for (const item of items) {
      const trimmed = item.replace(/["'[\]]/g, '').trim();
      if (trimmed && trimmed.includes('.') && trimmed !== currentAddress) {
        const parts = trimmed.split('.');
        if (parts.length >= 2) {
          references.add(`${parts[0]}.${parts[1]}`);
        }
      }
    }
  }

  return Array.from(references);
}

/**
 * Parse an HCL block body to extract basic key-value attributes.
 */
function parseBlockAttributes(bodyLines: string[]): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};
  for (const line of bodyLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('}')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.substring(0, eqIdx).trim();
      const valStr = trimmed.substring(eqIdx + 1).trim().replace(/,$/, '');
      if (key && !key.includes(' ') && !key.includes('.')) {
        // Simple value coercion
        if (valStr.startsWith('"') && valStr.endsWith('"')) {
          attributes[key] = valStr.substring(1, valStr.length - 1);
        } else if (valStr === 'true') {
          attributes[key] = true;
        } else if (valStr === 'false') {
          attributes[key] = false;
        } else if (!Number.isNaN(Number(valStr)) && valStr !== '') {
          attributes[key] = Number(valStr);
        } else {
          attributes[key] = valStr;
        }
      }
    }
  }
  return attributes;
}

/**
 * Parse a Terraform file into resources, modules, outputs, and variables.
 */
export function parseTerraformHcl(file: TerraformFile): {
  resources: TerraformResource[];
  modules: TerraformModule[];
  outputs: TerraformOutput[];
  variables: TerraformVariable[];
} {
  const lines = stripComments(file.content);
  const detectedResources: TerraformResource[] = [];
  const detectedModules: TerraformModule[] = [];
  const detectedOutputs: TerraformOutput[] = [];
  const detectedVariables: TerraformVariable[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]?.trim() || '';
    const lineNum = i + 1;

    // 1. Resource block: resource "type" "name" {
    const resourceMatch = line.match(/^resource\s+"([^"]+)"\s+"([^"]+)"\s*\{/);
    if (resourceMatch && resourceMatch[1] && resourceMatch[2]) {
      const type = resourceMatch[1];
      const name = resourceMatch[2];
      const { provider, prefix } = detectProvider(type);
      const address = `${type}.${name}`;

      // Extract block body by tracking braces
      let braceDepth = 1;
      const bodyLines: string[] = [];
      i++;
      while (i < lines.length && braceDepth > 0) {
        const curLine = lines[i] || '';
        for (const char of curLine) {
          if (char === '{') braceDepth++;
          else if (char === '}') braceDepth--;
        }
        if (braceDepth > 0) {
          bodyLines.push(curLine);
        }
        i++;
      }

      const bodyText = bodyLines.join('\n');
      const attributes = parseBlockAttributes(bodyLines);
      const references = extractReferences(bodyText, address);

      // Check depends_on explicitly
      const dependsOn: string[] = [];
      const dependsMatch = bodyText.match(/depends_on\s*=\s*\[(.*?)\]/s);
      if (dependsMatch && dependsMatch[1]) {
        for (const item of dependsMatch[1].split(/[\s,]+/)) {
          const t = item.replace(/["'[\]]/g, '').trim();
          if (t && t.includes('.')) dependsOn.push(t);
        }
      }

      detectedResources.push({
        address,
        provider,
        providerPrefix: prefix,
        type,
        name,
        attributes,
        references,
        dependsOn,
        location: { filePath: file.filePath, line: lineNum },
      });
      continue;
    }

    // 2. Module block: module "name" {
    const moduleMatch = line.match(/^module\s+"([^"]+)"\s*\{/);
    if (moduleMatch && moduleMatch[1]) {
      const modName = moduleMatch[1];
      let braceDepth = 1;
      const bodyLines: string[] = [];
      i++;
      while (i < lines.length && braceDepth > 0) {
        const curLine = lines[i] || '';
        for (const char of curLine) {
          if (char === '{') braceDepth++;
          else if (char === '}') braceDepth--;
        }
        if (braceDepth > 0) {
          bodyLines.push(curLine);
        }
        i++;
      }

      const inputs = parseBlockAttributes(bodyLines);
      const source = typeof inputs.source === 'string' ? inputs.source : './modules/' + modName;
      const version = typeof inputs.version === 'string' ? inputs.version : undefined;

      detectedModules.push({
        name: modName,
        source,
        version,
        inputs,
        location: { filePath: file.filePath, line: lineNum },
      });
      continue;
    }

    // 3. Output block: output "name" {
    const outputMatch = line.match(/^output\s+"([^"]+)"\s*\{/);
    if (outputMatch && outputMatch[1]) {
      const outName = outputMatch[1];
      let braceDepth = 1;
      const bodyLines: string[] = [];
      i++;
      while (i < lines.length && braceDepth > 0) {
        const curLine = lines[i] || '';
        for (const char of curLine) {
          if (char === '{') braceDepth++;
          else if (char === '}') braceDepth--;
        }
        if (braceDepth > 0) {
          bodyLines.push(curLine);
        }
        i++;
      }

      const attrs = parseBlockAttributes(bodyLines);
      const value = typeof attrs.value === 'string' ? attrs.value : String(attrs.value ?? '');
      const description = typeof attrs.description === 'string' ? attrs.description : undefined;
      const sensitive = attrs.sensitive === true;

      detectedOutputs.push({
        name: outName,
        value,
        description,
        sensitive,
        location: { filePath: file.filePath, line: lineNum },
      });
      continue;
    }

    // 4. Variable block: variable "name" {
    const varMatch = line.match(/^variable\s+"([^"]+)"\s*\{/);
    if (varMatch && varMatch[1]) {
      const varName = varMatch[1];
      let braceDepth = 1;
      const bodyLines: string[] = [];
      i++;
      while (i < lines.length && braceDepth > 0) {
        const curLine = lines[i] || '';
        for (const char of curLine) {
          if (char === '{') braceDepth++;
          else if (char === '}') braceDepth--;
        }
        if (braceDepth > 0) {
          bodyLines.push(curLine);
        }
        i++;
      }

      const attrs = parseBlockAttributes(bodyLines);
      detectedVariables.push({
        name: varName,
        type: typeof attrs.type === 'string' ? attrs.type : undefined,
        defaultValue: attrs.default,
        description: typeof attrs.description === 'string' ? attrs.description : undefined,
        location: { filePath: file.filePath, line: lineNum },
      });
      continue;
    }

    i++;
  }

  return {
    resources: detectedResources,
    modules: detectedModules,
    outputs: detectedOutputs,
    variables: detectedVariables,
  };
}

/**
 * Parse Terraform state JSON (e.g. terraform.tfstate or terraform show -json).
 */
export function parseTerraformStateJson(stateJsonStr: string): TerraformResource[] {
  try {
    const data = JSON.parse(stateJsonStr);
    const resources: TerraformResource[] = [];

    // Format A: Standard .tfstate file with top-level "resources" array
    if (Array.isArray(data.resources)) {
      for (const res of data.resources) {
        if (!res.type || !res.name) continue;
        const { provider, prefix } = detectProvider(res.type);
        const address = `${res.type}.${res.name}`;
        const instances = Array.isArray(res.instances) ? res.instances : [];
        const primaryAttrs = instances[0]?.attributes || {};
        const dependsOn = Array.isArray(res.depends_on) ? res.depends_on : [];

        resources.push({
          address,
          provider,
          providerPrefix: prefix,
          type: res.type,
          name: res.name,
          module: res.module,
          attributes: primaryAttrs,
          references: dependsOn,
          dependsOn,
          location: { filePath: 'terraform.tfstate', line: 1 },
        });
      }
      return resources;
    }

    // Format B: terraform show -json format with "values.root_module"
    if (data.values?.root_module) {
      const scanModule = (mod: Record<string, unknown>, modulePrefix?: string) => {
        if (Array.isArray(mod.resources)) {
          for (const res of mod.resources) {
            if (!res.type || !res.name) continue;
            const { provider, prefix } = detectProvider(res.type);
            const address = res.address || `${res.type}.${res.name}`;
            resources.push({
              address,
              provider,
              providerPrefix: prefix,
              type: res.type,
              name: res.name,
              module: modulePrefix,
              attributes: (res.values as Record<string, unknown>) || {},
              references: Array.isArray(res.depends_on) ? res.depends_on : [],
              dependsOn: Array.isArray(res.depends_on) ? res.depends_on : [],
              location: { filePath: 'terraform_plan.json', line: 1 },
            });
          }
        }
        if (Array.isArray(mod.child_modules)) {
          for (const child of mod.child_modules) {
            const childName = (child.address as string) || 'child';
            scanModule(child as Record<string, unknown>, childName);
          }
        }
      };
      scanModule(data.values.root_module);
      return resources;
    }

    return resources;
  } catch {
    return [];
  }
}

/**
 * Derives connection characteristics (kind, label, protocol) between two Terraform resources.
 */
export function deriveTerraformConnection(
  sourceRes: TerraformResource,
  targetRes: TerraformResource
): { kind: 'sync' | 'async'; label: string; protocol: string } {
  const targetKind = determineObjectKindForTerraform(targetRes.type, targetRes.attributes);

  // If target is datastore
  if (targetKind === 'store') {
    let protocol = 'Database Protocol';
    const targetIdentifier = `${targetRes.type} ${targetRes.name} ${String(targetRes.attributes.engine || '')}`.toLowerCase();
    if (targetIdentifier.includes('s3') || targetIdentifier.includes('storage')) {
      protocol = 'HTTPS / Storage API';
    } else if (targetIdentifier.includes('redis') || targetIdentifier.includes('cache')) {
      protocol = 'TCP : 6379';
    } else if (targetIdentifier.includes('dynamodb') || targetIdentifier.includes('cosmos') || targetIdentifier.includes('firestore')) {
      protocol = 'HTTPS / Document API';
    } else if (targetIdentifier.includes('postgres') || targetIdentifier.includes('psql') || targetIdentifier.includes('sql')) {
      protocol = 'TCP : 5432';
    }
    return { kind: 'sync', label: 'Queries / Persists', protocol };
  }

  // If target is queue or messaging component
  if (targetKind === 'component') {
    return { kind: 'async', label: 'Publishes message', protocol: 'AMQP / PubSub' };
  }

  // If source is load balancer or API Gateway
  if (
    sourceRes.type.includes('lb') ||
    sourceRes.type.includes('gateway') ||
    sourceRes.type.includes('ingress') ||
    sourceRes.type.includes('frontdoor') ||
    sourceRes.type.includes('cdn')
  ) {
    return { kind: 'sync', label: 'Routes traffic', protocol: 'HTTPS' };
  }

  // If source is compute and target is group (e.g. VPC/Subnet)
  if (targetKind === 'group') {
    return { kind: 'sync', label: 'Deployed in', protocol: 'Internal Network' };
  }

  // Default inter-service connection
  return { kind: 'sync', label: 'References', protocol: 'Internal RPC / HTTPS' };
}

/**
 * Main entrypoint: import and map Terraform configuration into DiagramHQ architecture model.
 */
export function importTerraformConfig(
  input: TerraformConfigScanInput,
  options: TerraformMappingOptions = {}
): TerraformImportResult {
  const includeModules = options.includeModules ?? true;
  const groupByModule = options.groupByModule ?? true;
  const inferConnections = options.inferConnections ?? true;
  const architectureId = options.architectureId || ('arch-tf-default' as ArchitectureId);
  const versionId = options.versionId || ('ver-tf-default' as VersionId);

  const allResources: TerraformResource[] = [];
  const allModules: TerraformModule[] = [];
  const allOutputs: TerraformOutput[] = [];
  const allVariables: TerraformVariable[] = [];

  // Parse each HCL file
  for (const file of input.files) {
    // If the file path implies a module (e.g. modules/vpc/main.tf), track module name
    let moduleName: string | undefined;
    const pathParts = file.filePath.split('/');
    const modIdx = pathParts.indexOf('modules');
    if (modIdx !== -1 && pathParts[modIdx + 1]) {
      moduleName = pathParts[modIdx + 1];
    }

    const parsed = parseTerraformHcl(file);

    for (const r of parsed.resources) {
      if (moduleName && !r.module) {
        r.module = moduleName;
      }
      allResources.push(r);
    }
    allModules.push(...parsed.modules);
    allOutputs.push(...parsed.outputs);
    allVariables.push(...parsed.variables);
  }

  // If state JSON provided, merge state resources (avoiding duplicates)
  if (input.stateJson) {
    const stateResources = parseTerraformStateJson(input.stateJson);
    const existingAddresses = new Set(allResources.map((r) => r.address));
    for (const sr of stateResources) {
      if (!existingAddresses.has(sr.address)) {
        allResources.push(sr);
        existingAddresses.add(sr.address);
      }
    }
  }

  // Filter providers if specified
  const filteredResources = allResources.filter((r) => {
    if (options.filterProviders && options.filterProviders.length > 0) {
      if (!options.filterProviders.includes(r.provider)) return false;
    }
    if (options.filterResourceTypes && options.filterResourceTypes.length > 0) {
      if (!options.filterResourceTypes.includes(r.type)) return false;
    }
    return true;
  });

  const objects: ModelObject[] = [];
  const connections: ModelConnection[] = [];
  const evidence: Record<ObjectId, TerraformEvidence> = {};

  const addressToObjectId = new Map<string, ObjectId>();
  const moduleNameToObjectId = new Map<string, ObjectId>();

  // 1. Create Module Group Objects if groupByModule is enabled
  if (includeModules && groupByModule) {
    // Collect distinct module names from module declarations and resource module assignments
    const distinctModules = new Map<string, { source?: string; location?: TerraformLocation }>();

    for (const m of allModules) {
      distinctModules.set(m.name, { source: m.source, location: m.location });
    }
    for (const r of filteredResources) {
      if (r.module && !distinctModules.has(r.module)) {
        distinctModules.set(r.module, { source: `./modules/${r.module}`, location: r.location });
      }
    }

    for (const [modName, modMeta] of distinctModules.entries()) {
      const modObjectId = `obj_tf_mod_${modName}` as ObjectId;
      moduleNameToObjectId.set(modName, modObjectId);

      const title = modName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) + ' Module';
      objects.push({
        id: modObjectId,
        architectureId,
        versionId,
        parentId: null,
        kind: 'group',
        name: title,
        description: `Terraform Module: ${modMeta.source || modName}`,
        metadata: {
          technology: 'Terraform Module',
          moduleName: modName,
          source: modMeta.source,
          tags: ['terraform', 'module', modName],
        },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      evidence[modObjectId] = {
        sourceType: 'iac_terraform',
        provider: 'generic',
        resourceType: 'terraform_module',
        address: `module.${modName}`,
        filePath: modMeta.location?.filePath || 'main.tf',
        line: modMeta.location?.line || 1,
        confidence: 1.0,
      };
    }
  }

  // 2. Map Resources to ModelObjects
  for (const res of filteredResources) {
    const objectId = `obj_tf_${res.address.replace(/[^a-zA-Z0-9_]/g, '_')}` as ObjectId;
    addressToObjectId.set(res.address, objectId);

    const kind = determineObjectKindForTerraform(res.type, res.attributes);
    const title = formatTerraformResourceName(res.type, res.name);

    // Determine parent ID: Module containment has precedence, otherwise VPC/Network containment
    let parentId: ObjectId | null = null;
    if (groupByModule && res.module && moduleNameToObjectId.has(res.module)) {
      parentId = moduleNameToObjectId.get(res.module) || null;
    }

    const providerUpper = res.provider.toUpperCase();
    const tech = `${providerUpper} · ${res.type}`;

    objects.push({
      id: objectId,
      architectureId,
      versionId,
      parentId,
      kind,
      name: title,
      description: `Terraform Resource: ${res.address} (${res.location.filePath}:${res.location.line})`,
      metadata: {
        technology: tech,
        provider: res.provider,
        resourceType: res.type,
        address: res.address,
        location: res.location,
        attributes: res.attributes,
        tags: ['terraform', res.provider, res.type, res.name],
      },
      position: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    evidence[objectId] = {
      sourceType: 'iac_terraform',
      provider: res.provider,
      resourceType: res.type,
      address: res.address,
      filePath: res.location.filePath,
      line: res.location.line,
      confidence: 1.0,
    };
  }

  // 3. Infer Inter-Resource Connections
  if (inferConnections) {
    const createdConnections = new Set<string>();

    for (const res of filteredResources) {
      const sourceObjId = addressToObjectId.get(res.address);
      if (!sourceObjId) continue;

      // Check all references from this resource to other resources
      for (const refAddress of res.references) {
        const targetRes = filteredResources.find((r) => r.address === refAddress);
        if (!targetRes) continue;

        const targetObjId = addressToObjectId.get(refAddress);
        if (!targetObjId || sourceObjId === targetObjId) continue;

        // Skip parent-child containment edge (if target is source's parent group, don't draw redundant connection)
        const sourceObj = objects.find((o) => o.id === sourceObjId);
        if (sourceObj?.parentId === targetObjId) continue;

        const connKey = `${sourceObjId}->${targetObjId}`;
        if (createdConnections.has(connKey)) continue;
        createdConnections.add(connKey);

        const connChar = deriveTerraformConnection(res, targetRes);
        const connectionId = `conn_tf_${sourceObjId}_${targetObjId}` as ConnectionId;

        connections.push({
          id: connectionId,
          architectureId,
          versionId,
          sourceObjectId: sourceObjId,
          targetObjectId: targetObjId,
          kind: connChar.kind,
          label: connChar.label,
          description: `Terraform dependency: ${res.address} -> ${targetRes.address}`,
          metadata: {
            protocol: connChar.protocol,
            sourceAddress: res.address,
            targetAddress: targetRes.address,
            tags: ['terraform', 'inferred', res.provider],
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  // 4. Compute Provider Distribution Summary
  const providerCounts: Record<TerraformProvider, number> = {
    aws: 0,
    azurerm: 0,
    google: 0,
    kubernetes: 0,
    generic: 0,
  };
  for (const r of filteredResources) {
    providerCounts[r.provider] = (providerCounts[r.provider] || 0) + 1;
  }

  return {
    objects,
    connections,
    resources: filteredResources,
    modules: allModules,
    outputs: allOutputs,
    variables: allVariables,
    evidence,
    summary: {
      resourceCount: filteredResources.length,
      moduleCount: allModules.length,
      connectionCount: connections.length,
      providerCounts,
    },
  };
}

/**
 * Creates a rich, realistic sample Terraform repository input for testing and acceptance verification.
 */
export function createMockTerraformRepo(): TerraformConfigScanInput {
  const mainTf = `
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

module "network" {
  source = "./modules/network"
  vpc_cidr = "10.0.0.0/16"
}

module "database" {
  source = "./modules/database"
  vpc_id = module.network.vpc_id
}

module "compute" {
  source = "./modules/compute"
  vpc_id = module.network.vpc_id
  db_host = module.database.db_endpoint
}

output "api_gateway_url" {
  value = module.compute.api_gateway_url
  description = "Public URL for Edge API Gateway"
}

output "database_endpoint" {
  value = module.database.db_endpoint
  description = "Private PostgreSQL Endpoint"
  sensitive = true
}
`;

  const networkTf = `
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = {
    Name = "Production VPC"
  }
}

resource "aws_subnet" "public" {
  vpc_id = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private" {
  vpc_id = aws_vpc.main.id
  cidr_block = "10.0.2.0/24"
}
`;

  const databaseTf = `
resource "aws_db_instance" "postgres" {
  allocated_storage    = 50
  engine               = "postgres"
  engine_version       = "16.1"
  instance_class       = "db.r6g.xlarge"
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  depends_on           = [aws_security_group.db_sg]
}

resource "aws_dynamodb_table" "sessions" {
  name           = "UserSessions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "SessionId"
}

resource "aws_s3_bucket" "assets" {
  bucket = "diagramhq-production-assets"
}

resource "aws_security_group" "db_sg" {
  name        = "db-access-sg"
  description = "Allow inbound postgres"
}
`;

  const computeTf = `
resource "aws_api_gateway_rest_api" "gateway" {
  name        = "EdgeApiGateway"
  description = "Ingress API Gateway"
}

resource "aws_ecs_service" "order_service" {
  name            = "order-processing-service"
  cluster         = "production-cluster"
  desired_count   = 4
  depends_on      = [aws_api_gateway_rest_api.gateway, aws_db_instance.postgres]
}

resource "aws_lambda_function" "auth_handler" {
  function_name = "auth-token-verifier"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  depends_on    = [aws_dynamodb_table.sessions]
}

resource "aws_sqs_queue" "order_events" {
  name                      = "order-events-queue"
  message_retention_seconds = 86400
}
`;

  return {
    repositoryUrl: 'https://github.com/diagramhq/infra-production',
    files: [
      { filePath: 'main.tf', content: mainTf },
      { filePath: 'modules/network/main.tf', content: networkTf },
      { filePath: 'modules/database/main.tf', content: databaseTf },
      { filePath: 'modules/compute/main.tf', content: computeTf },
    ],
  };
}
