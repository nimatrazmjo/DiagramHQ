import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createId,
  exportAuditLogToCsv,
  exportAuditLogToJson,
  simulateAuditLogLifecycle,
  verifyAuditLogIntegrity,
} from '@diagramhq/domain';
import { AuditLogsModal } from './components/enterprise/audit-logs-modal';

describe('Enterprise Immutable Audit Logs Integration & UI (F105)', () => {
  const orgId = createId('org');

  describe('AuditLogsModal Rendering', () => {
    it('renders audit logs modal with header, tabs, and KPI summary counters', () => {
      const html = renderToString(
        <AuditLogsModal isOpen={true} onClose={() => {}} orgName="Cyberdyne Systems" />
      );

      expect(html).toContain('Enterprise Immutable Audit Logs');
      expect(html).toContain('F105');
      expect(html).toContain('Append-Only &amp; Sealed');
      expect(html).toContain('Total Entries');
      expect(html).toContain('AI-Agent Actions');
      expect(html).toContain('Merkle Integrity');
      expect(html).toContain('All Audit Records');
      expect(html).toContain('AI-Agent Actions');
      expect(html).toContain('Cryptographic Integrity');
      expect(html).toContain('SIEM Export');
    });

    it('renders null when closed', () => {
      const html = renderToString(
        <AuditLogsModal isOpen={false} onClose={() => {}} />
      );
      expect(html).toBe('');
    });
  });

  describe('Acceptance Criteria: Actions Recorded & Append-Only Log', () => {
    it('records who/what/when including AI-agent actions and proves append-only immutability', () => {
      const sim = simulateAuditLogLifecycle(orgId);

      // 1. Actions recorded with who/what/when
      expect(sim.initialCount).toBe(3);
      expect(sim.isAppendOnly).toBe(true);

      // 2. AI-Agent actions audited with full provenance
      expect(sim.aiAgentActionsCount).toBe(1);
      expect(sim.aiAgentEntry?.actor.type).toBe('ai_agent');
      expect(sim.aiAgentEntry?.actor.aiAgentMetadata?.model).toBe('gemini-1.5-pro');
      expect(sim.aiAgentEntry?.actor.aiAgentMetadata?.confidenceScore).toBe(0.94);

      // 3. Cryptographic hash chain verification
      const integrity = verifyAuditLogIntegrity(sim.log);
      expect(integrity.valid).toBe(true);
      expect(integrity.verifiedCount).toBe(3);
      expect(integrity.violations.length).toBe(0);

      // 4. SIEM data exportability
      const json = exportAuditLogToJson(sim.log);
      expect(json).toContain('"orgId"');
      expect(json).toContain('"ai_agent.security_review.executed"');

      const csv = exportAuditLogToCsv(sim.log);
      expect(csv).toContain('Sequence,Timestamp,ActorType');
      expect(csv).toContain('ai_agent');
    });
  });
});
