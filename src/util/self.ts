import path from 'path';
import os from 'os';
import { getMemconDir } from '../config/index.js';

/**
 * Self-emission guards.
 *
 * Three of memcon's four emitters write into paths that a parser also reads
 * (AGENTS.md, .cursor/rules, ~/.hermes/memories). Without a guard the output of
 * one sync becomes the input of the next: the emitted block is ingested as a
 * fact, then re-emitted inside the next block, so the file doubles every pass.
 * Everything here exists to keep memcon's own output out of the store.
 */

export const MEMCON_BLOCK_START = '<!-- memcon:session-state:start -->';
export const MEMCON_BLOCK_END = '<!-- memcon:session-state:end -->';

/** Greedy on purpose: collapses legacy files where the block nested inside itself. */
export const MEMCON_BLOCK_RE = /<!-- memcon:session-state:start -->[\s\S]*<!-- memcon:session-state:end -->/;

/** First-line banners written by the emitters. */
const MEMCON_HEADERS = [
  '# MEMCON UNIFIED CONTEXT',
  '# MEMCON SHARED CONTEXT',
  '# Memcon Shared Context',
  '# Hermes Agent Memory (Managed by memcon)',
];

export const CURSOR_RULE_BASENAME = 'memcon-context.mdc';

/**
 * memcon's mirror inside ~/.hermes/memories. Hermes owns MEMORY.md in that
 * directory; memcon writes alongside it and never overwrites it.
 */
export const HERMES_MIRROR_BASENAME = 'MEMCON-CONTEXT.md';

/** True when this text was produced by one of memcon's own emitters. */
export function isSelfGenerated(text: string): boolean {
  const head = text.slice(0, 500);
  return MEMCON_HEADERS.some((h) => head.includes(h)) || text.includes(MEMCON_BLOCK_START);
}

/** Files memcon writes. Changes to these must never trigger or feed a sync. */
export function selfEmittedPaths(projectRoot: string): string[] {
  const home = os.homedir();
  return [
    path.join(getMemconDir(), 'CONTEXT.md'),
    path.join(projectRoot, '.cursor', 'rules', CURSOR_RULE_BASENAME),
    path.join(home, '.cursor', 'rules', CURSOR_RULE_BASENAME),
    path.join(home, '.hermes', 'memories', HERMES_MIRROR_BASENAME),
  ].map((p) => path.resolve(p));
}

/** Drop the memcon-managed block from a hand-maintained file before parsing it. */
export function stripMemconBlock(text: string): string {
  return text.replace(MEMCON_BLOCK_RE, '').trim();
}

/** A fact that is really memcon's own output looped back into the store. */
export function isSelfFact(fact: { key: string; content: string }): boolean {
  if (fact.key === `cursor.${path.basename(CURSOR_RULE_BASENAME, '.mdc')}`) return true;
  if (fact.key.includes('managed-by-memcon')) return true;
  return isSelfGenerated(fact.content);
}

/** Collapse to one line and cap length, so no single fact can dominate a file. */
export function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max - 1) + '…' : flat;
}
