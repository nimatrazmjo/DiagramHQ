import { describe, it, expect } from 'vitest';
import {
  createDomain,
  nestDomain,
  assignObjectToDomain,
  removeObjectFromDomain,
  filterObjectsByDomain,
  getDomainHierarchy,
  getDomainDescendantIds,
  findDomainBySelector,
  type Domain,
} from './domains';
import type { ArchitectureId, ObjectId, VersionId } from './ids';
import type { ModelObject } from './types';

describe('DDD Domains / Bounded Contexts (F113)', () => {
  const archId = 'arch_123' as ArchitectureId;
  const verId = 'ver_123' as VersionId;

  it('creates domain with auto-generated slug, id, and timestamps', () => {
    const domain = createDomain({
      architectureId: archId,
      name: 'Order Fulfillment',
      description: 'Manages customer orders from placement to delivery.',
      color: '#10b981',
      owner: 'Logistics Team',
    });

    expect(domain.id).toMatch(/^dom_/);
    expect(domain.architectureId).toBe(archId);
    expect(domain.name).toBe('Order Fulfillment');
    expect(domain.slug).toBe('order-fulfillment');
    expect(domain.color).toBe('#10b981');
    expect(domain.owner).toBe('Logistics Team');
    expect(domain.parentDomainId).toBeNull();
    expect(domain.createdAt).toBeInstanceOf(Date);
    expect(domain.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects empty domain name', () => {
    expect(() =>
      createDomain({
        architectureId: archId,
        name: '   ',
      }),
    ).toThrow('Domain name cannot be empty');
  });

  it('nests domains (bounded contexts under core domains)', () => {
    const billingDomain = createDomain({
      architectureId: archId,
      name: 'Billing & Invoicing',
    });

    const paymentProcessing = createDomain({
      architectureId: archId,
      name: 'Payment Processing',
      description: 'Handles credit card and ACH gateways',
    });

    const taxCalculation = createDomain({
      architectureId: archId,
      name: 'Tax Calculation',
      description: 'Regional VAT and sales tax calculator',
    });

    const allDomains: Domain[] = [billingDomain, paymentProcessing, taxCalculation];

    const nestedPayment = nestDomain(paymentProcessing.id, billingDomain.id, allDomains);
    expect(nestedPayment.parentDomainId).toBe(billingDomain.id);

    const nestedTax = nestDomain(taxCalculation.id, billingDomain.id, allDomains);
    expect(nestedTax.parentDomainId).toBe(billingDomain.id);

    const updatedDomains: Domain[] = [billingDomain, nestedPayment, nestedTax];

    const hierarchy = getDomainHierarchy(updatedDomains);
    expect(hierarchy.length).toBe(1);
    expect(hierarchy[0].domain.name).toBe('Billing & Invoicing');
    expect(hierarchy[0].children.length).toBe(2);
    expect(hierarchy[0].children.map((c) => c.domain.name)).toEqual([
      'Payment Processing',
      'Tax Calculation',
    ]);

    // Test descendant ID resolution and domain search by selector
    const descendantIds = getDomainDescendantIds(billingDomain.id, updatedDomains);
    expect(descendantIds).toContain(paymentProcessing.id);
    expect(descendantIds).toContain(taxCalculation.id);

    const foundBySlug = findDomainBySelector('billing-invoicing', updatedDomains);
    expect(foundBySlug?.id).toBe(billingDomain.id);
  });

  it('prevents cycle creation when nesting domains', () => {
    const domainA = createDomain({ architectureId: archId, name: 'Domain A' });
    const domainB = createDomain({ architectureId: archId, name: 'Domain B', parentDomainId: domainA.id });
    const domainC = createDomain({ architectureId: archId, name: 'Domain C', parentDomainId: domainB.id });

    const allDomains: Domain[] = [domainA, domainB, domainC];

    // Cannot nest under self
    expect(() => nestDomain(domainA.id, domainA.id, allDomains)).toThrow('cannot be its own parent');

    // Attempting to nest Domain A under Domain C (which is its grandchild) must be rejected
    expect(() => nestDomain(domainA.id, domainC.id, allDomains)).toThrow('Cycle detected');
  });

  it('assigns and removes objects to/from domains', () => {
    const domain = createDomain({
      architectureId: archId,
      name: 'Identity & Access',
      slug: 'identity-access',
    });

    const testObject: ModelObject = {
      id: 'app_auth' as ObjectId,
      architectureId: archId,
      versionId: verId,
      kind: 'application',
      name: 'Auth Service',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { env: 'production' },
    };

    const assigned = assignObjectToDomain(testObject, domain);
    expect(assigned.metadata?.domain).toBe('Identity & Access');
    expect(assigned.metadata?.domainId).toBe(domain.id);
    expect(assigned.metadata?.domainSlug).toBe('identity-access');
    expect(assigned.metadata?.env).toBe('production'); // Preserves other metadata

    const removed = removeObjectFromDomain(assigned);
    expect(removed.metadata?.domain).toBeUndefined();
    expect(removed.metadata?.domainId).toBeUndefined();
    expect(removed.metadata?.env).toBe('production');
  });

  it('filters objects by domain (F113 acceptance criterion)', () => {
    const paymentsDomain = createDomain({ architectureId: archId, name: 'Payments' });
    const inventoryDomain = createDomain({ architectureId: archId, name: 'Inventory' });

    const objPayments1 = assignObjectToDomain(
      { id: 'app_1', name: 'Payment Gateway', kind: 'application', architectureId: archId, versionId: verId, createdAt: new Date(), updatedAt: new Date() },
      paymentsDomain,
    );

    const objPayments2 = assignObjectToDomain(
      { id: 'sto_1', name: 'Ledger DB', kind: 'database', architectureId: archId, versionId: verId, createdAt: new Date(), updatedAt: new Date() },
      paymentsDomain,
    );

    const objInventory = assignObjectToDomain(
      { id: 'app_2', name: 'Warehouse Tracker', kind: 'application', architectureId: archId, versionId: verId, createdAt: new Date(), updatedAt: new Date() },
      inventoryDomain,
    );

    const objUnassigned = {
      id: 'app_3',
      name: 'Shared Utility',
      kind: 'application',
      architectureId: archId,
      versionId: verId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const allObjects = [objPayments1, objPayments2, objInventory, objUnassigned];

    // Filter by domain name
    const paymentResultsByName = filterObjectsByDomain(allObjects, 'Payments');
    expect(paymentResultsByName.map((o) => o.id)).toEqual(['app_1', 'sto_1']);

    // Filter by domain ID
    const paymentResultsById = filterObjectsByDomain(allObjects, paymentsDomain.id);
    expect(paymentResultsById.map((o) => o.id)).toEqual(['app_1', 'sto_1']);

    // Filter by inventory
    const inventoryResults = filterObjectsByDomain(allObjects, 'Inventory');
    expect(inventoryResults.map((o) => o.id)).toEqual(['app_2']);
  });

  it('filters objects including nested bounded contexts when includeNestedDomains is enabled', () => {
    const parentDomain = createDomain({ architectureId: archId, name: 'E-Commerce' });
    const subDomainA = createDomain({
      architectureId: archId,
      name: 'Checkout & Cart',
      parentDomainId: parentDomain.id,
    });
    const subDomainB = createDomain({
      architectureId: archId,
      name: 'Product Catalog',
      parentDomainId: parentDomain.id,
    });
    const separateDomain = createDomain({ architectureId: archId, name: 'HR Portal' });

    const allDomains = [parentDomain, subDomainA, subDomainB, separateDomain];

    const objRoot = assignObjectToDomain({ id: 'o_root', name: 'Root Web App' }, parentDomain);
    const objCheckout = assignObjectToDomain({ id: 'o_cart', name: 'Cart Microservice' }, subDomainA);
    const objCatalog = assignObjectToDomain({ id: 'o_cat', name: 'Catalog DB' }, subDomainB);
    const objHr = assignObjectToDomain({ id: 'o_hr', name: 'Payroll Service' }, separateDomain);

    const objects = [objRoot, objCheckout, objCatalog, objHr];

    // Without includeNestedDomains: only matches root
    const rootOnly = filterObjectsByDomain(objects, 'E-Commerce', {
      domains: allDomains,
      includeNestedDomains: false,
    });
    expect(rootOnly.map((o) => o.id)).toEqual(['o_root']);

    // With includeNestedDomains: matches root + all bounded contexts
    const withNested = filterObjectsByDomain(objects, 'E-Commerce', {
      domains: allDomains,
      includeNestedDomains: true,
    });
    expect(withNested.map((o) => o.id)).toEqual(['o_root', 'o_cart', 'o_cat']);

    // Querying sub-domain directly
    const cartOnly = filterObjectsByDomain(objects, 'Checkout & Cart', { domains: allDomains });
    expect(cartOnly.map((o) => o.id)).toEqual(['o_cart']);
  });
});
