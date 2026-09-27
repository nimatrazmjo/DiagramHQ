#!/usr/bin/env node
/**
 * Autonomous Model Scheduler & Failover Runner (DiagramHQ)
 * 
 * - Manages task execution one feature at a time from F036 to end.
 * - Detects session/rate limits on the active model.
 * - Fails over between Primary Model (Gemini/Antigravity) and Claude Sonnet.
 * - If both are limited, calculates which model resets sooner, waits until that exact time,
 *   and automatically resumes.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ModelLimitState {
  name: string;
  isLimited: boolean;
  limitedAt?: Date;
  resetAt?: Date;
  lastMessage?: string;
}

export interface RoadmapFeature {
  id: string;
  name: string;
  completed: boolean;
}

export interface LimitDetectionResult {
  isLimited: boolean;
  resetAt?: Date;
  reason?: string;
}

export interface SoonerCalculationResult {
  soonerModel: 'primary' | 'sonnet';
  waitMs: number;
  resumeAt: Date;
  reason: string;
}

export class ModelScheduler {
  public repoRoot: string;
  public primaryModel: string;
  public sonnetModel: string;
  public primaryRunner: string;
  public sonnetRunner: string;
  public currentModelType: 'primary' | 'sonnet' = 'primary';
  public primaryState: ModelLimitState;
  public sonnetState: ModelLimitState;
  public defaultCooldownMs: number;

  constructor(options: {
    repoRoot?: string;
    primaryModel?: string;
    sonnetModel?: string;
    primaryRunner?: string;
    sonnetRunner?: string;
    defaultCooldownMs?: number;
  } = {}) {
    this.repoRoot = options.repoRoot || process.cwd();
    this.primaryModel = options.primaryModel || process.env.PRIMARY_MODEL || 'gemini-3.1-pro-high';
    this.sonnetModel = options.sonnetModel || process.env.SONNET_MODEL || 'claude-sonnet-4-6';
    this.primaryRunner = options.primaryRunner || process.env.PRIMARY_RUNNER || 'agy';
    this.sonnetRunner = options.sonnetRunner || process.env.SONNET_RUNNER || 'agy';
    this.defaultCooldownMs = options.defaultCooldownMs || 15 * 60 * 1000; // 15 mins default

    this.primaryState = {
      name: this.primaryModel,
      isLimited: false,
    };
    this.sonnetState = {
      name: this.sonnetModel,
      isLimited: false,
    };
  }

  /**
   * Parses ROADMAP.md to extract all features and completion status.
   */
  public parseRoadmap(roadmapPath?: string): RoadmapFeature[] {
    const file = roadmapPath || path.join(this.repoRoot, '.harness', 'ROADMAP.md');
    if (!fs.existsSync(file)) {
      throw new Error(`ROADMAP.md not found at ${file}`);
    }

    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const features: RoadmapFeature[] = [];

    const featureRegex = /^-\s+\[([ x~])\]\s+(F[0-9]+(?:-[A-Z0-9]+)?)\s+[—–-]\s+(.*)$/;

    for (const line of lines) {
      const match = line.trim().match(featureRegex);
      if (match && match[1] && match[2] && match[3]) {
        features.push({
          id: match[2].trim(),
          name: match[3].trim(),
          completed: match[1].toLowerCase() === 'x',
        });
      }
    }

    return features;
  }

  /**
   * Retrieves pending features starting from a specific feature ID up to an optional end ID.
   */
  public getPendingFeatures(startId: string = 'F036', endId: string = 'end'): RoadmapFeature[] {
    const all = this.parseRoadmap();
    const startIndex = all.findIndex((f) => f.id === startId);
    if (startIndex === -1) {
      // If startId not found, return all uncompleted features
      return all.filter((f) => !f.completed);
    }

    let slice = all.slice(startIndex);
    if (endId && endId !== 'end') {
      const endIndex = slice.findIndex((f) => f.id === endId);
      if (endIndex !== -1) {
        slice = slice.slice(0, endIndex + 1);
      }
    }

    return slice.filter((f) => !f.completed);
  }

  /**
   * Detects whether an output log indicates rate/session limits and extracts reset time.
   */
  public detectLimit(output: string, now: Date = new Date()): LimitDetectionResult {
    const lower = output.toLowerCase();

    const limitKeywords = [
      'rate limit',
      'rate_limit',
      'usage limit',
      'session limit',
      'quota exceeded',
      'resource has been exhausted',
      'exhausted your quota',
      'try again later',
      'too many requests',
      '429',
    ];

    const hasLimitKeyword = limitKeywords.some((kw) => lower.includes(kw));
    if (!hasLimitKeyword) {
      return { isLimited: false };
    }

    // Attempt to extract reset time
    let resetAt: Date | undefined;

    // Pattern 1: "try again in X (minutes|hours|seconds)"
    const waitMatch = lower.match(/try again in\s+(\d+(?:\.\d+)?)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?)/);
    if (waitMatch && waitMatch[1] && waitMatch[2]) {
      const amount = parseFloat(waitMatch[1]);
      const unit = waitMatch[2];
      let addMs = amount * 60 * 1000;
      if (unit.startsWith('s')) addMs = amount * 1000;
      if (unit.startsWith('h')) addMs = amount * 3600 * 1000;
      resetAt = new Date(now.getTime() + addMs);
    }

    // Pattern 2: "resets (at|in) HH:MM(:SS) (am|pm)?"
    const resetTimeMatch = output.match(/resets?\s+(?:at\s+)?(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?)/i);
    if (!resetAt && resetTimeMatch && resetTimeMatch[1]) {
      const timeStr = resetTimeMatch[1].trim();
      const parsedTime = this.parseTimeStringToday(timeStr, now);
      if (parsedTime) {
        resetAt = parsedTime;
      }
    }

    // Pattern 3: ISO timestamp or standard date
    const isoMatch = output.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)/);
    if (!resetAt && isoMatch && isoMatch[1]) {
      const d = new Date(isoMatch[1]);
      if (!isNaN(d.getTime())) {
        resetAt = d;
      }
    }

    // Fallback: Default cooldown
    if (!resetAt) {
      resetAt = new Date(now.getTime() + this.defaultCooldownMs);
    }

    return {
      isLimited: true,
      resetAt,
      reason: output.slice(0, 300).trim(),
    };
  }

  /**
   * Helper to parse a time string like "3:45 PM" or "15:30:00" against reference date.
   */
  public parseTimeStringToday(timeStr: string, refDate: Date = new Date()): Date | null {
    try {
      const clean = timeStr.toLowerCase().trim();
      const isPm = clean.includes('pm');
      const isAm = clean.includes('am');
      const timeParts = clean.replace(/[ap]m/g, '').trim().split(':');

      if (timeParts.length < 2) return null;

      let hours = parseInt(timeParts[0] || '0', 10);
      const minutes = parseInt(timeParts[1] || '0', 10);
      const seconds = timeParts[2] ? parseInt(timeParts[2], 10) : 0;

      if (isPm && hours < 12) hours += 12;
      if (isAm && hours === 12) hours = 0;

      const target = new Date(refDate);
      target.setHours(hours, minutes, seconds, 0);

      // If the target time already passed today, assume it refers to tomorrow
      if (target.getTime() <= refDate.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      return target;
    } catch {
      return null;
    }
  }

  /**
   * Calculates which model resets sooner when both are limited.
   */
  public calculateSoonerReset(
    primaryState: ModelLimitState = this.primaryState,
    sonnetState: ModelLimitState = this.sonnetState,
    now: Date = new Date(),
  ): SoonerCalculationResult {
    const primaryReset = primaryState.resetAt || new Date(now.getTime() + this.defaultCooldownMs);
    const sonnetReset = sonnetState.resetAt || new Date(now.getTime() + this.defaultCooldownMs);

    const primaryDiff = Math.max(0, primaryReset.getTime() - now.getTime());
    const sonnetDiff = Math.max(0, sonnetReset.getTime() - now.getTime());

    if (primaryDiff <= sonnetDiff) {
      return {
        soonerModel: 'primary',
        waitMs: primaryDiff,
        resumeAt: primaryReset,
        reason: `Primary model (${primaryState.name}) resets at ${primaryReset.toISOString()} (in ${Math.round(primaryDiff / 1000)}s), earlier than Sonnet (${sonnetReset.toISOString()})`,
      };
    } else {
      return {
        soonerModel: 'sonnet',
        waitMs: sonnetDiff,
        resumeAt: sonnetReset,
        reason: `Claude Sonnet (${sonnetState.name}) resets at ${sonnetReset.toISOString()} (in ${Math.round(sonnetDiff / 1000)}s), earlier than Primary (${primaryReset.toISOString()})`,
      };
    }
  }

  /**
   * Logs a scheduler event to console and `.harness/RUNTIME-SWITCHES.md`.
   */
  public log(message: string): void {
    const timestamp = new Date().toISOString();
    const entry = `- ${timestamp} — [Scheduler] ${message}\n`;
    console.log(`\x1b[36m[${timestamp}]\x1b[0m ${message}`);

    const ledgerPath = path.join(this.repoRoot, '.harness', 'RUNTIME-SWITCHES.md');
    try {
      if (fs.existsSync(ledgerPath)) {
        fs.appendFileSync(ledgerPath, entry);
      }
    } catch (err) {
      console.error('Failed to append to RUNTIME-SWITCHES.md:', err);
    }
  }

  /**
   * Formulates the instruction prompt for a given feature.
   */
  public createFeaturePrompt(feature: RoadmapFeature): string {
    return [
      `Resume DiagramHQ for feature ${feature.id} — ${feature.name}.`,
      `Read .harness/PROJECT_STATE.md, then CURRENT_TASK.md, then follow .harness/AGENTS.md.`,
      `Implement and verify ${feature.id}, run 'pnpm verify' and 'pnpm build', complete PR review (.harness/reviews/${feature.id}-PR.md and review.md), squash merge into main, update all tracking documents, and set CURRENT_TASK.md to the next feature.`,
      `Do NOT stop until ${feature.id} is verified and merged to main.`,
    ].join(' ');
  }

  /**
   * Executes a command with child process, capturing output while streaming.
   */
  public async executeSession(
    command: string,
    args: string[],
  ): Promise<{ exitCode: number; output: string }> {
    return new Promise((resolve) => {
      this.log(`Spawning: ${command} ${args.join(' ')}`);

      let fullOutput = '';
      const child: ChildProcess = spawn(command, args, {
        cwd: this.repoRoot,
        env: process.env,
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      child.stdout?.on('data', (data) => {
        const text = data.toString();
        process.stdout.write(text);
        fullOutput += text;
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        process.stderr.write(text);
        fullOutput += text;
      });

      child.on('close', (code) => {
        resolve({
          exitCode: code ?? 0,
          output: fullOutput,
        });
      });

      child.on('error', (err) => {
        const errMsg = `Process error: ${err.message}\n`;
        process.stderr.write(errMsg);
        fullOutput += errMsg;
        resolve({
          exitCode: 1,
          output: fullOutput,
        });
      });
    });
  }

  /**
   * Main scheduler execution loop.
   */
  public async run(options: { startId?: string; endId?: string; dryRun?: boolean } = {}): Promise<void> {
    const startId = options.startId || 'F036';
    const endId = options.endId || 'end';

    this.log(`Initializing scheduler. Primary model: ${this.primaryModel}, Sonnet: ${this.sonnetModel}`);
    this.log(`Target range: ${startId} -> ${endId}`);

    let isRunning = true;
    while (isRunning) {
      const pending = this.getPendingFeatures(startId, endId);
      if (pending.length === 0) {
        this.log(`All features up to ${endId} are complete! Scheduler finished successfully.`);
        isRunning = false;
        break;
      }

      const activeFeature = pending[0];
      if (!activeFeature) break;

      this.log(`Starting implementation of feature: ${activeFeature.id} — ${activeFeature.name}`);
      this.log(`Remaining features in queue: ${pending.length} (${pending.map((p) => p.id).join(', ')})`);

      if (options.dryRun) {
        this.log(`[DRY RUN] Would execute ${activeFeature.id} using ${this.currentModelType} model.`);
        break;
      }

      // Check current model availability
      const now = new Date();
      if (this.currentModelType === 'primary' && this.primaryState.isLimited) {
        if (this.primaryState.resetAt && this.primaryState.resetAt.getTime() <= now.getTime()) {
          this.log(`Primary model cooldown expired. Resetting limit state.`);
          this.primaryState.isLimited = false;
        } else {
          this.log(`Primary model currently in limit cooldown. Switching to Claude Sonnet.`);
          this.currentModelType = 'sonnet';
        }
      }

      if (this.currentModelType === 'sonnet' && this.sonnetState.isLimited) {
        if (this.sonnetState.resetAt && this.sonnetState.resetAt.getTime() <= now.getTime()) {
          this.log(`Claude Sonnet cooldown expired. Resetting limit state.`);
          this.sonnetState.isLimited = false;
        } else {
          this.log(`Claude Sonnet currently in limit cooldown. Checking Primary model.`);
          this.currentModelType = 'primary';
        }
      }

      // If BOTH are currently limited:
      if (this.primaryState.isLimited && this.sonnetState.isLimited) {
        const sooner = this.calculateSoonerReset(this.primaryState, this.sonnetState, new Date());
        this.log(`Both models have reached session limits!`);
        this.log(sooner.reason);
        this.log(`Waiting ${Math.ceil(sooner.waitMs / 1000)} seconds until ${sooner.resumeAt.toLocaleTimeString()}...`);

        await new Promise((resolve) => setTimeout(resolve, sooner.waitMs + 2000)); // sleep + 2s buffer
        this.log(`Cooldown finished. Resuming with ${sooner.soonerModel} model.`);
        this.currentModelType = sooner.soonerModel;
        if (this.currentModelType === 'primary') this.primaryState.isLimited = false;
        if (this.currentModelType === 'sonnet') this.sonnetState.isLimited = false;
      }

      // Construct runner command
      const prompt = this.createFeaturePrompt(activeFeature);
      let cmd = 'agy';
      let args: string[] = [];

      if (this.currentModelType === 'primary') {
        cmd = this.primaryRunner;
        args = ['--model', this.primaryModel, '--dangerously-skip-permissions', prompt];
      } else {
        cmd = this.sonnetRunner;
        if (cmd === 'claude') {
          args = ['--dangerously-skip-permissions', '-p', prompt];
        } else {
          args = ['--model', this.sonnetModel, '--dangerously-skip-permissions', prompt];
        }
      }

      // Execute turn
      const result = await this.executeSession(cmd, args);

      // Check for limit in output
      const limitInfo = this.detectLimit(result.output);
      if (limitInfo.isLimited) {
        this.log(`Session limit detected on ${this.currentModelType} model!`);
        if (this.currentModelType === 'primary') {
          this.primaryState.isLimited = true;
          this.primaryState.resetAt = limitInfo.resetAt;
          this.currentModelType = 'sonnet';
          this.log(`Switched to Claude Sonnet (${this.sonnetModel}).`);
        } else {
          this.sonnetState.isLimited = true;
          this.sonnetState.resetAt = limitInfo.resetAt;
          this.currentModelType = 'primary';
          this.log(`Switched to Primary model (${this.primaryModel}).`);
        }
        continue;
      }

      // If finished cleanly, verify if feature completed
      const updatedRoadmap = this.parseRoadmap();
      const updatedFeature = updatedRoadmap.find((f) => f.id === activeFeature.id);
      if (updatedFeature?.completed) {
        this.log(`Feature ${activeFeature.id} successfully completed and verified!`);
      } else {
        this.log(`Feature ${activeFeature.id} session ended. Checking next step...`);
      }
    }
  }
}

// CLI entrypoint execution when called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const startId = args.find((a) => a.startsWith('--start='))?.split('=')[1] || 'F036';
  const endId = args.find((a) => a.startsWith('--end='))?.split('=')[1] || 'end';
  const dryRun = args.includes('--dry-run');

  const scheduler = new ModelScheduler();
  scheduler.run({ startId, endId, dryRun }).catch((err) => {
    console.error('Fatal scheduler error:', err);
    process.exit(1);
  });
}
