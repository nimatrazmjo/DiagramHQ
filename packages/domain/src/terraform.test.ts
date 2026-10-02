import { describe, it, expect } from 'vitest';
import {
  detectProvider,
  determineObjectKindForTerraform,
  parseTerraformHcl,
  parseTerraformStateJson,
  deriveTerraformConnection,
  importTerraformConfig,
  createMockTerraformRepo,
} from './terraform';

describe('Terraform IaC Mapping Engine (F081)', () => {
  describe('Provider and Kind Detection', () => {
    it('detects cloud providers from resource type prefixes', () => {
      expect(detectProvider('aws_instance').provider).toBe('aws');
      expect(detectProvider('azurerm_linux_virtual_machine').provider).toBe('azurerm');
      expect(detectProvider('google_compute_instance').provider).toBe('google');
      expect(detectProvider('kubernetes_deployment').provider).toBe('kubernetes');
      expect(detectProvider('random_password').provider).toBe('generic');
    });

    it('classifies Terraform resource types to C4 ModelObjectKinds correctly', () => {
      // Stores
      expect(determineObjectKindForTerraform('aws_db_instance')).toBe('store');
      expect(determineObjectKindForTerraform('aws_s3_bucket')).toBe('store');
      expect(determineObjectKindForTerraform('azurerm_mssql_database')).toBe('store');
      expect(determineObjectKindForTerraform('google_sql_database_instance')).toBe('store');

      // Groups
      expect(determineObjectKindForTerraform('aws_vpc')).toBe('group');
      expect(determineObjectKindForTerraform('azurerm_virtual_network')).toBe('group');
      expect(determineObjectKindForTerraform('google_compute_network')).toBe('group');
      expect(determineObjectKindForTerraform('kubernetes_namespace')).toBe('group');

      // Components
      expect(determineObjectKindForTerraform('aws_sqs_queue')).toBe('component');
      expect(determineObjectKindForTerraform('aws_sns_topic')).toBe('component');
      expect(determineObjectKindForTerraform('azurerm_servicebus_queue')).toBe('component');
      expect(determineObjectKindForTerraform('google_pubsub_topic')).toBe('component');

      // Applications
      expect(determineObjectKindForTerraform('aws_ecs_service')).toBe('application');
      expect(determineObjectKindForTerraform('aws_lambda_function')).toBe('application');
      expect(determineObjectKindForTerraform('azurerm_app_service')).toBe('application');
      expect(determineObjectKindForTerraform('google_cloud_run_service')).toBe('application');
    });
  });

  describe('HCL Parsing', () => {
    it('parses resource, module, output, and variable blocks with attributes and references', () => {
      const sampleTf = `
# Infrastructure Definition
variable "environment" {
  type        = "string"
  default     = "production"
  description = "Target deployment environment"
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"
  cidr = "10.0.0.0/16"
}

resource "aws_security_group" "web_sg" {
  name        = "web-server-sg"
  description = "Allow inbound HTTP"
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  vpc_security_group_ids = [aws_security_group.web_sg.id]
  depends_on    = [aws_security_group.web_sg]
}

output "web_public_ip" {
  value       = aws_instance.web.public_ip
  description = "Public IP address of web instance"
}
`;
      const parsed = parseTerraformHcl({ filePath: 'main.tf', content: sampleTf });

      expect(parsed.variables).toHaveLength(1);
      expect(parsed.variables[0]?.name).toBe('environment');
      expect(parsed.variables[0]?.defaultValue).toBe('production');

      expect(parsed.modules).toHaveLength(1);
      expect(parsed.modules[0]?.name).toBe('vpc');
      expect(parsed.modules[0]?.source).toBe('terraform-aws-modules/vpc/aws');

      expect(parsed.resources).toHaveLength(2);
      const webRes = parsed.resources.find((r) => r.name === 'web');
      expect(webRes).toBeDefined();
      expect(webRes?.type).toBe('aws_instance');
      expect(webRes?.references).toContain('aws_security_group.web_sg');

      expect(parsed.outputs).toHaveLength(1);
      expect(parsed.outputs[0]?.name).toBe('web_public_ip');
    });
  });

  describe('Terraform State JSON Parsing', () => {
    it('parses resources from standard .tfstate JSON', () => {
      const stateJson = JSON.stringify({
        version: 4,
        terraform_version: '1.6.0',
        resources: [
          {
            type: 'aws_s3_bucket',
            name: 'media_bucket',
            provider: 'provider["registry.terraform.io/hashicorp/aws"]',
            instances: [
              {
                attributes: {
                  bucket: 'diagramhq-media',
                  arn: 'arn:aws:s3:::diagramhq-media',
                },
              },
            ],
            depends_on: ['aws_kms_key.s3'],
          },
        ],
      });

      const resources = parseTerraformStateJson(stateJson);
      expect(resources).toHaveLength(1);
      expect(resources[0]?.type).toBe('aws_s3_bucket');
      expect(resources[0]?.name).toBe('media_bucket');
      expect(resources[0]?.provider).toBe('aws');
      expect(resources[0]?.references).toContain('aws_kms_key.s3');
    });
  });

  describe('Connection Derivation', () => {
    it('derives protocols and labels based on target resource kinds', () => {
      const appRes = {
        address: 'aws_ecs_service.api',
        provider: 'aws' as const,
        providerPrefix: 'aws',
        type: 'aws_ecs_service',
        name: 'api',
        attributes: {},
        references: [],
        dependsOn: [],
        location: { filePath: 'main.tf', line: 1 },
      };

      const dbRes = {
        address: 'aws_db_instance.postgres',
        provider: 'aws' as const,
        providerPrefix: 'aws',
        type: 'aws_db_instance',
        name: 'postgres',
        attributes: {},
        references: [],
        dependsOn: [],
        location: { filePath: 'main.tf', line: 10 },
      };

      const conn = deriveTerraformConnection(appRes, dbRes);
      expect(conn.kind).toBe('sync');
      expect(conn.label).toBe('Queries / Persists');
      expect(conn.protocol).toBe('TCP : 5432');
    });
  });

  describe('Acceptance Test: Sample Terraform Repo Import', () => {
    it('parses a sample Terraform repo and generates a complete architecture model', () => {
      const mockRepo = createMockTerraformRepo();
      const result = importTerraformConfig(mockRepo, {
        groupByModule: true,
        inferConnections: true,
      });

      // 1. Module Groups
      const moduleObjects = result.objects.filter((o) => o.kind === 'group');
      expect(moduleObjects.length).toBeGreaterThanOrEqual(3);
      const networkMod = moduleObjects.find((o) => o.name.includes('Network'));
      const dbMod = moduleObjects.find((o) => o.name.includes('Database'));
      const computeMod = moduleObjects.find((o) => o.name.includes('Compute'));

      expect(networkMod).toBeDefined();
      expect(dbMod).toBeDefined();
      expect(computeMod).toBeDefined();

      // 2. Resources Mapped to Objects
      expect(result.resources.length).toBeGreaterThanOrEqual(10);
      const postgresObj = result.objects.find((o) => (o.metadata?.tags as string[])?.includes('aws_db_instance'));
      expect(postgresObj).toBeDefined();
      expect(postgresObj?.kind).toBe('store');
      expect(postgresObj?.parentId).toBe(dbMod?.id);

      const gatewayObj = result.objects.find((o) => (o.metadata?.tags as string[])?.includes('aws_api_gateway_rest_api'));
      expect(gatewayObj).toBeDefined();
      expect(gatewayObj?.kind).toBe('application');
      expect(gatewayObj?.parentId).toBe(computeMod?.id);

      // 3. Inferred Connections
      expect(result.connections.length).toBeGreaterThan(0);
      const ecsToDbConn = result.connections.find(
        (c) => c.sourceObjectId.includes('aws_ecs_service') && c.targetObjectId.includes('aws_db_instance')
      );
      expect(ecsToDbConn).toBeDefined();
      expect(ecsToDbConn?.kind).toBe('sync');

      // 4. Traceable IaC Evidence
      for (const obj of result.objects) {
        expect(result.evidence[obj.id]).toBeDefined();
        expect(result.evidence[obj.id]?.sourceType).toBe('iac_terraform');
        expect(result.evidence[obj.id]?.confidence).toBe(1.0);
      }

      // 5. Outputs and Modules
      expect(result.outputs.length).toBeGreaterThanOrEqual(2);
      expect(result.modules.length).toBeGreaterThanOrEqual(3);
      expect(result.summary.providerCounts.aws).toBeGreaterThanOrEqual(10);
    });

    it('supports provider filtering', () => {
      const mockRepo = createMockTerraformRepo();
      const result = importTerraformConfig(mockRepo, {
        filterProviders: ['azurerm'], // Filter for azurerm when repo is aws
      });

      expect(result.resources).toHaveLength(0);
      expect(result.summary.resourceCount).toBe(0);
    });
  });
});
