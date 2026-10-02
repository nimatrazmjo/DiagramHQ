import { describe, expect, it } from 'vitest';
import {
  ALL_AWS_RESOURCE_TYPES,
  createMockAwsAccount,
  determineConnectionKindForAws,
  determineObjectKindForAws,
  importAwsAccount,
  parseAwsArn,
} from './aws';
import type { ArchitectureId, VersionId } from './ids';

describe('F078 — AWS Infrastructure Integration', () => {
  const archId = 'arch-cloud-prod' as ArchitectureId;
  const verId = 'ver-v1-main' as VersionId;

  describe('parseAwsArn', () => {
    it('correctly parses various standard AWS ARN formats', () => {
      // Lambda function (colon delimiter)
      const lambdaArn = parseAwsArn('arn:aws:lambda:us-east-1:123456789012:function:payment-service');
      expect(lambdaArn).toEqual({
        partition: 'aws',
        service: 'lambda',
        region: 'us-east-1',
        accountId: '123456789012',
        resourceType: 'function',
        resourceId: 'payment-service',
      });

      // S3 bucket (no region, no account)
      const s3Arn = parseAwsArn('arn:aws:s3:::company-data-lake-prod');
      expect(s3Arn).toEqual({
        partition: 'aws',
        service: 's3',
        region: '',
        accountId: '',
        resourceType: undefined,
        resourceId: 'company-data-lake-prod',
      });

      // EC2 VPC (slash delimiter)
      const vpcArn = parseAwsArn('arn:aws:ec2:us-west-2:123456789012:vpc/vpc-12345678');
      expect(vpcArn).toEqual({
        partition: 'aws',
        service: 'ec2',
        region: 'us-west-2',
        accountId: '123456789012',
        resourceType: 'vpc',
        resourceId: 'vpc-12345678',
      });
    });

    it('returns null for non-ARN strings or malformed inputs', () => {
      expect(parseAwsArn('invalid-non-arn-string')).toBeNull();
      expect(parseAwsArn('arn:too:short')).toBeNull();
    });
  });

  describe('determineObjectKindForAws & determineConnectionKindForAws', () => {
    it('maps all 13 canonical AWS resource types to valid ModelObject kinds', () => {
      for (const type of ALL_AWS_RESOURCE_TYPES) {
        const kind = determineObjectKindForAws(type);
        expect(['group', 'store', 'application', 'component']).toContain(kind);
      }

      expect(determineObjectKindForAws('vpc')).toBe('group');
      expect(determineObjectKindForAws('rds')).toBe('store');
      expect(determineObjectKindForAws('dynamodb')).toBe('store');
      expect(determineObjectKindForAws('s3')).toBe('store');
      expect(determineObjectKindForAws('lambda')).toBe('application');
      expect(determineObjectKindForAws('ecs')).toBe('application');
      expect(determineObjectKindForAws('eks')).toBe('application');
      expect(determineObjectKindForAws('ec2')).toBe('application');
      expect(determineObjectKindForAws('api_gateway')).toBe('application');
      expect(determineObjectKindForAws('cloudfront')).toBe('application');
      expect(determineObjectKindForAws('sqs')).toBe('component');
      expect(determineObjectKindForAws('sns')).toBe('component');
      expect(determineObjectKindForAws('eventbridge')).toBe('component');
    });

    it('determines appropriate connection kinds based on service topology', () => {
      const snsToSqs = determineConnectionKindForAws('sns', 'sqs');
      expect(snsToSqs.kind).toBe('async');

      const apiToLambda = determineConnectionKindForAws('api_gateway', 'lambda');
      expect(apiToLambda.kind).toBe('sync');

      const lambdaToRds = determineConnectionKindForAws('lambda', 'rds');
      expect(lambdaToRds.kind).toBe('data');
    });
  });

  describe('importAwsAccount (Mock Account Acceptance Test)', () => {
    it('imports a mocked account and verifies all 13 required AWS resource types are mapped', () => {
      const mockAccount = createMockAwsAccount('123456789012', 'us-east-1');
      const result = importAwsAccount(mockAccount, {
        architectureId: archId,
        versionId: verId,
        includeVpcContainment: true,
        mapConnections: true,
      });

      // Verify all 13 types were mapped
      for (const type of ALL_AWS_RESOURCE_TYPES) {
        expect(result.resourcesByType[type]).toBeGreaterThan(0);
      }

      // Check specific counts and mapping outputs
      expect(result.scannedCount).toBe(mockAccount.resources.length);
      expect(result.mappedObjectCount).toBe(mockAccount.resources.length);
      expect(result.mappedConnectionCount).toBeGreaterThan(0);
      expect(result.unmappedResources).toHaveLength(0);

      // Verify VPC group and containment
      const vpcObj = result.objects.find((o) => o.metadata?.awsResourceType === 'vpc');
      expect(vpcObj).toBeDefined();
      expect(vpcObj?.kind).toBe('group');

      // Resources in the VPC should have parentId pointing to the VPC
      const rdsObj = result.objects.find((o) => o.metadata?.awsResourceType === 'rds');
      expect(rdsObj).toBeDefined();
      expect(rdsObj?.parentId).toBe(vpcObj?.id);

      // Verify inter-resource connections derived
      expect(result.connections.length).toBeGreaterThanOrEqual(5);

      // Verify evidence generated for each object
      expect(result.evidence.length).toBe(result.mappedObjectCount);
      for (const ev of result.evidence) {
        expect(ev.sourceType).toBe('cloud_resource');
        expect(ev.confidence).toBeGreaterThan(0.9);
      }
    });

    it('applies region and resource type filters during import', () => {
      const mockAccount = createMockAwsAccount('123456789012', 'us-east-1');

      const filteredResult = importAwsAccount(mockAccount, {
        architectureId: archId,
        versionId: verId,
        resourceTypeFilter: ['lambda', 'dynamodb', 's3'],
      });

      expect(filteredResult.mappedObjectCount).toBe(4); // 2 lambdas + 1 dynamodb + 1 s3
      expect(filteredResult.resourcesByType.lambda).toBe(2);
      expect(filteredResult.resourcesByType.dynamodb).toBe(1);
      expect(filteredResult.resourcesByType.s3).toBe(1);
      expect(filteredResult.resourcesByType.ec2).toBe(0);
    });

    it('supports disabling VPC containment and connection mapping', () => {
      const mockAccount = createMockAwsAccount('123456789012', 'us-east-1');

      const flatResult = importAwsAccount(mockAccount, {
        architectureId: archId,
        versionId: verId,
        includeVpcContainment: false,
        mapConnections: false,
      });

      // No connections mapped
      expect(flatResult.mappedConnectionCount).toBe(0);

      // All objects have parentId = null
      for (const obj of flatResult.objects) {
        expect(obj.parentId).toBeNull();
      }
    });
  });
});
