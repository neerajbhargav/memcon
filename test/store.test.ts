import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { saveFact, getFactByKey, getAllFacts, searchFacts, deleteFact } from '../src/store/facts.js';
import { createHandoff, claimHandoff, getPendingHandoffs } from '../src/store/handoffs.js';
import { closeDatabase, getDatabase } from '../src/store/database.js';

const TEST_DB = path.join(os.tmpdir(), `memcon-test-${Date.now()}.db`);

describe('Memcon Fact & Handoff Store', () => {
  beforeEach(() => {
    closeDatabase();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    getDatabase(TEST_DB);
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it('should save and retrieve a fact', () => {
    const fact = saveFact({
      key: 'test.rule.1',
      content: 'Never strip zoning letter suffixes',
      category: 'rule',
      source: 'test-agent',
      tags: ['zoning', 'rule'],
    });

    expect(fact.key).toBe('test.rule.1');
    expect(fact.version).toBe(1);

    const retrieved = getFactByKey('test.rule.1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.content).toBe('Never strip zoning letter suffixes');
  });

  it('should increment version on update', () => {
    saveFact({
      key: 'test.state',
      content: 'Initial state',
      category: 'session-state',
      source: 'claude-code',
    });

    const updated = saveFact({
      key: 'test.state',
      content: 'Updated state',
      category: 'session-state',
      source: 'hermes',
    });

    expect(updated.version).toBe(2);
    expect(updated.content).toBe('Updated state');
  });

  it('should create and claim handoff packages', () => {
    const handoff = createHandoff({
      fromAgent: 'claude-code',
      toAgent: 'cursor',
      summary: 'Skiptracer phone investigation',
      context: 'Found IDI rate limit issues',
    });

    expect(handoff.id).toMatch(/^hf-/);
    expect(handoff.status).toBe('pending');

    const pending = getPendingHandoffs('cursor');
    expect(pending.length).toBe(1);

    const claimed = claimHandoff(handoff.id, 'cursor');
    expect(claimed?.status).toBe('claimed');
    expect(claimed?.claimedBy).toBe('cursor');

    const remainingPending = getPendingHandoffs();
    expect(remainingPending.length).toBe(0);
  });
});
