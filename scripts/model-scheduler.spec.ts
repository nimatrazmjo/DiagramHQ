import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ModelScheduler } from './model-scheduler.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const scheduler = new ModelScheduler({ repoRoot });

describe('Model Scheduler & Failover Engine', () => {
  it('1. correctly parses ROADMAP.md features and completion state', () => {
    const features = scheduler.parseRoadmap();
    assert.ok(features.length > 50, 'Roadmap should contain features');

    const f001 = features.find((f) => f.id === 'F001');
    assert.strictEqual(f001?.completed, true);

    const f035 = features.find((f) => f.id === 'F035');
    assert.strictEqual(f035?.completed, true);

    const f036 = features.find((f) => f.id === 'F036');
    assert.ok(f036, 'F036 should exist');
    assert.ok(f036?.name.includes('Filters'));
    assert.strictEqual(f036?.completed, false);
  });

  it('2. getPendingFeatures returns pending tasks starting from F036 to end', () => {
    const pending = scheduler.getPendingFeatures('F036', 'end');
    assert.ok(pending.length > 0);
    assert.strictEqual(pending[0].id, 'F036');
    assert.ok(pending.every((p) => !p.completed));
  });

  it('3. detects session limits from error logs and parses cooldown time', () => {
    const now = new Date('2026-09-27T10:00:00Z');

    // Clean output
    const cleanOutput = 'Compilation succeeded in 1.4s. All 254 tests passed.';
    assert.strictEqual(scheduler.detectLimit(cleanOutput, now).isLimited, false);

    // "try again in 15 minutes"
    const limitOutput1 = 'Error: Rate limit exceeded. Please try again in 15 minutes.';
    const det1 = scheduler.detectLimit(limitOutput1, now);
    assert.strictEqual(det1.isLimited, true);
    assert.strictEqual(det1.resetAt?.toISOString(), new Date('2026-09-27T10:15:00Z').toISOString());

    // "resets at 10:45 AM"
    const limitOutput2 = 'Resource has been exhausted (e.g. check quota). Session limit reached. Resets at 10:45 AM';
    const det2 = scheduler.detectLimit(limitOutput2, now);
    assert.strictEqual(det2.isLimited, true);
    assert.ok(det2.resetAt);
    assert.strictEqual(det2.resetAt?.getHours(), 10);
    assert.strictEqual(det2.resetAt?.getMinutes(), 45);

    // Generic quota message falls back to default cooldown
    const limitOutput3 = 'Google API error: 429 Resource has been exhausted.';
    const det3 = scheduler.detectLimit(limitOutput3, now);
    assert.strictEqual(det3.isLimited, true);
    assert.strictEqual(det3.resetAt?.getTime(), now.getTime() + 15 * 60 * 1000);
  });

  it('4. calculates which model resets sooner when both are limited', () => {
    const now = new Date('2026-09-27T12:00:00Z');

    // Case A: Primary resets earlier
    const primaryStateA = {
      name: 'gemini-3.1-pro-high',
      isLimited: true,
      resetAt: new Date('2026-09-27T12:10:00Z'), // in 10 mins
    };
    const sonnetStateA = {
      name: 'claude-sonnet-4-6',
      isLimited: true,
      resetAt: new Date('2026-09-27T12:25:00Z'), // in 25 mins
    };

    const soonerA = scheduler.calculateSoonerReset(primaryStateA, sonnetStateA, now);
    assert.strictEqual(soonerA.soonerModel, 'primary');
    assert.strictEqual(soonerA.waitMs, 10 * 60 * 1000);
    assert.deepStrictEqual(soonerA.resumeAt, primaryStateA.resetAt);

    // Case B: Sonnet resets earlier
    const primaryStateB = {
      name: 'gemini-3.1-pro-high',
      isLimited: true,
      resetAt: new Date('2026-09-27T12:45:00Z'), // in 45 mins
    };
    const sonnetStateB = {
      name: 'claude-sonnet-4-6',
      isLimited: true,
      resetAt: new Date('2026-09-27T12:05:00Z'), // in 5 mins
    };

    const soonerB = scheduler.calculateSoonerReset(primaryStateB, sonnetStateB, now);
    assert.strictEqual(soonerB.soonerModel, 'sonnet');
    assert.strictEqual(soonerB.waitMs, 5 * 60 * 1000);
    assert.deepStrictEqual(soonerB.resumeAt, sonnetStateB.resetAt);
  });

  it('5. creates single-feature prompt complying with harness protocol', () => {
    const prompt = scheduler.createFeaturePrompt({
      id: 'F036',
      name: 'Filters',
      completed: false,
    });

    assert.ok(prompt.includes('F036 — Filters'));
    assert.ok(prompt.includes('PROJECT_STATE.md'));
    assert.ok(prompt.includes('CURRENT_TASK.md'));
    assert.ok(prompt.includes('pnpm verify'));
    assert.ok(prompt.includes('main'));
  });
});
