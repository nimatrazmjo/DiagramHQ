import { describe, expect, it } from 'vitest';
import { createId } from './ids';
import {
  appendAuditEntry,
  createAuditLog,
  exportAuditLogToCsv,
  exportAuditLogToJson,
  GENESIS_PREVIOUS_HASH,
  queryAuditLogs,
  simulateAuditLogLifecycle,
  verifyAuditLogIntegrity,
  type AuditEntry,
  type ImmutableAuditLog,
} from './audit-log';

describe('Enterprise Immutable Audit Logs (F105)', () => {
  const orgId = createId('org');

  it('initializes an empty audit log with genesis hash', () => {
    const log = createAuditLog(orgId);
    expect(log.orgId).toBe(orgId);
    expect(log.entries.length).toBe(0);
    expect(log.genesisHash).toBe(GENESIS_PREVIOUS_HASH);
    expect(log.latestHash).toBe(GENESIS_PREVIOUS_HASH);

    const integrity = verifyAuditLogIntegrity(log);
    expect(integrity.valid).toBe(true);
    expect(integrity.verifiedCount).toBe(0);
  });

  describe('Append-Only Semantic & Record Chaining', () => {
    it('appends records with monotonic sequence indices and cryptographic hashes', () => {
      let log = createAuditLog(orgId);

      log = appendAuditEntry(log, {
        actor: {
          type: 'human_user',
          id: 'usr_john',
          name: 'John Connor',
          email: 'john@resistance.io',
          role: 'admin',
        },
        category: 'auth',
        action: 'user.login.sso',
        status: 'SUCCESS',
        resource: { type: 'user', id: 'usr_john' },
      });

      expect(log.entries.length).toBe(1);
      const firstEntry = log.entries[0]!;
      expect(firstEntry.sequenceIndex).toBe(1);
      expect(firstEntry.previousHash).toBe(GENESIS_PREVIOUS_HASH);
      expect(firstEntry.entryHash.startsWith('hash_')).toBe(true);
      expect(log.latestHash).toBe(firstEntry.entryHash);

      // Append second entry
      log = appendAuditEntry(log, {
        actor: {
          type: 'human_user',
          id: 'usr_john',
          name: 'John Connor',
        },
        category: 'model',
        action: 'model.object.created',
        status: 'SUCCESS',
        resource: { type: 'object', id: 'sys_payment', name: 'Payment Gateway' },
        details: { kind: 'system', technology: 'Node.js' },
      });

      expect(log.entries.length).toBe(2);
      const secondEntry = log.entries[1]!;
      expect(secondEntry.sequenceIndex).toBe(2);
      expect(secondEntry.previousHash).toBe(firstEntry.entryHash);
      expect(log.latestHash).toBe(secondEntry.entryHash);

      const integrity = verifyAuditLogIntegrity(log);
      expect(integrity.valid).toBe(true);
      expect(integrity.verifiedCount).toBe(2);
    });

    it('rejects appending records with backdated timestamps', () => {
      let log = createAuditLog(orgId);
      const t1 = new Date(2026, 0, 1, 12, 0, 0);
      const t0 = new Date(2026, 0, 1, 11, 0, 0); // Backdated by 1 hour

      log = appendAuditEntry(log, {
        actor: { type: 'human_user', id: 'usr_1', name: 'User 1' },
        category: 'auth',
        action: 'user.login',
        status: 'SUCCESS',
        resource: { type: 'user', id: 'usr_1' },
        timestamp: t1,
      });

      expect(() => {
        appendAuditEntry(log, {
          actor: { type: 'human_user', id: 'usr_1', name: 'User 1' },
          category: 'auth',
          action: 'user.logout',
          status: 'SUCCESS',
          resource: { type: 'user', id: 'usr_1' },
          timestamp: t0,
        });
      }).toThrow(/Cannot append audit entry with timestamp earlier than previous entry/);
    });
  });

  describe('AI-Agent Action Auditing', () => {
    it('audits AI-agent actions with model, prompt summary, and confidence score', () => {
      let log = createAuditLog(orgId);

      log = appendAuditEntry(log, {
        actor: {
          type: 'ai_agent',
          id: 'agent_c4_gen',
          name: 'C4 Architecture Synthesizer (AI Agent)',
          aiAgentMetadata: {
            agentType: 'architect',
            model: 'gemini-1.5-pro',
            promptSummary: 'Generate container diagram for Kafka streaming ingestion',
            confidenceScore: 0.96,
            autonomousExecution: false,
            toolCallsExecuted: ['createModelObject', 'createModelConnection'],
          },
        },
        category: 'ai_agent',
        action: 'ai_agent.diagram_generation.completed',
        status: 'SUCCESS',
        resource: { type: 'diagram', id: 'diag_kafka_c4', name: 'Kafka Ingestion' },
        details: { containersCreated: 4, connectionsCreated: 6 },
      });

      const entry = log.entries[0]!;
      expect(entry.actor.type).toBe('ai_agent');
      expect(entry.actor.aiAgentMetadata?.model).toBe('gemini-1.5-pro');
      expect(entry.actor.aiAgentMetadata?.confidenceScore).toBe(0.96);
      expect(entry.actor.aiAgentMetadata?.toolCallsExecuted).toContain('createModelObject');

      // Query specifically for AI agent actions
      const query = queryAuditLogs(log, { actorType: 'ai_agent' });
      expect(query.total).toBe(1);
      expect(query.entries[0]?.actor.id).toBe('agent_c4_gen');
    });
  });

  describe('Tamper-Evidence & Cryptographic Integrity', () => {
    it('detects when an entry payload is tampered with', () => {
      let log = createAuditLog(orgId);
      log = appendAuditEntry(log, {
        actor: { type: 'human_user', id: 'usr_admin', name: 'Admin' },
        category: 'rbac',
        action: 'role.permission.modified',
        status: 'SUCCESS',
        resource: { type: 'role', id: 'role_auditor' },
        details: { change: 'granted compliance:read' },
      });

      // Valid initially
      expect(verifyAuditLogIntegrity(log).valid).toBe(true);

      // Malicious attacker attempts to mutate the details in place
      const tamperedEntry: AuditEntry = {
        ...log.entries[0]!,
        details: { change: 'granted workspace:delete' }, // Modified payload!
      };

      const tamperedLog: ImmutableAuditLog = {
        ...log,
        entries: [tamperedEntry],
      };

      const integrity = verifyAuditLogIntegrity(tamperedLog);
      expect(integrity.valid).toBe(false);
      expect(integrity.tamperedIndex).toBe(1);
      expect(integrity.violations[0]).toContain('Hash integrity check failed');
    });

    it('detects when an entry hash chain is severed', () => {
      let log = createAuditLog(orgId);
      log = appendAuditEntry(log, {
        actor: { type: 'human_user', id: 'usr_1', name: 'U1' },
        category: 'auth',
        action: 'user.login',
        status: 'SUCCESS',
        resource: { type: 'user', id: 'usr_1' },
      });
      log = appendAuditEntry(log, {
        actor: { type: 'human_user', id: 'usr_1', name: 'U1' },
        category: 'canvas',
        action: 'diagram.opened',
        status: 'SUCCESS',
        resource: { type: 'diagram', id: 'diag_1' },
      });

      // Attacker attempts to forge previousHash on entry 2
      const tamperedEntries = [
        log.entries[0]!,
        { ...log.entries[1]!, previousHash: 'forged_fake_hash' } as AuditEntry,
      ];

      const tamperedLog: ImmutableAuditLog = {
        ...log,
        entries: tamperedEntries,
      };

      const integrity = verifyAuditLogIntegrity(tamperedLog);
      expect(integrity.valid).toBe(false);
      expect(integrity.tamperedIndex).toBe(2);
      expect(integrity.violations[0]).toContain('Broken hash chain');
    });
  });

  describe('Querying and Exporting', () => {
    it('filters entries by status, action, and category with pagination', () => {
      let log = createAuditLog(orgId);
      log = appendAuditEntry(log, {
        actor: { type: 'human_user', id: 'usr_1', name: 'Alice' },
        category: 'auth',
        action: 'user.login',
        status: 'SUCCESS',
        resource: { type: 'user', id: 'usr_1' },
      });
      log = appendAuditEntry(log, {
        actor: { type: 'human_user', id: 'usr_2', name: 'Bob' },
        category: 'rbac',
        action: 'role.permission.denied',
        status: 'DENIED',
        resource: { type: 'role', id: 'role_viewer' },
      });
      log = appendAuditEntry(log, {
        actor: { type: 'ai_agent', id: 'agent_1', name: 'Agent' },
        category: 'ai_agent',
        action: 'ai_agent.security_audit',
        status: 'SUCCESS',
        resource: { type: 'diagram', id: 'diag_1' },
      });

      // Filter by status: DENIED
      const deniedQuery = queryAuditLogs(log, { status: 'DENIED' });
      expect(deniedQuery.total).toBe(1);
      expect(deniedQuery.entries[0]?.action).toBe('role.permission.denied');

      // Filter by category: ai_agent
      const aiQuery = queryAuditLogs(log, { category: 'ai_agent' });
      expect(aiQuery.total).toBe(1);

      // Pagination
      const page = queryAuditLogs(log, { offset: 1, limit: 1 });
      expect(page.total).toBe(3);
      expect(page.entries.length).toBe(1);
      expect(page.entries[0]?.sequenceIndex).toBe(2);
    });

    it('exports audit log to JSON and CSV formats', () => {
      let log = createAuditLog(orgId);
      log = appendAuditEntry(log, {
        actor: { type: 'human_user', id: 'usr_1', name: 'Alice' },
        category: 'auth',
        action: 'user.login',
        status: 'SUCCESS',
        resource: { type: 'user', id: 'usr_1' },
      });

      const jsonStr = exportAuditLogToJson(log);
      const parsedJson = JSON.parse(jsonStr);
      expect(parsedJson.orgId).toBe(orgId);
      expect(parsedJson.entryCount).toBe(1);
      expect(parsedJson.entries[0].action).toBe('user.login');

      const csvStr = exportAuditLogToCsv(log);
      expect(csvStr).toContain('Sequence,Timestamp,ActorType,ActorId');
      expect(csvStr).toContain('user.login');
      expect(csvStr).toContain('SUCCESS');
    });
  });

  describe('Acceptance Criteria: simulateAuditLogLifecycle', () => {
    it('executes end-to-end lifecycle recording human and AI actions in an append-only log', () => {
      const result = simulateAuditLogLifecycle(orgId);

      expect(result.initialCount).toBe(3);
      expect(result.initialIntegrityValid).toBe(true);
      expect(result.isAppendOnly).toBe(true);
      expect(result.aiAgentActionsCount).toBe(1);
      expect(result.aiAgentEntry?.actor.name).toContain('AI Agent');
      expect(result.aiAgentEntry?.actor.aiAgentMetadata?.model).toBe('gemini-1.5-pro');
      expect(result.aiAgentEntry?.actor.aiAgentMetadata?.confidenceScore).toBe(0.94);
    });
  });
});
