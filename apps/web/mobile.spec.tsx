import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  addMobileComment,
  approveArchitectureChange,
  getCanvasDisplayMode,
  type MobileApprovalChange,
  type PullRequestId,
  type UserId,
} from '@diagramhq/domain';
import { MobileCompanion } from './components/enterprise/mobile-companion';

describe('Mobile Companion & Desktop-First Responsive Governance (F134)', () => {
  describe('MobileCompanion Component Rendering', () => {
    it('renders mobile companion with header, navigation bar, views, and desktop-first invariant', () => {
      const html = renderToString(<MobileCompanion isOpen={true} viewportWidth={375} />);

      expect(html).toContain('DiagramHQ Mobile');
      expect(html).toContain('F134');
      expect(html).toContain('Mobile Companion View');
      expect(html).toContain('Desktop-First Canvas');
      expect(html).toContain('Canvas layout and node editing is desktop-first');
      expect(html).toContain('Architecture Views');
      expect(html).toContain('Cardholder Data Environment (CDE)');
      expect(html).toContain('Views');
      expect(html).toContain('Search');
      expect(html).toContain('Approvals');
      expect(html).toContain('Comments');
      expect(html).toContain('AI');
    });

    it('returns empty string when closed', () => {
      const html = renderToString(<MobileCompanion isOpen={false} />);
      expect(html).toBe('');
    });
  });

  describe('Acceptance Criteria: Mobile viewport: view + approve a change + comment', () => {
    it('executes view inspection, change approval, and comment addition under mobile viewport constraints', () => {
      const mobileWidth = 375;

      // 1. Invariant: Canvas is desktop-first on mobile
      const displayConfig = getCanvasDisplayMode(mobileWidth);
      expect(displayConfig.mode).toBe('mobile_companion');
      expect(displayConfig.isCanvasEditingEnabled).toBe(false);

      // 2. View: Render views on mobile
      const htmlViews = renderToString(
        <MobileCompanion isOpen={true} viewportWidth={mobileWidth} />
      );
      expect(htmlViews).toContain('System Context &amp; External Actors');
      expect(htmlViews).toContain('Cardholder Data Environment (CDE)');
      expect(htmlViews).toContain('12 Objects');

      // 3. Approve a change on mobile
      const initialChange: MobileApprovalChange = {
        id: 'pr_cde_waf' as PullRequestId,
        title: 'Isolate Cardholder Vault with Egress Firewall',
        authorName: 'Alex Mercer',
        summary: 'Enforces PCI DSS v4.0 Req 1.3 by restricting all outbound vault connections.',
        affectedComponentNames: ['Cardholder Data Vault', 'Egress Firewall Proxy'],
        status: 'pending',
      };

      const approvedChange = approveArchitectureChange(
        initialChange,
        'Sarah Connor (CISO)',
        'Approved via mobile inspection.',
      );
      expect(approvedChange.status).toBe('approved');
      expect(approvedChange.reviewedBy).toBe('Sarah Connor (CISO)');

      // 4. Add comment on mobile
      const newComment = addMobileComment({
        author: {
          userId: 'usr_ciso_1' as UserId,
          name: 'Sarah Connor',
          avatarInitials: 'SC',
        },
        targetTitle: 'Cardholder Data Vault',
        text: 'Egress firewall rules successfully verified against network diagram.',
      });

      // Render modal with approved change and new comment
      const htmlUpdated = renderToString(
        <MobileCompanion
          isOpen={true}
          viewportWidth={mobileWidth}
          initialChanges={[approvedChange]}
          initialComments={[newComment]}
        />
      );

      // Assert mobile view renders desktop-first advisory
      expect(htmlUpdated).toContain('Desktop-First Canvas');
      expect(htmlUpdated).toContain('Canvas layout and node editing is desktop-first');
    });
  });
});
