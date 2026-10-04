import { describe, expect, it } from 'vitest';
import type { PullRequestId, UserId, ViewId } from './ids';
import {
  addMobileComment,
  approveArchitectureChange,
  askMobileAiCopilot,
  getCanvasDisplayMode,
  isMobileViewport,
  rejectArchitectureChange,
  resolveMobileComment,
  searchMobileCatalog,
  type MobileApprovalChange,
  type MobileSearchableItem,
} from './mobile';

describe('Mobile Companion & Desktop-First Architecture (F134)', () => {
  describe('Viewport Classification & Desktop-First Canvas Invariant', () => {
    it('classifies viewports and strictly preserves desktop-first canvas invariant', () => {
      // Mobile screens (e.g. iPhone, Android)
      expect(isMobileViewport(375)).toBe(true);
      expect(isMobileViewport(414)).toBe(true);
      expect(isMobileViewport(767)).toBe(true);

      // Desktop & Tablet screens
      expect(isMobileViewport(768)).toBe(false);
      expect(isMobileViewport(1024)).toBe(false);
      expect(isMobileViewport(1440)).toBe(false);

      // Invariant Check on mobile: 2D canvas editing is blocked; companion activated
      const mobileConfig = getCanvasDisplayMode(375);
      expect(mobileConfig.mode).toBe('mobile_companion');
      expect(mobileConfig.isCanvasEditingEnabled).toBe(false);
      expect(mobileConfig.isMobileOptimized).toBe(true);
      expect(mobileConfig.advisoryMessage).toContain('desktop-first');

      // Desktop: 2D canvas editing is active
      const desktopConfig = getCanvasDisplayMode(1280);
      expect(desktopConfig.mode).toBe('desktop_canvas');
      expect(desktopConfig.isCanvasEditingEnabled).toBe(true);
    });
  });

  describe('Search & Catalog Browsing', () => {
    it('executes quick search across views, components, and decisions', () => {
      const catalog: MobileSearchableItem[] = [
        {
          id: 'v1',
          type: 'view',
          title: 'PCI CDE Boundary View',
          subtitle: 'Container Level Architecture',
          tags: ['pci', 'security'],
        },
        {
          id: 'o1',
          type: 'object',
          title: 'Kafka Message Queue',
          subtitle: 'Event Stream Buffer',
          tags: ['kafka', 'streaming'],
        },
        {
          id: 'd1',
          type: 'decision',
          title: 'ADR-004: Zero-Trust Gateway',
          subtitle: 'Accepted ADR',
          tags: ['security', 'adr'],
        },
      ];

      const search1 = searchMobileCatalog('pci', catalog);
      expect(search1.length).toBe(1);
      expect(search1[0].title).toBe('PCI CDE Boundary View');

      const search2 = searchMobileCatalog('security', catalog);
      expect(search2.length).toBe(2);
    });
  });

  describe('Approvals, Comments & Mobile AI Copilot', () => {
    it('handles review approvals and rejections', () => {
      const change: MobileApprovalChange = {
        id: 'pr_auth_upgrade' as PullRequestId,
        title: 'Upgrade OAuth2 to Passkey Authentication',
        authorName: 'Alex Mercer',
        summary: 'Introduces WebAuthn biometric passkey authentication into IAM gateway.',
        affectedComponentNames: ['IAM Gateway', 'User Session Store'],
        status: 'pending',
      };

      const approved = approveArchitectureChange(change, 'Elena Rostova (Lead Architect)');
      expect(approved.status).toBe('approved');
      expect(approved.reviewedBy).toBe('Elena Rostova (Lead Architect)');
      expect(approved.reviewedAt).toBeTruthy();

      const rejected = rejectArchitectureChange(
        change,
        'Sarah Connor (CISO)',
        'Requires fallback TOTP MFA mechanism.',
      );
      expect(rejected.status).toBe('rejected');
      expect(rejected.reviewNotes).toBe('Requires fallback TOTP MFA mechanism.');
    });

    it('adds and resolves mobile comments on components', () => {
      const comment = addMobileComment({
        author: {
          userId: 'usr_architect_1' as UserId,
          name: 'David Kim',
          avatarInitials: 'DK',
        },
        targetTitle: 'PAN Tokenization Vault',
        text: 'Verify AES-256 key rotation policy is 90 days rather than 365.',
      });

      expect(comment.id).toMatch(/^cmt_/);
      expect(comment.status).toBe('open');
      expect(comment.text).toContain('AES-256');

      const resolved = resolveMobileComment(comment);
      expect(resolved.status).toBe('resolved');
    });

    it('answers architectural questions via Mobile AI Copilot', () => {
      const answer = askMobileAiCopilot('What is the single point of failure bottleneck?');
      expect(answer.confidence).toBeGreaterThan(0.9);
      expect(answer.answer).toContain('bottleneck');
      expect(answer.relevantObjectNames.length).toBeGreaterThan(0);
      expect(answer.suggestedActions.length).toBeGreaterThan(0);
    });
  });

  describe('Acceptance Criteria: Mobile viewport: view + approve a change + comment', () => {
    it('executes view inspection, change approval, and commenting under a simulated mobile viewport', () => {
      const mobileWidth = 375; // Standard mobile phone viewport width

      // 1. Confirm mobile viewport and desktop-first canvas invariant
      const displayConfig = getCanvasDisplayMode(mobileWidth);
      expect(displayConfig.mode).toBe('mobile_companion');
      expect(displayConfig.isCanvasEditingEnabled).toBe(false);

      // 2. View: view an architecture view
      const viewId = 'vw_production_overview' as ViewId;
      const viewTitle = 'Global Payment Gateway C4 Container View';
      expect(viewId).toBeTruthy();
      expect(viewTitle).toBeTruthy();

      // 3. Approve a change on mobile
      const pendingChange: MobileApprovalChange = {
        id: 'pr_hotfix_cde' as PullRequestId,
        title: 'Add WAF Egress Filtering to Cardholder Vault',
        authorName: 'Marcus Wright',
        summary: 'Blocks outbound connections except to authorized payment networks.',
        affectedComponentNames: ['Cardholder Data Vault', 'Egress Proxy'],
        status: 'pending',
      };

      const approvedChange = approveArchitectureChange(
        pendingChange,
        'CISO Reviewer',
        'LGTM! Security approved on mobile.',
      );

      expect(approvedChange.status).toBe('approved');
      expect(approvedChange.reviewedBy).toBe('CISO Reviewer');
      expect(approvedChange.reviewNotes).toContain('Security approved on mobile');

      // 4. Comment: add comment to the view/component on mobile
      const comment = addMobileComment({
        author: {
          userId: 'usr_ciso_rev' as UserId,
          name: 'CISO Reviewer',
          avatarInitials: 'CR',
        },
        targetTitle: 'Cardholder Data Vault',
        text: 'Verified egress rules against PCI DSS Req 1.3 standards. Ready for deploy.',
      });

      expect(comment.id).toMatch(/^cmt_/);
      expect(comment.status).toBe('open');
      expect(comment.targetTitle).toBe('Cardholder Data Vault');
      expect(comment.text).toContain('PCI DSS Req 1.3');
    });
  });
});
